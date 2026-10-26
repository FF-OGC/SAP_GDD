# UI Components — nghiệm thu 2026-10-26

Đã triển khai trang tĩnh riêng `#uicomponents/<id>` ngay dưới UI Proposal.
Không đổi allowlist game. Không đổi renderer/helper dùng chung, Preview,
controller Collection hoặc nguồn/nội dung Proposal.

## Catalog cuối

Nguồn toàn bộ: `Assets/HUDs/PetsCollection.ui`, qua snapshot Collection
trong GDD; không đọc game từ generator mới. Có 16 component, tổng 180 node
instance (các subtree lồng nhau được đếm trong từng component).

| ID | sourcePath (.ui) | Status |
|---|---|---|
| `close-button` | `PetsCollection/Container/Title/CloseButton` | real |
| `detail-card` | `PetsCollection/Container/PetDetails/Pet` | real |
| `detail-tab-button` | `PetsCollection/Container/DetailsTabsLayout/InfoTabButton` | runtime |
| `info-row` | `PetsCollection/Container/Info/Value` | real |
| `item-cell` | `PetsCollection/Container/PetsLayout/Pet (1)` | real |
| `item-grid` | `PetsCollection/Container/PetsLayout` | real |
| `list-popup` | `PetsCollection/Container` | real |
| `pagination` | `PetsCollection/Container/PageBtns` | real |
| `popup-frame` | `PetsCollection/Container/BG` | real |
| `progress-counter` | `PetsCollection/Container/PetsCount` | real |
| `rarity-badge` | `PetsCollection/Container/PetDetails/Pet/RarityBG` | runtime |
| `scrim` | `PetsCollection/DarkBG` | real |
| `tab-bar` | `PetsCollection/Container/RarityTabsLayout` | real |
| `tab-button` | `PetsCollection/Container/RarityTabsLayout/AllTabButton` | runtime |
| `title-bar` | `PetsCollection/Container/Title` | real |
| `unlock-banner` | `PetsCollection/Container/UnlockObtain` | real |

So với plan §4:

- `popup-frame` lấy BG và decor; Container là toàn màn nên dùng làm
  `list-popup`. Title và nút đóng là subtree riêng, có quan hệ composedOf.
- `item-grid` lấy PetsLayout; PageBtns là sibling nên giữ `pagination`
  độc lập, không ghép lại tọa độ bằng HTML.
- Thêm `detail-tab-button`: kích thước/nhãn/sprite chọn khác tab rarity,
  có giá trị tái dùng. State runtime đều ghi nguồn rule snapshot.
- Bỏ `recipe-row`: hiện là công thức riêng với hai Pet trùng path; chưa có
  hợp đồng tham số tái dùng đã xác minh. Recipe vẫn nguyên vẹn trong
  subtree list-popup. Không thêm state khoá thiếu bằng chứng.
- Scrim chỉ lấy DarkBG; không gộp PreventCloseButton ở nhánh khác.
- Không lấy thành phần thưởng từ Proposal chưa duyệt. Shop/Mission được
  ghi “dự kiến”; mỗi component chỉ tính 1 màn đã dùng (Collection).

## Hợp đồng định nghĩa và template

`component.schema.json` + `tools/ui-component-definition.mjs` kiểm
sourcePath/sourceId, group, status, slots, states, usedIn, composedOf, notes.
Slot gồm name/type/path/field/default và sample tuỳ chọn; default bằng .ui,
sample ghi nhãn mẫu. Dùng lại PATCH_FIELDS/validateField của Proposal,
không tạo whitelist field thứ hai. Sprite binding chỉ dùng spriteKey
image/button mà renderer và op add đã hỗ trợ. RuleSource là pointer dấu
chấm vào collection-rules.json. Màn ngoài Collection phải planned=true.

Generator validate toàn batch và mọi đích trước khi ghi; giữ guard symlink,
không nhận --project-root; chỉ ghi dist/. Rect khung resolve bằng chính
uiRenderer.rect, vì BG có sizeDelta âm và scrim dùng anchor stretch.
Re-root chỉ thay transform gốc; mọi node con giữ nguyên đầy đủ props.
Spec lấy từ snapshot, rect cây trên web đo sau layout bằng renderer chung.
Tìm/lọc giữ thumbnail hiện có; đổi hash trong trang chỉ đổi chi tiết.

Clipboard xuất op add đúng schema/semantic validator Proposal. Slot/state
đang chọn đã áp vào entity; binding slot ghi trong reason vì schema add
không cho field slots. Root đổi tên Component_<id>; ID thêm prefix uic;
sibling trùng tên thêm ID. Sửa parent/name/ID khi chèn nhiều instance.
`templateOmitted` công khai field ngoài whitelist và sprite thiếu, không
khẳng định template xuất giữ toàn bộ gradient/shader của .ui.

## Kết quả thực chạy

- Static Components: **219 case**, 16 định nghĩa lỗi bị từ chối mà không
  ghi output; idempotent; mọi template được applyProposal chấp nhận.
  Report: `dist/data/ui/components/components-audit.json`.
