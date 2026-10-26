# UI Components

Định nghĩa theo component.schema.json; validator tools/ui-component-definition.mjs dùng lại PATCH_FIELDS/validateField của Proposal, spriteKey là binding sprite đã có trong renderer và op add. sourcePath + sourceId phải cùng resolve một node; slot.path là full path trong subtree, default phải bằng snapshot .ui. sample là dữ liệu mẫu có nhãn. states.ruleSource là con trỏ dấu chấm vào collection-rules.json, không phải mã thực thi. usedIn.planned ghi rõ màn dự kiến. composedOf chỉ mô tả quan hệ; không nhân bản entity.

Generator chỉ đọc snapshot GDD, không nhận project-root; validate toàn batch trước khi ghi. Không mở rộng allowlist hoặc thay nguồn UI Proposal.
