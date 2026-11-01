# Bộ chuyển đổi Reward ID (tab "Reward ID")

Yêu cầu 2026-11-01: `reward.csv` chưa có chuẩn ID nên mỗi lần config phải dò tay
xem quà đã tồn tại chưa, thứ tự lộn xộn. Chuẩn ID mới do người dùng chốt ở
bảng bên dưới. Tab này nhập quà → sinh Reward ID chuẩn + dòng CSV, báo đã có
trong config hay chưa. Đây là công cụ nội dung ngoài canvas: không đổi UI
Preview/Proposal, không ghi vào game (chỉ đọc), không sửa `reward.csv`.

## Chuẩn ID (nguồn: người dùng, chỉ làm type đã có chuẩn)

`<Type>` là số type viết thẳng, không pad (1 hoặc 2 chữ số). ID là int32
(≤ 2147483647) → vượt thì báo lỗi.

| Type | Quà | ID | Value / Quantity trong dòng CSV | Ví dụ |
|---|---|---|---|---|
| 1 | Pet | `1·PetID(4)·Mutation(2)·Weather(2)` | Value `PetID;Mutation`, Qty 1 | 100010100 |
| 2 | Money | `2·RankValue(5)` | Value rank, Qty 1 | 220250 (25k) |
| 3 | Pet Coin | `3·Amount` | Value amount, Qty 1 | 3999, 3012300 |
| 4 | RandomPet | `4·Rarity(2)·Mutation(2)·Weather(2)` | Value `RARITY;Mutation`, Qty 1 | 4050100 |
| 5 | MoneyTime | `5·Amount(4)` (giờ × 10) | Value giờ (vd `1.5`), Qty 1 | 50015 |
| 7 | Dust | `7·Amount` | Value amount, Qty 1 | 7999, 7012300 |
| 8 | DMMP | `8·Amount` | Value amount, Qty 1 | 8999 |
| 9 | Spin | `9·Amount` | Value amount, Qty 1 | 9999 |
| 10 | Mutagen | `10·MutagenID(3)·Amount` | Value MutagenID, Qty amount | 10000005 (MutagenID 0, x5) |
| 16 | WeatherGen | `16·WeatherGenID(3)·Amount` | Value WeatherGenID, Qty amount | 16015010 (WeatherGenID 15, x10) |
| 17 | Duplicate Ticket | `17·Amount` | Value amount, Qty 1 | 17050 |

Bỏ qua (chưa có chuẩn): 6 RandomSecretPool, 11 Meteorite, 12 Mole, 13 Ball1,
14 Ball2, 15 Rarity Gem. Dropdown không liệt kê các type này.

Quy tắc đã chốt:

- **Amount cho Type 3, 7, 8, 9, 10, 16, 17**: `< 1000` → luôn 3 số (50→`050`);
  `1000…999999` → luôn 6 số (1106→`001106`, 23598→`023598`); `≥ 1000000` → lỗi
  (không vừa int). Amount phải là số nguyên dương.
- **Rarity (Type 4)**: COMMON=1, RARE=2, EPIC=3, LEGENDARY=4, MYTHIC=5,
  APEX=6, LIMITED=7, viết 2 số.
- **Mutation**: ID trong `mutation.csv`, 2 số, `01` = Normal (không đột biến).
- **Weather**: đúng một weather, ID trong `weatherEffects.csv`, 2 số, `00` =
  không có. Tool cho chọn weather ở Pet và RandomPet.
- **Mutagen/WeatherGen ID (Type 10/16)**: lấy trực tiếp cột `ID` từ
  `Mutagen.csv` / `WeatherGen.csv`, pad 3 chữ số trong Reward ID.
  Không phụ thuộc `RotationShopItems.csv`. Phần Amount theo quy tắc chung:
  dưới 1000 pad 3 số; 1000–999999 pad 6 số; 1000000 trở lên lỗi.
  Ví dụ Mutagen ID 0 × 5 → `10000005`; WeatherGen ID 15 × 10 → `16015010`.
  CSV giữ `Value = config ID`, `Quantity = amount`.

