# Shop Event → UI Preview

Nguồn: ShopEvent.ui, HudShopEvent, EventShopConfigs/Manager và currency,
ShopEventItems/EventSchedule/Pet/reward và catalog icon phụ thuộc. Gift chỉ
chiếu ID/Reward cho GiftId được Shop tham chiếu. Giữ nguyên cây 185 entity,
props/callback và ID; runtime values ghi riêng trong Inspector. Proposal giữ nguyên.

Màn hình: shop, dialog, tasks, submit; chọn schedule/ShopId; exclusive đầu
tiên, recommended hai item tiếp, general phần còn lại theo thứ tự CSV.
Selection, số dư, giới hạn mua, khóa thời gian, cooldown và mua cục bộ;
hai tab đổi sprite/màu theo controller; submit chuyển tầng 1–4 với kho trống.

Giới hạn mua hiển thị số lượt còn lại/max theo EventShopManager.GetStringLimit;
hết lượt thì xóa giá ở card. Exclusive pet hiển thị income/giới hạn nguồn;
pet thường có rarity, tên, giá và income trong Details. Mutagen/WeatherGen
giữ prefix, tên mutation/effect, rarity và màu rich text từ config.

ObtainableRewards của RandomPet lấy đúng pool CURREWARDID trong
RewardRandomConfig và poolRewardSecret.csv; RandomItem lấy toàn bộ
PoolRandomItem.csv, icon/rarity theo ItemConfigs. Đây là catalog hiển thị,
không chạy random draw hay mở rộng projection gift. Countdown dùng
HUD_SHOP_EVENT_END_LABEL + UIUtils.FormatTime (hai đơn vị khác 0), grace
cộng SHOP_EXTEND_SECONDS từ EventSettings.

Giới hạn: daily task progress và kho submit là trạng thái mô phỏng, không giả
tiến độ server. Chưa triển khai phát thưởng/pool draw, nhiệm vụ rarity động,
BaseColor unlock và server validation. Sprite lib:// không có bytes trong
checkout; ba tham chiếu Img_Itemtitle01/Img_Quality không tìm thấy đúng fileId
trong phạm vi nguồn được đăng ký, giữ missing trong manifest.
Không thay bằng ảnh tự tạo. Chưa có ảnh runtime để kết luận pixel parity.

Kiểm tra: `node tools/audit-ui-source-screen.mjs --project-root
"C:\_Code\craftland\StealAPet" --screen shop-event` kiểm cây, props, source
hash, PNG bytes/metadata và projection. Đã chạy pass: 185 entity, 80 sprite,
12 missing nêu trên, không thiếu localization/registration.

Browser CUA 2026-11-01: deep-link tải được DOM 185/185, mismatch 0; chọn
exclusive item, ví 10000 → mua 400 còn 9600; task tab có 3 row, hoàn thành
và claim mô phỏng thành công. Viewport 390×844 không tràn ngang, stage
345.2px. Console error không có trong lượt tải và thao tác đã kiểm.
