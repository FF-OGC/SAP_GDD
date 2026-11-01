"use strict";
const rewardIdModel = (() => {
  const fixed = [1,2,4,5], integers = [3,7,8,9,10,16,17];
  function encode(data, draft = {}) {
    const errors = [], warnings = [], fieldErrors = {};
    const fail = (field, message) => { errors.push(message); (fieldErrors[field] ||= []).push(message); };
    const type = Number(draft.type), amount = Number(draft.amount);
    const schema = data.types.find(t => t.id === type);
    if (!schema) fail('type','Type: chưa có chuẩn ID.');
    if (fixed.includes(type) && amount !== 1) fail('amount','Amount: Quantity cố định bằng 1; thêm mục quà để cấp nhiều.');
    let tail = '', value = '', quantity = 1, csvAllowed = true;
    const display = { name:schema?.label || 'chưa có dữ liệu', type, value:String(draft.value ?? ''), mutationId:String(draft.mutationId ?? '1'), weatherId:String(draft.weatherId ?? '0'), rarity:draft.rarity };
    const pad = (raw, width, field) => { const n = Number(raw); if (String(raw ?? '').trim() === '' || !Number.isInteger(n) || n < 0 || n >= 10 ** width) { fail(field, `${field}: cần số nguyên từ 0 đến ${10 ** width - 1}.`); return ''; } return String(n).padStart(width,'0'); };
    const catalog = (name, id, field) => { const r = data[name].find(r => r.ID === String(id)); if (!r) fail(field, `${field}: chọn ID hợp lệ.`); return r; };
    if (integers.includes(type)) {
      if (String(draft.amount ?? '').trim() === '' || !Number.isInteger(amount) || amount <= 0 || amount >= 1000000) fail('amount','Amount: cần số nguyên dương nhỏ hơn 1000000.');
      else tail = String(amount).padStart(amount < 1000 ? 3 : 6,'0');
      value = String(amount);
    }
    if ([1,4].includes(type)) {
      const mutation = catalog('mutations',draft.mutationId,'mutationId');
      const weatherId = String(draft.weatherId ?? '0');
      if (weatherId !== '0') catalog('weathers',weatherId,'weatherId');
      let first;
      if (type === 1) { const pet = catalog('pets',draft.value,'value'); first = pad(draft.value,4,'value'); display.name = pet?.Name || display.name; display.rarity = pet?.Rarity; value = `${Number(draft.value)};${Number(draft.mutationId)}`; }
      else { const rank = data.rarities[draft.rarity]; if (!rank) fail('rarity','Rarity: chọn độ hiếm hợp lệ.'); first = pad(rank,2,'rarity'); value = `${draft.rarity};${Number(draft.mutationId)}`; warnings.push('RandomPet: chưa có mẫu legacy có weather; parser config hiện chỉ đọc rarity, bỏ qua mutation.'); }
      tail = first + pad(draft.mutationId,2,'mutationId') + pad(weatherId,2,'weatherId');
      display.mutationName = mutation?.Name;
      if (weatherId !== '0') {
        if ((type === 1 && data.petWeatherSupported) || (type === 4 && data.randomWeatherSupported)) value += ';' + Number(weatherId);
        else { csvAllowed = false; warnings.push('Weather: Value chưa hỗ trợ weather; chỉ sinh ID, không sinh dòng CSV.'); }
      }
      if (type === 1) warnings.push('Pet: parser còn đọc phần thứ tư (level); hành vi Value thiếu level chưa được kiểm trong engine.');
    }
    if (type === 2 || type === 5) {
      const num = Number(type === 2 ? draft.moneyValue : draft.hours), scaled = Math.round(num * 10), field = type === 2 ? 'moneyValue' : 'hours';
      if (!Number.isFinite(num) || num < 0.1 || num > 999.9 || Math.abs(num*10-scaled)>1e-8) fail(field, `${field}: cần 0.1–999.9, tối đa 1 số thập phân.`);
      if (type === 2) {
        const unit = Number(draft.moneyUnit);
        if (!Number.isInteger(unit) || !Object.hasOwn(data.suffixes,String(unit))) fail('moneyUnit','Money: chọn hậu tố hợp lệ.');
        if (unit === 1 && scaled % 10 !== 0) fail(field,'Money: đơn vị cơ bản chỉ nhận số nguyên.');
        value = String(unit*10000+scaled); tail = pad(value,5,field); display.name = `${draft.moneyValue} ${data.suffixes[unit] || ''} Money`;
      } else { value = String(num); tail = pad(scaled,4,field); display.name = `${num} giờ MoneyTime`; }
    }
    if ([10,16].includes(type)) {
      const config = catalog(type === 10 ? 'mutagens' : 'weatherGens',draft.value,'value');
      const matches = data.rotationItems.filter(r => r.Type === (type === 10 ? '2' : '4') && r.Value === String(draft.value));
      if (!matches.length) fail('value','Vật phẩm: chưa có RSItemID.');
      else if (matches.length > 1) fail('value','Vật phẩm: có nhiều RSItemID, chưa có dữ liệu chọn chuẩn.');
      tail = pad(matches[0]?.RSItemID,5,'value') + tail; value = String(draft.value); quantity = amount;
      display.rarity = config?.Rarity;
      display.name = (type === 10 ? data.mutations.find(m=>m.ID===config?.Mutation)?.Name : data.weathers.find(w=>w.ID===config?.WeatherEffect)?.Name) || 'chưa có dữ liệu';
    }
    if (type === 8) warnings.push('DMMP: chưa có mẫu legacy; chưa xác minh cấp thưởng trong game.');
    const numericId = Number(String(type) + tail);
    if (!Number.isSafeInteger(numericId) || numericId > 2147483647 || numericId <= 0) fail('id','Reward ID: vượt int32 (2147483647).');
    const valid = errors.length === 0, id = valid ? String(numericId) : null;
    const row = valid ? { ID:id, TypeReward:String(type), Value:value, Quantity:String(quantity) } : null;
    display.amount = fixed.includes(type) ? 1 : amount;
    return { valid, errors, fieldErrors, warnings, id, csvRow:valid && csvAllowed ? [id,type,value,quantity].join(',') : null, row, display };
  }
  function key(row) {
    const type = String(row.TypeReward), parts = String(row.Value).split(';');
    if (['1','4'].includes(type)) { parts[1] = String(Number(parts[1] || 1)); if (!parts[2] || parts[2] === '0') parts[2] = ''; while (parts.at(-1) === '') parts.pop(); }
    return JSON.stringify([type, parts.join(';'), String(row.Quantity)]);
  }
  function lookup(data, result) {
    const row = result.row || result;
    const sameId = data.rewards.filter(r => String(r.ID) === String(row.ID));
    if (sameId.length) return sameId.every(r => key(r) === key(row)) ? 'exists' : 'id-conflict';
    return data.rewards.some(r => key(r) === key(row)) ? 'equivalent-other-id' : 'new';
  }
  function fromRow(row) {
    const type = Number(row.TypeReward), [value,mutationId='1',weatherId='0'] = String(row.Value).split(';');
    return { type, value, mutationId, weatherId, rarity:value, amount:fixed.includes(type)?row.Quantity:[10,16].includes(type)?row.Quantity:value, moneyUnit:Math.floor(Number(value)/10000), moneyValue:(Number(value)%10000)/10, hours:value };
  }
  return { encode, lookup, key, fromRow };
})();
if (typeof module !== 'undefined') module.exports = rewardIdModel;
