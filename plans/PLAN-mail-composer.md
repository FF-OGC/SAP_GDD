# Bộ soạn quà Mail → GMT

Yêu cầu 2026-11-01: chọn loại/số lượng/giá trị tối đa 5 quà, mô phỏng mail
và xuất field cần điền trong GMT Mails Manager. Đây là công cụ ngoài canvas
ở `#uipreview/mail`; không thiết kế lại game hoặc tạo Proposal Mail.

## Dữ liệu và field

`tools/sync-mail-composer.mjs` chỉ đọc source game; ghi riêng
`dist/data/ui/mail-composer.json`, không regenerate baseline hay Proposal.
Nguồn có hash: HudMailsManager, MailsManager, RewardManager, DataUtils,
EditorGenLib và catalog CSV được chiếu ID/tên/rarity/thuộc tính cần chọn.
Chỉ tái dùng icon đã có trong GDD; không copy thêm asset game, không đọc
giftcode/Compensate hay trích UID/map presets. Ghi cả commit source hiện tại
và commit snapshot icon vì chúng có thể khác nhau. Icon chỉ được liên kết
khi ID/tên trong catalog source còn khớp snapshot GDD.

Hỗ trợ 10 loại có nhánh ClaimReward: Coin, Dust, Money, MoneyTime, Pet,
RandomPet, Mutagen, WeatherGen, Spin, DuplicateTicket. Loại chưa có nhánh
thực thi (ví dụ RandomSecretPool) không được xuất. Field dùng enum source,
không dùng vị trí trong dropdown. Mẫu tiêu đề/nội dung từ MailDetails.csv;
`IsConfig=0`, Gift ID trong GMT là MailDetails ID.

Ví dụ yêu cầu gốc:

```text
IsConfig: 0
GiftId: 1
RewardTypes: 3,7
RewardValues: {5:10}{5:500}
RewardAmounts: 10,500
```

Map Code và UUID do người vận hành chọn/điền trong GMT. Dùng **Update
Pending Mails** (`HudMailsManager.fcg:228`); GMT tự tạo CA bằng server time.
Update Mails cũ vẫn ghi store cũ, không phải luồng append pending hiện tại.
Không xuất câu lệnh gọi server hoặc tự gửi thư.

## Hợp đồng đặc biệt đã đối chiếu source

- Các map RV phải liền nhau. Dấu `;` giữa hai map bị parser mail-level
  coi là ngăn field; RV chỉ còn map đầu. Các key bên trong map vẫn dùng `;`.
- Một map RV không rỗng cho mỗi mục, kể cả scalar. Raw `RV={}` bị
  ExtractRewardValue trả về list rỗng nên có thể lệch index.
- Money: chọn mantissa + suffix, xuất rank score RA. Ví dụ 10 m → 30100.
  Đơn vị cơ bản chỉ dùng số nguyên vì hàm chuyển rank bỏ phần thập phân.
- MoneyTime chỉ nhận số giờ nguyên vì ExtractMailsData dùng parser int cho RA.
- RandomPet luôn một pet/mục: ClaimReward không lặp theo RA. Cần thêm mục
  quà nếu muốn nhiều pet; pool thực phụ thuộc Rebirth, không roll trên web.
- Pet gửi ID, mutation và danh sách weather. Không xuất PetLevel vì đường
  ClaimPet hiện tại không đọc nó. Preview custom chưa map đầy đủ obtain badge.
- WeatherGen: parser giữ key 12 dưới dạng string; cast int trong ClaimReward
  chưa được xác minh bằng game. Tool giữ cảnh báo, không tự sửa game.

## Lỗi source cần xử lý riêng

`MailsManager.fcg:410` serialize RV bằng
`DataUtils.ListKeyValueToJsonString` (`DataUtils.fcg:221`), chèn `;` giữa map.
`JsonStringToKeyValueV3` (`DataUtils.fcg:338`) tách `;` ở depth 0 nên không
đọc đủ RV từ chính chuỗi serialize này. Test tái hiện 5 map → 1 map sau
source-style save; GMT input dùng map liền nhau đọc đủ 5 map.

Đây là kết luận đối chiếu code và bản port parser cho QA, chưa chạy engine.
Do đó không tuyên bố luồng nhận thưởng sau save/reconnect đã pass. Cảnh báo
hiện ngay trên bộ soạn khi có nhiều quà; không sửa repo game chỉ đọc.

## Kết quả kiểm tra

- Audit source hash + ví dụ Coin/Dust + một map đơn + parse toàn mail lồng
  5 map/RT/RA + Money boundary + 15 input không hợp lệ: pass.
- CUA 1440×1100 và 390×844: field realtime, invalid xóa output/chặn copy,
  không thêm quà thứ 6, xóa quà, control theo type, pet/mutation/weather,
  Money rank, copy một field và tất cả, canvas x10/x500, lưu draft khi
  chuyển trang/reload, không overflow ngang. Không console error/warn.
- Regression: Collection 107/107, Activities 286/286, Shop 70/70,
  Mail 128/128; 0 mismatch. Bộ soạn chỉ hiện ở Mail. Không sửa renderer,
  snapshot game hoặc nguồn/output Proposal.
- Report: `mail-composer-audit.json`, `mail-composer-browser-audit.json`;
  ảnh `mail-composer-desktop.jpg`, `mail-composer-mobile.jpg`.

```powershell
node tools/sync-mail-composer.mjs --project-root C:/_Code/craftland/StealAPet
node tools/audit-mail-composer.mjs --project-root C:/_Code/craftland/StealAPet
```

Website vẫn static, draft lưu localStorage trình duyệt. Chỉ commit local.
