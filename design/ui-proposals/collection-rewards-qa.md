# Collection rewards proposals — QA 2026-10-25

Đích: chỉ UI Proposal. Baseline Collection, renderer, controller Preview,
snapshot config và fixture cũ được giữ nguyên; kiểm bằng Git diff. Không
ghi repo game. Baseline nguồn website ghi master/1075dcec.

## Cơ chế và giả định

- Người dùng xác nhận: mỗi 4 mutation có quà; mỗi 4 weather có quà,
  trên từng pet; quà Cash/Dust. Lượng thưởng chưa được cung cấp.
- Đếm distinct loại đã ghi nhận theo pet type, không phải hiệu ứng đồng
  thời trên một cá thể. Mốc một lần, hai nhánh độc lập, không tiêu hao.
- 10 mutation (lọc ID >= 2) và 10 weather effects (ID >= 1) trong
  snapshot/binding hiện tại → mốc 4 và 8; không tự cấp quà ở 10 hay 12.
- Demo RAM, không có tài khoản hoặc cấp tiền; quy tắc retroactive và
  persistence khi mất pet cần nối với implementation game.

## Kiểm đã chạy

`node tools/create-collection-reward-proposals.mjs`

`node tools/sync-ui-proposals.mjs`

`node tools/audit-ui-proposals.mjs`: 671 case tĩnh pass, 4 proposals gồm
fixture cũ, 74 field. Kiểm guard, invalid batch không ghi, idempotency,
generated tree/diff/resource và asset border. Report
`dist/data/ui/proposals-audit.json` ghi browser=null; browser dưới đây là
kiểm trực tiếp bằng CUA, không phải suite Playwright trong audit script.

`node --check dist/app-ui-rewards-proposal.js`

`node --check dist/app-uiproposal.js`

Browser localhost:8080, pane 650×668, aspect 18:9:

| Kiểm | Kết quả |
|---|---|
| Deep link A, dữ liệu giả lập 8 mutation / 3 weather | Pass; thanh thưởng và mốc 4/8; DOM 159/159 sau layout cuối |
| A: nút trong canvas bằng tọa độ | Pass; nhận thử, mở lộ trình |
| A: cuộn sau nhận bằng tọa độ | Stage scrollTop=0, window scrollY=730.4 trước/sau; label chuyển Nhận mốc 4 → Nhận mốc 8 |
| 4/4, nhận Mutation rồi Weather | Pass; Mutation badge tắt trước; Weather và pet còn dấu tới khi nhận nhánh kia |
| Nhận hết quà pet chọn | Pass; dấu trên pet tắt, Common còn dấu do pet khác chưa nhận |
| B vào Info và nhận riêng một thẻ | Pass; hai thẻ hiện, nhận Mutation vẫn giữ Weather |
| C mở/đóng roadmap, khóa mốc chưa đạt | Pass; mốc 4/8 trên hai nhánh, DOM 152/152 |
| Current | Pass; không có RewardEntry trong DOM nguồn |
| Overlay | Pass; hai lớp current/proposed hiện; một thao tác chọn mode timeout ở client nhưng DOM xác nhận đổi thành công, không có lỗi console |
| Không sở hữu | Pass; badge pet tắt, vẫn xem được lộ trình khóa |
| Console warn/error | Không ghi nhận khi kiểm |
| Viewport 390×844 và 1440×1100 | Chưa chạy trong phiên này |
| Runtime game/safe area/font engine | Chưa có bằng chứng; không chạy Studio/build |

Ảnh QA trong `dist/data/ui/collection-rewards-*-qa.png` là web pane,
không phải ảnh engine. Tất cả lượng Cash/Dust giữ nhãn chưa có dữ liệu.
Locator click trong một bước QA đã tự cuộn stage của công cụ; tải sạch và
đo lại bằng click tọa độ để kiểm cuộn thật như hàng A phía trên.

## Bàn giao dev

Prompt tự sinh của mỗi proposal có patch entity và behavior appendix.
Các widget mới cần binding game; demo website không chứng minh binding
engine. Claim game phải được server xác nhận và có key nhận một lần theo
account/pet type/nhánh/mốc; lỗi claim giữ badge, nhận thành công mới cập
nhật. Mở tab không xóa badge; rarity tổng hợp cả pet ngoài trang hiện tại.
