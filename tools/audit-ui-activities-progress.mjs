import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rules = JSON.parse(readFileSync(path.join(root, "dist/data/ui/activities-rules.json"), "utf8"));
const mission = rules.missions.find(row => Number(row.TargetValue) === 3 && Number(row.Day) === 0);
const pointIndex = mission.RewardType.split("|").findIndex(type => rules.itemTypes[type] === "DMMPoint");
const points = Number(mission.RewardValue.split("|")[pointIndex]);
const require = createRequire(import.meta.url), { chromium } = require("playwright");
const browser = await chromium.launch({ channel: process.env.UI_AUDIT_BROWSER || "msedge" }), reports = [];
try {
  for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport }), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(new URL("/#uipreview/activities", process.argv[2] || "http://localhost:8080").href);
    await page.waitForSelector("#activities-debug-mission");
    await page.selectOption("#activities-debug-mission", mission.ID);
    const status = page.locator("#activities-debug-progress"), add = page.locator("#activities-debug-add");
    const card = `[data-activity-mission="${mission.ID}"]`;
    const progress = page.locator(`${card} > [data-ui-name="Progress"] > .ui-text`);
    const claim = page.locator(`${card} > [data-ui-name="Progress"] > [data-ui-name="ClaimButton"]`);
    assert.ok((await status.textContent()).startsWith("0/3"));
    await claim.dispatchEvent("click");
    assert.equal(await page.locator("#activities-points").inputValue(), "0");
    for (const expected of [1, 2, 3]) {
      await add.click();
      assert.equal(await progress.textContent(), `${expected}/3`);
      assert.ok((await status.textContent()).startsWith(`${expected}/3`));
      assert.equal(await page.locator("#activities-points").inputValue(), "0");
    }
    assert.ok(await add.isDisabled());
    assert.ok((await status.textContent()).includes("Có thể nhận"));
    const other = rules.missions.find(row => row.ID !== mission.ID && Number(row.Day) === 0);
    assert.equal(await page.locator(`[data-activity-mission="${other.ID}"] > [data-ui-name="Progress"] > .ui-text`).textContent(), `0/${other.TargetValue}`);
    // Claim uses a clone for this config row; verify actual input after debug scrolling.
    await page.evaluate(selector => {
      const el = document.querySelector(selector), scroll = el.closest('[data-ui-name="Scroll View"]');
      const r = el.getBoundingClientRect(), parent = scroll.getBoundingClientRect();
      scroll.scrollTop += (r.top - parent.top - 20) / (parent.height / scroll.clientHeight);
    }, `${card} > [data-ui-name="Progress"] > [data-ui-name="ClaimButton"]`);
    await claim.click();
    assert.equal(await page.locator("#activities-points").inputValue(), String(points));
    assert.ok((await status.textContent()).includes("Đã nhận"));
    await claim.dispatchEvent("click"); // repeat delivery cannot award twice
    assert.equal(await page.locator("#activities-points").inputValue(), String(points));
    assert.ok(await add.isDisabled());
    await page.locator("#activities-debug-reset").click();
    assert.ok((await status.textContent()).startsWith("0/3"));
    assert.equal(await page.locator("#activities-points").inputValue(), "0");
    await page.fill("#activities-debug-step", "999"); await add.click();
    assert.ok((await status.textContent()).startsWith("3/3"));
    await page.selectOption("#activities-progress", "50");
    assert.ok((await status.textContent()).startsWith("1/3"));
    await page.fill("#activities-debug-step", "0"); await add.click();
    assert.ok((await status.textContent()).startsWith("1/3"));
    await page.locator("#activities-debug-complete").click();
    assert.ok((await status.textContent()).startsWith("3/3"));
    await page.selectOption("#ui-language", "en"); await page.waitForSelector("#activities-debug-mission");
    assert.ok((await status.textContent()).startsWith("3/3"));
    await page.selectOption("#activities-cycle", "2");
    assert.ok((await status.textContent()).startsWith("1/3")); // preset survives; per-mission override cleared
    assert.deepEqual(errors, []);
    reports.push({ viewport, missionId: mission.ID, progress: ["0/3", "1/3", "2/3", "3/3"], pointsOnClaim: points, repeatedClaimIgnored: true, clampAndInvalidStep: true, completeResetPresetCycleLanguage: true, errors });
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(path.join(root, "dist/data/ui/activities-progress-audit.json"), JSON.stringify(reports, null, 2) + "\n");
console.log("Activities incremental mission progress passed on desktop and mobile");
