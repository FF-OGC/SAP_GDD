# UI Shop → UI Preview

Yêu cầu 2026-11-01: map Shop hiện có trong game, cùng pipeline với Collection.
Đích: `#uipreview/shop`; không tạo/sửa Proposal.

1. Đăng ký phạm vi Shop.ui, controller/config, sprite và localization dùng thật.
2. Sinh snapshot đủ entity/raw props, manifest 9-grid, binding và provenance.
3. Binder riêng: mở/đóng, ba nhóm hàng, selection/details, tiền và giá,
   bạn bè giảm giá, Rebirth, stock và cooldown mô phỏng trong RAM.
4. Audit source/asset, browser desktop/mobile, chuyển Collection/Activities,
   deep-link và không cuộn shell khi thao tác game. Commit local; không push.

Server và gameplay UseItem không chạy trên web. Thiếu ảnh engine nên chỉ
kết luận source mapping và hành vi web đã kiểm; chưa xác nhận pixel parity.

## Kết quả 2026-11-01

- Source audit pass: 70/70 entity (ID/path/type/raw props/eca), hash tất cả
  source controller/config, 100 PNG và border metadata; 60 wave tham chiếu
  item hợp lệ. Sync Shop lặp lại không thay hash JSON. Không regenerate
  Collection, Activities hay các Proposal.
- 110 sprite trong manifest, 10 thiếu: 7 `lib://`, 3 resource cũ
  `Assets/Sprites/Mutations/{Rainy,Snowy,Windy}.png`. PNG cùng tên ở Weather
  có fileId khác nên không thay. 23 entity có field unsupported được giữ
  nguyên trong manifest; không coi chúng là đã hỗ trợ đầy đủ.
- CUA/browser: deep-link trực tiếp; DOM 70/70, 0 mismatch; desktop
  1440×1100 và mobile 390×844, không overflow ngang. Tương tác theo tọa độ
  ở cả hai viewport giữ scrollX/Y và resource row ID.
- Chọn pet → chi tiết/nút vàng; 1000 Coin mua pet giá 60 → 940, stock 4/4
  → 3/4. Mua tinh chất hai lần → 0/2, khóa/nút unavailable. Bạn bè giảm
  giá 20 → 16. Wave 60 render sáu món đúng config. Rebirth 3 hiện pet
  16/17; pet 16 giá 164 k, mua từ 1 m còn 836000 Money. Rebirth 16 ẩn nhóm.
- Vật phẩm thường #1 cooldown 30 giây, reset selection/nút unavailable.
  Mua thời tiết #6 kích hoạt cooldown chung 300 giây cho #6/#7/#8; timer
  giảm trên mobile. Scroll nội bộ đã chạy. Mở/đóng qua button game pass.
- Ngôn ngữ vi/en, rich text b/i/s/color và clone pressed/reset được map;
  rich text b trong chi tiết tinh chất đã quan sát. i/s/color chưa có case
  browser riêng ngoài giá gạch ngang khi giảm giá.
- Chuyển Collection DOM 107/107 và Activities 286/286, 0 mismatch; không
  thấy console warning/error trong các case đã chạy. Không đổi renderer
  chung hoặc baseline Proposal. Ảnh: `dist/data/ui/shop-desktop.jpg`,
  `shop-mobile.jpg`.

Giới hạn: mô phỏng mua thường không kiểm Requirement/target/gameplay thành
công. Wave chọn bằng tay và stock giả lập từ config, không giả là stock
server. WeatherGen không xuất hiện trong 60 wave nên binder branch chưa
được thử với stock thực; giữ lỗi source gọi tên Weather bằng WeatherEffect
ID và nhánh mô tả trùng Mutagen thay vì sửa game qua Preview. Còn thiếu
localization `HUD_ROTATION_SHOP_WEATHERGEN_DESC` của nhánh không thể tới.
Không có ảnh runtime engine; chưa thể xác nhận hình ảnh khớp tuyệt đối.
