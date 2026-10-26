# UI Components

Định nghĩa theo component.schema.json; validator tools/ui-component-definition.mjs dùng lại PATCH_FIELDS/validateField của Proposal, spriteKey là binding sprite đã có trong renderer và op add. sourcePath + sourceId phải cùng resolve một node; slot.path là full path trong subtree, default phải bằng snapshot .ui. sample là dữ liệu mẫu có nhãn. states.ruleSource là con trỏ dấu chấm vào collection-rules.json, không phải mã thực thi. usedIn.planned ghi rõ màn dự kiến. composedOf chỉ mô tả quan hệ; không nhân bản entity.

Generator chỉ đọc snapshot GDD, không nhận project-root; validate toàn batch trước khi ghi. Không mở rộng allowlist hoặc thay nguồn UI Proposal.

## Catalog đã chốt

| ID | Nguồn dưới Container (trừ scrim) | Trạng thái |
|---|---|---|
| `popup-frame` | `/BG` | real |
| `title-bar` | `/Title` | real |
| `close-button` | `/Title/CloseButton` | real |
| `scrim` | `PetsCollection/DarkBG` | real |
| `tab-button` | `/RarityTabsLayout/AllTabButton` | runtime |
| `detail-tab-button` | `/DetailsTabsLayout/InfoTabButton` | runtime |
| `tab-bar` | `/RarityTabsLayout` | real |
| `item-cell` | `/PetsLayout/Pet (1)` | real |
| `item-grid` | `/PetsLayout` | real |
| `pagination` | `/PageBtns` | real |
| `detail-card` | `/PetDetails/Pet` | real |
| `info-row` | `/Info/Value` | real |
| `progress-counter` | `/PetsCount` | real |
| `unlock-banner` | `/UnlockObtain` | real |
| `rarity-badge` | `/PetDetails/Pet/RarityBG` | runtime |
| `list-popup` | `Container` | real |

So với plan §4: popup-frame dùng BG (decor) vì Container chứa toàn màn; title-bar tách riêng. item-grid chỉ lấy PetsLayout, phân trang là sibling độc lập. Thêm detail-tab-button vì tab chi tiết có kích thước/nhãn/sprite chọn khác tab rarity, cùng có tiềm năng tái dùng. Bỏ recipe-row: công thức hiện riêng Collection/Fusion với hai Pet trùng path, chưa có hợp đồng tham số tái dùng đã xác minh; không tạo component một lần. Giữ list-popup là Container đầy đủ, không vẽ HTML hoặc ghép lại geometry. Scrim chỉ dùng DarkBG, không gộp PreventCloseButton khác subtree. Không lấy component Proposal (các phương án thưởng chưa duyệt).

Rect khung dùng kích thước đã resolve anchor/sizeDelta bằng uiRenderer.rect; BG có sizeDelta.y âm và scrim có anchor stretch nên không thể dùng sizeDelta thô. Re-root chỉ thay transform gốc, giữ nguyên mọi node con. Spec.nodes.rect giữ tọa độ cục bộ của nguồn; cây trên web đo lại sau layout bằng renderer.

Template xuất op add hợp lệ; slot đã áp vào entity, tên/binding được ghi ở reason, không thêm field slots trái schema Proposal. ID được thêm tiền tố uic. Những field serialize không được whitelist Proposal hỗ trợ và sprite lib thiếu được liệt kê templateOmitted, không ngầm khẳng định export đầy đủ shader/gradient. Không thực thi op addComponent.

Tên gốc template xuất là Component_<id>; các sibling trùng tên (Recipe/Pet) thêm ID vào tên để validator Proposal chấp nhận. Bản preview/spec giữ nguyên tên/path nguồn. Sprite lib thiếu không được thay bằng asset giả.
