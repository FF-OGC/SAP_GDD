# Plan: mục "UI Components" — thư viện thành phần UI chuẩn trích từ Collection

Cập nhật 2026-10-31: thư viện mở rộng thêm 11 template từ snapshot Activities,
theo `PLAN-ui-components-activities.md`. Catalog Collection và ranh giới
Preview/Proposal bên dưới giữ nguyên; generator chỉ đọc snapshot GDD.

**Trạng thái:** đã triển khai và nghiệm thu web 2026-10-26; xem `design/ui-components/QA.md` (G4 chưa có bằng chứng, lỗi Proposal có sẵn DA-019 được bảo toàn). Prompt giao Codex: `plans/PROMPT-codex-ui-components.md`.

Mục tiêu: thêm mục sidebar **UI Components** (dưới "UI Proposal", `data-page="uicomponents"`, deep-link `#uicomponents/<id>`). Mục này tách các thành phần con lặp lại trong UI Collection (đã dựng ở UI Preview) thành **template chuẩn có tham số**, để các UI sau (Shop, Mail, Mission, Leaderboard…) và các UI Proposal dùng lại cùng một bộ, không vẽ lại từng màn.

## 1. Học từ PvZ GDD (`plant_vs_zombie_gdd`)

- `knowledge-pack/04-ui-ux/craftland-ui-ux-skill/04-component-library.md`: xây **bộ component chuẩn trước khi dựng từng màn**; mỗi component là hàm nhận tham số theo *nghĩa* (rarity, locked, selected — không phải giá trị CSS thô), sửa một chỗ thì mọi màn đổi theo; thứ tự: primitive → component đơn giản dùng nhiều → component ghép → màn cụ thể; ghi nguồn `.ui` ngay tại component (node gốc, toạ độ, 9-grid, thật hay ước lượng).
- `design/19-ui-source-asset-mapping.md` §"Design System / Base Layout": bảng *Component · class · sprite thật (+ 9-grid) · dùng ở*, kèm bảng toạ độ `.ui` đã quy đổi. Đây là dạng trình bày cần có.
- `tools/balance-web/public/js/uiux.js`: `buildAssetSpec`/`renderSpecTables` — bảng "hình ảnh / hình khối / chữ" cho dev; `slot`, `invCell`, `stars`, `pagination`, `listPopup`, `goldFrameBar`… là catalog tham khảo.
- **Không** dùng lại: HTML viết tay từng component. SAP GDD đã có renderer đọc cây `.ui`; component ở đây là **subtree của cây entity đã sync** + tham số, render bằng chính renderer đó (nên tự khớp game, không có bản vẽ thứ hai để lệch).

## 2. Phân luồng (CLAUDE.md, skill `map-game-ui` R8)

Đây là **tính năng mới**, không phải parity. Không đổi hành vi UI Preview và không đổi nội dung UI Proposal; mọi chạm vào renderer/helper chung phải kèm bằng chứng before/after (audit Preview 107/107 entity, audit Proposal vẫn pass). Không mở rộng allowlist game: dữ liệu lấy từ `dist/data/ui/collection.json`, `collection-sprites.json`, `collection-rules.json`, `collection-i18n.json` (đầu ra của sync UI Preview) và sprite đã có trong `dist/assets/**`. Script mới **không** nhận `--project-root` và không đọc repo game.

## 3. Quyết định thiết kế

