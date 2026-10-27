import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chaseChance, dailyChaseCeilings } from "./chase-model.mjs";

const snapshot = JSON.parse(readFileSync(new URL("../dist/data/chase.json", import.meta.url)));
const fish = snapshot.channels.find(c => c.key === "FISH");
const box = snapshot.channels.find(c => c.key === "BOX");
test("shot boundaries, disabled flag and clamp", () => {
  assert.equal(chaseChance(fish, 0), 0);
  assert.equal(chaseChance(fish, 1), 0);
  assert.equal(chaseChance(fish, 2), fish.step);
  assert.equal(chaseChance({ ...fish, enabled: false }, 56), 0);
  assert.equal(chaseChance(fish, 100), chaseChance(fish, 56));
  assert.equal(chaseChance({ ...fish, step: 100 }, 2), 1);
});
test("daily maxima use counted shots with no off-by-one and plateau after day 7", () => {
  const days = dailyChaseCeilings(fish);
  assert.equal(days[0].shots, 8);
  assert.equal(days[0].chance, fish.step * 7 ** 3);
  assert.equal(days[6].shots, 56);
  assert.equal(days[6].chance, days[7].chance);
  assert.ok(Math.abs(days[6].chance - 0.10921021375) < 1e-12);
});
test("Limited priority reduces Chase probability per opened box", () => {
  const last = dailyChaseCeilings(box, snapshot.limited.chance).at(-1);
  assert.ok(Math.abs(last.chance - 0.266648) < 1e-12);
  assert.ok(Math.abs(last.chasePerOpen - 0.2624349616) < 1e-12);
  assert.ok(Math.abs(last.eitherPerOpen - 0.2782349616) < 1e-12);
  assert.equal(last.chance, box.days.at(-1).chance);
});
