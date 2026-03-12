#!/usr/bin/env node

// Compares freshness categories between two snapshots of repositories.yaml
// Lists every repo whose category changed.
//
// Usage:
//   node freshness-diff.js --commit-start abc123 --date-start 2026-03-11 --date-end 2026-03-12
//   node freshness-diff.js --commit-start abc123 --date-start 2026-03-11 --commit-end def456 --date-end 2026-03-12

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { parse } from "yaml";

const args = process.argv.slice(2);
let commitStart = null;
let commitEnd = null;
let dateStart = new Date();
let dateEnd = new Date();

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--commit-start" && args[i + 1]) commitStart = args[++i];
  if (args[i] === "--commit-end" && args[i + 1]) commitEnd = args[++i];
  if (args[i] === "--date-start" && args[i + 1]) dateStart = new Date(args[++i]);
  if (args[i] === "--date-end" && args[i + 1]) dateEnd = new Date(args[++i]);
}

const FRESH = 12;
const AGING = 36;

function classify(ex, evalDate) {
  if (ex.status === "archived") return "📦";
  if (ex.status === "deprecated") return "🪦";
  if (ex.status === "fixed") return "📌";
  if (ex.status === "no_repo") return "—";
  if (!ex.last_update) return "🔴";
  const [y, m] = ex.last_update.split("-").map(Number);
  const months = (evalDate.getFullYear() - y) * 12 + (evalDate.getMonth() + 1 - m);
  if (months <= FRESH) return "🟢";
  if (months <= AGING) return "🟡";
  return "🔴";
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

const startMap = {};
for (const ex of startExs) startMap[ex.name] = classify(ex, dateStart);
const endMap = {};
for (const ex of endExs) endMap[ex.name] = classify(ex, dateEnd);

const allNames = new Set([...Object.keys(startMap), ...Object.keys(endMap)]);
for (const name of [...allNames].sort()) {
  const s = startMap[name] || "(new)";
  const e = endMap[name] || "(removed)";
  if (s !== e) console.log(`${name}: ${s} → ${e}`);
}
