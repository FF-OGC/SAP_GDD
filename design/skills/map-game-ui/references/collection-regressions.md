# Bug lịch sử → rule → bằng chứng hồi quy

Nguồn: Git checkout SAP_GDD, khảo sát đến `4048e4a` ngày 2026-10-25.
Đây là commit của website GDD, không phải commit game. Khi dùng ở repo khác,
đọc bài học nhưng không giả định các hash/file này tồn tại trong repo đó.
Trong SAP_GDD dùng `git show <hash> -- <file>` để kiểm diff thực tế.

| Commit | Sai lệch/khắc phục đã thấy | Rule | Case ngăn tái diễn |
|---|---|---|---|
| `4268ec4` | Resolve mũi tên phân trang, ghi sprite thiếu | R2 | Next/previous đúng asset, hướng và vùng click; resource thiếu có lý do |
| `08b3cc0`, `676c42e` | Xuất tab sprite rule runtime và border metadata | R2, R7 | Active/inactive tab đổi đúng sprite; border khớp meta |
| `0f952c0`, `d1daede` | Bổ sung localization và sprite Obtain gán lúc chạy | R2, R5 | Đổi VI/EN, icon runtime có trong manifest dù không nằm tĩnh trong UI |
| `67a3b71` | Resource inspection làm scroll/focus khi thao tác preview | R6 | Click pet/tab/page giữ scroll và stage rect; hàng resource giữ identity |
| `dc6ff77`, `97e2483` | Tách visual khỏi hit rect; giữ alpha cascade tạm trong khi thiếu xác minh | R6 | Alpha-zero click được theo policy web; disableCollider chặn; không gọi cascade là semantic engine |
| `9145131` | Bỏ hover và title tooltip khỏi canvas mobile | R6 | Hover không đổi màu/tạo tooltip; pressed reset sau cancel/leave |
| `b713b40` | Giữ full UI properties và runtime rules | R1 | Entity/props/assignment không bị mất; unsupported được liệt kê |
| `f06c120` | Thay màu site/brightness/background bằng tint từ game và gradient | R4 | Pixel trong suốt không bị tô nền; rarity/outline/owned theo nguồn game |
| `99b233b` | Hợp nhất layout, bỏ công thức grid lặp trong binding | R3 | Clone, inactive và resize runtime reflow qua cùng layout engine |
| `fdb803b` | Bổ sung field text/fill/viewport bị bỏ qua | R3, R5 | Text không bị cắt sai policy; fill/rotation/pivot có kiểm tra riêng |
| `7fcaf79`, `19dc56a` | Inspector và audit state/widget geometry | R1, R6 | Clone truy được template; Inspector không nuốt click gameplay; source vs runtime tách rõ |
| `86b684c` | Shared helper tải sau module phụ thuộc | R8 | Load trực tiếp preview/proposal với cache lạnh, không ReferenceError |
| `d6668ca`, `4048e4a` | Map Obtain/Recipe từ logic nguồn, sửa thêm các nhánh thiếu | R7 | Precedence nguồn nhận, secret exception và boundary rarity được test |
| `4048e4a` | PNG move/rename nhưng đường dẫn serialize cũ | R2 | Resolve bằng fileId trong phạm vi cho phép, giữ declaredKeys; ID mơ hồ phải báo lỗi |
| `4048e4a` | CSS 9-slice lộ seam khi scale lẻ | R2 | Kiểm ảnh/đường nối ở desktop/mobile; bitmap ghép đúng kích thước tham chiếu |
| `4048e4a` | Template/clone HasMW chưa áp cùng gradient do async | R4 | So hash pixel template và clone sau render; đổi selection nhanh không nhận ảnh cũ |
| `4048e4a` | Label overflow=0 chưa shrink theo xác nhận designer | R5 | Chuỗi dài/ngắn, VI/EN, resize: fit lại từ fontSize nguồn, giữ style/alignment |
| `4048e4a` | Pet lớn thiếu cập nhật Rarity, chỉ cập nhật RarityBG | R4, R7 | Mọi rarity + unowned: strip dùng đúng màu và actual pixel; badge kiểm riêng |

## Các bẫy Collection không được biến thành rule game chung

- Obtain theo thứ tự Giftcode → LuckyBox → Fusion → Road → Fishing → Dig →
  Event trong implementation hiện tại; Fishing/Dig kiểm membership pool,
  không lọc theo event đang mở. Màn hình/game khác phải đọc controller riêng.
- Recipe icon dùng `Summon<previousPetRarity>`, nhưng nhãn/màu ô bất kỳ theo
  rarity pet đích; ô hai giữ pet cụ thể khi pet trước thuộc secret theo rule
  nguồn. Case cùng rarity không bắt được lỗi này, phải có case qua boundary.
- Rarity của strip pet lớn theo UIUtils.UpdatePetWidgetV3; badge theo
  HudCollection. Kiểm từng target, không coi toàn card có một rarity tint.
- Các sprite rename như ContainerBG/DecorateIcon1/2/HasMWIcon được resolve
  bằng ID. Tên này chỉ là ví dụ, không phải alias tự dùng ở UI mới.

## Bằng chứng có thể chạy lại

- `tools/audit-ui-preview.mjs`: cấu trúc, props, source assignment, resource,
  border, localization và một số invariant renderer.
- `tools/audit-ui-preview-browser.mjs`: state traversal, click/scroll,
  Inspector, geometry và console ở desktop/mobile.
- `tools/audit-ui-preview-regressions.mjs`: helper được browser audit gọi;
  kiểm pixel HasMW clone, detail tint, Obtain và Recipe boundary. Không chạy
  trực tiếp file này rồi coi là đã chạy browser test.
- `tools/audit-ui-proposals.mjs` và `tools/audit-ui-proposals-browser.mjs`:
  patch pipeline, ba mode, resource/prompt/Inspector và baseline chung.

Không dùng test chỉ đọc `data-ui-runtime-color` để chứng minh sprite đúng
màu: regression cuối đã cần đọc actual pixel. Đồng thời, expected rule lấy
từ chính JSON renderer dùng có thể cùng sai; vẫn cần đối chiếu rule với
controller/config độc lập trước khi kết luận khớp source.
