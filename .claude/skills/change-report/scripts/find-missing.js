#!/usr/bin/env node

// Searches the CleverCloud GitHub organization for repositories that look like
// examples but are not listed in repositories.yaml.
//
// Usage:
//   node find-missing.js                  # search with default patterns
//   node find-missing.js --include-archived  # also show archived repos
//
// Requires: gh CLI authenticated with access to the CleverCloud org.

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { parse } from "yaml";

const args = process.argv.slice(2);
let includeArchived = args.includes("--include-archived");

function collect(obj) {
  const all = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k === "title") continue;
    if (k === "examples" && Array.isArray(v)) all.push(...v);
    else if (typeof v === "object" && v) all.push(...collect(v));
  }
  return all;
}

// Load known repos from YAML
const yaml = readFileSync("repositories.yaml", "utf8");
const data = parse(yaml);
const knownRepos = collect(data);
const knownUrls = new Set(knownRepos.map((r) => r.url?.toLowerCase()).filter(Boolean));

// Fetch all repos from CleverCloud org
process.stderr.write("Fetching repos from CleverCloud org...\n");

let ghArgs = `gh api --paginate '/orgs/CleverCloud/repos?per_page=100&type=public' --jq '.[] | [.html_url, .name, .archived, .description // "", .pushed_at] | @tsv'`;

let rawOutput;
try {
  rawOutput = execSync(ghArgs, {
    encoding: "utf8",
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (e) {
  console.error("Failed to fetch repos from GitHub:", e.message);
  process.exit(1);
}

const orgRepos = rawOutput
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [url, name, archived, description, pushedAt] = line.split("\t");
    return {
      url,
      name,
      archived: archived === "true",
      description: description || "",
      pushedAt: pushedAt ? pushedAt.slice(0, 10) : "unknown",
    };
  });

// Patterns that suggest "example" repos
const examplePatterns = [
  /example/i,
  /demo/i,
  /sample/i,
  /starter/i,
  /template/i,
  /quickstart/i,
  /tutorial/i,
  /boilerplate/i,
];

function looksLikeExample(repo) {
  return examplePatterns.some(
    (p) => p.test(repo.name) || p.test(repo.description)
  );
}

// Find repos that match example patterns but aren't in our YAML
const missing = orgRepos.filter((repo) => {
  if (!includeArchived && repo.archived) return false;
  if (knownUrls.has(repo.url.toLowerCase())) return false;
  return looksLikeExample(repo);
});

// Also find non-example-named repos that aren't tracked (for awareness)
const untracked = orgRepos.filter((repo) => {
  if (!includeArchived && repo.archived) return false;
  if (knownUrls.has(repo.url.toLowerCase())) return false;
  return !looksLikeExample(repo);
});

if (missing.length > 0) {
  console.log(`\n🔍 Potential example repos not in repositories.yaml (${missing.length}):\n`);
  for (const r of missing.sort((a, b) => a.name.localeCompare(b.name))) {
    const flags = [];
    if (r.archived) flags.push("archived");
    const flagStr = flags.length ? ` [${flags.join(", ")}]` : "";
    console.log(`  ${r.name}${flagStr}`);
    console.log(`    ${r.url}`);
    if (r.description) console.log(`    ${r.description}`);
    console.log(`    Last push: ${r.pushedAt}`);
    console.log();
  }
} else {
  console.log("\n✅ No missing example repos found.");
}

console.log(
  `\nSummary: ${orgRepos.length} public repos in org, ${knownUrls.size} tracked in YAML, ${missing.length} potential examples not tracked, ${untracked.length} other untracked repos.`
);
