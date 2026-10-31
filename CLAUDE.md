# Runbook — Steal A Pet Balance & Pacing GDD

Đọc file này trước khi sửa project.

## Đăng ký batch UI Preview (2026-11-01)

Theo yêu cầu người dùng adapt Shop Event, Rebirth, Lobby, Fusion (confirm,
result), Leaderboard, Permanent Event (Dig/Fish) và Storage: cho phép đọc
đúng các `.ui` tương ứng trong `Assets/HUDs`, controller/config `.fcg`
liên quan, CSV được các controller tham chiếu, localization key thực sự dùng,
sprite tĩnh/runtime và `.png.meta` tương ứng. Được đọc đăng ký widget/texture
của các màn này trong ResourceRegisteration.asset, enum liên quan trong
EditorGenLib.fcc và PermanentEventTypes.fcc; resolve fileId trong NewAssets
và đường dẫn bỏ tiền tố UIComponents khi metadata xác nhận identity.
Không đọc dữ liệu người chơi/server; dữ liệu thử phải ghi rõ mô phỏng.
Không mở rộng quyền giftcode/Compensate; game chỉ đọc, không chạy Studio.
Mỗi UI commit riêng; Fusion confirm/result cùng một UI, Permanent Event
Dig/Fish cùng một UI với hai type riêng. Chỉ thêm UI Preview, giữ Proposal.

## Đăng ký UI Mail (2026-11-01)