- **Money**: nhập mantissa (0.1–999.9, tối đa 1 số thập phân) + hậu tố như bộ
  soạn Mail (`unit×10000 + mantissa×10`). 25k → `20250`. Đơn vị cơ bản chỉ nhận
  số nguyên.
- **MoneyTime**: giờ tối đa 1 số thập phân, 0.1–999.9, pad 4 số theo giờ×10.
- **Pet / RandomPet / Money / MoneyTime**: chuẩn ID không có chỗ cho số lượng →
  Quantity khóa = 1; muốn nhiều thì thêm nhiều mục quà (ghi chú ngay trên form).
  Với các type còn lại, field "Số lượng/Amount" là bắt buộc theo bảng trên.

## Field theo type

Mọi type có **Type** và **Amount** (bắt buộc). Field riêng:

| Type | Field riêng | Ghi chú |
|---|---|---|
| Pet | Pet (tìm theo tên/ID), Mutation, Weather | Amount khóa 1 |
| RandomPet | Rarity, Mutation, Weather | Amount khóa 1 |
| Money | Mantissa, Hậu tố | "Amount" = giá trị tiền |
| MoneyTime | Giờ | "Amount" = số giờ |
| Mutagen | Mutagen (tên + rarity) | amount = Quantity |
| WeatherGen | WeatherGen (weather + rarity) | amount = Quantity |
| Pet Coin, Dust, DMMP, Spin, Duplicate Ticket | không | Amount = số nguyên |

## Kết quả hiển thị

1. Icon quà (visualize) + tên dễ đọc; Pet có badge mutation/weather như bộ soạn Mail.
2. Reward ID, dòng CSV `ID,TypeReward,Value,Quantity` (nút copy).
3. Trạng thái đối chiếu `reward.csv`:
   - **Đã có**: ID tồn tại và Type/Value/Quantity khớp.
   - **Trùng ID khác nội dung**: ID tồn tại nhưng nội dung khác (ID legacy
     va chạm) → lỗi, hiện cả dòng đang có.
   - **Đã có tương đương ID khác**: chưa có ID chuẩn nhưng Type/Value/Quantity
     đã tồn tại dưới ID legacy → hiện ID đó, khuyên tái dùng hoặc đổi.
   - **Chưa có**: sẵn sàng thêm dòng mới.
4. Lỗi/cảnh báo theo field, xóa output khi input không hợp lệ.

Pha 2 (nếu muốn sau): ô giải mã ID → type/field; bảng liệt kê dòng legacy
đã/chưa đúng chuẩn để chuẩn hóa dần.

## Câu hỏi nguồn — đã đối chiếu ngày 2026-11-01

- **Pet weather đã xác nhận ở luồng config Mail**: `MailConfigs.fcg:87`
  tách Value theo `;`; `MailsManager.fcg:946` đọc `rewardRawValue[2]`
  thành danh sách weather; `RewardManager.fcg:58` truyền weather vào ClaimPet.
  Không có weather: giữ `PetID;Mutation`; có weather: xuất
  `PetID;Mutation;WeatherID`. Không dùng nhánh ClaimRewardByType để suy ra
  parser Mail vì nhánh đó truyền danh sách weather rỗng.
- **Giới hạn Pet còn mở ở engine**: `MailsManager.fcg:947` còn đọc phần thứ
  tư (level), trong khi ClaimPet hiện không dùng level. Chưa kiểm hành vi
  thiếu phần thứ tư bằng engine; cảnh báo luôn hiện khi chọn Pet.