| Vấn đề | Quyết định |
|---|---|
| Nguồn định nghĩa | `design/ui-components/<id>.json` do GDD sở hữu: chọn subtree bằng `sourcePath` (+ `sourceId` để chống đổi tên), khai báo `slots`, `states`, `usedIn`, `status`. Không copy thủ công JSON cây. |
| Dữ liệu dẫn xuất | `tools/sync-ui-components.mjs` đọc cây Collection đã sync + định nghĩa → `dist/data/ui/components/<id>.json` (subtree đã re-root, slot đã gắn, `spec`), `registry.json`, `components-audit.json`. Chỉ ghi trong `dist/`, giữ guard đích. Idempotent. |
| Re-root | Subtree đặt vào khung có kích thước = `sizeDelta` thực của component; transform neo của gốc bị thay bằng neo giữa khung để render độc lập. Mọi node con giữ nguyên transform/image/text/layout (R3: một chủ sở hữu geometry). |
| Tham số (`slots`) | Có tên theo nghĩa: `text` (key i18n hoặc chuỗi mẫu), `sprite` (key manifest), `tint` (màu), `active`, `count`… Mỗi slot trỏ tới `path` + `field` trong subtree (dùng đúng tập field renderer hỗ trợ như `tools/ui-proposal-fields.mjs`). Giá trị mặc định lấy từ `.ui`; dữ liệu mẫu ghi nhãn "mẫu". Không bịa số. |
| Trạng thái (`states`) | Ví dụ tab Chọn/Không chọn, ô pet Thường/Chọn/Khoá. Chỉ liệt kê state có bằng chứng trong `.ui` hoặc `collection-rules.json` (rule runtime nào bật/tắt node nào, kèm nguồn); thiếu bằng chứng ⇒ "chưa có dữ liệu". |
| Trạng thái nguồn | `real` (đúng node `.ui`), `runtime` (sprite/màu do code Collection gán — nêu rule), `proposal` (thành phần chỉ có trong đề xuất, ví dụ ô mốc thưởng), `new` (chưa có trong game). Mỗi component ghi rõ. |
| Thành phần từ Proposal | Mặc định chỉ trích từ Collection thật. Thành phần đã có trong proposal (milestone reward…) chỉ liệt kê sau khi nhóm các đề xuất đó ở trạng thái đã duyệt; tới lúc đó dùng `status: "proposal"` + link proposal, không trộn vào nhóm `real`. |
| Quan hệ với Proposal | Giai đoạn này **chỉ trình bày + xuất template**. Nút "Sao chép template" cho ra JSON entity (subtree + slot) đúng shape của `op: "add"` trong `design/ui-proposals/proposal.schema.json`. Cho phép Proposal tham chiếu component (`op: "addComponent"`) là việc sau, ghi vào `design/20-dev-action-items.md`, không làm ở đây. |
| Giao diện | Vanilla JS, tiếng Việt, gọn, mobile không hover. Không hard-code dữ liệu component vào JS. |

## 4. Catalog ứng viên trích từ Collection

Danh sách xuất phát từ cây `PetsCollection` (107 entity). Codex phải đối chiếu `dist/data/ui/collection.json` và `collection-rules.json`, bỏ/gộp/thêm khi thực tế khác, ghi lý do. Không tạo component cho entity chỉ xuất hiện một lần nếu không có giá trị tái dùng.

| ID | Thành phần | Subtree nguồn | Dùng lại ở |
|---|---|---|---|
| `popup-frame` | Khung popup: nền + decor trái/phải + tiêu đề | `Container`, `BG/*`, `Title` | mọi popup |
| `title-bar` | Thanh tiêu đề + nhãn | `Container/Title`, `Title/Label` | mọi popup |
| `close-button` | Nút đóng | `Title/CloseButton` | mọi popup |
| `scrim` | Nền tối chặn bấm | `DarkBG`, `Container/PreventCloseButton` | mọi popup modal |
| `tab-button` | Nút tab (chọn/không chọn, có nhãn) | `RarityTabsLayout/*TabButton`, `DetailsTabsLayout/*TabButton` | Shop, Mission, Inventory |
| `tab-bar` | Dải tab bằng layout | `RarityTabsLayout`, `DetailsTabsLayout` | như trên |
| `item-cell` | Ô lưới: rarity + thumbnail + tên + viền chọn + cờ phụ | `PetsLayout/Pet (1)` | Shop, Inventory, Reward |
| `item-grid` | Lưới ô + phân trang | `PetsLayout` + `PageBtns` | như trên |
| `pagination` | Prev / `n/N` / Next | `PageBtns` | mọi danh sách phân trang |
| `detail-card` | Thẻ chi tiết: thumbnail lớn + decor + tên + dải rarity | `PetDetails/Pet` | Shop, Reward |
| `info-row` | Dòng icon + nội dung | `Info/Value`, `Info/Mutations`, `Info/Weathers` | Shop, Mission |
| `progress-counter` | Thanh tiến độ + số + nhãn | `PetsCount`, `MutationsCount`, `WeathersCount` | Mission, Collection khác |
| `unlock-banner` | Dải "mở khoá/nhận từ…" | `UnlockObtain`, `PetDetails/Obtain` | Shop, Mission |
| `recipe-row` | Công thức: ô + dấu cộng + biểu tượng kết quả | `Recipe` | Fusion/Craft |
| `rarity-badge` | Nền/viền theo rarity (tint do code gán) | `Pet/Rarity`, `PetDetails/Pet/RarityBG` | mọi nơi có rarity |

Component ghép (xếp sau các primitive): `list-popup` = `popup-frame` + `tab-bar` + `item-grid` + `pagination` + `detail-card`. Trang hiển thị cây ghép theo `composedOf`.

## 5. Trang "UI Components" (thứ tự dọc)

