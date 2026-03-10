#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { parse } from "yaml";

const data = parse(readFileSync("repositories.yaml", "utf8"));

const FRESHNESS_MONTHS = { fresh: 12, aging: 36 };

function freshness(lastUpdate, status) {
  if (status === "archived") return "📦";
  if (status === "fixed") return "📌";
  if (status === "no_repo") return "—";
  if (!lastUpdate) return "🔴";
  const [y, m] = lastUpdate.split("-").map(Number);
  const now = new Date();
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (months <= FRESHNESS_MONTHS.fresh) return "🟢";
  if (months <= FRESHNESS_MONTHS.aging) return "🟡";
  return "🔴";
}

function title(obj, fallback) {
  return obj?.title || fallback.charAt(0).toUpperCase() + fallback.slice(1);
}

function table(examples) {
  const rows = examples.map((ex) => {
    const icon = freshness(ex.last_update, ex.status);
    const date = ex.last_update || "—";
    const desc = ex.description || "";
    return `| [${ex.name}](${ex.url}) | ${desc} | ${date} | ${icon} |`;
  });
  return [
    "| Example | Description | Last Commit | Status |",
    "|---------|-------------|-------------|--------|",
    ...rows,
  ].join("\n");
}

// Collect all examples recursively
function collectExamples(obj) {
  const all = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key === "title") continue;
    if (key === "examples" && Array.isArray(value)) {
      all.push(...value);
    } else if (typeof value === "object" && value !== null) {
      all.push(...collectExamples(value));
    }
  }
  return all;
}

const allExamples = collectExamples(data);
const stats = { "🟢": 0, "🟡": 0, "🔴": 0, "📌": 0, "📦": 0, "—": 0 };
for (const ex of allExamples) {
  const icon = freshness(ex.last_update, ex.status);
  stats[icon] = (stats[icon] || 0) + 1;
}

const now = new Date();
const generated = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

// Build README
const lines = [];
const w = (s = "") => lines.push(s);

w("![Clever Cloud logo](/github-assets/clever-cloud-logo.png)");
w();
w("# Clever Cloud Examples and Demos");
w(
  "[![Clever Cloud - PaaS](https://img.shields.io/badge/Clever%20Cloud-PaaS-orange)](https://clever-cloud.com)"
);
w();
w(
  "Welcome to the official repository of examples and demos for [Clever Cloud](https://www.clever-cloud.com/), a flexible Platform as a Service designed to simplify application deployment and scaling."
);
w();
w("## What is Clever Cloud?");
w();
w(
  "Clever Cloud is a PaaS (Platform as a Service) that allows you to deploy applications easily, without worrying about infrastructure management. It provides automatic scaling, continuous deployment, and a wide range of services to support your applications."
);
w();
w("## Purpose of this Repository");
w();
w(
  "This repository serves as a central hub with links to various examples, demos, and best practices for deploying applications and services on Clever Cloud. Whether you're new to Clever Cloud or an experienced user looking for specific implementation examples, you'll find resources here to help you get started and make the most of the platform."
);
w();
w("## Freshness Indicators");
w();
w(
  "Each example includes a freshness indicator based on the date of its last commit:"
);
w();
w("- 🟢 **Fresh** — Updated within the last year");
w("- 🟡 **Aging** — Updated between 1 and 3 years ago");
w("- 🔴 **Outdated** — Not updated for more than 3 years");
w("- 📌 **Fixed** — Pinned to a specific version, still useful for reference");
w("- 📦 **Archived** — Repository is archived");
w();
w("---");

// Render sections from YAML structure
for (const [sectionKey, section] of Object.entries(data)) {
  if (typeof section !== "object" || section === null) continue;

  w();
  w(`## ${title(section, sectionKey)}`);

  for (const [catKey, category] of Object.entries(section)) {
    if (catKey === "title") continue;
    if (typeof category !== "object" || category === null) continue;

    // Category has examples directly
    if (category.examples && Array.isArray(category.examples)) {
      w();
      w(`### ${title(category, catKey)}`);
      w();
      w(table(category.examples));
    }
  }

  w();
  w("---");
}

w();
w("## Summary");
w();
w("| Status | Count | Meaning |");
w("|--------|-------|---------|");
w(`| 🟢 Fresh | ${stats["🟢"]} | Updated within the last year |`);
w(`| 🟡 Aging | ${stats["🟡"]} | Updated between 1 and 3 years ago |`);
w(`| 🔴 Outdated | ${stats["🔴"]} | Not updated for more than 3 years |`);
if (stats["📌"])
  w(
    `| 📌 Fixed | ${stats["📌"]} | Pinned to a specific version, still useful |`
  );
w(`| 📦 Archived | ${stats["📦"]} | Repository is archived |`);
if (stats["—"])
  w(`| — No repo | ${stats["—"]} | Planned, no repository yet |`);
w(`| **Total** | **${allExamples.length}** | |`);
w();
w(
  `> **Last generated**: ${generated} — Dates are based on the last commit on the default branch.`
);
w();
w("---");
w();
w("## Contributing");
w();
w(
  "We welcome contributions to the Clever Cloud ecosystem! If you have an example or demo that could benefit others, please consider creating a repository and we can link to it from this hub."
);
w();
w("## Additional Resources");
w();
w("- [Clever Cloud Documentation](https://www.clever-cloud.com/doc/)");
w("- [Clever Cloud GitHub](https://github.com/CleverCloud)");
w("- [Clever Tools CLI](https://github.com/CleverCloud/clever-tools)");
w("- [Clever Cloud Status](https://status.clever-cloud.com/)");
w("- [Clever Cloud Blog](https://www.clever-cloud.com/blog/)");
w();
w("## Support");
w();
w(
  "If you have questions or need assistance with these examples, please:"
);
w();
w(
  "- Check the [Clever Cloud Documentation](https://www.clever-cloud.com/doc/)"
);
w(
  "- Join the [Clever Cloud Discord community](https://discord.com/invite/PwVqfwH)"
);
w("- Contact [Clever Cloud Support](https://www.clever-cloud.com/support/)");
w();
w("## License");
w();
w(
  "Unless otherwise specified, all examples linked from this repository are licensed under their respective licenses. Please check each repository for specific license information."
);
w();

writeFileSync("README.md", lines.join("\n"));

const runtimeCount = Object.keys(data.runtimes).filter(
  (k) => k !== "title"
).length;
console.log(
  `README.md generated — ${allExamples.length} examples across ${runtimeCount} runtimes`
);
