# Prompt cho Codex — tab "Reward ID"

Copy toàn bộ phần trong khung dưới vào Codex, chạy ở thư mục `C:\_Code\craftland\_Users\SAP_GDD`.

````text
Bạn đang làm việc trong project GDD tĩnh `C:\_Code\craftland\_Users\SAP_GDD`. Đọc theo thứ tự: `CLAUDE.md`, `AGENTS.md`, `plans/PLAN-reward-id.md` (spec chính — bảng chuẩn ID, quy tắc amount, acceptance), `plans/PLAN-mail-composer.md` + `dist/mail-composer-model.js`, `dist/app-mail-composer.js`, `tools/sync-mail-composer.mjs`, `tools/audit-mail-composer.mjs` (mẫu kiến trúc: sync → JSON → model thuần → audit), `dist/app-reward-display.js` (icon quà), `dist/app-router.js`, `dist/index.html`.

Project game `C:\_Code\craftland\StealAPet` là CHỈ ĐỌC: không ghi, không build, không dùng lệnh Git ghi ở đó. Website vẫn tĩnh trong `dist/` (không Express/framework/build step), vanilla JS, tiếng Việt, dữ liệu dẫn xuất do `tools/*.mjs` sinh vào `dist/data/`. Không đụng UI Preview/Proposal, không mở rộng allowlist, không đọc giftcode hoặc `Compensate/**`. Không bịa số; thiếu nguồn thì ghi "chưa có dữ liệu".

## Mục tiêu

Thêm tab **Reward ID** (nhóm nav "NỘI DUNG"). Người dùng chọn Type và nhập Amount (bắt buộc) cùng các field riêng của từng type; tool trả Reward ID theo chuẩn trong plan, dòng CSV `ID,TypeReward,Value,Quantity`, icon quà, và trạng thái đã có/chưa có trong `reward.csv`. Bỏ qua các type chưa có chuẩn (6, 11, 12, 13, 14, 15): không đưa vào dropdown.

## Việc cần làm (mỗi pha một commit local)

### Pha 1 — Dữ liệu
1. Viết `tools/sync-reward-id.mjs` (không nhận đường dẫn ghi tùy ý; guard output nằm trong `dist/`). Đọc từ `--project-root`: `Assets/CSV/reward.csv`, `Pet.csv`, `mutation.csv`, `weatherEffects.csv`, `Mutagen.csv`, `WeatherGen.csv`, `RotationShopItems.csv`, và chỉ các `.fcg` cần để xác nhận cách parser đọc Value của reward (RewardManager và config reward). Ghi hash từng nguồn và commit game vào `dist/data/reward-id.json` cùng: danh sách reward hiện có, catalog pet/mutation/weather, bảng RSItemID (RotationShopItems `Type=2` → Mutagen, `Type=4` → WeatherGen, cột `Value` là ID trong Mutagen.csv/WeatherGen.csv, RSItemID là cột `ID`), bảng rarity COMMON=1…APEX=6, LIMITED=7.
2. Xác nhận từ `.fcg` xem Value của Pet trong reward.csv có đọc được weather (phần thứ 3) không. Ghi kết luận kèm file:dòng vào JSON (`notes`). Nếu chưa xác nhận: khi chọn weather ≠ 0 vẫn sinh ID nhưng KHÔNG sinh dòng CSV, hiện cảnh báo. Không tự sửa game.
3. Commit: `feat(sync): export reward id catalog and existing rewards`.

