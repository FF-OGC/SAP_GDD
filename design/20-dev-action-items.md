# Việc kỹ thuật còn mở

## GMT Mail composer (2026-11-01)

- Source serialize/parse RV nhiều quà không khép kín: MailsManager.fcg:410
  dùng DataUtils.ListKeyValueToJsonString (chèn `;` giữa map), trong khi
  DataUtils.JsonStringToKeyValueV3 tách field mail tại `;` depth 0. QA port
  parser tái hiện RV 5 map còn 1 map sau source-style save. Bộ xuất GMT dùng
  map liền nhau để input ban đầu đọc đủ; cảnh báo chưa kiểm delivery sau
  save/reconnect. Cần sửa/kiểm riêng trong repo game; GDD không ghi game.
- RandomPet claim bỏ qua RA, cấp một pet/mục; MoneyTime mail đọc RA bằng
  int; WeatherGen Value parse thành string trước cast int. Bộ soạn giới
  hạn input và ghi cảnh báo tương ứng. Không đưa loại claim no-op vào menu.
- Chi tiết, source và lệnh QA: `plans/PLAN-mail-composer.md`.

## Activities Preview (2026-10-31)

- Theo yêu cầu hiển thị thanh tiến độ chung 5 milestone, track/fill thiếu
  sprite white `lib://` được biểu diễn bằng nền màu theo geometry/tint source.
  Inspector giữ sprite missing và ghi RenderFallback; không tạo PNG thay thế.
  Source sprite vẫn chưa resolve. Audit milestone-bar kiểm actual pixel xanh/
  vàng và fill clamp ở 0/20/40/60/80/100/120 trên desktop/mobile. Claim nhiệm vụ
  mới cộng Pet Points và cập nhật thanh; mới hoàn thành chưa cộng điểm.

- Source Activities: game HEAD `471a62bb8a55ad735cfeebf5a0a315730df90daa`,
  kèm hash từng file `.ui`/controller/resource/enum trong activities-rules.json.
  286 entity được giữ đủ props/eca, 54 sprite, 4 `lib://` thiếu. Các PNG có
  đường dẫn cũ được resolve qua fileId; không vẽ ảnh thay thế.
- Registration key Activities trỏ ID `KVOVUcWb` đã cũ, không có trong cây;
  binder dùng TabsLayout và các widget có ID khớp. Không sửa game.
- Event tab inactive từ `.ui` và controller không bật lại; giữ nguyên.
  Panel công cụ cho kiểm nội dung và trạng thái claim tách khỏi lịch sự kiện.
- ScrollView dùng native web scroll, extent theo cell/space/ignoreInactive;
  engine origin/inertia còn thiếu bằng chứng. 66 entity có field ngoài lớp
  normalize (gồm callback/animation/panel/scroll); raw props được giữ. Binder
  xử lý scroll/clipping và nút Activities; không thực thi callback graph,
  animation atlas, tooltip, hiệu ứng thưởng hoặc server/database game.
- Chưa có ảnh runtime game cùng state/resolution: font fallback, raster,
  rich-text/shader, alpha/hit order, scaler và easing vòng quay là giới hạn
  đối chiếu. Không coi DOM/source audit pass là pixel parity game.
- Collection static audit với checkout game hiện tại dừng ở chênh lệch có sẵn:
  `PetsCollection/Container/PreventCloseButton` alpha snapshot=100, game=0.
  Task Activities không regenerate baseline Collection hoặc Proposal đã sửa.
  Browser regression Collection kiểm riêng trên snapshot website hiện hành.
- Activities source/browser audit: 13 cấu hình và biên UserType/Rebirth,
  18 click theo tọa độ ở mỗi viewport 1440×1100/390×844, không lỗi console;
  đủ 7 ngày quà, 7 cycle nhiệm vụ, claim/milestone/scroll/spin, 3 quà Event
  qua panel kiểm tra, VI/EN, chuyển màn và dispose khi rời vòng quay.
  Inspector xác nhận ID/raw props của 8 icon trùng path và clone nhiệm vụ.
  Collection browser regression: 214 click, 173 pet ở mỗi viewport, pass.
  Sync Activities idempotent; 30 file baseline/Proposal giữ nguyên nội dung.
