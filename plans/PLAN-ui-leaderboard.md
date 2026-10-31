# Leaderboard → UI Preview

Nguồn Leaderboard.ui + HudLeaderboard/LeaderboardManager/BigNumberHandler.
Tabs Income/Collection/Wealth/Like, loading/details, empty/reset ten ranks,
current rank 0→120+, medals 1/2/3 và label 4+, source money-rank suffix.
Tất cả score và rank là fixture mô phỏng, không đọc leaderboard thật.

UIProfile giữ props/callback gốc nhưng native account avatar/name chưa có
renderer web. AccountID mô phỏng chỉ hiện trong Inspector, không bịa avatar
hoặc dữ liệu tài khoản. Font/engine shader/scaler/hit order chưa có đối chiếu.

Static pass: 84 entity,14 sprite, không thiếu sprite/localization/registration.
CUA 2026-11-01: DOM84/84 mismatch0, Income `$100.0 m/s`, Like `12.345`,
rank0→`120+`, loading ẩn Details/hiện LoadingLabel, empty xóa Score;
390×844 không tràn ngang; console error rỗng. Native profile vẫn là gap.
