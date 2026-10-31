# Trích template Activities vào UI Components (2026-10-31)

Theo yêu cầu người dùng, mở rộng thư viện UI Components từ snapshot Activities
đã có trong GDD. Không đọc thêm game, không đổi Preview/Proposal và không đăng
ký Activities trong Proposal. Một thay đổi logic, một commit local:
`feat(ui): extract activities component templates`.

Catalog 11 thành phần:

| ID | Thành phần |
|---|---|
| activities-tab-button | Nút tab và alert |
| activities-tab-bar | Nhóm tab |
| activities-reward-card | Thẻ quà đăng nhập thường |
| activities-featured-reward | Thẻ quà lớn ngày cuối |
| activities-reward-item | Ô thưởng, rarity, số lượng, mask |
| activities-claim-button | Nút nhận, biến thể hình ảnh claimable |
| activities-mission-row | Dòng nhiệm vụ, hai ô thưởng, progress/claimed |
| activities-points-counter | Bộ đếm Pet Points |
| activities-milestone | Mốc thưởng, tooltip/claim/mask theo subtree |
| activities-milestone-bar | Thanh điểm tổng; nền màu tạm có khai báo |
| activities-spin-wheel | Wheel 8 ô theo vị trí/góc nguồn |

Định nghĩa có sourceScreen=activities. Các slot/override dùng sourceId bên
cạnh path để không nhầm hai Reward cùng tên. Validator từ chối path mơ hồ,
ID sai, nguồn ngoài Collection/Activities, fallback không có sprite lib thiếu.
Tất cả định nghĩa được validate trước lần ghi đầu tiên.

UI Components tải manifest/i18n theo từng màn hình, có bộ lọc nguồn. Thư viện
đã có 16 component Collection giữ nguyên payload. Component Activities tự fit
cả phần con nhô khỏi rect gốc (mốc thưởng, góc wheel); không đổi rect entity.
Không gọi binder, không cấp quà, không quay ngẫu nhiên. State chỉ áp các field
đã khai báo, không tự nhận là mô phỏng đủ mọi gradient/animation runtime.

Template copy vẫn là op:add, không thêm metadata trái schema vào op. Khi tái
dùng phải chọn parent/ID và đăng ký sprite trong manifest đích. QA xác nhận
shape/semantic bằng validator Proposal trên base Collection biệt lập và hợp
manifest trong bộ nhớ; không ghi bất kỳ Proposal nào. Export không chứa màu
nền tạm của milestone bar và vẫn liệt kê sprite lib bị bỏ qua.

Kiểm tra:

```powershell
node tools/sync-ui-components.mjs
node tools/audit-ui-components.mjs
node tools/audit-ui-components-browser.mjs http://localhost:8080 --components-only
node tools/audit-ui-activities-components.mjs http://localhost:8080
```

Browser cần NODE_PATH của bundled runtime trong README. Kiểm toàn bộ catalog
ở 1440×1100/390×844: source rect/sprite, state, slot, instance isolation,
clipboard, export validation, filter/deep-link và không scroll ngang.
So hash các snapshot Preview/Proposal và 16 payload Collection trước/sau.
