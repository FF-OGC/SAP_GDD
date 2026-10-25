import assert from "node:assert/strict";

export async function auditCollectionRegressions(browser, url, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && !message.location().url.endsWith("/favicon.ico")) errors.push(message.text()); });
  try {
    await page.goto(new URL("/#uipreview/collection", url).href);
    await page.waitForSelector("[data-ui-pet-id]");
    await page.waitForFunction(() => [...document.querySelectorAll('[data-ui-name="PetsLayout"] [data-ui-name="HasMW"] img')].every(img => img.complete && img.naturalWidth && img.src.startsWith("data:image/png")));
    const gradients = await page.evaluate(() => [...document.querySelectorAll('[data-ui-name="PetsLayout"] [data-ui-name="HasMW"] img')].map(image => {
      const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d"); context.drawImage(image, 0, 0);
      let hash = 2166136261;
      for (const value of context.getImageData(0, 0, canvas.width, canvas.height).data) hash = Math.imul(hash ^ value, 16777619);
      return { hash: hash >>> 0, props: image.dataset.uiRenderData };
    }));
    assert.ok(gradients.length > 1);
    assert.ok(gradients.every(item => item.hash === gradients[0].hash && item.props === gradients[0].props), "HasMW pixel gradient differs between template and clones");
    const checks = await page.evaluate(async () => {
      const canvas = uiPreview.rendered.canvas, rules = uiPreview.rules, pets = t("Pet.csv").rows;
      const binding = initCollectionPreview(uiPreview.screen, rules, uiPreview.rendered, { passive: true, onUpdate: () => {} });
      const child = (root, name) => [...root.children].find(el => el.dataset.uiName === name);
      const panel = canvas.querySelector('[data-ui-name="PetDetails"]');
      const detail = canvas.querySelector('[data-ui-path="PetsCollection/Container/PetDetails/Pet"]');
      const details = [];
      collectionPreview.mode = "all";
      for (const pet of pets.filter(pet => rules.obtain.byPetId[pet.ID] && !(Number(pet.ID) > rules.petFilter.luckyBoxStart && Number(pet.ID) <= rules.petFilter.luckyBoxStart + rules.petFilter.luckyBoxCount))) {
        collectionPreview.selected = pet; binding.refresh();
        details.push({ id: pet.ID, color: child(detail, "Rarity").dataset.uiRuntimeColor, expectedColor: rules.rarityColors.values[pet.Rarity].value,
          obtain: panel.dataset.uiObtainKind, expectedObtain: rules.obtain.byPetId[pet.ID].kind });
      }
      collectionPreview.mode = "none";
      binding.refresh();
      const unowned = { actual: child(detail, "Rarity").dataset.uiRuntimeColor, expected: rules.unowned.tint };
      const recipes = [];
      for (const [id, recipe] of Object.entries(rules.recipe.byPetId)) {
        collectionPreview.selected = pets.find(pet => pet.ID === id); binding.refresh();
        const root = canvas.querySelector('[data-ui-name="Recipe"]');
        const items = [...root.children].filter(el => el.dataset.uiName === "Pet");
        await Promise.all(items.map(item => child(item, "Thumbnail").querySelector("img").decode()));
        recipes.push({ id, visible: !root.classList.contains("ui-inactive"), boundary: recipe.anyRarity !== recipe.previousRarity,
          items: items.map((item, index) => {
            const thumbnail = child(item, "Thumbnail"), specific = index === 1 && recipe.secondIsSpecific;
            return { sprite: thumbnail.dataset.uiRuntimeSpriteKey, expectedSprite: specific ? s.data.visualAssets.petIcons[recipe.previousPetId] : rules.recipe.iconSpriteKeys[recipe.thumbnailKey],
              name: child(item, "Name").textContent, expectedName: specific ? uiTranslate(pets.find(pet => pet.ID === recipe.previousPetId).Name) : uiTranslate("ANY_RARITY", [uiTranslate(`RARITY_${recipe.anyRarity}`)]),
              color: child(item, "Rarity").dataset.uiRuntimeColor, expectedColor: rules.rarityColors.values[specific ? recipe.previousRarity : recipe.anyRarity].value,
              imageWidth: thumbnail.querySelector("img").naturalWidth };
          }) });
      }
      const events = [];
      for (const name of ["MRFOOTBALL", "DRAGON", "PEGASUS"]) {
        collectionPreview.selected = pets.find(pet => pet.Name === name); binding.refresh();
        events.push({ name, kind: panel.dataset.uiObtainKind,
          text: canvas.querySelector('[data-ui-path="PetsCollection/Container/UnlockObtain/Label"]').textContent,
          expected: `${uiTranslate("HUD_OBTAIN_BY")} ${uiTranslate("HUD_EVENT")}`,
          sprite: canvas.querySelector('[data-ui-path="PetsCollection/Container/UnlockObtain/Icon"]').dataset.uiSpriteKey,
          expectedSprite: rules.obtain.iconSpriteKeys.event });
      }
      return { details, unowned, recipes, events };
    });
    for (const detail of checks.details) { assert.equal(detail.color, detail.expectedColor, detail.id); assert.equal(detail.obtain, detail.expectedObtain, detail.id); }
    assert.equal(checks.unowned.actual, checks.unowned.expected);
    assert.ok(checks.recipes.length > 0);
    for (const recipe of checks.recipes) {
      assert.ok(recipe.visible, recipe.id);
      for (const item of recipe.items) {
        assert.ok(item.imageWidth > 0 && item.expectedSprite, `Recipe image absent: ${recipe.id}`);
        assert.equal(item.sprite, item.expectedSprite, `Recipe sprite: ${recipe.id}`);
        assert.equal(item.name, item.expectedName, `Recipe name: ${recipe.id}`);
        assert.equal(item.color, item.expectedColor, `Recipe rarity: ${recipe.id}`);
      }
    }
    for (const event of checks.events) { assert.equal(event.kind, "event", event.name); assert.equal(event.text, event.expected, event.name); assert.equal(event.sprite, event.expectedSprite, event.name); }
    // Verify rendered pixels, not only the runtime color metadata, for all
    // rarity strips on the large detail pet.
    const rarities = await page.evaluate(() => Object.keys(uiPreview.rules.rarityColors.values));
    await page.evaluate(() => { window.collectionAuditBinding = initCollectionPreview(uiPreview.screen, uiPreview.rules, uiPreview.rendered, { passive: true, onUpdate: () => {} }); });
    for (const rarity of rarities) {
      const expectedColor = await page.evaluate(rarity => {
        collectionPreview.mode = "all";
        collectionPreview.selected = t("Pet.csv").rows.find(pet => pet.Rarity === rarity);
        window.collectionAuditBinding.refresh();
        return uiPreview.rules.rarityColors.values[rarity].value;
      }, rarity);
      await page.waitForFunction(expected => {
        const image = document.querySelector('[data-ui-path="PetsCollection/Container/PetDetails/Pet/Rarity"] img');
        if (!image.complete || !image.naturalWidth) return false;
        const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d"); context.drawImage(image, 0, 0);
        const actual = context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
        return [0, 1, 2].every(index => actual[index] === parseInt(expected.slice(1 + index * 2, 3 + index * 2), 16));
      }, expectedColor);
    }
    assert.deepEqual(errors, []);
    return { cloneGradientCount: gradients.length, sameClonePixels: true, detailPetsChecked: checks.details.length,
      recipesChecked: checks.recipes.length, rarityBoundaryRecipes: checks.recipes.filter(recipe => recipe.boundary).length,
      eventPets: checks.events.map(event => event.name), unownedDetailTint: checks.unowned.actual, rarityPixelChecks: rarities.length };
  } finally { await page.close(); }
}
