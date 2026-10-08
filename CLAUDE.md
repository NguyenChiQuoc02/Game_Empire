# Game Empire

Game chiến thuật TypeScript + Vite + PixiJS 8, lưu tài khoản/tiến trình bằng Firebase Auth + Firestore, deploy trên Vercel. Xem [README.md](README.md).

- ý tưởng tướng lấy từ truyện kim dung, tam quốc, tây du ký 
## Quy tắc bảo mật — KHÔNG push key lên Git

- **Tuyệt đối không commit/push** bất kỳ giá trị cấu hình Firebase nào (`VITE_FIREBASE_*`: apiKey, appId, messagingSenderId...) hay bí mật khác. Chúng chỉ nằm trong file `.env` (đã có trong `.gitignore`) và trong Environment Variables của Vercel.
- `.env.example` chỉ chứa **tên biến để trống**, không điền giá trị thật.
- Không ghi giá trị key vào code, README, CLAUDE.md, docs hay commit message.
- `.playwright-mcp/` (log, snapshot trình duyệt) có thể chứa cấu hình Firebase: luôn để trong `.gitignore`, không commit.
- Trước mỗi lần commit/push: chạy `git status` và `git diff --cached`, tìm `AIzaSy` và các giá trị trong `.env` để chắc chắn không lộ. Không dùng `git add -f` cho `.env`.
- Nếu lỡ push key: báo ngay cho chủ dự án để xoay (rotate) key trong Firebase/Google Cloud Console; xoá khỏi lịch sử Git là chưa đủ.
- không push những ảnh chụp màn hình chứa nội dung game.
- các ảnh chứa nội dung game chỉ được lưu trong `image/screenshoot/`
- không tạo branch, push code vào main luôn
## Đồng bộ dữ liệu

- Mỗi tài khoản có một document `saves/{uid}`; Firestore Rules chỉ cho chủ tài khoản đọc/ghi (xem [firestore.rules](firestore.rules)).
- Tài khoản dùng tên đăng nhập thường, quy đổi nội bộ thành `ten@gameempire.app`, không cần email thật.
- Ghi save qua `mutate()`/`flush()` trong [src/state.ts](src/state.ts). Server giữ số phiên bản `rev`; nếu thiết bị khác đã ghi trước thì `mergeSaves()` ([src/backend/save.ts](src/backend/save.ts)) gộp thay vì ghi đè. Khi thêm field mới vào `SaveData`, nhớ cập nhật `normalizeSave` và `mergeSaves`.

## Lệnh

- `npm run dev` — chạy dev (restart sau khi đổi `.env`)
- `npm run build` — typecheck + build