Theo yêu cầu adapt Mail vào UI Preview, cho phép đọc `Assets/HUDs/Mail.ui`,
HudMail và controller/config `.fcg` liên quan, CSV được Mail tham chiếu,
đúng key localization và sprite tĩnh/runtime cùng `.png.meta` tương ứng.
Được đọc bảng đăng ký texture/widget Mail trong ResourceRegisteration.asset,
enum liên quan trong EditorGenLib.fcc; resolve fileId trong NewAssets và
đường dẫn bỏ tiền tố UIComponents khi metadata xác nhận. Không đọc
Compensate/** hay mở rộng quyền giftcode. Dữ liệu thư người chơi/server
không được mirror; tình huống thử trên web phải ghi rõ là mô phỏng.
Game vẫn chỉ đọc. Đây là scope bổ sung theo yêu cầu Mail của người dùng.

Theo yêu cầu tạo bộ soạn quà/GMT ngày 2026-11-01, cho phép đọc controller
`Assets/GMT/Scripts/HudMailsManager.fcg`, UtilsGMTMails, MailsManager,
RewardManager, DataUtils và enum TypeReward/RewardValue/DataKey trong
EditorGenLib.fcc để xuất field GMT. Catalog chỉ chiếu ID/tên/rarity và
thuộc tính cần chọn từ CSV Pet, mutation, weatherEffects, Mutagen,
WeatherGen, MailDetails; tái dùng sprite snapshot GDD. Không đọc UID/map
presets, dữ liệu mailbox thật, giftcode hay Compensate; không gửi mail.
Bộ soạn là công cụ ngoài canvas; không thay thiết kế game Preview/Proposal.

## Đăng ký UI Shop (2026-11-01)

Theo yêu cầu adapt Shop vào UI Preview, cho phép đọc `Assets/HUDs/Shop.ui`,
các controller/config `.fcg` và CSV liên quan, đúng localization key và sprite
tĩnh/runtime mà Shop dùng, cùng `.png.meta` để lấy identity/9-grid. Được đọc
bảng texture và đăng ký widget Shop trong ResourceRegisteration.asset, enum
RSItemType trong EditorGenLib.fcc; resolve fileId trong NewAssets và đường
dẫn bỏ tiền tố UIComponents khi metadata xác nhận. Không bao gồm ShopEvent.ui
hay RotationShop.ui; không mở rộng quyền giftcode/Compensate. Game chỉ đọc.

## Đăng ký UI Activities (2026-10-31)

Theo yêu cầu người dùng adapt Activities vào UI Preview: cho phép đọc
`Assets/HUDs/Activities.ui`, các `.fcg` điều khiển/binding Activities,
CSV được controller tham chiếu, đúng key localization và sprite tĩnh/runtime
của màn hình cùng `.png.meta` tương ứng. Được đọc đúng bảng đăng ký sprite/widget
trong `ProjectSettings/ResourceRegisteration.asset` và enum ItemType trong
`Temp/UGCLanguage/editorGen/EditorGenLib.fcc`. Cho phép resolve sprite Activities
theo fileId trong `Assets/Sprites/NewAssets/`, giữ đường dẫn khai báo để truy vết.
Sprite Activities có tiền tố UIComponents cũ được resolve ở đường dẫn bỏ tiền tố
đó; PetPointIcon → DMMPointIcon chỉ khi metadata xác nhận cùng fileId.
Đây là scope bổ sung cho Activities; không cấp quyền đọc HUD khác, Compensate,
hay dữ liệu giftcode ngoài phép chiếu ID/Reward hiện hành. Game vẫn chỉ đọc.

## Quy tắc cứng

- Site chạy tĩnh trong `dist/`: không thêm Express, server ứng dụng, framework hay build step.
- `C:\_Code\craftland\StealAPet` là project game chỉ đọc. Chỉ đọc CSV trong `Assets/CSV/**`, file `.fcg`, `Assets/HUDs/<UI đã đăng ký>.ui`, các sprite mà UI tham chiếu hoặc code Collection gán lúc chạy, và `.png.meta` tương ứng của đúng các sprite UI đó để lấy 9-grid. Đã đăng ký `PetsCollection.ui`, `Activities.ui`, `Shop.ui` và `Mail.ui` (scope bổ sung ở trên). Được đọc `Assets/Localization/key.csv` nhưng chỉ trích các key UI đã đăng ký thực sự dùng vào dữ liệu dẫn xuất; không mirror toàn bộ file. Được đọc file/bảng định nghĩa `EResSprite`/`Res.Sprite` để ánh xạ sprite runtime cho UI này. Không chạy Studio/build, không tạo file, không dùng lệnh Git ghi ở repo game.
- Mọi script sync chỉ ghi trong project GDD; giữ guard đích output. `giftcode.csv` là dữ liệu vận hành: chỉ được chiếu các cột `ID` và `Reward` cho Gift ID đang được config hiển thị tham chiếu; không ghi hoặc render Code, Name, Limit, Start, End, Reuse hay Rebirth. Không đọc `Compensate/**` hoặc asset game ngoài sprite được `.ui` đã đăng ký hoặc code Collection tham chiếu làm nguồn sync.
- Với sprite Collection đã move/rename, được tra `fileId` trong `.png.meta` của `Assets/Sprites/NewAssets/` theo thư mục người dùng xác nhận. Chỉ copy PNG có ID khớp tham chiếu Collection; giữ đường dẫn khai báo cũ để truy vết, không mirror metadata/asset không liên quan.
- Commit message bắt buộc theo Conventional Commits 1.0.0 (`type(scope): description`); chi tiết ở `AGENTS.md`.
- Không commit/push trong repo game. Trong GDD chỉ commit local cho từng thay đổi của plan; không push, amend, rebase, reset hoặc tạo tag.
- Không bịa số. Dùng CSV/code đã kiểm chứng; thiếu nguồn thì ghi “chưa có dữ liệu”. Balance target và mô phỏng chỉ thêm khi có quyết định hoặc cơ chế nguồn đã xác nhận.
- Giao diện dùng vanilla JS, tiếng Việt, mặc định gọn; dữ liệu dẫn xuất do `tools/*.mjs` sinh vào `dist/data/`. Trình duyệt chỉ đọc JSON và hiển thị.
- Phân luồng UI: yêu cầu thêm tính năng/đổi thiết kế/tạo UI mới chỉ sửa **UI Proposal**. Yêu cầu chỉnh cho khớp project gốc chỉ sửa **UI Preview**, cập nhật thêm Proposal tương ứng nếu bản đó chưa từng chỉnh sửa thiết kế. Kiểm lịch sử/patch trước khi kết luận; bảo toàn Proposal đã sửa hoặc chưa rõ lịch sử, kể cả tác động gián tiếp qua renderer chung/sync baseline. Chi tiết ở skill `map-game-ui`, rule R8.

## Lệnh thường dùng

UI Components là tính năng riêng theo `plans/PLAN-ui-components.md`, không
đổi Preview/Proposal và không mở rộng allowlist. Định nghĩa ở
`design/ui-components/`; `tools/sync-ui-components.mjs` chỉ đọc snapshot
Collection và Activities trong GDD, không nhận `--project-root`. Trang ở
`dist/app-uicomponents.js`, output ở `dist/data/ui/components/`.
Chạy `node tools/sync-ui-components.mjs` rồi
`node tools/audit-ui-components.mjs` (thêm `--browser-url http://localhost:8080`
để kiểm trình duyệt).

Chạy từ thư mục project GDD:

```powershell
node tools/sync-source-data.mjs --project-root "C:\_Code\craftland\StealAPet"
node tools/sync-ui-preview.mjs --project-root "C:\_Code\craftland\StealAPet"
node tools/sync-ui-proposals.mjs
node tools/audit-ui-preview.mjs --project-root "C:\_Code\craftland\StealAPet"
node tools/audit-ui-proposals.mjs
python -m http.server 8080 --directory dist
```

Mở `http://localhost:8080`. Sync chỉ đọc allowlist CSV và `.fcg` từ checkout game; mọi output được neo trong `dist/` của project này.

## Bản đồ project

- `plans/PLAN-features-from-pvz.md`: thứ tự và phạm vi tính năng.
- `design/00-decisions.md`: quyết định đã chốt và trạng thái nguồn.
- `design/20-dev-action-items.md`: việc kỹ thuật còn mở có bằng chứng.
- `tools/sync-source-data.mjs`: đọc config được allowlist, tạo snapshot và JSON dẫn xuất.
- `tools/sync-ui-preview.mjs`: xuất các UI đã đăng ký theo allowlist; `--screen activities` chỉ sync Activities. Collection không đọc giftcode; Activities chỉ chiếu ID/Reward cho Gift đang được config tham chiếu. Không đọc compensation.
- `plans/PLAN-ui-proposal.md`: spec chính của UI Proposal. Nguồn patch do GDD sở hữu ở `design/ui-proposals/<screen>/<id>.json`; PNG mới ở `assets/` cùng screen, border 9-grid phải khai báo.
- `tools/sync-ui-proposals.mjs`: validate toàn bộ batch trước khi ghi, áp patch lên snapshot UI; output cây/diff/resource/prompt/registry và sprite chỉ trong `dist/`. Không mở rộng allowlist game.
- `tools/templates/ui-proposal-prompt.md`: template prompt cho phiên Codex riêng tại repo game; GDD chỉ sinh văn bản, không thực thi thay đổi game.
- `dist/app-ui-shared.js`, `dist/app-uiproposal.js`: stage/resource dùng chung và trang so sánh đề xuất; Collection và Activities được đăng ký trong Preview; Proposal hiện chỉ Collection.
- `dist/index.html`, `dist/styles.css`: shell, sidebar và layout.
- `dist/app-core.js`: helper và các trang tổng quan/progression/roster/cadence.
- `dist/app-*.js`: module theo trang hoặc nhóm trang liên quan; router ở `app-router.js`.
- `dist/data/`: snapshot và các JSON tách theo bảng/trang.

## Quy trình thay đổi

Khi mapping UI game sang website hoặc sửa parity, đọc skill
[`map-game-ui`](design/skills/map-game-ui/SKILL.md) và các reference phù hợp.
Skill ghi rule mapping, regression từ commit Collection và acceptance gates;
không tự mở rộng allowlist nguồn. UI ngoài các màn đã đăng ký vẫn cần đăng ký
phạm vi trước khi đọc nguồn game tương ứng.

1. Đọc plan, README và các module/trang liên quan.
2. Xác nhận nguồn số liệu trong CSV và `.fcg` cho phép đọc; không suy diễn cơ chế chưa kiểm chứng.
3. Sửa script sinh dữ liệu và UI tĩnh; không hard-code dữ liệu config vào JavaScript.
4. Chạy sync, serve `dist/`, kiểm tra trang, console và màn hình nhỏ.
5. Trước mỗi commit: `git status` và `git diff --stat` trong repo GDD; chỉ stage file của update đó. Không push.

Nếu bước nào cần ghi vào project game, dừng tại đó.
