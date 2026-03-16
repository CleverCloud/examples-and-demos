#!/usr/bin/env node

// Compares all repo fields (name, status, last_update) between two snapshots.
// Catches date-only updates, status changes, renames, additions, and removals.
// Unlike grep-based diffing, this is not confused by block reorderings.
//
// Usage:
//   node repo-diff.js --commit-start abc123
//   node repo-diff.js --commit-start abc123 --commit-end def456

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { parse } from "yaml";

const args = process.argv.slice(2);
let commitStart = null;
let commitEnd = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--commit-start" && args[i + 1]) commitStart = args[++i];
  if (args[i] === "--commit-end" && args[i + 1]) commitEnd = args[++i];
}

function collect(obj) {
  const all = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k === "title") continue;
    if (k === "examples" && Array.isArray(v)) all.push(...v);
    else if (typeof v === "object" && v) all.push(...collect(v));
  }
  return all;
}

function loadYaml(commit) {
  if (commit) {
    try {
      return execSync(`git show ${commit}:repositories.yaml`, { encoding: "utf8" });
    } catch {
      return null;
    }
  }
  return readFileSync("repositories.yaml", "utf8");
}

const startYaml = loadYaml(commitStart);
const endYaml = loadYaml(commitEnd);

if (!startYaml) {
  console.log("No start snapshot found.");
  process.exit(0);
}

const startExs = collect(parse(startYaml));
const endExs = collect(parse(endYaml));

// Build maps keyed by name
const startMap = {};
for (const ex of startExs) startMap[ex.name] = ex;
const endMap = {};
for (const ex of endExs) endMap[ex.name] = ex;

// Build maps keyed by URL for rename detection
const startByUrl = {};
for (const ex of startExs) if (ex.url) startByUrl[ex.url] = ex;
const endByUrl = {};
for (const ex of endExs) if (ex.url) endByUrl[ex.url] = ex;

const allNames = new Set([...Object.keys(startMap), ...Object.keys(endMap)]);
const changes = [];

for (const name of [...allNames].sort()) {
  const s = startMap[name];
  const e = endMap[name];

  if (!s && e) {
    // Check if it's a rename (same URL existed under a different name)
    const prev = startByUrl[e.url];
    if (prev && prev.name !== name) {
      changes.push(`${name}: added (renamed from ${prev.name}), status=${e.status}, date=${e.last_update}`);
    } else {
      changes.push(`${name}: added, status=${e.status}, date=${e.last_update}`);
    }
  } else if (s && !e) {
    const next = endByUrl[s.url];
    if (next && next.name !== name) {
      changes.push(`${name}: removed (renamed to ${next.name})`);
    } else {
      changes.push(`${name}: removed`);
    }
  } else if (s && e) {
    const diffs = [];
    // Treat "fixed" and "pinned" as equivalent (backward compatibility)
    const normalizeStatus = (st) => st === "fixed" ? "pinned" : st;
    if (normalizeStatus(s.status) !== normalizeStatus(e.status)) diffs.push(`status: ${s.status} → ${e.status}`);
    if (s.last_update !== e.last_update) diffs.push(`date: ${s.last_update} → ${e.last_update}`);
    if (diffs.length > 0) {
      changes.push(`${name}: ${diffs.join(", ")}`);
    }
  }
}

if (changes.length === 0) {
  console.log("No changes.");
} else {
  for (const c of changes) console.log(c);
}