- So sánh pixel before/after với c1bb1bc: giữ tiêu chí hash trùng tuyệt đối;
  các capture có sai khác được ghi `cropIdentical=false` cùng số pixel và
  maxChannelDifference trong activities-consumer-regression.json, không gọi
  là pass pixel. DOM và lỗi JavaScript được kiểm độc lập, phải giữ nguyên.
  Kết quả: 26/26 capture giữ nguyên DOM; 24/26 trùng hash ảnh. Hai capture
  desktop của Proposal lệch tối đa 1 mỗi kênh RGB; mobile trùng 13/13 ảnh.

## UI Components (2026-10-26)

- DA-016: `op: addComponent` và đưa template ngược vào Proposal cũ cần quyết
  định riêng. Phiên này chỉ xuất `op: add`, không sửa nguồn Proposal.
- DA-017: Collection snapshot còn hai sprite `lib://` thiếu, font Default,
  gradient/shader, alpha cascade và scaler chưa có đối chiếu runtime game.
  Component mặc định giữ `.ui`; tab/grid không clone/bind dữ liệu Collection.
  `recipe-row` chưa có hợp đồng tham số tái dùng (hai Pet trùng path).
  “Khoá” không có bằng chứng rule đủ rõ nên không thêm state. Tái dùng màn
  Shop/Mission đều là dự kiến, chưa được tính như màn đã đăng ký.
- DA-018: Export Proposal chỉ hỗ trợ whitelist hiện có. `templateOmitted`
  liệt kê field không xuất (gradient/raw visual fields và sprite lib thiếu).
  Cần quyết định riêng nếu muốn mở hợp đồng Proposal; không tự mở renderer.
- DA-019 (đã sửa 2026-10-26 trong task Collection rewards): phương án thưởng
  bảo vệ nút claim vắng mặt trên cây `current`. Kiểm CUA: current DOM
  107/107, không RewardEntry; đổi lại proposed và nhận riêng Mutation giữ
  Weather/Pet Gift, console sạch. Mô tả lịch sử dưới đây được giữ để truy vết.
  Lỗi có sẵn trước UI Components: phương án thưởng Collection đổi
  sang `current` ném `Cannot set properties of null (setting 'disabled')`
  trong binding thưởng vì cây hiện tại không có nút thưởng. Audit hồi quy
  chạy HTTP substitution từ baseline GDD `4787ee6` để đối chiếu cả lỗi,
  DOM và ảnh crop với hiện tại. Giữ nguyên code/hành vi Proposal trong task
  này. Audit browser Proposal chi tiết chỉ áp dụng fixture pipeline (kỳ vọng
  offset +4); audit Components kiểm cả bốn Proposal / ba mode.
- DA-020: Geometry/spec khung resolve bằng renderer hiện có; kiểm rect và
  raster sprite với snapshot `.ui` qua renderer Preview, chưa phải ảnh game.
  Không suy semantic layout V2 hoặc hit-order mới từ các test web.


## Cập nhật UI Preview (2026-10-25)

- DA-004/008: nguồn nhận Collection đã mirror đủ thứ tự GetPetObtainSource,
  kiểm ID membership ở Event/Fishing/PoolFishing.csv và Event/Dig/DigPools.csv
  như EventFishingConfig_Client/EventDigConfig_Client. MrFootBall (1037),
  Dragon (1042), Pegasus (1045) đều fallback Event. Không đọc giftcode.csv.
- Bổ sung runtime binding UIUtils.UpdatePetWidgetV3 cho thanh Rarity ở pet
  chi tiết; chưa sở hữu dùng DEFAULT_COLOR, badge RarityBG vẫn theo rarity.
  Clone khởi chạy lại xử lý pixel gradient từ source để tránh copy URL thô
  khi template chưa render xong. Recipe xuất 44 cấu hình và 6 sprite Summon
  theo HudCollection.UpdateRecipe/UpdateAnyRarityPetWidget; ô thứ hai vẫn
  dùng thumbnail pet thật khi previousPetId là secret.

