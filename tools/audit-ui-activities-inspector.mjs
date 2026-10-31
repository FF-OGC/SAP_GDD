import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screen = JSON.parse(readFileSync(path.join(root, "dist/data/ui/activities.json"), "utf8"));
const nodes = new Map(); (function walk(n) { nodes.set(n.id, n); n.children.forEach(walk); })(screen.tree);
const require = createRequire(import.meta.url), { chromium } = require("playwright");
const browser = await chromium.launch({ channel: process.env.UI_AUDIT_BROWSER || "msedge" }), results = [];
try {
  for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport }), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(new URL("/#uipreview/activities", process.argv[2] || "http://localhost:8080").href);
    await page.waitForSelector("#activities-user");
    await page.evaluate(() => document.querySelector(".ui-canvas").classList.add("ui-show-inactive"));
    const checks = await page.evaluate(() => {
      const canvas = uiPreview.rendered.canvas;
      const repeated = [...canvas.querySelectorAll('[data-ui-path]')].filter(el => el.dataset.uiName === "RewardIcon" && el.closest('[data-ui-name="SpinLayout"]'));
      const checks = [];
      for (const el of repeated) {
        const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        const hits = uiWidgetInspector.hitTest(canvas, x, y), index = hits.indexOf(el);
        if (index < 0) throw new Error("Inspector hit list omitted source icon");
        uiWidgetInspector.openInspector(canvas, x, y);
        document.querySelectorAll(".ui-inspector-layer-choice")[index].click();
        const dt = [...document.querySelectorAll(".ui-inspector-content dt")].find(el => el.textContent === "_entityId");
        const details = [...document.querySelectorAll(".ui-inspector-content details")].find(el => el.querySelector("summary").textContent.startsWith("propsData đầy đủ"));
        checks.push({ expectedId: el.dataset.uiId, id: dt.nextElementSibling.textContent, raw: JSON.parse(details.querySelector("pre").textContent) });
        uiWidgetInspector.closeInspector();
      }
      return checks;
    });
    assert.equal(checks.length, 8);
    for (const check of checks) { assert.equal(check.id, check.expectedId); assert.deepEqual(check.raw, nodes.get(check.id).propsData); }
    await page.evaluate(() => { document.querySelector(".ui-canvas").classList.remove("ui-show-inactive"); activitiesPreview.tab = 1; uiPreview.controller.refresh(); });
    await page.waitForTimeout(200);
    const clones = await page.evaluate(() => {
      const canvas = uiPreview.rendered.canvas, el = canvas.querySelector('[data-ui-source-entity-id][data-ui-name="RewardAmount"]');
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const hits = uiWidgetInspector.hitTest(canvas, x, y), index = hits.indexOf(el);
      uiWidgetInspector.openInspector(canvas, x, y); document.querySelectorAll(".ui-inspector-layer-choice")[index].click();
      const dt = [...document.querySelectorAll(".ui-inspector-content dt")].find(n => n.textContent === "_entityId");
      const details = [...document.querySelectorAll(".ui-inspector-content details")].find(n => n.querySelector("summary").textContent.startsWith("propsData đầy đủ"));
      const result = { expectedId: el.dataset.uiSourceEntityId, id: dt.nextElementSibling.textContent, raw: JSON.parse(details.querySelector("pre").textContent) }; uiWidgetInspector.closeInspector(); return result;
    });
    assert.equal(clones.id, clones.expectedId); assert.deepEqual(clones.raw, nodes.get(clones.id).propsData);
    assert.deepEqual(errors, []);
    results.push({ viewport, repeatedSpinIconIds: checks.map(c => c.id), rawPropsMatch: true, cloneSourceId: clones.id, errors });
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(path.join(root, "dist/data/ui/activities-inspector-audit.json"), JSON.stringify(results, null, 2) + "\n");
console.log("Activities Inspector identity and clone audit passed at both viewports");
