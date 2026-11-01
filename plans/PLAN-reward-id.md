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
| 10 | Mutagen | `10·RSItemID(5)·Amount` | Value MutagenID, Qty amount | 1020001005 |
| 16 | WeatherGen | `16·RSItemID(5)·Amount` | Value WeatherGenID, Qty amount | 1640027010 |
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
- **RSItemID (Type 10/16)**: lấy từ `RotationShopItems.csv` — dòng có
  `Type=2` (Mutagen) / `Type=4` (WeatherGen) và cột `Value` = ID Mutagen /
  WeatherGen trong `Mutagen.csv` / `WeatherGen.csv`; RSItemID là cột `ID` của
  dòng đó (vd 20001 ↔ Mutagen 0 Golden Common). Mutagen/WeatherGen không có
  dòng Rotation Shop → báo "chưa có RSItemID", không sinh ID.
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

## Câu hỏi còn mở (Codex phải kiểm, không tự bịa)

- `reward.csv` Value của Pet chỉ có `IdPet;Mutation`, chưa có chỗ weather. Cần
  đọc parser reward trong `.fcg` (RewardManager và config reward) để biết có
  đọc phần thứ 3 không. Nếu chưa xác nhận: vẫn sinh ID khi chọn weather nhưng
  KHÔNG sinh dòng CSV, ghi cảnh báo "Value chưa hỗ trợ weather". Chỉ sinh
  `;WeatherID` khi parser xác nhận.
- Type 8 (DMMP) và Type 4 có Weather chưa có dòng nào trong `reward.csv`; chỉ sinh
  theo chuẩn, đánh dấu "chưa có mẫu legacy".

## Dữ liệu và kiến trúc

- `tools/sync-reward-id.mjs`: chỉ đọc `Assets/CSV/reward.csv`, `Pet.csv`,
  `mutation.csv`, `weatherEffects.csv`, `Mutagen.csv`, `WeatherGen.csv`,
  `RotationShopItems.csv` (đều trong `Assets/CSV/**`, không cần mở allowlist)
  cùng các `.fcg` reward để xác nhận parser. Ghi hash nguồn + commit game.
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
  50015, 7999, 7012300, 8999, 9999, 1020001005, 1640027010, 17050.
- Biên amount: 999→`999`, 1000→`001000`, 999999→`999999`, 1000000→lỗi, 0/âm/thập phân→lỗi; ID > int32→lỗi.
- Mọi dòng `reward.csv` hiện có được phân loại không crash; ID chuẩn trùng ID
  legacy khác nội dung được phát hiện; dòng tương đương được báo.
- Mọi pet/mutation/weather/mutagen/weathergen chọn được đều có icon hoặc
  cảnh báo rõ; không có ảnh vỡ.
- Không console error; 1440 và 390 không tràn ngang; invalid → không copy.
- Regression: audit Preview/Proposal/Mail composer/UI Components không đổi
  (0 mismatch); `git diff` không chạm `design/ui-proposals/**`, snapshot UI, repo game.
- Chỉ commit local, Conventional Commits, mỗi pha một commit; không push.
