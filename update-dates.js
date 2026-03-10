#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { parse } from "yaml";

const yamlContent = readFileSync("repositories.yaml", "utf8");
const data = parse(yamlContent);

// Collect all repo URLs and their current dates
const repos = [];

function collectRepos(obj) {
  for (const [key, value] of Object.entries(obj)) {
    if (key === "title") continue;
    if (key === "examples" && Array.isArray(value)) {
      for (const ex of value) {
        if (ex.url) repos.push(ex);
      }
    } else if (typeof value === "object" && value !== null) {
      collectRepos(value);
    }
  }
}

collectRepos(data);
console.log(`Fetching last commit dates for ${repos.length} repositories...\n`);

let updated = 0;
let lines = yamlContent.split("\n");

for (const ex of repos) {
  const repoPath = ex.url.replace("https://github.com/", "");
  try {
    const date = execSync(
      `gh api 'repos/${repoPath}/commits?per_page=1' --jq '.[0].commit.committer.date'`,
      { encoding: "utf8", timeout: 15000 }
    ).trim();

    if (!date) continue;
    const newDate = date.slice(0, 10); // YYYY-MM-DD
    const oldDate = ex.last_update;

    if (oldDate !== newDate) {
      // Find the line with this URL and update the last_update line near it
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(ex.url)) {
          // Search forward for the last_update line (within 5 lines)
          for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
            if (lines[j].match(/^\s+last_update:/)) {
              lines[j] = lines[j].replace(/last_update:.*/, `last_update: ${newDate}`);
              console.log(`  ${ex.name}: ${oldDate || "—"} → ${newDate}`);
              updated++;
              break;
            }
          }
          break;
        }
      }
    }
  } catch {
    console.error(`  ⚠ ${ex.name}: failed to fetch date`);
  }
}

writeFileSync("repositories.yaml", lines.join("\n"));
console.log(`\n${updated} dates updated, ${repos.length - updated} unchanged`);
