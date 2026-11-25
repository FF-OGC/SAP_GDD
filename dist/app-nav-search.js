(() => {
  const input = document.getElementById('nav-search-input');
  const status = document.getElementById('nav-search-status');
  const sidebar = document.getElementById('sidebar');
  const items = [...sidebar.querySelectorAll('.nav-item')];
  const groups = [...sidebar.querySelectorAll('.nav-list')];
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const aliases = {
    overview: 'tổng quan', progression: 'tiến trình tái sinh rebirth',
    economy: 'kinh tế cân bằng danh sách pet', cadence: 'nhịp thế giới thời tiết sự kiện',
    spawn: 'sinh pet', config: 'cấu hình dữ liệu', changes: 'thay đổi gần đây',
    rewardid: 'quà phần thưởng mã id', shop: 'cửa hàng', missions: 'nhiệm vụ',
    chase: 'bảo đảm bảo hiểm pity chase', pools: 'bể pool phần thưởng',
    weatherdrop: 'thời tiết', luckybox: 'hộp may mắn',
    uipreview: 'xem trước giao diện', uiproposal: 'đề xuất giao diện',
    uicomponents: 'thành phần giao diện'
  };
  function filter() {
    const words = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const item of items) {
      const text = normalize(item.textContent + ' ' + item.dataset.page + ' ' + (aliases[item.dataset.page] || ''));
      item.hidden = !words.every(word => text.includes(word));
      if (!item.hidden) count++;
    }
    for (const group of groups) {
      group.hidden = ![...group.querySelectorAll('.nav-item')].some(item => !item.hidden);
      if (group.previousElementSibling?.classList.contains('nav-label')) group.previousElementSibling.hidden = group.hidden;
    }
    status.textContent = words.length ? (count ? `${count} đề mục · Enter để mở` : 'Không tìm thấy đề mục phù hợp.') : '';
  }
  input.addEventListener('input', filter);
  input.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      input.value = ''; filter();
    }
    if (event.key === 'Enter') {
      const first = items.find(item => !item.hidden);
      if (!first || !s.data) return;
      event.preventDefault();
      first.click();
      document.getElementById('content').focus();
    }
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); sidebar.classList.add('open'); input.focus(); input.select();
    }
  });
})();
