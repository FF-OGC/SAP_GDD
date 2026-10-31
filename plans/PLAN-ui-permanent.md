# UI Preview · Permanent Event Dig / Fish

Một cây PermanentEvent.ui với Type Dig/Fish trong bảng mô phỏng ngoài canvas.
Source controller HudPermanentEvent, PlayerEventDig, PlayerFishingClient,
EventDigConfig, PetConfigs_Client, UIUtilsClient và BigNumberHandlerClient.
Fixture pet lấy hai dòng đầu thuộc pool Dig/Fish, không giả làm inventory thật.

Phủ profile đổi icon/background DigIcon+Dirt và FishIcon+Tidal; toggle event
mode, Dig scan cooldown 3s, switch cooldown 2s; hitbar bắt đầu .125/.4 và đi
từ -200 tới 200. Dig dùng COMMON scan/spot: power/drift nguồn chia400;
Fish dùng gain/drift mặc định nguồn. Có state inventory miễn phí/cần mua,
exchange Yes/No, confirm buy, reveal reward, success/fail hitbar.

Cost bị controller ẩn nên giữ ẩn; không bật các nút tăng/giảm giá từ UI cũ.
Inventory height dùng công thức ước lượng source theo character width VI/EN,
không tự dùng CSS text measurement để đổi thuật toán game.

Giới hạn: giữ geometry action button serialize vì không có kích thước Default
Attack runtime; chưa thực thi world target/camera/water, network, ownership,
RNG, tween/3D. Chỉ COMMON Dig không gap tier và Fish default; các điều kiện
runtime khác lưu trong assignments/gap. Chưa có ảnh engine đối chiếu.
Static pass:58 entity,32 sprite,6 thiếu; không thiếu localization;2 alias
đăng ký cũ (Event/MashMeter) ghi trong audit. CUA 2026-11-01: DOM58/58,
mismatch0; Dig có Scan, Fish ẩn Scan và gán FishIcon; purchase mở ConfirmBuy,
No đóng; exchange hiện Reject; Fish hitbar chạy và giảm ratio .4 theo timer.
390×844 không tràn ngang; console error rỗng. Hint2s có visibility, tween
chưa mô phỏng. Không tuyên bố pixel parity.