### Pha 2 — Model + audit
1. `dist/reward-id-model.js` (dạng UMD như `mail-composer-model.js`, chạy được trong Node): `encode(data, draft)` trả `{valid, errors, warnings, id, csvRow, display}` và `lookup(data, result)` trả một trong `exists` / `id-conflict` / `equivalent-other-id` / `new`.
2. Quy tắc (chi tiết ở plan): ID = số Type viết thẳng + các phần pad; int32 tối đa 2147483647 else lỗi; Amount cho type 3,7,8,9,10,16,17: <1000 → 3 số, 1000–999999 → 6 số, ≥1000000 lỗi, chỉ số nguyên dương; Money = mantissa 0.1–999.9 (1 số thập phân) + hậu tố, dùng cùng thuật toán rank như bộ soạn Mail (`unit*10000 + mantissa*10`, 5 số); MoneyTime = giờ×10, 4 số; Pet/RandomPet/Money/MoneyTime khóa Quantity=1; Mutagen/WeatherGen: Value = ID config, Quantity = amount, thiếu RSItemID thì lỗi "chưa có RSItemID". Quantity của Mutagen/WeatherGen nằm ở cột Quantity, amount của Dust/PetCoin/Spin/DMMP/Ticket nằm ở cột Value (đúng theo reward.csv hiện tại).
3. `tools/audit-reward-id.mjs`: test vector (100010100, 220250, 3999, 3012300, 4050100, 50015, 7999, 7012300, 8999, 9999, 1020001005, 1640027010, 17050), biên amount (999, 1000, 999999, 1000000, 0, âm, thập phân), ID vượt int32, Mutagen/WeatherGen không có RSItemID, và phân loại toàn bộ dòng reward.csv hiện có (không crash; đếm exists/conflict/equivalent). Ghi `dist/data/reward-id-audit.json`. Mọi vector phải pass trước khi sang pha 3.
4. Commit: `feat(rewards): add reward id encoder and audit`.

### Pha 3 — Tab giao diện
1. `dist/app-reward-id.js` + nút nav `Reward ID` trong `index.html` + route trong `app-router.js` (cache-bust giống các script khác). Form: dropdown Type (chỉ type có chuẩn); Amount luôn hiện (khóa và giải thích khi Quantity cố định = 1); field riêng theo type như bảng "Field theo type" trong plan (Pet có ô tìm theo tên/ID; Mutation, Weather dropdown có icon; Rarity; Mutagen/WeatherGen chọn theo tên + rarity; Money mantissa + hậu tố; MoneyTime giờ). Không hard-code dữ liệu config trong JS.
2. Kết quả realtime: icon quà lớn + tên, badge mutation/weather như bộ soạn Mail, Reward ID, dòng CSV (nút copy; vô hiệu khi lỗi), lỗi/cảnh báo theo field, và huy hiệu trạng thái đối chiếu (Đã có / Trùng ID khác nội dung — kèm dòng đang có / Đã có tương đương ở ID legacy X / Chưa có). Icon chỉ tái dùng snapshot GDD sẵn có (mail-composer.json và `app-reward-display.js`); không copy asset game mới. Thiếu icon thì placeholder có nhãn và nêu trong báo cáo.
3. Lưu draft vào localStorage bọc try/catch; hợp 1440 và 390 px, không tràn ngang; không console error.
4. Commit: `feat(rewards): add reward id converter tab`.

### Pha 4 — Kiểm tra và tài liệu
1. Serve: `python -m http.server 8080 --directory dist`. Kiểm bằng trình duyệt ở 1440 và 390: mỗi type có đủ field, kết quả khớp test vector, invalid thì không copy, trạng thái đối chiếu đúng với một dòng đã có / một ID va chạm / một quà mới. Đọc console.
2. Chạy lại toàn bộ audit hiện có (Preview, Proposal, Mail composer, UI Components) và xác nhận 0 mismatch; `git diff --stat` không được chạm `design/ui-proposals/**`, snapshot UI, hay repo game.
3. Cập nhật `plans/PLAN-reward-id.md` (mục kết quả kiểm tra, câu hỏi mở đã đóng), thêm vào `CLAUDE.md` mục Bản đồ project và Lệnh thường dùng một dòng cho `sync-reward-id.mjs` / `audit-reward-id.mjs`.
4. Commit: `docs(rewards): record reward id converter results`.

## Quy tắc commit

Conventional Commits 1.0.0 (`AGENTS.md`). Dòng đầu phải khớp
`^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: .{1,72}$`.
Trước mỗi commit chạy `git status` và `git diff --stat`, chỉ stage file của pha đó. Không push, amend, rebase, reset, tạo tag.

## Báo cáo cuối

Liệt kê: commit (hash + message), kết quả audit, kết luận về weather trong Value của Pet (kèm file:dòng), danh sách icon còn thiếu (nếu có), số dòng reward.csv theo từng trạng thái (exists/conflict/equivalent), và những gì chưa kiểm chứng.
````