1. **Thư viện**: lưới thẻ component (thumbnail render thật, tên, trạng thái nguồn, số nơi dùng), lọc theo nhóm (Khung / Điều khiển / Hiển thị dữ liệu / Ghép) và tìm kiếm. Mobile xếp dọc.
2. **Chi tiết component** (chọn thẻ hoặc deep-link):
   - **Preview** bằng renderer chung, nền caro, công tắc state, bảng điều khiển slot (nhập text/chọn sprite/màu/active) cập nhật tức thì; công tắc "Hiện đường viền entity" (debug).
   - **Cây entity** của subtree (tên, loại, rect đã quy đổi `.ui`).
   - **Spec cho dev** (theo mẫu PvZ `renderSpecTables`): bảng hình ảnh (thumbnail, key/path, kích thước, 9-grid, tint), hình khối/màu, chữ (key i18n, cỡ, màu, outline, căn). Mọi giá trị đọc từ dữ liệu, không gõ tay.
   - **Tham số & state**: bảng slot (tên, kiểu, mặc định, path+field đích) và state (tên, điều kiện runtime, nguồn rule).
   - **Nguồn & tái dùng**: path/id `.ui`, trạng thái nguồn, danh sách màn dùng (liên kết sang UI Preview/Proposal khi có), `composedOf`/`usedBy`, ghi chú chưa xác minh.
   - **Template**: nút "Sao chép JSON" (entity subtree + slot, shape `op: add`), clipboard bọc try/catch.
3. **Bảng so sánh biến thể** cho component có state (cạnh nhau).

## 6. Kiến trúc

```
design/ui-components/<id>.json          (định nghĩa, nguồn thật)
design/ui-components/README.md          (schema, cách thêm component)
design/ui-components/component.schema.json
tools/sync-ui-components.mjs            (chỉ ghi trong dist/, không đọc repo game)
  ├─ đọc dist/data/ui/{collection,collection-sprites,collection-rules,collection-i18n}.json
  ├─ validate: sourcePath/sourceId tồn tại & khớp, slot.path/field hợp lệ, sprite có trong manifest, id không trùng, không vòng composedOf
  ├─ ghi dist/data/ui/components/<id>.json, registry.json, (kèm spec dẫn xuất)
tools/audit-ui-components.mjs           (kiểm tĩnh)
tools/audit-ui-components-browser.mjs   (kiểm trình duyệt, theo mẫu audit-ui-proposals-browser)
dist/app-uicomponents.js                 trang + module (nạp trong index.html, ?v=)
dist/app-ui-shared.js                    chỉ thêm helper chung nếu cần (không đổi hành vi cũ)
dist/styles.css                          rule .uic-*
```

`dist/app-router.js`: thêm `uicomponents` vào `go()` và `hashchange`. Không làm `go()` dài thêm mà không cần: thêm bằng tối thiểu theo cách router đang làm.

## 7. Tiêu chí nghiệm thu

- Mỗi component: số entity DOM `data-ui-path` = số node subtree; render khớp node nguồn trong Preview (cùng sprite, 9-grid, màu, chữ, kích thước) — so bằng ảnh crop hoặc rect, không bằng mắt.
- Ba chế độ kiểm: bản mặc định, từng state, slot bị thay giá trị; subtree không bị đổi khi đổi slot ở instance khác.
- Spec/bảng đọc từ dữ liệu; sprite thiếu hiện "thiếu", không im lặng.
- UI Preview (audit 107/107 entity) và UI Proposal (audit hiện có) không đổi kết quả; `git diff` chứng minh không sửa file Preview/Proposal ngoài đăng ký trang.
- Viewport 1440×1100 và 390×844, không scroll ngang, console sạch, sync chạy lại cho output giống nhau, repo game không bị chạm.
- Chưa xác minh được đều ghi `design/20-dev-action-items.md`; không tuyên bố "khớp game" khi chưa kiểm.

## 8. Thứ tự làm (mỗi bước một commit local, Conventional Commits)

0. `docs(ui): record ui components scope and boundary` — CLAUDE.md (bản đồ, lệnh), `design/00-decisions.md`, README; xác nhận không mở rộng allowlist.
1. `feat(sync): add ui component definition schema and validator`
2. `feat(sync): extract collection ui components into derived data`
3. `feat(ui): add ui components library page`
4. `feat(ui): add component detail preview with slots and states`
5. `feat(ui): add component spec tables and template export`
6. `test(ui): audit ui components pipeline and page`

## 9. Rủi ro / việc để sau

- Component phụ thuộc layout động (tab layout, grid) cần dữ liệu runtime của `app-ui-collection.js`: chỉ mô phỏng khi rule runtime có nguồn; không copy logic Collection vào renderer chung.
- Màn sau Collection (Shop…) chưa có `.ui` đăng ký ⇒ cột "Dùng lại ở" chỉ là *dự kiến*, ghi nhãn rõ, không đếm như đã dùng.
- `op: addComponent` trong Proposal và việc thay thành phần ngược vào Proposal cũ: để sau, cần quyết định riêng để bảo toàn Proposal đã chỉnh sửa.