- **RandomPet weather không được parser config hỗ trợ**:
  `MailsManager.fcg:958` chỉ đọc rarity, không đọc mutation/weather.
  Weather khác 0 vẫn sinh ID nhưng chặn CSV. Mutation có trong chuẩn CSV
  người dùng chốt, kèm cảnh báo rằng parser config hiện bỏ qua mutation.
- **Type 8 DMMP** chưa có mẫu legacy; sinh theo chuẩn người dùng chốt,
  cảnh báo chưa xác minh nhánh cấp thưởng trong engine.

## Dữ liệu và kiến trúc

- `tools/sync-reward-id.mjs`: chỉ đọc `Assets/CSV/reward.csv`, `Pet.csv`,
  `mutation.csv`, `weatherEffects.csv`, `Mutagen.csv`, `WeatherGen.csv`,
  (đều trong `Assets/CSV/**`, không cần mở allowlist) cùng các `.fcg` reward
  để xác nhận parser. Mutagen/WeatherGen ID lấy trực tiếp từ catalog tương ứng.
  Ghi hash nguồn + commit game.
  Output duy nhất `dist/data/reward-id.json` (guard đích trong `dist/`). Không
  đọc giftcode/Compensate.
- Icon: tái dùng snapshot GDD đã có (`dist/data/ui/mail-composer.json`: pets,
  mutations, weathers, mutagens, weatherGens, randomIcons, sprites; và icon
  Money/PetCoin/Dust/Spin/DuplicateTicket trong `dist/app-reward-display.js`).
  Không copy asset game mới. DMMP chỉ dùng icon nếu GDD đã có; không thì placeholder
  có nhãn, ghi rõ trong report.
- `dist/reward-id-model.js`: logic thuần (encode, đối chiếu), chạy được trong
  Node để audit; `dist/app-reward-id.js`: form + hiển thị. Thêm vào
  `index.html` (nút nav `Reward ID` trong nhóm "NỘI DUNG") và `app-router.js`.
  Vanilla JS, tiếng Việt, gọn, hợp 390px; draft lưu localStorage (bọc try/catch).
- `tools/audit-reward-id.mjs`: test vector, đối chiếu, báo cáo `dist/data/reward-id-audit.json`.

## Acceptance

- Test vector khớp bảng ví dụ: 100010100, 220250, 3999, 3012300, 4050100,
  50015, 7999, 7012300, 8999, 9999, 10000005, 16015010, 17050.
- Biên amount: 999→`999`, 1000→`001000`, 999999→`999999`, 1000000→lỗi, 0/âm/thập phân→lỗi; ID > int32→lỗi.
- Mọi dòng `reward.csv` hiện có được phân loại không crash; ID chuẩn trùng ID
  legacy khác nội dung được phát hiện; dòng tương đương được báo.
- Mọi pet/mutation/weather/mutagen/weathergen chọn được đều có icon hoặc
  cảnh báo rõ; không có ảnh vỡ.
- Không console error; 1440 và 390 không tràn ngang; invalid → không copy.
- Regression: audit Preview/Proposal/Mail composer/UI Components không đổi
  (0 mismatch); `git diff` không chạm `design/ui-proposals/**`, snapshot UI, repo game.
- Chỉ commit local, Conventional Commits, mỗi pha một commit; không push.

## Kết quả triển khai và kiểm tra (2026-11-01)

Tab `#rewardid` nằm trong nhóm NỘI DUNG. Tool static, vanilla JS; không
sửa reward.csv, không copy asset mới, không đổi Preview/Proposal.
Catalog ghi source commit `92918e23af54d9d55a6c9545eb0d8948ef5530d3`
và SHA-256 của từng CSV/parser đã đọc. Không đọc giftcode/Compensate.

- Model: 13/13 vector chuẩn pass; biên amount 999/1000/999999,
  1000000/0/âm/thập phân, int32, config ID 3 chữ số, fixed Quantity,
  Money/MoneyTime và weather fallback pass.
