import assert from "node:assert/strict";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2), option = name => args[args.indexOf(name) + 1];
if (!args.includes("--project-root")) throw new Error("Use --project-root <game checkout> [--browser-url <url>]");
const game = path.resolve(option("--project-root"));
const read = file => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const screen = read("dist/data/ui/activities.json"), rules = read("dist/data/ui/activities-rules.json"), manifest = read("dist/data/ui/activities-sprites.json");
const raw = readFileSync(path.join(game, "Assets/HUDs/Activities.ui"), "utf8");
const original = JSON.parse(raw.includes("\n//") ? raw.slice(0, raw.lastIndexOf("\n//")) : raw);
assert.equal(rules.uiSha256, createHash("sha256").update(Buffer.from(raw)).digest("hex"));
let entities = 0;
function compare(a, b, parent = "") {
  const p = parent ? parent + "/" + a._entityName : a._entityName;
  assert.deepEqual({ id: b.id, path: b.path, type: b.type, props: b.propsData, eca: b.ecaProps }, { id: a._entityId, path: p, type: a._tag.type, props: a.propsData || {}, eca: a.ecaProps || {} });
  assert.equal(a.children?.length || 0, b.children.length);
  entities++; (a.children || []).forEach((n, i) => compare(n, b.children[i], p));
}
compare(original, screen.tree); assert.equal(entities, screen.entityCount);
for (const sprite of manifest.sprites) {
  if (sprite.missing) { assert.ok(sprite.key.startsWith("lib://"), "Unexpected missing project sprite: " + sprite.key); continue; }
  assert.ok(existsSync(path.join(root, "dist", sprite.output)), sprite.key);
  assert.equal(createHash("sha256").update(readFileSync(path.join(root, "dist", sprite.output))).digest("hex"), createHash("sha256").update(readFileSync(path.join(game, sprite.key))).digest("hex"));
  const metaFile = path.join(game, sprite.key + ".meta");
  if (existsSync(metaFile)) { const meta = JSON.parse(readFileSync(metaFile, "utf8")); if (sprite.fileId) assert.equal(sprite.fileId, meta.fileId); assert.deepEqual(sprite.border, { left: Number(meta.borderLeft) || 0, right: Number(meta.borderRight) || 0, top: Number(meta.borderTop) || 0, bottom: Number(meta.borderBottom) || 0 }); }
}
for (const value of Object.values(rules.gifts)) assert.deepEqual(Object.keys(value), ["ID", "Reward"]);
for (const file of rules.sourceFiles) assert.equal(file.sha256, createHash("sha256").update(readFileSync(path.join(game, file.file), "utf8")).digest("hex"));
assert.equal(rules.descriptions.RandomPet, "HUD_REWARD_TITLE_RANDOM_PET");
assert.equal(rules.widgetIds.MilestoneBar, "RvVwJCGc");
const report = { sourceCommit: rules.sourceCommit, entities, sprites: manifest.sprites.length, missing: manifest.missing.map(s => s.key), source: "pass", browser: [], runtimeGameParity: "no engine screenshots supplied", gaps: rules.gaps };
if (args.includes("--browser-url")) {
  const require = createRequire(import.meta.url), { chromium } = require("playwright");
  const browser = await chromium.launch({ channel: process.env.UI_AUDIT_BROWSER || "msedge" });
  try {
    for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport }), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error" && !message.location().url.endsWith("/favicon.ico")) errors.push(message.text()); });
      await page.goto(new URL("/#uipreview/activities", option("--browser-url")).href);
      await page.waitForSelector("#activities-user");
      const settle = () => page.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
      await settle();
      if (viewport.width === 1440) await page.screenshot({ path: path.join(root, "dist/data/ui/activities-desktop.png"), fullPage: false });
      assert.equal(await page.locator("#ui-preview-stage [data-ui-path]").count(), entities);
      assert.equal(await page.locator('[data-ui-name="DailyEventTabButton"]').evaluate(el => getComputedStyle(el).display), "none");
      const button = name => `#ui-preview-stage button[data-ui-name="${name}"]`;
      let clicks = 0, profiles = 0;
      async function click(selector) {
        await page.evaluate(selector => {
          const el = document.querySelector(selector), scroll = el.closest('[data-ui-name="Scroll View"]');
          if (scroll) { const r = el.getBoundingClientRect(), parent = scroll.getBoundingClientRect(); const scale = parent.height / scroll.clientHeight; scroll.scrollTop += (r.top - parent.top - 25) / scale; }
          const r = el.getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top - 220);
        }, selector);
        const before = await page.evaluate(() => ({ x: scrollX, y: scrollY, resource: document.querySelector(".ui-resource-scroll").scrollTop, first: document.querySelector("#ui-resource-rows tr") }));
        const row = await page.locator("#ui-resource-rows tr").first().elementHandle();
        const point = await page.locator(selector).evaluate(el => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; return { x, y, hit: document.elementFromPoint(x, y) === el }; });
        assert.ok(point.hit, "Blocked hit: " + selector);
        await page.mouse.click(point.x, point.y); await settle();
        assert.deepEqual(await page.evaluate(() => ({ x: scrollX, y: scrollY, resource: document.querySelector(".ui-resource-scroll").scrollTop })), { x: before.x, y: before.y, resource: before.resource });
        assert.ok(await row.evaluate(el => el === document.querySelector("#ui-resource-rows tr")), "Resource row identity changed");
        clicks++;
      }
      const profilesToTest = [...new Set(rules.dailyRewards.map(r => `${r.UserType}/${r.RebirthLevel}`))].map(s => s.split("/"));
      for (const [type, rebirth] of profilesToTest) {
        await page.selectOption("#activities-user", type); await page.fill("#activities-rebirth", rebirth); await page.locator("#activities-rebirth").dispatchEvent("change"); await settle();
        const expected = rules.dailyRewards.filter(r => r.UserType === type && r.RebirthLevel === rebirth);
        assert.equal(await page.locator('[data-activity-day]:visible').count(), expected.length);
        assert.ok(!(await page.locator("#ui-preview-stage").textContent()).includes("undefined")); profiles++;
      }
      for (const type of [...new Set(rules.dailyRewards.map(r => r.UserType))]) {
        const levels = [...new Set(rules.dailyRewards.filter(r => r.UserType === type).map(r => Number(r.RebirthLevel)))];
        for (const rebirth of [...levels.map(n => n - 1), Math.max(...levels) + 1]) {
          await page.selectOption("#activities-user", type); await page.fill("#activities-rebirth", String(rebirth)); await page.locator("#activities-rebirth").dispatchEvent("change"); await settle();
          const match = Math.max(0, ...levels.filter(n => n <= rebirth));
          assert.equal(await page.locator('[data-activity-day]:visible').count(), match > 0 ? rules.dailyRewards.filter(r => r.UserType === type && Number(r.RebirthLevel) === match).length : 0);
          profiles++;
        }
      }
      await page.selectOption("#activities-user", "New"); await page.fill("#activities-rebirth", "1"); await page.locator("#activities-rebirth").dispatchEvent("change");
      await page.selectOption("#activities-day", "7"); await settle();
      for (let day = 1; day <= 7; day++) await click(`[data-activity-day="${day}"] > [data-ui-name="ClaimButton"]`);
      assert.equal(await page.locator('[data-activity-day] > [data-ui-name="ClaimedButton"]:visible').count(), 7);
      await click(button("DailyMissionsTabButton"));
      for (let day = 1; day <= 7; day++) { await page.selectOption("#activities-cycle", String(day)); await settle(); const expected = rules.missions.filter(r => Number(r.Day) === 0 || Number(r.Day) === day).length; assert.equal(await page.locator('[data-activity-mission]:visible').count(), expected); }
      await page.selectOption("#activities-progress", "100"); await settle();
      const firstMission = page.locator('[data-activity-mission]:visible').first(), missionId = await firstMission.getAttribute("data-activity-mission");
      await click(`[data-activity-mission="${missionId}"] > [data-ui-name="Progress"] > [data-ui-name="ClaimButton"]`);
      assert.equal(await page.locator(`[data-activity-mission="${missionId}"] > [data-ui-name="Claimed"]`).evaluate(el => getComputedStyle(el).display), "block");
      const scrollSelector = '#ui-preview-stage [data-ui-name="Scroll View"]';
      assert.ok(await page.locator(scrollSelector).evaluate(el => el.scrollHeight > el.clientHeight));
      await page.locator(scrollSelector).evaluate(el => { el.scrollTop = el.scrollHeight; });
      assert.ok(await page.locator(scrollSelector).evaluate(el => el.scrollTop > 0));
      await page.fill("#activities-points", "100"); await page.locator("#activities-points").dispatchEvent("change"); await settle();
      await click('[data-activity-milestone="20"] [data-ui-name="ClaimButton"]');
      assert.equal(await page.locator('[data-activity-milestone="20"] [data-ui-name="ClaimedMask"]').evaluate(el => getComputedStyle(el).display), "block");
      await page.locator("#ui-preview-stage").screenshot({ path: path.join(root, `dist/data/ui/activities-missions-${viewport.width}.png`) });
      await click(button("DailySpinTabButton"));
      await page.fill("#activities-spins", "1"); await page.locator("#activities-spins").dispatchEvent("change"); await click(button("SpinButton"));
      await page.waitForFunction(() => !document.getElementById("activities-result").textContent.includes("Đang quay"), null, { timeout: 10000 });
      assert.ok((await page.locator("#activities-result").textContent()).length > 0);
      await click(button("SpinButton")); // no remaining spins: no second tween
      assert.ok(!(await page.locator("#activities-result").textContent()).includes("Đang quay"));
      await page.locator("#ui-preview-stage").screenshot({ path: path.join(root, `dist/data/ui/activities-spin-${viewport.width}.png`) });
      await page.locator('details:has(#activities-event-preview) > summary').click();
      await page.fill("#activities-event-day", "3"); await page.locator("#activities-event-day").dispatchEvent("change");
      await page.locator("#activities-event-preview").click(); await settle();
      assert.equal(await page.locator('[data-activity-event]:visible').count(), rules.events.length);
      for (let day = 1; day <= 3; day++) await click(`[data-activity-event="${day}"] > [data-ui-name="ClaimButton"]`);
      assert.equal(await page.locator('[data-activity-event] > [data-ui-name="ClaimedButton"]:visible').count(), 3);
      assert.equal(await page.locator('[data-ui-name="DailyEventTabButton"]').evaluate(el => getComputedStyle(el).display), "none");
      await page.selectOption("#ui-language", "en"); await page.waitForSelector("#activities-user"); await settle();
      await page.locator('[data-ui-screen="collection"]').click(); await page.waitForSelector("[data-ui-pet-id]");
      assert.equal(await page.locator("#activities-user").count(), 0);
      await page.locator('[data-ui-screen="activities"]').click(); await page.waitForSelector("#activities-user");
      assert.equal(await page.locator("#ui-preview-stage [data-ui-path]").count(), entities);
      await click(button("DailyRewardsTabButton"));
      await page.selectOption("#ui-language", "vi"); await page.waitForSelector("#activities-user"); await settle();
      await page.locator("#ui-preview-stage").screenshot({ path: path.join(root, `dist/data/ui/activities-rewards-${viewport.width}.png`) });
      await click(button("CloseButton")); assert.ok(await page.locator(".ui-canvas").evaluate(el => el.classList.contains("ui-closed")));
      await page.locator("#ui-open-toggle").click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      report.browser.push({ viewport, profiles, clicks, states: ["all configured user/Rebirth tiers and boundaries", "7 login claims", "7 mission cycle days", "mission claim and sorting", "milestone claim", "vertical scrolling", "spin and zero spins", "3 Event claims via inspection panel with source tab still hidden", "VI/EN", "Collection roundtrip", "close/reopen"], errors });
      await page.close();
    }
    const page = await browser.newPage(), lifecycleErrors = [];
    page.on("pageerror", error => lifecycleErrors.push(error.message));
    await page.goto(new URL("/#uipreview/activities", option("--browser-url")).href);
    await page.waitForSelector("#activities-user");
    await page.locator('[data-ui-name="DailySpinTabButton"]').click();
    await page.locator('[data-ui-name="SpinButton"]').click();
    await page.locator('[data-page="uiproposal"]').click();
    await page.waitForSelector("#ui-preview-stage .ui-canvas");
    await page.waitForTimeout(rules.constants.ROTATE_DURATION + 100);
    assert.deepEqual(lifecycleErrors, []);
    await page.goto(new URL("/#uipreview/activities", option("--browser-url")).href);
    await page.waitForSelector("#activities-user");
    await page.evaluate(() => { for (const id of ["collection", "activities", "collection", "activities"]) { history.replaceState(null, "", "#uipreview/" + id); updateUiPreviewPage(id); } });
    await page.waitForFunction(() => uiPreview.screenId === "activities" && document.querySelector("#activities-user"));
    await page.waitForTimeout(250);
    assert.equal(await page.locator("#ui-preview-stage [data-ui-path]").count(), entities);
    assert.deepEqual(lifecycleErrors, []);
    report.lifecycle = { leaveDuringSpinForProposal: true, rapidScreenSwitches: true, errors: lifecycleErrors };
    await page.close();
  } finally { await browser.close(); }
}
writeFileSync(path.join(root, "dist/data/ui/activities-audit.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
