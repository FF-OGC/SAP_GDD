Object.assign(pages, { chase: "Guarantee theo ngày" });
let chaseData = null;

function chasePage() {
  return head("TOP PRIZE · CHASE PITY", "Guarantee theo ngày", "Trần tỷ lệ mỗi lượt khi tích pity từ 0, dùng đủ quota mỗi ngày và chưa trúng Chase. Ngày ở đây là ngày tích pity qua mốc GMT, độc lập cycle Day 1–7.", pill("Đối chiếu config + runtime", "mint")) +
    '<div id="chase-data" aria-live="polite"><div class="empty">Đang tải dữ liệu…</div></div>';
}

async function updateChasePage() {
  const target = document.getElementById("chase-data");
  try {
    if (!chaseData) {
      const response = await fetch("./data/chase.json");
      if (!response.ok) throw new Error("HTTP " + response.status);
      chaseData = await response.json();
    }
    if (s.page !== "chase" || !target.isConnected) return;
    const d = chaseData;
    const pct = value => (value * 100).toLocaleString("vi-VN", { maximumFractionDigits: 5 }) + "%";
    const names = { DIG: "Dig", FISH: "Fish", BOX: "Lucky Box" };
    const conditions = {
      DIG: "Mash thành công, spot Mythic, không ra rương; chỉ nhánh pet mới gọi Chase.",
      FISH: "Roll pet lên cần sau khi loại nhánh rương; tính shot ngay lúc roll, không chờ nhận pet.",
      BOX: "Mở box pet ID " + d.limited.sourceBoxPetId + ". Limited roll trước Chase; Limited trúng dùng quota ngày nếu còn nhưng giữ pity."
    };
    target.innerHTML = note("Max tỷ lệ mỗi lượt ≠ xác suất trúng trong ngày", "Các con số là trần pity có thể đạt cuối ngày, có điều kiện đủ lượt hợp lệ và chưa hit Chase. Không phải tỷ lệ cho mọi lần Dig/cast, xác suất cộng dồn hay cam kết chắc chắn nhận pet. Chưa có số lượt chơi để tính xác suất ít nhất một pet/ngày.", "ChaseManager.RollChase · ChaseConfigs.GetChaseChance", "info") +
      '<section class="kpi-grid">' + d.channels.map(c => {
        const last = c.days.at(-1);
        return kpi(names[c.key] + " · " + c.petName, pct(last.chance), "Trần Chase từ ngày " + c.plateauDay + " · " + c.shotsPerDay + " lượt tăng pity/ngày" + (c.enabled ? "" : " · ĐANG TẮT"));
      }).join("") + kpi("Limited · " + d.limited.petName + " #" + d.limited.petId, pct(d.channels.find(c => c.key === "BOX").enabled ? d.limited.chance : 0), "Mỗi lần mở box nguồn · trước nhánh Chase") + '</section>' +
      d.channels.map(c => {
        const pet = t("Pet.csv").rows.find(row => Number(row.ID) === c.petId);
        const isBox = c.key === "BOX";
        const rows = c.days.map(row => '<tr><td>' + (row.day > c.plateauDay ? "Ngày " + row.day + " · giữ trần" : "Ngày " + row.day) + '</td><td class="num">' + row.shots + '</td><td class="num">' + row.effectiveShot + '</td><td class="num">' + pct(row.chance) + '</td>' + (isBox ? '<td class="num">' + pct(row.chasePerOpen) + '</td><td class="num">' + pct(row.eitherPerOpen) + '</td>' : '') + '</tr>').join("");
        return panel(names[c.key] + " · " + c.petName + " #" + c.petId, conditions[c.key],
          (pet ? '<div class="pet-name-cell">' + petImageHtml(pet) + rarity(pet.Rarity) + '</div>' : '') +
          '<div class="inline-note">' + (c.enabled ? "Đang bật" : "Đang tắt") + ' · p(n) = clamp(' + esc(c.step) + ' × (min(n, ' + c.maxShot + ') − 1)^' + c.power + ', ' + c.minChance + ', ' + c.maxChance + '). Shot 1 = 0%.</div>' +
          '<div class="table-wrap"><table><thead><tr><th>Ngày tích pity</th><th class="num">Pity tối đa nếu chưa hit</th><th class="num">n dùng tính p</th><th class="num">Max Chase / lượt gọi</th>' + (isBox ? '<th class="num">Max ' + esc(c.petName) + ' / mở box¹</th><th class="num">Max Chase hoặc Limited / box¹</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
          (isBox ? '<p class="inline-note">¹ Chase / box = (1 − p Limited) × p Chase; tổng hai nhánh = p Limited + (1 − p Limited) × p Chase. Đây là trần với lịch sử không hit; Limited có thể làm chậm tích pity vì dùng quota ngày.</p>' : '') +
          (c.poolLeaks.length ? note("Pet đặc biệt còn weight dương trong pool thường", "Có " + c.poolLeaks.length + " dòng chưa zero. Pet có thể xuất hiện qua pool fallback; bảng chỉ tính nhánh Chase/Limited, chưa cộng xác suất fallback.", "DigPools.csv · PoolFishing.csv · LuckyBox.csv", "review") : '<p class="inline-note">Đã kiểm tra: Chase' + (isBox ? '/Limited' : '') + ' không còn weight dương trong pool thường.</p>'));
      }).join("") +
      panel("Cách đọc counter", "Luồng hiện hành trong ChaseManager", '<p class="inline-note">Dưới quota: n = pity + 1. Hết quota: n = pity, vẫn roll và không tăng counter. Trúng Chase: pity = 0, quota đã dùng giữ nguyên; lượt kế tiếp có thể về 0%. Qua ngày GMT: reset ShotsToday, giữ pity; không chơi thì không tự tăng. MaxShot chỉ chặn chance, counter có thể tiếp tục tăng. Các kênh có counter riêng; lifecycle chưa hydrate thì không roll Chase/Limited.</p>') +
      '<details class="panel"><summary>Nguồn kiểm chứng · ' + esc(d.sourceCommit.slice(0, 12)) + '</summary><p class="inline-note">' + d.sourceFiles.map(esc).join('<br>') + '</p></details>';
  } catch (error) {
    if (target?.isConnected) target.innerHTML = note("Không tải được Chase data", error.message, "Chạy lại sync-source-data.mjs", "review");
  }
}
