# UI Mail → UI Preview

Yêu cầu 2026-11-01: adapt Mail từ project game tương tự Collection.
Đích `#uipreview/mail`; không có Proposal Mail trong cây hoặc lịch sử Git.
Không sửa renderer chung, baseline Collection/Activities/Shop hay Proposal.
Scope nguồn Mail được đăng ký trong CLAUDE.md theo yêu cầu người dùng.

## Pipeline và nguồn

- Game chỉ đọc, commit `471a62bb8a55ad735cfeebf5a0a315730df90daa`.
  `Mail.ui`, HudMail, MailsManager, MailConfigs, ItemConfigs, PetConfigs,
  UIUtils và BigNumberHandler có hash trong `mail-rules.json`.
- Snapshot giữ 128 entity: ID/path/type/order, raw props, ecaProps,
  sourceFields (kể cả ecaScripts/componentList). Audit so với UI độc lập.
  Manifest giữ 22 entity có field chưa được renderer chung hỗ trợ đầy đủ;
  scroll/input được binder xử lý theo policy web và ghi runtime override.
- Nội dung thông báo và tiêu đề lấy đúng key localization từ HudMail;
  nội dung thư hệ thống từ MailDetails.csv. Không mirror toàn localization.
  Pet/Mutagen/WeatherGen/mutation/weatherEffects chỉ dùng để chọn tài nguyên
  cho fixture tổng hợp. Không đọc giftcode.csv hoặc Compensate/**.
- Sprite static/runtime giữ identity, declared/resolved path, 9-grid và PNG.
  36 resource: 31 có PNG, 5 thiếu gồm 2 `lib://`, Facebook.png,
  SquareRounded100.png (RarityBG cũ) và Mutations/Rainy.png.
  Không dùng sprite cùng tên có identity khác để thay thế.
- Generator chỉ ghi trong GDD/dist, sync riêng `--screen mail`.

## Hành vi

Hai tab Notice/System, ba thông báo, NextVersion chỉ ở thông báo đầu,
URL cộng đồng, chọn tiêu đề và selected sprite/text color theo controller.
Nội dung có rich text b/i/s/color an toàn qua DOM; không đưa text vào HTML.
ClaimAll/DeleteAll giữ inactive theo source. Inspector giữ source/runtime.

Hộp thư mặc định rỗng; panel cho bộ 5 thư tổng hợp hoặc 30 thư, ngày còn lại,
loading, ô trống và thu nhập Money/s. Fixture được ghi rõ trong dữ liệu;
không giả là hộp thư hoặc số dư server. Phủ PetCoin/Dust/Spin/RandomPet/Money,
Pet, Mutagen, WeatherGen, DuplicateTicket, RandomSecretPool và MoneyTime.
Pet fixture là pet đường đi đầu tiên, mutation/weather lấy từ config;
chưa phủ badge của pet Fusion/Fishing/Dig. PetCoin/quantity ví dụ là QA,
không phải đề xuất balance hoặc cấu hình thưởng vận hành.

Nhận thử kiểm ô trống cho Pet/RandomPet theo PET_MAIL_TYPE, sau đó xóa thư
trong RAM. Không cấp thưởng, database hay gọi gameplay. Giữ selected index
sau claim như HudMail: nhận thư cuối có thể hiển thị trạng thái không có quà
dù còn thư khác. Có thể chọn lại thư còn tồn tại. Loading là kịch bản web
riêng, không mô phỏng đầy đủ lifecycle DatabaseController/OpenMail.

## Kiểm chứng thực chạy

- G0 pass: chỉ Preview Mail; không regenerate Proposal hoặc màn cũ.
- G1 pass: `node tools/audit-ui-mail.mjs --project-root
  C:/_Code/craftland/StealAPet`; 128 entity/raw props/source fields;
  hash controller/config/CSV, 31 PNG và metadata identity/border;
  không thiếu localization. Sync lặp lại cho cùng hash JSON.
- G2/G3: CUA tại 1440×1100 và 390×844, deep-link trực tiếp, DOM 128/128,
  0 mismatch, không overflow ngang. Đã xem ảnh thông báo, reward currency,
  pet và items; text/rich text, selected tab/card, native scrolling.
  Ảnh ở `mail-desktop.jpg`, `mail-mobile.jpg`; trace ở
  `mail-browser-audit.json`. Không có test tự động pixel/overlay với engine.
- Gameplay click theo tọa độ: tab/title/claim giữ window scroll và stage;
  30 hàng có clone identity, cuộn danh sách mobile không cuộn shell.
  Phủ claim chọn index 1, claim index cuối, nhà đầy/chưa đầy, empty,
  loading, close/reopen, vi/en, năm reward slot và MoneyTime với income thử.
- Regression: Collection DOM 107/107, Activities 286/286, Shop 70/70,
  Mail 128/128; 0 mismatch. Không có console error/warn trong lượt kiểm.
- G4 chưa có bằng chứng: không được mở game/build và chưa có ảnh engine.
  Font fallback, shader/scaler/safe area, input và hit order/inertia chưa
  được xác nhận bằng runtime; không tuyên bố pixel-perfect.

## Chạy lại

```powershell
node tools/sync-ui-preview.mjs --project-root C:/_Code/craftland/StealAPet --screen mail
node tools/audit-ui-mail.mjs --project-root C:/_Code/craftland/StealAPet
```

Website vẫn tĩnh. Chỉ commit local, không push hoặc publish.
