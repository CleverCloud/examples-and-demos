#!/usr/bin/env node

// Compares last_update dates in repositories.yaml against actual last commit
// dates on the default branch of each GitHub repository.
//
// Usage:
//   node check-dates.js                # check all active/pinned repos
//   node check-dates.js --all          # check all repos including deprecated
//   node check-dates.js --name "Go Example"  # check a single repo by name
//
// Requires: gh CLI authenticated with access to the CleverCloud org.

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { parse } from "yaml";

const args = process.argv.slice(2);
let checkAll = false;
let filterName = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--all") checkAll = true;
  if (args[i] === "--name" && args[i + 1]) filterName = args[++i];
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

const yaml = readFileSync("repositories.yaml", "utf8");
const data = parse(yaml);
const repos = collect(data);

// Filter repos
let toCheck = repos.filter((r) => r.url && r.status !== "no_repo");
if (!checkAll) {
  toCheck = toCheck.filter(
    (r) => !["deprecated", "archived"].includes(r.status)
  );
}
if (filterName) {
  toCheck = toCheck.filter((r) => r.name === filterName);
}

if (toCheck.length === 0) {
  console.log("No repos to check.");
  process.exit(0);
}

// Extract owner/repo from GitHub URL
function parseGhUrl(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  return m ? `${m[1]}/${m[2]}` : null;
}

// Get last commit date on default branch via gh CLI
function getLastCommitDate(nwo) {
  try {
    const result = execSync(
      `gh api repos/${nwo}/commits?per_page=1 --jq '.[0].commit.committer.date'`,
      { encoding: "utf8", timeout: 15000, stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (!result) return null;
    // Return YYYY-MM-DD
    return result.slice(0, 10);
  } catch {
    return null;
  }
}

const stale = [];
const upToDate = [];
const errors = [];

for (const repo of toCheck) {
  const nwo = parseGhUrl(repo.url);
  if (!nwo) {
    errors.push({ name: repo.name, reason: "invalid URL" });
    continue;
  }

  process.stderr.write(`Checking ${repo.name}...\r`);
  const actual = getLastCommitDate(nwo);

  if (!actual) {
    errors.push({ name: repo.name, reason: "API error or repo not found" });
    continue;
  }

  const recorded = repo.last_update;
  if (recorded === actual) {
    upToDate.push({ name: repo.name, date: recorded });
  } else {
    stale.push({ name: repo.name, recorded, actual, status: repo.status });
  }
}

// Clear progress line
process.stderr.write("\x1b[2K\r");

if (stale.length > 0) {
  console.log(`\n📅 Date mismatches (${stale.length}):\n`);
  for (const s of stale.sort((a, b) => a.name.localeCompare(b.name))) {
    const arrow =
      s.recorded < s.actual ? "→" : s.recorded > s.actual ? "←" : "~";
    console.log(`  ${s.name}: ${s.recorded} ${arrow} ${s.actual} (${s.status})`);
  }
}

if (errors.length > 0) {
  console.log(`\n⚠️  Errors (${errors.length}):\n`);
  for (const e of errors) {
    console.log(`  ${e.name}: ${e.reason}`);
  }
}

if (stale.length === 0 && errors.length === 0) {
  console.log("✅ All dates are up to date.");
}

console.log(
  `\nChecked ${toCheck.length} repos: ${upToDate.length} up to date, ${stale.length} mismatches, ${errors.length} errors.`
);
