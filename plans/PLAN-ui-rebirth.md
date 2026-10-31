# Rebirth → UI Preview

Map Rebirth.ui + HudRebirth/RebirthManager/RebirthConfigs/FeatureUnlockConfigs.
Giữ cây và props, clone required pets theo config, thanh tiền, owned masks,
reward changes và popup UnlockContent; source max six reward widgets.
Tất cả cấp, tiền, sở hữu và kết quả là mô phỏng ngoài canvas.

ConfirmWidget và một số đăng ký label cũ còn trong controller/registration
nhưng không còn trong Rebirth.ui. Không tạo dialog giả trong Preview; dùng
nút QA xác nhận bên ngoài canvas để thử thành công/UnlockContent. Redirect
Collection chỉ thông báo đích mô phỏng. Chưa có ảnh game/font/scaler/shader
để xác nhận pixel parity.

Static audit đã pass: 91 entity, 87 sprite, 3 lib sprite thiếu, không thiếu
localization/registration. CUA 2026-11-01: deep-link DOM 91/91 mismatch 0;
390×844 không tràn ngang; ví 10000, cấp1 → cấp2 mở UnlockContent; cấp2
hiển thị required pet và đổi OwnedMask; cấp27 ẩn RebirthButton/hiện warning.
Console error không có trong lượt kiểm. Chưa đối chiếu runtime game.
