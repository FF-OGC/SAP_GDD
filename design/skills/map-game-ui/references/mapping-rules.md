# Quy tắc mapping tái sử dụng

## R1 · Hợp đồng nguồn và dữ liệu

Giữ entity ID, full path, type, parent/order, active state, propsData và
callback/ecaProps gốc để truy vết. Template và clone phải phân biệt được
identity; clone giữ liên hệ template, không giả làm entity gốc mới.

Inventory runtime cần condition → target cụ thể → property → value/resource
→ file/function nguồn. Các assignment cùng tên property không đủ chứng minh
alias trỏ vào widget nào; mapping alias chưa xác minh phải được ghi rõ.
Ghi đè runtime phải xuất hiện trong Inspector cùng giá trị source, không
ghi đè mất nguồn gốc. Runtime đổi Content/Size/Visibility/Sprite/Color đều
có thể làm thay đổi layout hoặc hình ảnh phụ thuộc.

## R2 · Asset identity và 9-grid

- Thu thập cả sprite trong UI lẫn sprite controller gán khi chạy (enum/key
  resource, icon trạng thái, Obtain, Recipe…). Không chỉ duyệt cây UI.
- Đường dẫn cũ không chứng minh asset đã mất. Trong phạm vi được phép, tra
  identity/fileId từ metadata; giữ declared path, resolved path, ID và nơi
  tham chiếu. Nhiều ứng viên cùng ID là mơ hồ cần giải quyết, không lấy file
  đầu tiên. Không thay bằng PNG cùng tên hoặc trông gần giống.
- Chỉ copy asset đã có tham chiếu hợp lệ; không quét/mirror toàn project vì
  tiện. Thư mục relocation của màn hình này không tự dùng cho màn hình khác.
- Lấy border từ metadata được xác minh, giữ width/height và nguồn; không suy
  9-grid từ hình nhìn thấy. Test centerInvisible, widget nhỏ hơn tổng border,
  stretch/tile/fit/fill, reverse/flip theo field màn hình thực sự dùng.
- Kiểm tra 9-slice ở scale lẻ: CSS border-image có thể lộ seam dù số border
  đúng. Nếu gặp lỗi đã thấy ở Collection, ghép chín vùng trên bitmap ở kích
  thước tham chiếu trước khi scale; kiểm pixel/ảnh ở cả desktop và mobile.
  Đây là giải pháp web đã dùng, không khẳng định thuật toán engine.
- Asset thiếu ghi manifest/gap; placeholder kỹ thuật chỉ bật trong Debug.
  Không tự vẽ asset thay thế trong công việc mapping fidelity.

## R3 · Geometry và layout có một chủ sở hữu

Tính anchorMin/Max, pivot, anchoredPosition, sizeDelta trong hệ tọa độ nguồn
trước khi scale stage. Giữ thứ tự cây, clipping và transform-origin; kiểm
rotation/reverse/priority nếu có. Root size suy từ UI phải ghi là suy từ UI,
không gọi là reference resolution engine đã xác nhận.

Layout dùng một engine chung đọc props; binder chỉ đổi state/Size và yêu cầu
refresh. Không để một công thức grid trong renderer và một công thức khác
trong controller web. Kiểm cell size/space, direction, corner, constraint,
offset, sortType, ignoreInactive và table fields theo nguồn được xác minh;
không suy semantic enum chưa gặp từ tên trường. Reflow sau clone, đổi active,
đổi kích thước và đổi nội dung có ảnh hưởng geometry. Kiểm trang cuối thiếu
ô và số icon vượt một hàng. Phân biệt crop viewport với scale/safe area game.

## R4 · Tint, gradient và vòng đời render

Dùng màu game theo controller/config cho từng widget và state; palette của
dashboard không phải palette game. Rarity strip, badge, outline, label và
thumbnail có thể nhận màu từ các hàm khác nhau, không tô một lần cho cả card.

Để tránh lỗi Collection: phép dựng web nhân RGB sprite × tint × gradient
và giữ vùng trong suốt sprite; không phủ background hình chữ nhật hoặc dùng
brightness để thay tint. Gradient mode/alpha/blending engine còn thiếu bằng
chứng phải ghi policy riêng; không phổ quát hóa phép dựng web thành shader
đã xác nhận của engine.

Clone có thể chụp raw URL trước khi xử lý ảnh hoàn tất: phải refresh tint,
gradient và slice cho mỗi clone. Async render cần version/token để kết quả
cũ không ghi đè sprite/state mới. Khi thay sprite, dọn runtime URL/state cũ.
Cache key phải bao gồm các input làm đổi pixel và có cơ chế không giữ lỗi
load vĩnh viễn. Kiểm ảnh đã decode/render xong, đổi selection nhanh và cả
render đầu với cache lạnh; metadata màu đúng không đủ chứng minh pixel đúng.

## R5 · Text và localization

Trích đúng key màn hình và key runtime thật sự dùng, gồm parameterized text;
không mirror toàn localization nếu không cần/không được phép. Test ngôn ngữ
nguồn và bản dịch dài, key thiếu, thay Content khi chọn item khác.

Áp font size/style, alignment ngang/dọc, wrap/overflow, line spacing,
background, gradient, shadow/outline offset và alpha theo dữ liệu. Không kế
thừa typography website rồi coi là font engine. Thiếu font gốc ghi rõ font
fallback và giới hạn metrics/raster.

