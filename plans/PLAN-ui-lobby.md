# UI Preview · Lobby

Nguồn: `Lobby.ui`, `HudLobby.fcg`, WeatherConfigs, EventCurrencyManager,
FeatureUnlockConfigs, `Weather.csv`, `weatherEffects.csv`. Giữ nguyên cây UI,
widget registration, props/eca và sprite/meta; không tạo Proposal.

Web mô phỏng thời tiết, event countdown, event icon/timer, weekend x4,
ba nội dung Details, các contextual button và popup thu nhập. Điều khiển thử
nằm ngoài canvas, ghi rõ không kết nối game/server. Không dùng lịch event
hay dữ liệu người chơi thật. Các nút dẫn sang gameplay chỉ báo thao tác thử.

Kiểm: sync theo screen, audit hash/entity/resource/localization, mở trực tiếp
route `#uipreview/lobby` ở desktop/mobile, đổi VI/EN và trạng thái details.
Đã chạy static pass: 40 entity, 40 sprite, 6 sprite thiếu trong manifest,
không thiếu localization/registration. CUA 2026-11-01: deep-link DOM40/40
mismatch0, mở/đóng Weather Details; Weekend Details hiển thị x4 và nguồn
thu bụi; ready=false ẩn Event; 390×844 không tràn ngang. Console error rỗng.

Giới hạn: chưa có ảnh runtime game, font/scaler/shader/raycast và tween popup
chưa xác minh. Context eligibility và event ordering là input mô phỏng.
