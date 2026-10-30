# HANDOFF — Dominate The World: Tower Defense

## Mục đích
Tài liệu này dành cho Claude Free để đọc mã nguồn game và hỗ trợ nhúng/liên kết game vào trang Novel.

## Mã nguồn hiện tại
- Repository: https://github.com/kazamajaze/dtw-tower-defense
- Game đang chạy: https://kazamajaze.github.io/dtw-tower-defense/
- File chính: `index.html`
- Đăng nhập/đồng bộ tiến trình: `cloud-auth.js`
- Nhánh: `main`

Tải toàn bộ mã nguồn: mở repository → nút **Code** → **Download ZIP**. Giải nén rồi tải ZIP hoặc hai file trên vào Claude để Claude đọc.

## Kiến trúc đang có
- Game là ứng dụng HTML/CSS/JS một trang.
- Dữ liệu thiết kế game nằm trong `data` của `index.html`: characters, monsters, maps, campaign, settings và dữ liệu tiến trình.
- Dữ liệu cục bộ dùng localStorage key `dtwtd_data`.
- Tài khoản và tiến trình cloud dùng Supabase Auth + bảng `player_saves`, truy vấn theo `user_id`.
- `playerSaveData()` chỉ đóng gói trạng thái người chơi: collection, equipped, wins, shards, chestsClaimed, completed, settings.
- Không đưa Supabase service-role key vào frontend. Publishable key hiện có trong `cloud-auth.js` là khóa client-side.

## Sự kiện tích hợp hiện có
Game phát các sự kiện:
- `dtw-cloud-save`: gửi payload tiến trình người chơi.
- `dtw-cloud-load`: nhận dữ liệu tiến trình người chơi.
- `dtw-cloud-request-local`: yêu cầu game gửi tiến trình local.
- `dtw-cloud-reset-player`: reset phần tiến trình người chơi trên thiết bị.

API trình duyệt:
- `window.DTWCloud.save(payload)`
- `window.DTWCloud.sync()`
- `window.DTWCloud.getUser()`

## Ranh giới dữ liệu bắt buộc khi tích hợp Novel
1. **Dữ liệu dùng chung do admin/Novel quản lý**: nội dung nhân vật, quái, bản đồ, campaign, wave, thông số cân bằng và cấu hình mở khóa. Đây là nội dung game, không phải tài sản của từng người chơi.
2. **Dữ liệu riêng theo tài khoản**: nhân vật đã sở hữu, đội hình, wins, shards, rương đã nhận, màn đã vượt, cài đặt. Dữ liệu này tiếp tục thuộc từng `user_id` trong `player_saves`.
3. Không được ghi đè/xóa `player_saves` khi cập nhật nội dung dùng chung. Không reset tài nguyên hoặc tiến trình của người chơi khi admin cập nhật game.
4. Không cho client tự ghi nội dung dùng chung bằng quyền admin. Quyền cập nhật phải được xác thực phía server/database.

## Cách nhúng khuyến nghị
Ưu tiên nhúng game bằng iframe từ URL GitHub Pages để giảm xung đột CSS/JS với Novel:
```html
<iframe
  src="https://kazamajaze.github.io/dtw-tower-defense/"
  title="Dominate The World: Tower Defense"
  style="width:100%;min-height:800px;border:0;border-radius:12px"
  loading="lazy"
  allow="fullscreen"
></iframe>
```
Nếu cần trao đổi dữ liệu giữa Novel và game, dùng `window.postMessage` với kiểm tra chính xác `event.origin` ở cả hai phía. Không dùng `'*'` làm target origin khi gửi dữ liệu nhạy cảm. Chỉ gửi dữ liệu cần thiết; không gửi mật khẩu, access token hay service-role key.

## Việc chưa hoàn tất — Claude cần biết rõ
- Chưa có cầu nối `postMessage` được triển khai trong game.
- Chưa có endpoint/bảng riêng cho nội dung game dùng chung do admin quản lý.
- Chưa nối schema dữ liệu Novel với schema characters/monsters/maps/campaign trong game.
- Chưa có phân quyền admin phía server cho việc xuất bản nội dung dùng chung.
- Vì vậy hiện tại iframe chỉ hiển thị game độc lập; không được mô tả là đã đồng bộ nội dung Novel.

## Prompt gửi Claude Free
"Đọc toàn bộ mã nguồn game trong các file đính kèm và tài liệu HANDOFF_FOR_CLAUDE.md. Hãy đề xuất cách tích hợp game vào file Novel `Dominate_The_World_Kazama_Jaze.html`. Mục tiêu: (1) nhúng game vào trang Novel, ưu tiên iframe; (2) thiết kế cầu nối postMessage an toàn nếu thật sự cần; (3) tách nội dung game dùng chung do admin quản lý khỏi tiến trình riêng từng tài khoản; (4) tuyệt đối không xóa/ghi đè player_saves, tài nguyên, nhân vật sở hữu hoặc tiến trình người chơi khi cập nhật nội dung chung. Trước tiên hãy phân tích và liệt kê các điểm cần sửa theo file/hàm; chưa tự ý xóa hoặc thay thế dữ liệu hiện có. Trả lời bằng patch cụ thể và giải thích cách áp dụng."

## Kiểm tra trước khi triển khai
- Xác nhận file Novel đích và vị trí muốn hiển thị game.
- Xác nhận nguồn gốc được phép trong iframe/CSP.
- Thiết kế schema nội dung chung và policy admin trước khi bật ghi dữ liệu.
- Kiểm thử đăng nhập hai tài khoản khác nhau để chắc chắn tiến trình tách biệt.
