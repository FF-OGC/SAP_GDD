"use strict";

const eventPages = {
  revival: {
    title: "Revival", description: "Điều kiện tham gia, nhiệm vụ và phần thưởng theo Rebirth khi quay lại.",
    metrics: [["NGÀY VẮNG MẶT", "Inactive days", "Điều kiện quay lại"], ["REBIRTH TỐI THIỂU", "Minimum return RB", "Rebirth khi bắt đầu"], ["THỜI LƯỢNG", "Event days", "Số ngày của event"], ["TRẦN ĐIỂM", "Daily points cap", "Điểm mỗi ngày"]]
  },
  snowball: {
    title: "Snowball", description: "Config lăn cầu tuyết, Event Token và phần thưởng sau trần điểm.",
    metrics: [["COOLDOWN", "launchCooldown", "Giây giữa các lượt"], ["TRẦN ĐIỂM", "dailyPointCap", "Event Token mỗi ngày"], ["ĐIỂM LĂN TỐI ĐA", "maxRollPoints", "Event Token mỗi lượt"], ["BÁN KÍNH TỐI ĐA", "maxRadius", "Kích cỡ lớn nhất"]]
  },
  fishing: {
    title: "Fishing", description: "Cơ chế Fishing 1.2.0, pool Gen và tốc độ indicator theo độ hiếm.",
    metrics: [["REBIRTH MỞ KHÓA", "Rebirth mở khóa", "Rebirth tối thiểu"], ["TAP CHẤM ĐIỂM", "Số tap chấm điểm", "Số tap mỗi lượt"], ["GEN TỐI ĐA", "Số Gen tối đa", "Số Gen mỗi pet"], ["COOLDOWN", "Cooldown (s)", "Giây giữa các lượt"]]
  }
};

for (const [id, event] of Object.entries(eventPages)) pages[id] = event.title;

let eventDesignData;

function eventDesignPage() {
  const event = eventPages[s.page];
  return head("NỘI DUNG CẤU HÌNH · " + event.title.toUpperCase(), event.title, event.description, pill("Snapshot từ Sheet", "mint")) +
    '<div id="event-design-data"><div class="loading-state"><span class="loader"></span><span>Đang đọc dữ liệu event.</span></div></div>';
}

function renderEventSection(section, source) {
  const headings = section.headers.map(label => '<th scope="col">' + esc(label) + '</th>').join("");
  const rows = section.rows.map(row => '<tr>' +
    section.headers.map((_, index) => '<td>' + esc(row[index] ?? "–") + '</td>').join("") +
    '</tr>').join("");
  return panel(section.title, source,
    '<div class="table-wrap"><table class="system-data-table"><thead><tr>' + headings +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="table-foot"><span>' + section.rows.length + ' dòng</span></div>');
}

async function updateEventDesignPage(page) {
  const target = document.getElementById("event-design-data");
  try {
    eventDesignData ||= await fetch("./data/event-design.json").then(response => {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
    const sources = eventDesignData[page];
    const values = new Map(sources[0].sections[0].rows.map(([key, value]) => [key, value]));
    const summary = eventPages[page].metrics.map(([label, key, detail]) =>
      kpi(label, values.get(key) ?? "–", detail)).join("");
    target.innerHTML = '<section class="kpi-grid">' + summary + '</section>' + sources.map(source => {
      const notes = source.notes.map(line => '<div class="inline-note">' + esc(line) + '</div>').join("");
      const links = '<a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">Mở tab nguồn</a>' +
        (source.example ? '<a href="' + esc(source.example) + '" target="_blank" rel="noopener noreferrer">Mở prototype</a>' : "");
      return source.sections.map(section =>
        '<div class="system-data-panel">' + renderEventSection(section, source.tab) + '</div>').join("") +
        '<div class="system-footnote-panel">' + panel("Nguồn · " + source.tab, "", notes +
          '<div class="table-foot">' + links + '</div>') + '</div>';
    }).join("");
  } catch (error) {
    target.innerHTML = note("Không đọc được dữ liệu event", error.message, "data/event-design.json");
  }
}
