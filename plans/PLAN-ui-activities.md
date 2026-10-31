# Activities trong UI Preview

## Thanh tiến độ chung của 5 milestone (2026-10-31)

Người dùng xác nhận cần thanh Pet Points chung phía trên tab nhiệm vụ.
Track/fill đã có trong Activities.ui nhưng sprite white `lib://` không có PNG.
Theo yêu cầu hiển thị thanh này, binder dùng nền màu tạm cho riêng hai visual,
giữ nguyên geometry/tint serialize (track 660×5, fill cao hơn track 2 đơn vị),
raw sprite identity và manifest missing. Không tạo PNG thay thế. Inspector ghi
RenderFallback rõ đây là xấp xỉ web; không coi là đã resolve asset gốc.
Fill lấy points / mốc cuối theo HudActivities.GetMilestoneFill, clamp 0–1.
Điểm chỉ tăng khi claim mission, không tăng khi mới hoàn thành nhiệm vụ.
Kiểm actual pixel và clip ở 0/20/40/60/80/100/over-max trên desktop/mobile.

## Debug progress (2026-10-31)

Yêu cầu tiếp theo của người dùng: thêm debug kiểm tra tiến độ nhiệm vụ trong
Preview. Đây là công cụ ở panel mô phỏng, không phải thay đổi thiết kế HUD.
Chọn nhiệm vụ theo cycle đang xem, tăng riêng theo số đơn vị nhập hoặc hoàn
thành; clamp ở TargetValue. Preset 0/50/100% xoá override riêng. Nhận thưởng
chỉ được phép khi nhiệm vụ đủ tiến độ và chưa nhận, Pet Points cộng một lần.
Reset nhiệm vụ xoá tiến độ/claim/milestone/points mô phỏng; đổi cycle/profile
cũng xoá override riêng. Giữ state khi đổi ngôn ngữ hoặc rời rồi mở lại màn.
Kiểm bằng `node tools/audit-ui-activities-progress.mjs http://localhost:8080`.

Yêu cầu ngày 2026-10-31: adapt màn hình Activities đã có trong game, tương tự
Collection. Đích là UI Preview. Không tạo Proposal; các Proposal Collection
đã chỉnh sửa (lịch sử `6700b5f`, `c1bb1bc`) được giữ nguyên baseline và patch.

Phạm vi được đăng ký trong CLAUDE.md trước khi đọc Activities: Activities.ui,
controller/config `.fcg` liên quan, CSV được dùng, localization có tham chiếu,
sprite tĩnh/runtime và metadata tương ứng. ResourceRegisteration và
EditorGenLib cung cấp binding widget, sprite identity và enum ItemType.
Chỉ chiếu ID/Reward của giftcode đang được cấu hình Activities tham chiếu.

Một thay đổi logic, một commit `feat(ui): adapt activities in ui preview`:

- [x] Pipeline riêng Activities, provenance/hash, raw props/callback, manifest.
- [x] Đăng ký màn hình, lazy-load và chuyển màn có token chống race.
- [x] Binding Rewards/Missions/Spin/Event, trạng thái mô phỏng tách khỏi config.
- [x] Dùng renderer/Inspector/resource panel hiện có; giữ Collection/Proposal.
- [x] Audit source, asset/fileId/border và browser desktop/mobile, có ảnh QA.

Lệnh sync chỉ Activities, không regenerate Collection hoặc Proposal:

```powershell
node tools/sync-ui-preview.mjs --project-root "C:\_Code\craftland\StealAPet" --screen activities
node tools/audit-ui-activities.mjs --project-root "C:\_Code\craftland\StealAPet" --browser-url http://localhost:8080
node tools/audit-ui-activities-inspector.mjs http://localhost:8080
node tools/audit-ui-activities-consumers.mjs http://localhost:8080
```

Browser audit cần Playwright có sẵn trong bundled runtime (NODE_PATH theo
README). Report: `dist/data/ui/activities-audit.json`; ảnh stage Rewards,
Missions, Spin ở 1440/390. Đây là kiểm web theo source; chưa có ảnh runtime game.
Không push hoặc publish theo quy tắc checkout.

Inspector kiểm 8 RewardIcon trùng path và một clone nhiệm vụ ở mỗi viewport,
đối chiếu ID/raw props. Renderer và Inspector dùng ID trước path khi có widget
trùng tên. Audit consumers đối chiếu toàn bộ Collection và bốn Proposal, cả
current/proposed/overlay, với `c1bb1bc`. DOM phải trùng chính xác. Pixel được
so hash và ghi số pixel/kênh lệch khi không trùng; exact equality không được
gọi là pass khi hash khác. Edge có sai khác raster ±1 RGB trên gradient giữa
page. Không nới tolerance hoặc đổi gradient source để làm test pass.