- DA-002: đã phân giải 5 sprite project bằng `fileId` trong `.png.meta`.
  `ContainerBG`, `DecorateIcon1/2`, `HasMWIcon` đã move/rename vào NewAssets;
  Container BG khớp ID với `Assets/Sprites/Backgrounds/BG.png`. Alias
  ShadowTriangleRounded cũng kiểm ID. Chỉ còn 2 sprite thư viện `lib://`.
- DA-012: designer xác nhận `text.overflow=0` là Reduce when exceed.
  Preview đo nội dung và giảm font trong RectTransform, tách nội dung khỏi
  khung để căn ngang/dọc đúng; cập nhật cả label clone và nội dung runtime.
  Font Default là sans-serif hệ thống, chưa có font engine để đối chiếu.
  Label không có newline được giữ một dòng; quy tắc wrap của engine vẫn
  cần ảnh runtime. Các enum overflow khác không được suy diễn.
- 9-slice: thay CSS border-image bằng bitmap ghép 9 vùng theo border metadata
  tại kích thước tham chiếu để tránh đường nối ở scale lẻ. Không đổi source
  PNG, tọa độ entity, màu, hoặc quy tắc sở hữu trong game.

## DA-015 · Field patch và binding UI Proposal (2026-10-23)

MCP đã xác nhận UIWidget, UIWidgetLabel/Image/Button và enum fill; 74 field
chuẩn hóa được whitelist theo renderer và PetsCollection.ui. MCP chưa có
tài liệu serialization LayoutV2 phù hợp (tìm “UILayout”/“布局”); layout,
reverse/background lấy từ .ui và nhánh web đã có, chưa khẳng định thuật toán
engine. Không mở patch font/overflow/gradient/animation hoặc field ngoài
tập; tập chính xác được ghi ở `design/ui-proposals/README.md`.

Prompt quét literal ID/key/tên trong bốn .fcg Collection đã allowlist;
trùng tên là candidate cần dev xác nhận. Demo Label có bốn candidate
HudCollection :132/:662/:663/:664, không phải bằng chứng cả bốn gán lên
Title/Label. Alias runtime, GetChildren/GetChildByIndex, EResKey mapping và
widget mới cần dev kiểm/viết code. Không tự thêm binding/đọc engine source.
Nếu bỏ template Collection thiết yếu, preview giữ cây visual và báo cần
dev xác nhận tương tác. Editor/runtime và DA-002–014 tiếp tục mở.

Audit Proposal: 153 case tĩnh, hai viewport, đủ năm op bằng fixture mạng
tạm (108 entity sau patch); UI Preview hồi quy 107/107. Kiểm tra web không
đóng các giới hạn engine ở trên.

Chỉ ghi các việc cần xác minh có bằng chứng từ snapshot/code. Không ghi đề xuất balance chưa được duyệt.