Chỉ auto-shrink khi nguồn/semantic đã được xác nhận. Collection overflow=0
đã được designer xác nhận là Reduce when exceed: reset về fontSize nguồn
rồi fit lại khi đổi text, ngôn ngữ và kích thước; nếu chỉ giảm từ size đang
dùng, label sẽ không lớn lại khi đổi sang text ngắn. Giữ bold/italic và căn
chỉnh; test actual bounds ở stage có scale, không chỉ đọc CSS font-size.

## R6 · Hit target và interaction

Tách RectTransform/collider khỏi visual. Alpha=0 không tự chứng minh button
không click được; disableCollider là trường riêng. Với engine chưa rõ,
dùng policy web có ghi nguồn và kiểm alpha-zero, inactive, disabled, overlap;
không suy hit order game từ AABB hoặc DOM order của trình duyệt.

UI game mobile dùng normal/pressed/disabled và reset khi pointerup/cancel/
leave; không thêm hover, title tooltip hoặc hành vi desktop vào canvas nếu
không có nguồn. Inspector là chế độ công cụ riêng (chuột phải/chạm Inspect),
không biến click gameplay thành chọn resource hoặc cuộn trang.

Resource panel cập nhật theo ID ổn định, chỉ đổi ô cần thiết; không rebuild
toàn bảng mỗi tick. Click/tab/page/selection không gọi scrollIntoView, focus
hay đổi hash để đồng bộ Inspector. Đo scrollX/Y, stage rect và row identity
trước/sau thao tác; kiểm thử phải click theo tọa độ để tránh tool tự scroll
và che lỗi. Điều hướng chủ đích của shell được tách khỏi cập nhật gameplay.

## R7 · Logic runtime là một phần của UI

Map đủ thứ tự nhánh và fallback, filter, sort/rank, pagination, state owned,
visibility, redirect và formatting từ code/config. Khi nhiều nguồn cùng
match, giữ precedence của controller; không suy từ event hiện mở hay tên
item. Đừng gom các field có tên gần giống thành một field: rarity của pet
đích, pet nguyên liệu và key icon có thể khác nhau tại boundary.

Sinh rule trong pipeline, render từ JSON và ghi source function. Test mỗi
nhánh có dữ liệu, ranh giới rarity/rank, item đặc biệt, trạng thái rỗng và
fallback. Nếu chưa có dữ liệu cho nhánh, ghi là chưa test; không tạo fixture
giả làm config thật. Fixture tổng hợp phải gắn nhãn và chỉ dùng trong QA.

## R8 · Chia sẻ primitive và phân biệt proposal

**Chọn đích sửa từ ý định người dùng, trước khi chọn file:**

| Yêu cầu | Đích sửa | Xử lý mục còn lại |
|---|---|---|
| Thêm tính năng vào UI, đổi thiết kế, tạo UI mới | Chỉ UI Proposal | Giữ UI Preview theo project gốc |
| Map hoặc chỉnh UI cho khớp project gốc | UI Preview | Cập nhật thêm Proposal tương ứng nếu chưa từng chỉnh sửa thiết kế |
| Sửa parity khi Proposal đã có chỉnh sửa riêng | Chỉ UI Preview | Giữ thiết kế Proposal; không tự reset/rebase/ghi đè |

“Chưa từng chỉnh sửa” xét từng bản Proposal của màn hình: kiểm patch/ops,
asset/binding thiết kế và lịch sử Git hoặc record chỉnh sửa nếu có. Chỉnh
sửa thiết kế theo yêu cầu trước đó, dù do agent thực hiện, vẫn được tính.
File dẫn xuất regenerate không tự là một lần chỉnh thiết kế; ngược lại,
diff hiện tại rỗng hoặc status=draft không chứng minh chưa từng chỉnh sửa.
Thiếu lịch sử để kết luận thì bảo toàn Proposal, ghi rõ chưa xác định; tiếp
tục sửa Preview theo scope đã có. Không tự tạo Proposal mới chỉ vì sửa parity.

Proposal chưa từng chỉnh sửa có thể kế thừa baseline Preview đã sửa và được
regenerate qua pipeline; không vá JSON output bằng tay. Proposal đã chỉnh
sửa không tự động nhận thay đổi baseline làm đổi thiết kế. Kiểm tác động
trước khi sync vì pipeline đang áp patch lên snapshot Preview hiện tại;
không gọi regenerate toàn bộ Proposal một cách máy móc nếu nó làm đổi bản
đã chỉnh sửa. Nếu cần, giữ baseline/override hoặc tách hành vi render trong
phạm vi bản Proposal đó để bảo toàn thiết kế, không tự mở rộng scope task.

Giữ renderer/layout/tint/text/slice/stage/resource panel dùng chung giữa
preview và proposal khi phù hợp với phân luồng trên. Sửa primitive chung
không được làm tính năng mới lọt sang Preview hoặc làm đổi thiết kế Proposal
đã chỉnh sửa; dùng binding/option theo mode nếu cần. Kiểm regression consumer
khác là kiểm bảo toàn, không phải quyền sửa thiết kế ở cả hai mục.
Binder riêng điều khiển hành vi màn hình. Đảm bảo thứ
tự script dependency và cache version khiến browser tải code tương thích.
Mở deep-link trực tiếp với storage sạch là case bắt buộc khi đổi module.

Proposal giữ patch/diff/resource riêng trên baseline có provenance; không
biến thay đổi đề xuất thành dữ liệu game hiện hành. Khi đổi renderer chung,
kiểm cả before/after/overlay để tránh hai trang tự lệch vì dùng hai bộ render.
