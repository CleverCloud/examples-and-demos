#!/usr/bin/env node

// Computes freshness stats for repositories.yaml
// Usage:
//   node freshness-stats.js                          # current file, evaluated today
//   node freshness-stats.js --date 2026-03-09        # current file, evaluated at given date
//   node freshness-stats.js --commit abc123           # file at commit, evaluated today
//   node freshness-stats.js --commit abc123 --date 2026-03-09  # file at commit, evaluated at date

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { parse } from "yaml";

const args = process.argv.slice(2);
let commit = null;
let evalDate = new Date();

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--commit" && args[i + 1]) commit = args[++i];
  if (args[i] === "--date" && args[i + 1]) evalDate = new Date(args[++i]);
}

let yaml;
if (commit) {
  try {
    yaml = execSync(`git show ${commit}:repositories.yaml`, { encoding: "utf8" });
  } catch {
    console.log(JSON.stringify({ error: "no_file" }));
    process.exit(0);
  }
} else {
  yaml = readFileSync("repositories.yaml", "utf8");
}

const data = parse(yaml);
const FRESH = 12;
const AGING = 36;

function classify(ex) {
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

const exs = collect(data);
const stats = { "🟢": 0, "🟡": 0, "🔴": 0, "📌": 0, "🪦": 0, "📦": 0, "—": 0 };
for (const ex of exs) stats[classify(ex)]++;
stats.total = exs.length;

console.log(JSON.stringify(stats));