| ID | Việc | Bằng chứng | Trạng thái |
|---|---|---|---|
| DA-001 | Đối chiếu ghi chú rate-test trong `HudDebug.fcg` với modifier thực tế trong `PetParadeManager.fcg` trên build đang phát hành. | Snapshot hiện tại phát hiện ghi chú nói road spawn không áp dụng daily modifier, trong khi nhánh tính trọng số có gọi `DailyPoolConfigs.GetDailyModifier(petId)`. | Mở · cần xác nhận build |
| DA-002 | Cấp/đối chiếu 7 sprite HUD thiếu. | `dist/data/ui/collection-sprites.json` ghi 2 `lib://fftextures`, 4 `Assets/_Test/**`, 1 `Assets/Sprites/UIComponents/Backgrounds/BG.png` không có trong checkout. `ShadowTriangleRounded.png` đã tìm thấy ở `Assets/Sprites/Shapes/` và sửa mapping. | Mở · cần asset gốc |
| DA-003 | Xác nhận độ phân giải tham chiếu và primitive render của Studio bằng ảnh game. | `.ui` cho root `sizeDelta=1500×750` nhưng không khai báo engine canvas; renderer web dùng font stack, tint/multiply, 9-slice và outline xấp xỉ. | Mở · cần ảnh chụp game |
| DA-004 | Đối chiếu đường đi Obtain/Recipe và routing đóng với build game. | `HudCollection.fcg` gọi `PetConfigs.GetPetObtainSource` (có tham số pool Fishing/Dig); preview chưa có đầy đủ phép tra pool trong bước này. `CloseCollection` đã rõ, nhưng handler `DarkBG`/`PreventCloseButton` nằm ngoài hai `.fcg` chính. | Mở · cần xác minh runtime |
| DA-005 | Xem 76 trường HUD chưa được renderer xử lý trước khi tuyên bố tương đương hình ảnh. | Audit thấy 57 entity có trường chưa hỗ trợ, chủ yếu button callback và `m_ApplyingPreviewAnimation`; có `ecaScripts` trên 1 entity. | Mở · cần đối chiếu visual/runtime |
| DA-006 | Xác nhận engine ưu tiên border meta hay border trong `.ui`, xử lý entity nhỏ hơn tổng border, tiled và gradient/tint. | MCP `FillType` xác nhận enum nhưng không mô tả thuật toán cắt hoặc thứ tự ưu tiên. `.ui` dùng `fillType=1`, `slicedBorder=0`, trong khi `NormalTabBG.png.meta` có border 20 px; CSS `border-image` là phép dựng lại có kiểm chứng dữ liệu, chưa xác nhận pixel-parity. | Mở · cần thông số Editor/ảnh game |
| DA-007 | Bổ sung 8 key pet Halloween trong localization nguồn hoặc xác nhận fallback game. | `collection-i18n.json` thiếu `BULL_PUMPKIN`, `CHICK_PUMPKIN`, `GIRAFFE_PUMPKIN`, `GORILLA_PUMPKIN`, `JELLYFISH_PUMPKIN`, `PENGUIN_PUMPKIN`, `SQUID_PUMPKIN`, `WILDBOAR_PUMPKIN`; các key này đến từ tên Pet.csv, không có trong `key.csv`. | Mở · cần localization nguồn |
| DA-008 | Đối chiếu sprite pet/mutation/weather và nguồn Obtain Fishing/Dig/Event theo runtime. | `HudCollection.fcg` gán `Res.Sprite[...]` từ config và `GetPetObtainSource` nhận pool Fishing/Dig; preview đang dùng icon snapshot GDD và chỉ map chính xác các icon Obtain có tên `EResSprite` trong `PetConfigs.fcg`. Không tìm thấy file/bảng generated `EResSprite`/`Res.Sprite` trong checkout cho mọi key. | Mở · cần bảng resource hoặc ảnh game |

Các mục UI Preview trên là giới hạn đã quan sát từ nguồn được phép đọc, chưa phải đề xuất đổi game.

## DA-009 · Alpha/raycast Collection (2026-10-23)

Đã hỏi MCP Craftland (`mcp__ffugcdocs`) và đọc:
- `ScriptManual/Types/UIWidgetButton`: Alpha (-41002), TopAlpha/BottomAlpha
  (-41017/-41018), DisableCollider (-41019) là thuộc tính riêng.
- `ScriptManual/Types/UIWidgetImage`: Alpha (-39002), TopAlpha/BottomAlpha;
  không liệt kê RaycastTarget hoặc collider cho Image.
- `ScriptManual/Types/UIWidgetLabel`: Alpha, ShadowAlpha, OutlineAlpha riêng.
- `ScriptManual/Types/UIWidget`: Priority, Depth, ChildIndex và RectTransform;
  không mô tả thuật toán sắp xếp/raycast.
