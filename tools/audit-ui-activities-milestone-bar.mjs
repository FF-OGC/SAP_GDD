import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rules = JSON.parse(readFileSync(path.join(root, "dist/data/ui/activities-rules.json"), "utf8"));
const values = rules.milestone.Milestone.split(";").map(Number), maximum = values.at(-1);
const require = createRequire(import.meta.url), { chromium } = require("playwright"), { PNG } = require("pngjs");
const browser = await chromium.launch({ channel: process.env.UI_AUDIT_BROWSER || "msedge" }), results = [];
try {
  for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport }), errors = [], cases = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(new URL("/#uipreview/activities", process.argv[2] || "http://localhost:8080").href);
    await page.waitForSelector("#activities-debug-mission");
    await page.locator('[data-ui-name="DailyMissionsTabButton"]').click();
    for (const points of [0, ...values, maximum + 20]) {
      await page.fill("#activities-points", String(points)); await page.locator("#activities-points").dispatchEvent("change");
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const geometry = await page.locator('[role="progressbar"][aria-label="Pet Points"]').evaluate(el => {
        const r = el.getBoundingClientRect(), track = el.parentElement.getBoundingClientRect(), stage = document.querySelector("#ui-preview-stage").getBoundingClientRect();
        return { width: r.width, height: r.height, x: r.x - stage.x, y: r.y - stage.y, trackWidth: track.width, clip: el.style.clipPath, now: el.getAttribute("aria-valuenow"), max: el.getAttribute("aria-valuemax"), rawSprite: el.dataset.uiMissingSprite, fallback: JSON.parse(el.dataset.uiRuntimeValues).RenderFallback.value };
      });
      assert.ok(geometry.width > 0 && geometry.height > 0);
      assert.equal(geometry.width, geometry.trackWidth);
      assert.equal(geometry.now, String(Math.min(maximum, points))); assert.equal(geometry.max, String(maximum));
      const inset = geometry.clip.slice(6, -1).split(" ").map(parseFloat);
      assert.ok(Math.abs(inset[1] - 100 * (1 - Math.min(1, points / maximum))) < 0.0001, "CSS percentage serialization must preserve the fill ratio");
      assert.equal(inset[0], 0); assert.equal(inset[2] ?? inset[0], 0); assert.equal(inset[3] ?? inset[1] ?? inset[0], 0);
      assert.ok(geometry.rawSprite.startsWith("lib://")); assert.equal(geometry.fallback.color, "#FFD515");
      const image = PNG.sync.read(await page.locator("#ui-preview-stage").screenshot());
      const sample = fraction => {
        const x = Math.floor(geometry.x + geometry.width * fraction), y = Math.floor(geometry.y + geometry.height / 2);
        return [...image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 3)];
      };
      const first = sample(.1), last = sample(.95);
      if (points === 0) assert.ok(first[2] > first[0], "Empty track must show source blue pixels");
      if (points >= values[0]) assert.ok(first[0] > first[2] && first[1] > first[2], "Earned fill must show yellow pixels");
      if (points < maximum) assert.ok(last[2] > last[0], "Unfilled tail must remain blue");
      else assert.ok(last[0] > last[2] && last[1] > last[2], "Full bar must show yellow to the end");
      cases.push({ points, fill: Math.min(1, points / maximum), firstPixel: first, tailPixel: last });
    }
    await page.fill("#activities-points", String(values[2])); await page.locator("#activities-points").dispatchEvent("change");
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.locator("#ui-preview-stage").screenshot({ path: path.join(root, `dist/data/ui/activities-milestone-bar-${viewport.width}.png`) });
    assert.deepEqual(errors, []); results.push({ viewport, cases, sourceSpriteStillMarkedMissing: true, errors });
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(path.join(root, "dist/data/ui/activities-milestone-bar-audit.json"), JSON.stringify(results, null, 2) + "\n");
console.log("Activities milestone bar geometry, fill and actual pixels passed on desktop/mobile");
