"use strict";

async function initMailComposer(controller, token) {
  const host = document.getElementById("mail-composer");
  try {
    const data = await fetchUiResource("./data/ui/mail-composer.json").then(checkUiJson);
    if (uiPreview.loadToken !== token || s.page !== "uipreview" || uiPreview.screenId !== "mail") return;
    let nextId = 2, preview = false;
    const defaults = type => ({ type, amount: "1", value: data.pets[0]?.ID || "", mutationId: "1", weathers: [], rarity: data.rarities[0], moneyValue: "10", moneyUnit: "3" });
    let draft = { detailId: data.details[0].ID, rewards: [{ ...defaults("PetCoin"), amount: "10" }, { ...defaults("Dust"), amount: "500" }] };
    try { const saved = JSON.parse(localStorage.getItem("mailComposerDraft")); if (saved?.version === 1 && Array.isArray(saved.rewards) && saved.rewards.length <= data.maxRewards && saved.rewards.every(r => r && data.types.some(t => t.name === r.type))) draft = saved; } catch {}
    draft.rewards.forEach(row => row.editorId = nextId++);
    host.hidden = false;
    host.innerHTML = `<div class="section-heading"><div><p class="eyebrow">CÔNG CỤ MÔ PHỎNG</p><h2>Soạn quà → GMT Mails Manager</h2><p>Chọn tối đa ${data.maxRewards} quà. Field GMT cập nhật tự động; bạn tự gửi mail trong GMT.</p></div></div>
      <div class="mail-composer-columns"><div><label class="mail-composer-label">Mẫu tiêu đề / nội dung <select id="mail-compose-detail">${data.details.map(d => `<option value="${esc(d.ID)}" ${d.ID === draft.detailId ? "selected" : ""}>${esc(d.ID)} · ${esc(uiTranslate(d.Title))}</option>`).join("")}</select></label><p class="mail-composer-hint">IsConfig = 0: ô Gift ID trong GMT dùng ID mẫu nội dung thư, không phải Giftcode.</p><div id="mail-compose-rows"></div><div class="mail-composer-actions"><button type="button" id="mail-compose-add">+ Thêm quà</button><span id="mail-compose-count"></span></div></div>
      <div class="mail-composer-output"><h3>Field cần điền trong GMT</h3><p>Map Code: chọn đúng region trong GMT. UUID: nhập UID người nhận trong GMT.</p><div id="mail-compose-errors" role="alert"></div><div id="mail-compose-fields"></div><div class="mail-composer-actions"><button type="button" id="mail-compose-copy">Sao chép tất cả field</button><button type="button" id="mail-compose-preview">Mô phỏng trên Mail</button></div><p id="mail-compose-status" role="status" aria-live="polite"></p><div id="mail-compose-warnings"></div><details><summary>Cách dùng và giới hạn từ source</summary><p>Dán các field vào GMT Mails Manager, chọn <b>Update Pending Mails</b>. GMT tự điền thời gian tạo thư. Không dùng Update Mails cũ cho luồng này.</p><p>Giữ nguyên thứ tự RT/RV/RA. Mỗi quà cần một map RV, kể cả Coin/Dust. Các map RV viết liền nhau (không có dấu ; giữa quà); dấu ; chỉ ngăn key trong cùng map. Đây không phải JSON chuẩn.</p><p>Money xuất rank score vào RA, không phải số tiền thô. Money theo giờ dùng giờ nguyên. RandomPet chỉ cấp một pet/mục; thêm mục khác nếu cần nhiều pet. Các loại chưa có nhánh cấp thưởng thực thi không được liệt kê.</p><p>Thư thật chưa được gửi/chạy thử trong game. Mô phỏng không cấp thưởng hoặc ghi database.</p><p>Nguồn: ${esc(data.bindings.gmt)} · ${esc(data.bindings.parse)} · ${esc(data.bindings.claim)}</p></details></div></div>`;
    const rowsHost = host.querySelector("#mail-compose-rows");
    const options = (rows, value, label) => rows.map(r => `<option value="${esc(String(r.ID))}" ${String(r.ID) === String(value) ? "selected" : ""}>${esc(label(r))}</option>`).join("");
    function renderRows() {
      rowsHost.innerHTML = draft.rewards.map((row, i) => {
        const schema = data.types.find(t => t.name === row.type), id = row.editorId;
        let extra = "";
        const field = (label, html) => `<label>${label}${html}</label>`;
        const select = (name, html) => `<select data-field="${name}">${html}</select>`;
        if (schema?.kind === "money") extra = field("Giá trị Money", `<input data-field="moneyValue" type="number" min="0.1" max="999.9" step="0.1" value="${esc(row.moneyValue)}">`) + field("Đơn vị Money", select("moneyUnit", Object.entries(data.suffixes).map(([id, text]) => `<option value="${id}" ${String(row.moneyUnit) === id ? "selected" : ""}>${esc(text || "Cơ bản")}</option>`).join("")));
        else extra = field(schema?.kind === "hours" ? "Số giờ (nguyên)" : "Số lượng", `<input data-field="amount" type="number" min="1" step="1" value="${esc(String(row.amount))}" ${schema?.kind === "random" ? "readonly" : ""}>`);
        if (schema?.kind === "pet") extra += field("Pet", select("value", options(data.pets, row.value, r => `${r.ID} · ${r.label} · ${r.Rarity}`)));
        if (schema?.kind === "random") extra += field("Độ hiếm", select("rarity", data.rarities.map(r => `<option ${r === row.rarity ? "selected" : ""}>${esc(r)}</option>`).join(""))) + '<p class="mail-composer-hint">Source hiện chỉ cấp 1 pet/mục quà.</p>';
        if (["pet", "random"].includes(schema?.kind)) extra += field("Đột biến", select("mutationId", options(data.mutations, row.mutationId, r => `${r.ID} · ${r.Name}`)));
        if (schema?.kind === "pet") extra += `<fieldset class="mail-composer-weathers"><legend>Thời tiết (tối đa 5)</legend>${data.weathers.map(w => `<label><input type="checkbox" data-weather="${esc(w.ID)}" ${(row.weathers || []).includes(w.ID) ? "checked" : ""}> ${esc(w.Name)}</label>`).join("")}</fieldset>`;
        if (schema?.kind === "mutagen") extra += field("Loại tinh chất", select("value", options(data.mutagens, row.value, r => `${r.ID} · ${data.mutations.find(m => m.ID === r.Mutation)?.Name || "?"} · ${r.Rarity}`)));
        if (schema?.kind === "weatherGen") extra += field("Máy tạo thời tiết", select("value", options(data.weatherGens, row.value, r => `${r.ID} · ${data.weathers.find(w => w.ID === r.WeatherEffect)?.Name || "?"} · ${r.Rarity}`)));
        return `<fieldset data-reward-editor="${id}" class="mail-composer-reward"><legend>Quà ${i + 1}</legend><div class="mail-composer-row-head"><label>Loại quà<select data-field="type">${data.types.map(t => `<option value="${t.name}" ${row.type === t.name ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select></label><button type="button" data-remove="${id}" aria-label="Xóa quà ${i + 1}">Xóa</button></div><div class="mail-composer-inputs">${extra}</div></fieldset>`;
      }).join("");
    }
    let current;
    function update() {
      current = mailComposerModel.build(data, draft);
      try { localStorage.setItem("mailComposerDraft", JSON.stringify({ ...draft, version: 1 })); } catch {}
      host.querySelector("#mail-compose-count").textContent = `${draft.rewards.length}/${data.maxRewards} quà`;
      host.querySelector("#mail-compose-add").disabled = draft.rewards.length >= data.maxRewards;
      host.querySelector("#mail-compose-copy").disabled = host.querySelector("#mail-compose-preview").disabled = !current.valid;
      host.querySelector("#mail-compose-errors").replaceChildren(...current.errors.map(message => { const p = document.createElement("p"); p.textContent = message; return p; }));
      host.querySelector("#mail-compose-warnings").replaceChildren(...current.warnings.map(message => { const p = document.createElement("p"); p.textContent = message; return p; }));
      const fields = host.querySelector("#mail-compose-fields");
      if (!fields.children.length) fields.innerHTML = ["IsConfig", "GiftId", "RewardTypes", "RewardValues", "RewardAmounts"].map(name => `<div class="mail-composer-field"><label>${name === "GiftId" ? "Gift ID / MailDetails ID" : name}<textarea rows="${name === "RewardValues" ? 3 : 1}" readonly data-gmt-field="${name}" aria-label="${name}"></textarea></label><button type="button" data-copy="${name}" aria-label="Sao chép ${name}">Sao chép</button></div>`).join("");
      for (const field of fields.querySelectorAll("textarea")) field.value = current.fields?.[field.dataset.gmtField] || "";
      for (const button of fields.querySelectorAll("button")) button.disabled = !current.valid;
      host.querySelector("#mail-compose-status").textContent = !current.valid ? "Chưa có field hợp lệ để sao chép hoặc mô phỏng." : preview ? "Canvas đang hiển thị mail tự soạn, cập nhật theo các lựa chọn trên." : "Field đã sẵn sàng. Bấm Mô phỏng trên Mail để xem phần thưởng trong canvas.";
      if (preview) controller.setSimulatedMail(current.valid ? current.mail : null, data);
    }
    function change(event) {
      const editor = event.target.closest("[data-reward-editor]");
      if (event.target.id === "mail-compose-detail") draft.detailId = event.target.value;
      else if (editor) {
        const row = draft.rewards.find(r => r.editorId === Number(editor.dataset.rewardEditor)), name = event.target.dataset.field;
        if (name === "type") {
          const type = event.target.value, id = row.editorId; Object.assign(row, defaults(type), { editorId: id });
          if (type === "Mutagen") row.value = data.mutagens[0].ID;
          if (type === "WeatherGen") row.value = data.weatherGens[0].ID;
          renderRows();
        } else if (name) row[name] = event.target.value;
        else if (event.target.dataset.weather) row.weathers = [...editor.querySelectorAll("[data-weather]:checked")].map(el => el.dataset.weather);
      } else return;
      update();
    }
    host.oninput = event => { if (event.target.tagName === "INPUT" && event.target.type !== "checkbox") change(event); };
    host.onchange = event => { if (event.target.tagName !== "INPUT" || event.target.type === "checkbox") change(event); };
    host.onclick = async event => {
      const button = event.target.closest("button"); if (!button) return;
      if (button.id === "mail-compose-add" && draft.rewards.length < data.maxRewards) { draft.rewards.push({ ...defaults("PetCoin"), editorId: nextId++ }); renderRows(); update(); }
      else if (button.dataset.remove) { draft.rewards = draft.rewards.filter(r => r.editorId !== Number(button.dataset.remove)); renderRows(); update(); }
      else if (button.id === "mail-compose-preview" && current.valid) { preview = true; update(); }
      else if ((button.dataset.copy || button.id === "mail-compose-copy") && current.valid) {
        try { await navigator.clipboard.writeText(button.dataset.copy ? current.fields[button.dataset.copy] : current.text); if (uiPreview.loadToken === token) host.querySelector("#mail-compose-status").textContent = "Đã sao chép " + (button.dataset.copy || "tất cả field") + "."; }
        catch { if (uiPreview.loadToken === token) host.querySelector("#mail-compose-status").textContent = "Trình duyệt chưa cho phép clipboard. Chọn và sao chép trực tiếp trong ô field."; }
      }
    };
    renderRows(); update();
  } catch (error) {
    if (uiPreview.loadToken !== token) return;
    host.hidden = false; host.textContent = "Không tải được công cụ soạn Mail: " + error.message;
  }
}
