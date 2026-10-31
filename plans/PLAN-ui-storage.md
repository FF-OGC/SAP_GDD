# UI Preview · Storage

Nguồn `PetStorage.ui` có root tên `PetInteract`; giữ nguyên identity.
Controller `HudPetStorage`, PetConfigs/MutationConfigs/WeatherConfigs,
RebirthConfigs, UIUtils.UpdatePetWidgetV3, StorageManager và BigNumberHandler.
CSV chiếu các cột cần dùng từ Pet, mutation, weatherEffects, Rebirth.

Map panel Storage và Confirm, clone template grid, chọn pet/ô trống,
paging 15 ô, details/rarity/thumbnail/income, mutation/weather, khóa lấy pet,
store-confirm/not-remind/retrieve. Capacity mặc định từ rebirth nguồn;
override capacity chỉ dùng QA pagination và được ghi rõ ngoài canvas.
Pet mẫu là level 1, không phải kho người chơi. Không gọi database/request game.

Kiểm: sync `--screen storage`, static hash/entity/resource/meta/i18n,
browser route trực tiếp ở desktop/mobile và VI/EN. Tình huống: kho rỗng,
đầy, chọn ô trống, khóa/mở khóa, confirm/cancel/not-remind, đổi trang, lấy pet.
Static pass:75 entity,228 sprite,7 thiếu, không thiếu localization; alias
PetWidget cũ được audit ghi rõ, binder theo LevelLabel parent từ controller.
CUA 2026-11-01: DOM75/75 mismatch0; QA capacity20 →15 ô trang1/5 ô trang2;
retrieve bị chặn khi khóa8h, bỏ khóa lấy được và về trang1; đóng Storage,
Store→Confirm→Yes cất pet mô phỏng; mutation Golden/weather thay icon; kho
trống ẩn details. 390×844 không tràn ngang, VI/EN tải được, console error rỗng.
Lượt cuối CUA: warning rich text có3 span màu, không lộ tag; click tọa độ
pet thứ2 đổi detail sang Chim Hồng Y và giữ scrollX/Y=0, resource scroll=0,
stageTop409.2625px và hash không đổi. Shared source helper giữ path nguồn
localization trực tiếp trong Inspector. Một số lần CUA timeout khi chờ tải
snapshot; lần đọc tiếp xác nhận DOM đầy đủ và không có console error.

Giới hạn: chưa đối chiếu ảnh runtime; special egg/luckybox/secret pets và
income level >1 chưa được mô phỏng. Không xác nhận font/scaler/shader/raycast.
