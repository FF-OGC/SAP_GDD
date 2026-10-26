# Prompt cho Codex — Mục "UI Components" (thư viện thành phần UI chuẩn)

Dán khối dưới vào Codex (MCP craftland bật), chạy từ `C:\_Code\craftland\_Users\SAP_GDD`.

````text
Project GDD tĩnh: C:\_Code\craftland\_Users\SAP_GDD. Đọc trước: CLAUDE.md, AGENTS.md, plans/PLAN-ui-components.md (spec chính, làm đúng), plans/PLAN-ui-proposal.md, plans/PLAN-ui-preview.md, design/skills/map-game-ui/SKILL.md và references/* (đặc biệt R3, R8, acceptance), design/00-decisions.md, design/20-dev-action-items.md, design/ui-proposals/README.md + proposal.schema.json, tools/ui-proposal-fields.mjs, tools/sync-ui-preview.mjs, tools/sync-ui-proposals.mjs, tools/audit-ui-proposals-browser.mjs, dist/app-ui-shared.js, dist/app-ui-renderer.js, dist/app-uipreview.js, dist/app-uiproposal.js, dist/app-router.js, dist/index.html, các rule .ui-* trong dist/styles.css, dist/data/ui/{registry,collection,collection-sprites,collection-rules,collection-i18n}.json.
Tham khảo ý tưởng (CHỈ ĐỌC, không sửa, không copy code): C:\_Code\craftland\_Users\plant_vs_zombie_gdd — knowledge-pack/04-ui-ux/craftland-ui-ux-skill/04-component-library.md, 03-visual-primitives.md, design/19-ui-source-asset-mapping.md (mục "Design System / Base Layout"), tools/balance-web/public/js/uiux.js (các hàm slot/invCell/stars/pagination/listPopup/goldFrameBar và buildAssetSpec/renderSpecTables). Bài học dùng: bộ component chuẩn có tham số đặt tên theo nghĩa; bảng Component · sprite thật + 9-grid · dùng ở; bảng spec hình ảnh/hình khối/chữ cho dev; ghi nguồn .ui tại từng component. KHÔNG viết HTML tay từng component: ở đây component là SUBTREE của cây entity đã sync + tham số, render bằng renderer hiện có.

## Phạm vi và ranh giới
Đây là TÍNH NĂNG MỚI (mục sidebar mới), không phải parity. Không đổi hành vi UI Preview, không đổi nội dung UI Proposal (design/ui-proposals/** giữ nguyên). Nếu phải chạm renderer/helper dùng chung, chứng minh bằng before/after: audit-ui-preview 107/107 entity và audit-ui-proposals vẫn pass, ảnh/DOM crop không đổi.
KHÔNG đọc repo game. Script mới không nhận --project-root. Nguồn duy nhất: dist/data/ui/collection*.json (đầu ra sync UI Preview) và sprite đã có trong dist/assets/**. Không mở rộng allowlist; không đọc giftcode/Compensate. C:\_Code\craftland\StealAPet chỉ-đọc (nếu cần xác nhận widget/field thì dùng MCP craftland, không mở file ngoài allowlist); điều chưa xác minh ghi design/20-dev-action-items.md, không đoán. Không bịa số: giá trị mặc định lấy từ .ui, dữ liệu mẫu ghi nhãn "mẫu".

## Yêu cầu tính năng
Thêm mục sidebar "UI Components" ngay dưới "UI Proposal" (data-page="uicomponents", deep-link #uicomponents/<id>), module riêng dist/app-uicomponents.js (nạp trong index.html với ?v=, đăng ký vào pages + router, thêm tối thiểu vào go()/hashchange). Trang theo thứ tự dọc:
1. Thư viện: lưới thẻ component (thumbnail render thật, tên, nhãn nguồn real/runtime/proposal/new, số nơi dùng), lọc theo nhóm (Khung / Điều khiển / Hiển thị dữ liệu / Ghép) + tìm kiếm.
2. Chi tiết component: (a) Preview bằng renderer chung trên nền caro, công tắc state, bảng điều khiển slot (text/sprite/màu/active) cập nhật tức thì, công tắc hiện đường viền entity; (b) cây entity của subtree với rect quy đổi từ .ui; (c) Spec cho dev: bảng hình ảnh (thumbnail, key/path, kích thước, 9-grid, tint), hình khối/màu, chữ (key i18n, cỡ, màu, outline, căn) — đọc từ dữ liệu; (d) bảng slot và state (kèm nguồn rule runtime trong collection-rules.json; thiếu bằng chứng ⇒ "chưa có dữ liệu"); (e) Nguồn & tái dùng: path/id .ui, composedOf/usedBy, màn dùng (màn chưa đăng ký ghi "dự kiến"), ghi chú chưa xác minh; (f) nút "Sao chép template" ra JSON entity (subtree + slot) đúng shape op "add" của design/ui-proposals/proposal.schema.json, clipboard bọc try/catch.
3. So sánh biến thể cạnh nhau cho component có state.
Mobile: xếp dọc, không scroll ngang, không hover/title tooltip/pointerenter. Vanilla JS, tiếng Việt, mặc định gọn, không build step, không hard-code dữ liệu component vào JS.

## Kiến trúc bắt buộc (chi tiết plan §3, §6)
- design/ui-components/<id>.json (GDD sở hữu) + component.schema.json + README.md: sourcePath + sourceId (chống đổi tên), group, status (real|runtime|proposal|new), slots[{name,type,path,field,default,sample?}], states[{name,when,ruleSource,overrides}], usedIn[{screen,note,planned?}], composedOf, notes. Field slot chỉ thuộc tập renderer hỗ trợ (dùng lại tools/ui-proposal-fields.mjs, không nhân đôi danh sách).
- tools/sync-ui-components.mjs: đọc dist/data/ui/collection*.json + định nghĩa; validate (sourcePath/sourceId tồn tại và khớp, slot.path/field hợp lệ, sprite có trong manifest, id không trùng, composedOf không vòng) — sai thì lỗi rõ, không sinh output nửa vời; re-root subtree vào khung đúng kích thước thực, giữ nguyên transform/image/text/layout các node con (R3); ghi dist/data/ui/components/<id>.json (subtree + spec dẫn xuất), registry.json. Chỉ ghi trong dist/ của GDD, giữ guard đích, idempotent.
- Catalog xuất phát ở plan §4 (popup-frame, title-bar, close-button, scrim, tab-button, tab-bar, item-cell, item-grid, pagination, detail-card, info-row, progress-counter, unlock-banner, recipe-row, rarity-badge + ghép list-popup). Đối chiếu cây thật, bỏ/gộp/thêm khi cần và ghi lý do trong design/ui-components/README.md; không tạo component dùng một lần không có giá trị tái dùng. Không đưa thành phần từ UI Proposal vào nhóm real.
- Tách helper chung vào dist/app-ui-shared.js chỉ khi thực sự dùng chung; không copy code từ app-uipreview.js/app-uiproposal.js; không đưa logic của một component cụ thể vào renderer. Runtime state (tab chọn, ô khoá…) chỉ mô phỏng theo rule có nguồn; không sao chép logic Collection vào renderer chung.

## Quy tắc cứng
CLAUDE.md/AGENTS.md áp dụng đủ. Repo game chỉ đọc: không Studio/build, không tạo file, không Git ghi. GDD: commit local Conventional Commits, mỗi bước một commit, trước commit chạy git status + git diff --stat, chỉ stage file của bước đó, kiểm dòng đầu theo regex trong AGENTS.md; không push/amend/rebase/reset/tag. Nếu cần ghi vào project game thì dừng.

## Việc cần làm (mỗi bước một commit)
0 docs(ui): record ui components scope and boundary — CLAUDE.md (bản đồ, lệnh), design/00-decisions.md, README; xác nhận không đổi allowlist.
1 feat(sync): add ui component definition schema and validator
2 feat(sync): extract collection ui components into derived data (kèm design/ui-components/*.json cho catalog đã chốt)
3 feat(ui): add ui components library page
4 feat(ui): add component detail preview with slots and states
5 feat(ui): add component spec tables and template export
6 test(ui): audit ui components pipeline and page — tools/audit-ui-components.mjs (tĩnh: mọi component resolve, slot hợp lệ, sprite tồn tại hoặc đánh dấu thiếu, spec đủ node, định nghĩa sai ⇒ sync lỗi, chạy lại ⇒ output giống) và tools/audit-ui-components-browser.mjs (số data-ui-path = số node subtree, rect/ảnh crop khớp node nguồn trong UI Preview, slot/state đổi đúng, 1440×1100 và 390×844, không scroll ngang, console sạch). Chạy:
  node tools/sync-source-data.mjs --project-root "C:\_Code\craftland\StealAPet"
  node tools/sync-ui-preview.mjs --project-root "C:\_Code\craftland\StealAPet"
  node tools/sync-ui-proposals.mjs
  node tools/sync-ui-components.mjs
  node tools/audit-ui-preview.mjs --project-root "C:\_Code\craftland\StealAPet"
  node tools/audit-ui-proposals.mjs
  node tools/audit-ui-components.mjs
  python -m http.server 8080 --directory dist
Kiểm thủ công trên http://localhost:8080: thư viện, lọc/tìm, chi tiết từng component, state, slot, so sánh biến thể, sao chép template, deep-link, UI Preview/Proposal không đổi; git diff không chạm repo game. Cập nhật README/design.

## Báo cáo cuối
Liệt kê commit; catalog component cuối (id, nguồn, trạng thái, lý do bỏ/gộp/thêm so với plan §4); schema định nghĩa; kết quả audit tĩnh + trình duyệt; bằng chứng Preview/Proposal không đổi (audit + git diff); điều chưa xác minh (ghi design/20-dev-action-items.md); xác nhận repo game không bị chạm. Không tuyên bố "khớp game" nếu chưa kiểm.
````
