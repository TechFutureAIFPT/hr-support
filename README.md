# Ứng dụng sàng lọc CV thông minh

Ứng dụng này chứa mọi thứ cần thiết để chạy ứng dụng của bạn cục bộ.

## Chạy cục bộ

**Yêu cầu:** Node.js

1. Cài đặt dependencies:
   `npm install`
2. Chạy ứng dụng:
   `npm run dev`

## Bản quyền

<img src="./public/photo/icon/Support Hr.jpg" alt="Support HR Logo" width="150" />

© 2025 - Phần mềm của tôi
 

## Chế độ Chấm điểm Deterministic

Hệ thống hiện sử dụng một bộ máy chấm điểm deterministic (rule-based) để đảm bảo cùng một JD và cùng một bộ CV đầu vào luôn cho ra kết quả giống nhau 100% (trừ khi bạn thay đổi mã nguồn hoặc trọng số cấu hình).

### Thành phần chính
- `services/deterministicScoring.ts`: Tách trích xuất tín hiệu và tính 8 subscores (K,E,P,U,R,S,Q,V) + 2 khoản phạt (G,F) + confidence.
- `geminiService.ts`: AI chỉ còn dùng để trích xuất & giải thích; mọi tham số sinh ngôn ngữ đặt `temperature=0`, `topP=0`, `topK=1` để loại bỏ độ ngẫu nhiên.
- `scoringWorker.ts`: Dùng điểm đã có (nếu có) hoặc fallback hash ổn định (không còn Math.random cho scoring).

### Các nguồn ngẫu nhiên đã loại bỏ
| Trước | Sau |
|-------|-----|
| Math.random() cho ID ứng viên | Hash FNV-1a ổn định dựa trên tên file + metadata |
| temperature > 0 trong gọi LLM | temperature=0, topP=0, topK=1 |
| Sắp xếp không ổn định | Sort theo điểm giảm dần, tie-break theo tên file |

### Công thức tổng quát
Score = Σ (w_i * sub_i) - (λ_G * G) - (λ_F * F)
Confidence = min(coverage, Q, link/kpi signal)

### Tùy biến
Có thể điều chỉnh trọng số hoặc penalty bằng cách truyền `config` vào `generateDeterministicScore` (nếu tích hợp sâu hơn) hoặc sửa hằng số trong file engine.

### Lưu ý
LLM vẫn có thể khác biệt về câu chữ giải thích nếu thay đổi model, nhưng điểm số tổng và phân rã luôn nhất quán.

