---
name: map-game-ui
description: >-
  Map an existing game's UI to a website from UI trees, runtime bindings,
  config and original sprites; audit visual and interaction fidelity and
  prevent regressions learned from SAP Collection. Route feature updates and
  new UI to UI Proposal, source-parity fixes to UI Preview. Use for that
  routing and source-based reconstruction, not a screenshot-only mockup.
---

# Map game UI từ source sang website

Mục tiêu: tái hiện cây widget, hình ảnh, dữ liệu và chuyển trạng thái theo
nguồn; có bằng chứng kiểm tra và khai báo phần chưa xác minh. Không hứa
pixel parity chỉ vì DOM hoặc test web đã pass.

## Phân luồng UI Preview / UI Proposal trước khi sửa

- **Update UI để thêm tính năng, đổi thiết kế hoặc tạo UI mới:** chỉ thực
  hiện ở **UI Proposal**; giữ UI Preview phản ánh project gốc. UI mới do
  người dùng đề xuất khác với map một UI đã có trong project gốc.
- **Chỉnh UI cho khớp project gốc:** chỉ sửa **UI Preview**. Sửa thêm bản
  **UI Proposal tương ứng nếu bản đó chưa từng được chỉnh sửa thiết kế**,
  để nó tiếp tục khớp baseline. Proposal đã được chỉnh sửa phải giữ nguyên
  thiết kế riêng; không tự reset, ghi đè hay đồng bộ lại theo Preview.
- Kiểm lịch sử/patch để xác định Proposal đã từng chỉnh sửa; không kết luận
  chỉ từ diff hiện tại rỗng. Chưa xác định được thì bảo toàn Proposal và ghi
  rõ giới hạn. Chi tiết và trường hợp renderer chung: R8 trong
  [quy tắc mapping](references/mapping-rules.md).
- Prompt chứa cả thêm tính năng và sửa parity: tách phần việc theo hai đích
  trên; không đưa tính năng đề xuất vào baseline Preview.

## Đọc theo công việc

- Mapping mới hoặc sửa renderer: đọc [quy tắc mapping](references/mapping-rules.md).
- Sửa lỗi/parity hoặc chuẩn bị nghiệm thu: đọc
  [bug lịch sử và regression](references/collection-regressions.md), rồi
  [acceptance gates](references/acceptance.md).
- Làm trong SAP_GDD: luôn đọc [tích hợp SAP](references/sap-integration.md)
  sau CLAUDE.md và AGENTS.md của checkout hiện tại. Quyền nguồn của project
  hiện tại quyết định phạm vi; ví dụ Collection không cấp quyền đọc UI khác.

## Quy trình

1. Phân luồng ý định theo quy tắc trên, xác định Proposal đã từng chỉnh sửa
   hay chưa. Chốt màn hình, checkout nguồn, trạng thái cần map và nguồn được phép đọc.
   Ghi commit/hash khi có, file UI, controller, config, resource, localization,
   ảnh runtime nếu có; kiểm tra snapshot có cùng phiên bản với code không.
   Thiếu quyền/nguồn chỉ chặn phần phụ thuộc, tiếp tục phần đã đủ chứng cứ.
2. Lập inventory entity/ID/path/type/parent, toàn bộ props gốc, runtime
   assignment và sprite tĩnh/runtime. Phân loại mỗi field: đã render và test,
   giữ nguyên nhưng chưa hỗ trợ, hoặc không áp dụng có lý do. Không bỏ field
   không hiểu để làm report đẹp hơn.
3. Xây pipeline source → dữ liệu dẫn xuất có provenance → renderer dùng chung
   → binding riêng từng màn hình. Sửa lớp sở hữu nguyên nhân; không vá JSON
   sinh ra, đổi CSS theo tên widget để che sai số, hoặc nhét config vào JS.
4. Đối chiếu render và state transition bằng các rule/reference. Với semantic
   engine chưa biết, tìm tài liệu chính thức qua connector nếu có; tên/kiểu
   field không chứng minh thuật toán. Giữ policy preview rõ ràng, không tự
   coi giả định hiện tại là quy tắc game. Không cần dừng toàn bộ task vì một
   sai khác đã được khoanh vùng.
5. Chạy static audit rồi browser audit theo acceptance gates; khi sửa primitive
   dùng chung, kiểm tra tất cả màn hình đang dùng nó, gồm proposal nếu có.
   Đối chiếu ảnh game cùng state/resolution nếu được cung cấp; ghi phần chưa
   chạy hoặc thiếu bằng chứng thành gap, không gọi là pass.
6. Bàn giao file/rule đã đổi, kết quả thực chạy, trạng thái đã phủ và gap còn
   mở. Commit/install/publish theo quyền và quy tắc project hiện tại; skill
   không tự cấp quyền ghi repo game, triển khai hay gửi tin nhắn.

## Tiêu chí quyết định

- Source UI quyết định giá trị serialize; controller quyết định override theo
  state; config/resource quyết định dữ liệu và sprite; ảnh/runtime quyết định
  kết quả quan sát được của engine. Nếu mâu thuẫn, kiểm tra phiên bản và state
  trước khi chọn nguồn; không dùng ảnh để bịa công thức gameplay.
- Tách ba kết luận: **khớp source**, **đã kiểm hành vi web**, **đã đối chiếu
  runtime game**. Mỗi kết luận chỉ áp dụng cho phạm vi đã kiểm.
- Collection là case study có giới hạn; số entity, viewport, recipe, alpha
  policy và allowlist của nó không phải hằng số dùng cho mọi game/màn hình.
