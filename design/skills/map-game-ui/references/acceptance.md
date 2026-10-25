# Acceptance gates và prompt dùng lại

Đánh dấu **pass / fail / chưa chạy / chưa có bằng chứng / không áp dụng**.
Mỗi kết quả kèm file/report hoặc ảnh và phạm vi state đã kiểm. Không áp số
entity/test Collection làm quota cho màn hình mới.

## G0 · Đích sửa và bảo toàn thiết kế

- Ghi ý định và đích sửa: tính năng/thiết kế/UI mới chỉ vào Proposal; parity
  project gốc vào Preview. Với parity, chỉ cập nhật thêm Proposal tương ứng
  khi có bằng chứng bản đó chưa từng chỉnh sửa thiết kế.
- Ghi bằng chứng lịch sử/patch dùng để phân loại Proposal. Không dùng status
  draft hay diff rỗng làm bằng chứng duy nhất; chưa biết thì bảo toàn.
- Kiểm diff và ảnh/hành vi trước–sau ở mục cần giữ: task Proposal không đổi
  Preview; task parity không đổi thiết kế Proposal đã chỉnh sửa. Kiểm cả tác
  động gián tiếp qua renderer chung, baseline và regenerate patch.

## G1 · Source và export

- Phiên bản UI/controller/config/resource/snapshot đã ghi, hoặc ghi phần
  không xác định. Mỗi runtime rule có nguồn; không mất nhánh/fallback.
- Cây entity nguồn và export khớp ID/path/type/order/active; raw props được
  giữ; unsupported được đếm và giải thích, không lặng lẽ loại khỏi coverage.
- Sprite tĩnh/runtime đều có manifest, declared/resolved path, ID nếu có,
  border/dimension, output hoặc missing reason. Localization đúng phạm vi.
- Generator chỉ ghi output hợp lệ. Không sửa source game hoặc JSON dẫn xuất
  bằng tay; kiểm guard hiện có khi mở rộng pipeline.

## G2 · Render web

- DOM khớp cây gốc; clone có identity riêng và nguồn template. So geometry
  với source ở stage/reference coordinates, tách sai số scale/rounding và
  ghi tolerance cùng lý do; không nới tolerance để làm test pass.
- Xem render đầu và sau tương tác: tint/gradient/alpha, strip/badge/outline,
  9-slice/seam, text fit/wrap/style, fill/flip, clipping và reflow.
- Đợi font/ảnh decode và async render thực sự xong trước khi lấy ảnh/pixel.
  Kiểm pixel ở nơi CSS/metadata có thể đúng nhưng ảnh vẫn sai; kiểm cả clone.
- Desktop và mobile (Collection đang dùng 1440×1100, 390×844); thêm aspect
  ratio đặc thù nếu màn hình có scaler/anchor mới. Không lấy viewport web
  làm bằng chứng safe area game.

## G3 · State và interaction

Lập matrix theo controller thực tế, ưu tiên phủ toàn bộ dữ liệu nhỏ hữu hạn;
dataset lớn chọn nhánh và boundary có lý do, công bố phần chưa phủ.

| Chiều | Các case cần cân nhắc khi có trong UI |
|---|---|
| Danh sách | Mỗi category/rarity, trang đầu/cuối, trang thiếu ô, rỗng |
| Sở hữu/quyền | Owned/unowned/mixed, disabled, hidden, alpha-zero |
| Chi tiết | Mỗi tab, từng nguồn Obtain, Recipe boundary, item đặc biệt |
| Điều hướng | Next/back, redirect và selection/filter sau redirect |
| Text | Mỗi ngôn ngữ hỗ trợ, dài/ngắn, tham số, key thiếu |
| Vòng đời | Clone đầu, clone sau đổi tab/page, đổi selection nhanh, resize |
| Công cụ | Debug/inactive, Inspector, filter resource; không cuộn/focus ngoài ý muốn |

Đo window scroll, stage rect, resource row identity qua click theo tọa độ.
Kiểm hit target ở tâm/cạnh/overlap và collider riêng với alpha. Audit console,
pageerror, lỗi asset; chỉ bỏ qua lỗi đã nêu rõ (ví dụ favicon mặc định), không
bỏ qua mọi 404. Test load trực tiếp route/cache lạnh và mode proposal nếu dùng
chung renderer. Lỗi primitive chung cần chạy regression các consumer liên quan.

## G4 · Đối chiếu game

Ảnh/runtime phải cùng phiên bản, state, ngôn ngữ, ownership, kích thước và
scale/crop được ghi. Dùng overlay/diff hoặc crop widget để xác định lệch,
phân biệt khác font/raster với geometry/sprite/state sai. Runtime interaction
cần bằng chứng tương ứng, ảnh tĩnh không chứng minh collider/transition.

Không có ảnh hoặc không được phép mở Editor: giữ G4 là chưa có bằng chứng,
bàn giao G1–G3 cùng gap. Không tự chạy game/build để hoàn thành gate khi project
cấm. Alpha cascade/raycast, layout enum lạ, font, shader, scaler/safe area là
các mục cần xác minh riêng khi chưa có tài liệu đủ rõ.

## G5 · Handoff

Ghi ngắn: nguồn/baseline, thay đổi, report và lệnh thực chạy, state coverage,
sai khác đã biết/ảnh còn thiếu. Report cũ chỉ là tham khảo lịch sử, không nói
đã chạy trong phiên hiện tại. Nếu chưa đạt gate, gọi đúng phần đã hoàn thành;
không tuyên bố “1-1 hoàn toàn” hoặc “pixel-perfect” ngoài phạm vi có chứng cứ.

## Prompt mở đầu cho màn hình tiếp theo

```text
Dùng skill map-game-ui để map UI [screen] từ [source checkout] vào website
[target checkout]. Đọc CLAUDE.md/AGENTS.md hiện tại trước và kiểm tra màn hình
đã nằm trong allowlist chưa; skill không tự mở rộng quyền nguồn.
Phân luồng trước: thêm tính năng hoặc tạo UI mới chỉ sửa UI Proposal; chỉnh
cho khớp project gốc chỉ sửa UI Preview, cập nhật thêm Proposal tương ứng
nếu chưa từng chỉnh sửa thiết kế. Kiểm lịch sử và bảo toàn Proposal đã sửa.

Đối chiếu .ui + controller/runtime assignments + config + sprite/meta +
localization. Lập inventory và state matrix theo nguồn, dùng pipeline dữ liệu
dẫn xuất và renderer chung; không hard-code layout/màu theo tên widget.
Đọc mapping-rules và collection-regressions, áp các case liên quan, không sao
chép hằng số/allowlist hay giả định engine của Collection sang màn hình mới.

Kiểm static, browser desktop/mobile, actual pixel cho tint/clone/9-slice,
text fit khi đổi nội dung/ngôn ngữ, click/collider/scroll stability, các nhánh
runtime và regression consumer renderer chung. Đối chiếu ảnh game được cung
cấp tại [reference, nếu có]. Bàn giao G0–G5, report thực chạy và gap còn mở;
phân biệt khớp source, hành vi web và parity runtime.
```