- Components browser: **1440×1100 và 390×844**, mỗi viewport đủ 16
  component/180 node, rect so source sai số tối đa 0.01 đơn vị .ui (độ
  chính xác CSS số; không so sau scale), raster sprite decoded giống hệt.
  Tổng **112 lượt đổi slot, 22 lượt đổi state**, gồm slot khi đang chọn
  state. Nguồn/instance biến thể độc lập, filter/search, route thiếu,
  deep-link, outline, clipboard thành công/bị chặn đều kiểm. Mở toàn bộ
  spec khi đo: không tràn ngang, console/pageerror/HTTP error bằng 0.
  Report: `dist/data/ui/components/browser-audit.json`; ảnh browser-1440.png,
  browser-390.png cùng thư mục đã kiểm bằng mắt.
- Preview static **107/107 entity**, browser **173 pet, 214 click/viewport**,
  clone gradient, 44 recipe, 7 rarity pixel checks; console sạch.
  `dist/data/ui/collection-audit.json`, `collection-browser-audit.json`.
- Proposal static **671 case, đủ 4 proposal**. Browser chi tiết chạy fixture
  pipeline và fixture cấu trúc 108 entity, cả hai viewport, console sạch.
  Sửa phạm vi auditor (không đổi UI): kỳ vọng +4 offset/summary của fixture
  không áp lên ba phương án thưởng có layout khác.
  `dist/data/ui/proposals-audit.json`.
- Regression toàn bộ: **26/26 DOM + crop PNG SHA-256 giống hệt**, gồm
  Preview và bốn Proposal × ba mode × hai viewport. HTTP substitution các
  shell file từ Git baseline `4787ee6` (trước implementation), cùng data và
  renderer; đo cả lỗi JavaScript trước/sau. Report:
  `dist/data/ui/components/regression-audit.json` (baselineRef/crop hash).

**Giới hạn có thật:** ba phương án thưởng ở mode current đều có lỗi sẵn
`Cannot set properties of null (setting 'disabled')`. Baseline và hiện tại
cùng lỗi, cùng DOM/crop. Đã ghi DA-019; không sửa hành vi Proposal trong
phạm vi này. Không gọi toàn bộ Proposal là console sạch. Fixture pipeline
và UI Components sạch console. Chưa có ảnh/runtime game để nghiệm thu G4;
font, shader, alpha/scaler và hai sprite lib thiếu vẫn mở (DA-017/020).

## Lệnh và điều kiện QA

Đã chạy đủ sync-source-data, sync-ui-preview, sync-ui-proposals,
sync-ui-components; audit-ui-preview (static + browser), audit-ui-proposals
(static + browser fixture), audit-ui-components. Giữ nguyên dữ liệu balance
ngoài scope: khôi phục chỉ output provenance/recentCommits do lần refresh
của task tạo ra sau khi kiểm diff; không sửa dữ liệu component bằng tay.

Server cơ bản đã chạy bằng `python -m http.server 8080 --directory dist`.
QA hàng loạt dùng thêm server Python HTTP/1.1 ở port riêng, tránh cạn socket
TIME_WAIT khi chạy nhiều browser; không thêm server ứng dụng/build step.
Các lượt đầu gặp lỗi kết nối/cạn buffer và một lượt so crop hết bộ nhớ;
không tính các lượt đó là pass. Lượt cuối đã pass và lưu report nêu trên.
Pixel comparison dùng SHA-256 PNG, tránh tạo diff Buffer lớn khi lỗi.
Playwright là dependency QA tuỳ chọn từ runtime của môi trường.

Lệnh tái chạy (sau sync và khi server đang phục vụ dist):

```powershell
node tools/audit-ui-components.mjs
node tools/audit-ui-components-browser.mjs http://localhost:8080 --components-only
node tools/audit-ui-components-regressions.mjs http://localhost:8080
# Hoặc chạy chung:
node tools/audit-ui-components.mjs --browser-url http://localhost:8080
```

## Bảo toàn nguồn / Git

37 file baseline (các module render/Preview/Proposal, định nghĩa Proposal và
JSON Collection/Proposal đã sync) có SHA-256 trước–sau không đổi. Lệnh
`git diff 4787ee6 -- design/ui-proposals dist/app-ui-renderer.js
...` với toàn bộ module Preview/Proposal và dữ liệu nguồn trả diff rỗng.
CSS cũ giữ nguyên, chỉ thêm .uic-*; index/router chỉ đăng ký trang/route.
Game git status --porcelain trước–sau giống hệt. Không ghi repo game,
không Studio/build, không Git mutation ở game, không push/amend/rebase/reset/tag.

Commit local theo đúng thứ tự plan: 4787ee6 (scope), 1e3b290 (schema),
2dccab5 (extract), 3f7ed5b (library), aecb438 (detail), 68a5692 (spec/export),
HEAD `test(ui): audit ui components pipeline and page` (nghiệm thu).
