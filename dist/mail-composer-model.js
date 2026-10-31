"use strict";

const mailComposerModel = (() => {
  function build(data, draft) {
    const errors = [], warnings = [], rewards = [], maps = [], ids = [], amounts = [];
    const detail = data.details.find(r => r.ID === String(draft.detailId));
    if (!detail) errors.push("Chọn mẫu tiêu đề/nội dung thư hợp lệ.");
    if (!Array.isArray(draft.rewards) || draft.rewards.length < 1 || draft.rewards.length > data.maxRewards) errors.push(`Mỗi mail cần 1–${data.maxRewards} quà.`);
    for (const [index, row] of (Array.isArray(draft.rewards) ? draft.rewards : []).entries()) {
      if (!row || typeof row !== "object") { errors.push(`Quà ${index + 1}: dữ liệu không hợp lệ.`); continue; }
      const schema = data.types.find(t => t.name === row.type), prefix = `Quà ${index + 1}: `;
      if (!schema) { errors.push(prefix + "loại quà chưa được hỗ trợ bởi luồng claim mail."); continue; }
      let amount = Number(row.amount), values = {}, icon, rarity, mutationIcon, weatherIcons = [];
      if (!Number.isSafeInteger(amount) || amount <= 0) errors.push(prefix + "số lượng phải là số nguyên dương.");
      if (["scalar", "hours"].includes(schema.kind)) values[schema.valueKey] = amount;
      if (schema.kind === "money") {
        const value = Number(row.moneyValue), unit = Number(row.moneyUnit), scaled = Math.round(value * 10);
        if (!Number.isFinite(value) || value <= 0 || value > 999.9 || Math.abs(value * 10 - scaled) > 1e-8 || !(String(unit) in data.suffixes) || (unit === 1 && scaled % 10 !== 0)) errors.push(prefix + "Money cần 0–999.9, tối đa 1 số thập phân; đơn vị cơ bản phải là số nguyên.");
        amount = unit * 10000 + scaled; values[schema.valueKey] = amount;
      }
      if (schema.kind === "pet" || schema.kind === "random") {
        const mutation = data.mutations.find(r => r.ID === String(row.mutationId));
        if (!mutation) errors.push(prefix + "chọn đột biến hợp lệ.");
        values[data.valueKeys.PetMutation] = Number(row.mutationId);
        mutationIcon = mutation?.ID === "1" ? null : mutation?.icon;
        if (schema.kind === "pet") {
          const pet = data.pets.find(p => p.ID === String(row.value));
          if (!pet) errors.push(prefix + "chọn pet hợp lệ.");
          values[data.valueKeys.PetId] = Number(row.value);
          const weatherIds = row.weathers || [];
          if (new Set(weatherIds).size !== weatherIds.length || weatherIds.length > 5 || weatherIds.some(id => !data.weathers.some(w => w.ID === String(id)))) errors.push(prefix + "chọn tối đa 5 thời tiết khác nhau.");
          values[data.valueKeys.PetWeathers] = weatherIds.join(",");
          weatherIcons = weatherIds.map(id => data.weathers.find(w => w.ID === String(id))?.icon);
          icon = pet?.icon; rarity = pet?.Rarity;
          if (!icon) warnings.push(prefix + "chưa có ảnh pet trong snapshot GDD.");
        } else {
          if (!data.rarities.includes(row.rarity)) errors.push(prefix + "chọn độ hiếm hợp lệ.");
          if (amount !== 1) errors.push(prefix + "RandomPet chỉ cấp 1 pet/mục theo code hiện tại; thêm mục quà để cấp nhiều pet.");
          values[data.valueKeys.PetRarity] = row.rarity;
          rarity = row.rarity; icon = data.randomIcons?.[row.rarity];
          if (!icon) warnings.push(prefix + "chưa có ảnh summon của độ hiếm này; việc roll pet phụ thuộc pool/Rebirth trong game.");
        }
      }
      if (schema.kind === "mutagen" || schema.kind === "weatherGen") {
        const list = schema.kind === "mutagen" ? data.mutagens : data.weatherGens;
        const config = list.find(r => r.ID === String(row.value));
        if (!config) errors.push(prefix + "chọn ID vật phẩm hợp lệ.");
        values[schema.valueKey] = Number(row.value);
        icon = schema.kind === "mutagen" ? data.mutations.find(m => m.ID === config?.Mutation)?.icon : data.weathers.find(w => w.ID === config?.WeatherEffect)?.icon;
        // ItemConfigs.GetItemRarityColorV2 uses ITEM_RARITY, not config.Rarity.
        if (schema.kind === "weatherGen") warnings.push(prefix + "WeatherGen: parser giữ Value dưới dạng chuỗi; cast sang int chưa được kiểm trong game.");
      }
      ids.push(schema.id); amounts.push(amount);
      maps.push("{" + Object.entries(values).sort(([a], [b]) => Number(a) - Number(b)).map(([key, value]) => `${key}:${value}`).join(";") + "}");
      rewards.push({ type: schema.name, amount, icon, rarity, petId: schema.kind === "pet" ? String(row.value) : undefined, mutationIcon, weatherIcons, badge: null });
    }
    if (errors.length) return { valid: false, errors, warnings, fields: null, mail: null };
    // Adjacent maps survive the outer mail parser. A semicolon between maps
    // would be treated as another mail-level field by JsonStringToKeyValueV3.
    if (maps.length > 1) warnings.push("RV xuất các map liền nhau để parser nhận đủ quà. Source lưu mail lại dùng dấu ; giữa map; cần kiểm trong game sau khi lưu/tải lại, nhất là quà có Value.");
    const fields = { IsConfig: String(data.isConfig), GiftId: String(draft.detailId), RewardTypes: ids.join(","), RewardValues: maps.join(""), RewardAmounts: amounts.join(",") };
    return { valid: true, errors, warnings, fields, mail: { id: "composed", detailId: String(draft.detailId), daysLeft: data.maxValidDays, rewards }, text: Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n") };
  }
  return { build };
})();
if (typeof module !== "undefined") module.exports = mailComposerModel;