- [HowToCreateUI](https://awp.garenanow.com/wiki/57528c29-7806-59c9-b3cb-90bfd8962246)
  xác nhận FF dùng NGUI. Tài liệu AddUGCCustomUIWidget/Attribute chỉ nêu các
  controller runtime, không có triển khai alpha/raycast.

Nguồn được phép đọc: `Assets/HUDs/PetsCollection.ui` có đúng bốn entity
alpha khác 100; cả ba button đều `disableCollider=false`, priority=0.
Mọi entity trong file có priority=0; mọi gradientTop/Bottom.a hiện bằng 1.
`HudCollection.fcg:918-925` chỉ chọn pet khi parent button nằm trong
_PetWidgets: button trên PetDetails không chọn pet. `:927-933` chỉ mở pet
nguyên liệu thứ hai. `UIUtils.fcg:36-50` ẩn button redirect khi không hợp lệ,
đồng thời bật italic/underline của tên khi hợp lệ.

**Chưa xác minh runtime:** ngưỡng alpha có ảnh hưởng collider không; alpha
của widget có nhân xuống con hay chỉ graphic; shader nhân màu/gradient/text/
outline/shadow như thế nào; Image có chặn click và cách priority/depth cùng
thứ tự cây chọn đối tượng trên cùng. Không có runtime/controller source
trong allowlist; không mở rộng đọc source engine hoặc chạy Studio.

Web dùng chính sách tạm ghi trong JSON `renderingPolicy`: giữ phép composite/cascade CSS
alpha/100 vốn có của preview, chưa đổi sang alpha riêng vì thiếu chứng cứ; hit target button
không phụ thuộc alpha và tắt khi disableCollider=true. Non-button xuyên
click; thứ tự cây quyết định lớp trên, không thêm z-index theo tên. Đây là
mô hình web, **chưa phải quy tắc engine đã xác nhận**. RarityName có alpha
gốc 100, web cộng dồn thành 90 dưới RarityBG=90; cần ảnh/runtime để chốt cascade.
Gradient alpha hiện đều 1 nên không thêm phép blend chưa có bằng chứng;
RGB gradient, tint, text outline/shadow vẫn thuộc giới hạn DA-003/006.
Bảng ghi alpha gốc và alpha cộng dồn web; không báo alpha hiệu dụng game
khi chưa biết cascade. Cần kiểm runtime bốn entity và vùng chồng lấn trước
khi đóng DA-009 hoặc tuyên bố khớp game.

## DA-010 · UI image tint/gradient output (2026-10-23)

MCP Craftland `脚本手册/UGC_Wiki_Entities` xác nhận `UIWidgetImage.Color`
là `Color`; `Gradient` là `int`; `GradientTop` và `GradientBottom` là hai
màu ở đầu/trên và cuối/dưới. Tài liệu không liệt kê ý nghĩa số của các mode
`Gradient`. Trong `PetsCollection.ui`, 9 image dùng `gradient=1`, một image
dùng `gradient=2`; mọi màu đầu/cuối có alpha 1.

Preview dùng phép nhân từng kênh RGB giữa pixel sprite, `Color` và nội suy
dọc từ `gradientTop` đến `gradientBottom` khi `gradient > 0`; alpha sprite
được giữ nguyên. Đây là mô hình preview theo cấu trúc trường `.ui`, chưa được
đối chiếu pixel với runtime. Cần xác minh các mode gradient 1/2, phép nhân
Color và kết quả trên sprite 9-grid bằng Editor hoặc ảnh runtime trước khi
tuyên bố parity.

## DA-011 · UILayoutEntityV2 grid semantics (2026-10-23)

MCP Craftland `脚本手册/UGC_Wiki_Entities` ghi nhận các trường của
`UIWidgetLayout` đời cũ: `CellSize`, `CellSpace`, `Constraint`,
`ConstraintCount`, offset dọc/ngang, `SortType` và `IgnoreInactive`. Tài liệu
nói `IgnoreInactive` sắp child active trước rồi đến inactive; `LayoutSortType`
có các giá trị 0 theo hierarchy, 1 priority cao xuống thấp, 2 priority thấp
lên cao. `FillDirectionType` định nghĩa ngang=0, dọc=1. Tài liệu không mô tả
`UILayoutEntityV2.corner`, `tableOffset`, `tableSpace` hoặc ý nghĩa fixed row /
fixed column của V2.

Bốn layout hiện có trong `.ui` dùng `constraint=0`, `corner=0`, table
offset/space bằng 0 và `sortType=0`; cell size/spacing khớp size icon M/W,
khoảng dọc và giới hạn năm cột trong FCG. Engine web ánh xạ corner thành bốn
góc bắt đầu, dùng table offset như padding cộng thêm, table space như khoảng
cách cell cộng thêm, và hiểu constraint 1/2 lần lượt là fixed row/column. Đây
Đây là giả định preview cho V2. Cần đối chiếu vị trí trong Editor/runtime trước
khi dùng cấu hình V2 khác 0 hoặc tuyên bố vị trí khớp game.

## DA-012 · Text, fill, rotation và viewport (2026-10-23)

MCP `脚本手册/UGC_Wiki_Entities` ghi các trường `UITextEntity` như `Font`,
`FontSize`, `LineSpacing`, `Overflow`, `ShadowColor/Offset/Alpha`,
`OutlineColor/Offset/Alpha`, cùng gradient/background; tài liệu chủ yếu mô tả
tên và kiểu, không nêu font `Default`, đơn vị/ý nghĩa line spacing, giá trị
Overflow, baseline/wrap, hay thuật toán vẽ text. `脚本手册/UGC_Wiki_Enum`
xác nhận `FillType` (0 Simple, 1 Sliced, 2 Tiled, 3 Filled, 5 Fit) và
`FillDirectionType` (0 Horizontal, 1 Vertical, 2/3/4 Radial90/180/360),
nhưng không giải thích điểm bắt đầu, chiều, cung fill, `InvertFill`, Fit, hoặc
`FlipType`. Trong `.ui` 33 text node đều `font=Default`, `lineSpacing=0`,
`overflow=0`; cả 68 image/button đều `flip=0`; ba progress image dùng
`Radial360`, `fillAmount` 0.3/0.5 và `invertFill=true`; có bốn `reverse.x`.
MCP Editor manual nói root/anchors thích ứng với tỉ lệ thiết bị nhưng không
cho reference resolution, match-width/height, hoặc safe area. Mọi rotation và
priority trong `.ui` đều bằng 0.

Preview dùng font stack offline của trang; `lineSpacing=0` dùng line-height
browser `normal`, giá trị dương map thành CSS unitless line-height; text bị
clip trong RectTransform; background/gradient/shadow/outline và các kiểu fill
được dựng bằng CSS. Rotation dùng pivot làm transform-origin, sign giữ theo
quy ước web cũ. Đây là mô hình hiển thị; line spacing, overflow=0, text
gradient, alpha/outline/shadow raster, radial fill geometry, Fit, numeric flip,
rotation sign, priority/depth và safe-area behavior vẫn chưa xác minh. Preset
16:9/18:9/20:9/4:3 chỉ đổi khung viewport và crop canvas; không khẳng định
đây là cách game scale HUD.

## DA-013 · Inspector source mapping và web hit order (2026-10-23)

Widget Inspector đọc `propsData`/`ecaProps` đầy đủ từ JSON; giá trị dynamic
hiện trên canvas được ghi từ web preview và có nguồn `.ui`, `HudCollection.fcg`
hoặc module mô phỏng khi xác định được. MCP/runtime hiện không cung cấp bảng
ánh xạ từ alias cục bộ trong FCG (ví dụ `petName`, `rarity`, `icon`) sang
`EResKeyPetsCollection`/entity path. Vì vậy panel liệt kê các assignment cùng
property như nguồn tham khảo, nhưng ghi rõ alias chưa được gắn chính xác với
entity đang chọn. Hit-test dùng AABB của `getBoundingClientRect()` (gồm scale /
rotation CSS), alpha-zero vẫn được xét, inactive thêm vào khi checkbox bật;
stack order là web CSS z-index/DOM order, không phải hit-order đã xác minh của
Craftland. Cần source mapping/runtime inspector của Editor để đóng các mục này.


## DA-014 · D7 browser audit và so sánh widget (2026-10-23)

Sync/audit đối chiếu đủ 107 entity, propsData/ecaProps, 81 assignment từ
HudCollection và 7 giá trị RARITY_COLOR từ PetConfigs_Client. Browser audit
chạy ở 1440×1100 và 390×844; duyệt đủ 8 rarity, 173 pet qua mọi trang, trạng
thái owned/unowned, 3 detail tab, Recipe redirect, Inspector và lỗi console.
collection-browser-audit.json ghi 12 mẫu transform/màu source .ui cùng
AABB/màu quan sát ở web. Bảng này so cấu hình nguồn với preview, không phải
đo từ Craftland Editor. Engine pixel parity, font/raster, scaler/safe area,
alpha/raycast và 7 sprite thiếu tiếp tục chờ xác nhận runtime/asset.
