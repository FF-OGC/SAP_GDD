# Tích hợp SAP_GDD

Canonical skill: `design/skills/map-game-ui/` trong repo SAP_GDD. Bản cài ở
thư mục skill cá nhân Codex/Claude là bản sao; khi cập nhật, sửa canonical
trước và đồng bộ cả folder, tránh chỉnh ba bản độc lập. CLAUDE.md của checkout
luôn là nguồn hiện hành cho quyền đọc/ghi, không lấy reference này để mở rộng.

## Đích thay đổi Preview / Proposal

Thêm tính năng, đổi thiết kế hoặc tạo UI mới: chỉ sửa UI Proposal qua nguồn
GDD sở hữu. Chỉnh để khớp project gốc: sửa UI Preview, và cập nhật Proposal
tương ứng nếu bản đó chưa từng chỉnh sửa thiết kế. Kiểm lịch sử/patch; bảo
toàn Proposal đã sửa hoặc chưa xác định được lịch sử. Xem R8 của
[mapping-rules](mapping-rules.md) trước khi sửa renderer chung hoặc chạy
sync-ui-proposals: regenerate trên baseline mới có thể làm đổi Proposal
gián tiếp dù không đụng file patch.

## Phạm vi hiện tại (2026-10-25)

- Website static vanilla JS trong `dist/`, tiếng Việt; không thêm framework,
  application server hay build step. Browser đọc JSON dẫn xuất.
- Game `C:\_Code\craftland\StealAPet` chỉ đọc theo allowlist; chỉ Collection
  (`PetsCollection.ui`) đã đăng ký. UI mới cần phạm vi được cho phép trước
  khi đọc nguồn tương ứng; ghi đề xuất đăng ký cụ thể trong GDD để review.
- Sprite relocation chỉ tra `.png.meta` trong NewAssets đã được xác nhận,
  chỉ copy PNG khớp tham chiếu Collection. Giữ declared path để truy vết.
- Không đọc Compensate hoặc asset ngoài phạm vi, không mirror localization.
  Giftcode vận hành chỉ được chiếu ID/Reward đang được config hiển thị tham
  chiếu theo CLAUDE.md; sync UI Preview riêng không đọc giftcode/compensation.
- Mọi output sync nằm trong GDD/dist với guard. Không chạy Studio/build,
  không ghi hay thực hiện Git mutation trong repo game.

## Các lớp code cần tìm khi áp dụng

| Trách nhiệm | File trong SAP_GDD |
|---|---|
| Export UI/resource/i18n/runtime rule | `tools/sync-ui-preview.mjs` |
| Geometry/layout/sprite/tint/text chung | `dist/app-ui-renderer.js` |
| State/binding Collection | `dist/app-ui-collection.js` |
| Stage/resource chung | `dist/app-ui-shared.js` |
| Trang preview và Inspector | `dist/app-uipreview.js`, `dist/app-ui-inspector.js` |
| Proposal patch và renderer consumer | `tools/sync-ui-proposals.mjs`, `dist/app-uiproposal.js` |
| Dependency và CSS | `dist/index.html`, `dist/styles.css` |
| Snapshot/report | `dist/data/ui/collection*.json` |
| Nguồn quyết định/gap | `design/00-decisions.md`, `design/20-dev-action-items.md` |

Đọc mục cập nhật mới nhất ở đầu action-items trước các đoạn lịch sử. README
và DA cũ có số sprite thiếu/text policy từ baseline trước; không gộp chúng
thành trạng thái hiện tại. Baseline `4048e4a` đã resolve sprite rename, chỉ
còn hai `lib://` và đã có xác nhận designer về overflow=0; các giới hạn font,
shader, alpha/raycast và scaler chưa vì thế mà được xác minh toàn bộ.

## Lệnh QA hiện có

Chạy từ root GDD, chọn theo phần đã đổi; không regenerate snapshot cho một
thay đổi tài liệu/skill đơn thuần.

```powershell
node tools/sync-ui-preview.mjs --project-root "C:\_Code\craftland\StealAPet"
node tools/sync-ui-proposals.mjs
node tools/audit-ui-preview.mjs --project-root "C:\_Code\craftland\StealAPet"
node tools/audit-ui-proposals.mjs
python -m http.server 8080 --directory dist
```

Khi đã có server, Playwright và browser QA:

```powershell
node tools/audit-ui-preview.mjs --project-root "C:\_Code\craftland\StealAPet" --browser-url http://localhost:8080
node tools/audit-ui-proposals.mjs --browser-url http://localhost:8080
```

Runtime/package path lấy từ môi trường đang chạy; không giả định NODE_PATH
máy này tồn tại ở máy khác. Xem README hiện hành để chọn Edge/Chrome.
Audit tạo report; kiểm diff trước khi commit, tránh kéo snapshot ngoài scope.

## Sử dụng ở Codex/Claude

Codex: gọi `$map-game-ui` (sau khi phiên mới nhận skill cá nhân). Claude Code:
gọi `/map-game-ui` khi skill đã được discovery. Trong repo này, agent cũng
được CLAUDE.md trỏ trực tiếp vào canonical nên không phụ thuộc lệnh gọi.
Ở môi trường không tự discover skill, yêu cầu đọc SKILL.md và các reference
liên quan bằng đường dẫn; không coi skill cá nhân là đã cài cho mọi máy/app.