- Browser Microsoft Edge headless, 1440×1000 và 390×1000: 13 vector/mỗi
  viewport, không overflow ngang, không console error hoặc HTTP lỗi,
  invalid xóa output/chặn copy; clipboard, draft qua reload, tìm Pet,
  Pet weather, RandomPet weather và đối chiếu trạng thái pass.
- Trạng thái **Đã có** dùng fixture chỉ trong browser vì catalog thực chưa
  có ID chuẩn; không sửa JSON/config. Va chạm và tương đương dùng dữ liệu
  thật, quà mới dùng Pet Coin 12345. Va chạm khóa cả hai nút copy, hiện
  dòng đang có để người dùng xử lý ID legacy.
- Đã xem ảnh desktop/mobile. Icon hiển thị không có ảnh vỡ; placeholder
  có nhãn và cảnh báo khi thiếu icon. Icon/mutation/weather giữ snapshot
  Mail, scalar giữ mapping app-reward-display.js.
- Thiếu icon: Pet **1055, 1056, 1057, 1058, 1059, 1060, 1061**;
  **Mutation 1 (Normal)**; **RandomPet LIMITED**; **DMMP**.
  Các field ID/tên/rarity của catalog có mặt trong snapshot Mail vẫn khớp.

### Phân loại 210 dòng reward.csv

Đối chiếu nguyên dòng hiện tại theo chính ID của nó: **exists 210,
id-conflict 0, equivalent-other-id 0, new 0**.

Khi chuyển nội dung từng dòng sang ID chuẩn mới: **exists 0,
id-conflict 6, equivalent-other-id 201, new 0, unencodable 3**.
Đây là số dòng nguồn, không phải số tuple quà duy nhất.

- Va chạm: ID nguồn 17, 22, 47, 48, 50, 21003; ID chuẩn đụng
  các ID legacy 50020, 50050, 50060, 50090.
- Chưa mã hóa: 20001 (type chưa có chuẩn), 20013 và 21001
  (Pet ID không có trong catalog hiện tại).
- Chi tiết mỗi dòng: `dist/data/reward-id-audit.json`.

### Regression — chưa đạt gate 0 mismatch

Đã chạy lại các audit yêu cầu. Không sửa audit hoặc snapshot để che lỗi.
Các input audit/snapshot UI và design/ui-proposals không có diff so với
commit trước task; các lỗi bên dưới nằm ở đối chiếu nguồn game/snapshot cũ.

| Audit | Kết quả |
|---|---|
| Reward ID | pass, 13 vector + các biên và lookup |
| Reward ID browser | pass cả 1440 và 390 |
| UI Components | pass 360 cases, 27 components, 303 entity instances |
| Preview Collection | fail: alpha PreventCloseButton, snapshot 100 / nguồn 0 |
| Proposal | fail: binding line HudCollection khác snapshot (132/174, 662/775…) |
| Mail composer | fail: hash EditorGenLib.fcc khác snapshot |
| Preview Activities / Shop / Mail | fail: hash PetConfigs.fcg khác snapshot |

Vì các audit dừng ở assertion đầu tiên, chưa biết tổng số mismatch phía sau.
Không tuyên bố toàn bộ regression pass. Việc hòa lại snapshot với checkout
mới là công việc riêng vì yêu cầu hiện tại bảo toàn snapshot UI/Proposal.
Không chạy game/Studio, chưa xác minh cấp thưởng thực tế, DMMP, RandomPet
mutation/weather hoặc Pet Value thiếu level trong engine.

Artifacts: `dist/data/reward-id.json`, `reward-id-audit.json`,
`reward-id-browser-audit.json`, `reward-id-1440.png`, `reward-id-390.png`.
Browser audit tái chạy bằng `node tools/audit-reward-id-browser.mjs`
(khi môi trường đã có Playwright và Microsoft Edge; không thêm build step).
Chỉ commit local; không push. Server kiểm tra: `http://localhost:8080/#rewardid`.
