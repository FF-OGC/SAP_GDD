import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditUnchangedConsumers } from "./audit-ui-components-regressions.mjs";

const require = createRequire(import.meta.url), { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browser = await chromium.launch({ channel: process.env.UI_AUDIT_BROWSER || "msedge" }), results = [];
const files = ["index.html", "styles.css", "app-router.js", "app-uipreview.js", "app-ui-renderer.js", "app-ui-inspector.js"];
try {
  for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
    const report = await auditUnchangedConsumers(browser, process.argv[2] || "http://localhost:8080", viewport, "c1bb1bc", files, false);
    results.push(report);
    console.log(`Collection/Proposal DOM matches: ${viewport.width}; exact pixel differences: ${report.captures.filter(c => !c.cropIdentical).length} captures (see report)`);
  }
} finally { await browser.close(); }
writeFileSync(path.join(root, "dist/data/ui/activities-consumer-regression.json"), JSON.stringify(results, null, 2) + "\n");
