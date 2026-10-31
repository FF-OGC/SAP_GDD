# UI Preview · Fusion confirm / result

Nguồn: FusionConfirm.ui, FusionResult.ui và hai HudFusion*.fcg; PetConfigs,
FusionManager, UIUtils, BigNumberHandler, bước chỉnh bụi từ CustomUIUtils.
Cây entity, props/ecaProps, registration, sprite/metadata và localization
đi qua pipeline nguồn chung. Hai màn có route riêng, cùng một commit UI.

Confirm cho chọn hai pet từ các ID nguồn đã được PetConfigs tải; nhánh kết
quả/rank/secret, gộp trùng và chia đôi kết quả đầu khi còn hai loại giữ theo
GetCleanedPossibleResultIds. Dust có giới hạn, Max/Reset, đủ/thiếu ví; một kết
quả nằm ở ô giữa, indicators và label theo ngưỡng controller. Result cho chọn
kết quả từ cùng cặp nguyên liệu, đủ/thiếu Pet Coin và điều kiện weekend x4.
Mọi trạng thái người chơi là mô phỏng, không đọc mailbox/database hoặc gửi
request server. Tắt mutation percentage của GMT theo capability thông thường.

Giới hạn: chỉ pet level gốc không mutation/weather/passive; chưa kiểm nhánh
Purebred, inheritance, thời gian hatch, ownership/selection và tooltip popup.
Chưa có screenshot engine; font/shader/safe area/raycast/flip còn cần đối chiếu.
Static/browser audit được ghi bởi quy trình batch, không tuyên bố pixel parity.

Kiểm mô hình độc lập trong Node: 38.088 tổ hợp cặp CanFuse × bụi 0/đầy,
tổng weight đều bằng 1 (sai số dưới 1e-8), tối đa ba ô. Có 182 tình huống
cap=0 do dòng secret nguồn để DustCap trống; giữ fallback chia 0 của
BigNumberHandler là 0, không tự bù cap. Tên pet skin theo BuildPetSkinConfigs
và GetBasePetId; sprite vẫn dùng tên skin nguồn.

Đã chạy static source audit cho cả hai cây (120/64 entity, không thiếu key
localization hay registration). CUA 2026-11-01: DOM120/120 và64/64, bụi
Max200/200 → Reset0/200, confirm đóng, result weekend1→4; cả hai viewport
390px không tràn ngang, console error rỗng. Collection hồi quy DOM107/107;
Proposal Hiện tại và Chồng lớp tải được, overlay có2 canvas.

Fusion chọn policy nonGridLayout=serialized: giữ tọa độ child của `fill`,
không chạy công thức grid lên kiểu khác. Chưa có tài liệu engine fill qua
connector, không khẳng định đây là engine layout runtime; các consumer cũ
không bật policy nên không đổi. Chưa kiểm actual pixel shader/tint/flip.

Hai audit cũ đã thử nhưng không pass với checkout game hiện tại:
audit-ui-preview dừng ở source alpha PreventCloseButton (snapshot100,
source0); audit-ui-proposals lệch line binding HudCollection so với snapshot.
Đây là drift baseline có sẵn, giữ Collection/Proposal để bảo toàn thiết kế;
không regenerate ngoài scope. Các audit mới đối chiếu đúng source hiện tại.
