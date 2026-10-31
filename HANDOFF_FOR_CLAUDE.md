# HANDOFF — Dominate The World: Tower Defense

## Nguồn hiện tại
- Repository: https://github.com/kazamajaze/dtw-tower-defense
- Game Pages: https://kazamajaze.github.io/dtw-tower-defense/
- Game: `index.html`
- Auth + Supabase: `cloud-auth.js`
- SQL: `supabase-player-saves.sql`, `supabase_admin_player_setup.sql`, `supabase_inbox_redeem_setup.sql`, `supabase_security_hardening.sql`

## Ranh giới dữ liệu — bắt buộc giữ
### Nội dung game dùng chung
Chỉ lưu trong `public.game_content`, row `id='main'`:
- `characters`, `monsters`, `maps`, `campaign`, `rouletteRewards`
- Chỉ Admin đã xác thực được publish. `cloud-auth.js` chỉ pick các khóa trên, không chuyển payload người chơi vào `game_content`.

### Dữ liệu riêng của từng tài khoản
Chỉ lưu trong `public.player_saves`, khóa `user_id`, JSONB `save_data`:
- `collection`, `equipped`, `shards`, `wins`, `chestsClaimed`, `completed`, `settings`, `inventory`
- Payload hiện dùng `schemaVersion: 2`, `playerState`.
- `inventory` đã có trong payload để lưu vật phẩm; giao diện vật phẩm riêng chưa được xây dựng trong bản game hiện tại.
- RLS phải giới hạn SELECT/INSERT/UPDATE theo `auth.uid() = user_id`. Không ghi dữ liệu người chơi vào `game_content`.

## LocalStorage và migration an toàn
- Legacy key `dtwtd_data` được đọc để khôi phục dữ liệu cũ, nhưng code mới không ghi đè hoặc xóa key này.
- Nội dung chung mới: `dtwtd_shared_content_v1`.
- Tiến trình local theo tài khoản: `dtwtd_player_state_v1:<user_id>`; khách chưa đăng nhập dùng hậu tố `guest`.
- `dtwtd_cloud_migrated_v1` đánh dấu tài khoản đầu tiên đã nhận dữ liệu legacy trên thiết bị. Tài khoản khác không có save riêng sẽ bắt đầu từ mặc định, không nhận nhầm tiến trình của tài khoản đầu.
- Nếu tài khoản có bản local riêng thì ưu tiên bản đó khi cloud row chưa tồn tại.
- Khi tải cloud save cũ thiếu một số trường mới, dữ liệu local của đúng tài khoản/legacy owner được giữ làm fallback; tài khoản khác không dùng fallback của người đầu.
- Đăng xuất phải flush save trước. Nếu chưa xác nhận lưu cloud thành công, nút đăng xuất giữ phiên đăng nhập để tránh mất tiến trình.
- Không xóa `dtwtd_data`, không chạy reset toàn bộ data trong migration.

## Import / export / cập nhật nội dung
- File backup mới có `format: "dtw-shared-content"`, chỉ chứa `characters`, `monsters`, `maps`, `campaign`, `rouletteRewards`.
- Import chỉ dành cho Admin, xác thực cấu trúc trước khi áp dụng và chỉ thay đổi các khóa nội dung chung.
- Import tương thích file JSON dự án cũ bằng cách chỉ lấy các khóa nội dung; bỏ qua `collection`, `equipped`, `shards`, `wins`, `inventory`, `completed`, `settings`.
- Backup Novel ZIP/JSON không phải backup game và không được nhập vào game.
- Export không bao giờ chứa email, user id, token hoặc tiến trình người chơi.
- Nút khôi phục mẫu chỉ khôi phục nội dung chung, không reset tài khoản.
- Khi nội dung chung xóa một nhân vật, ID sở hữu/đội hình của người chơi vẫn được giữ. Nếu nhân vật được phát hành lại, quyền sở hữu cũ vẫn còn.

## Sự kiện và API
- `dtw-cloud-save`: gửi player payload.
- `dtw-cloud-load`: nhận player payload; detail gồm `userId` và cờ fallback.
- `dtw-cloud-local-load`: nạp local save theo user trước khi hỏi cloud.
- `dtw-cloud-request-local`: yêu cầu player payload hiện tại.
- `dtw-cloud-reset-player`: reset player state trong bộ nhớ cho tài khoản mới/đăng xuất; không xóa legacy backup.
- `dtw-shared-content-load`: nhận riêng nội dung chung.
- `window.DTWCloud.getUser()`, `isReady()`, `save(payload)`, `sync()`, `publishSharedContent(content)`.

## Supabase — cần kiểm tra thủ công
Không có quyền truy cập trực tiếp Supabase Dashboard trong lần sửa này; chưa xác minh schema/policy đang chạy trên project thật và chưa chạy SQL.
1. Nếu chưa có cột/index: chạy `supabase-player-saves.sql`.
2. Nếu chưa có `game_content` hoặc chưa gán Admin: kiểm tra rồi chạy `supabase_admin_player_setup.sql`.
3. Nếu dùng Inbox/redeem: chạy `supabase_inbox_redeem_setup.sql`.
4. Cuối cùng rà soát rồi chạy `supabase_security_hardening.sql` để thay policy cũ bằng policy owner/admin. Script này thay đổi quyền RLS nhưng không xóa dữ liệu bảng.
5. Sau khi gán role Admin, đăng xuất/đăng nhập lại để JWT nhận `app_metadata.role='admin'`.
6. Kiểm thử bằng hai tài khoản: tài khoản A có dữ liệu; tài khoản B không được thấy shards/collection/đội hình của A.

Không đưa service-role key vào frontend. Publishable key trong `cloud-auth.js` là client key; RLS mới là ranh giới bảo mật.

## Novel — cấu trúc đã kiểm tra
File `Dominate_The_World_Kazama_Jaze.html` có backup riêng:
- `BACKUP_KEY = 'dtw_full_backup'`
- `collectAllData()` gom chapters, characters, powerTree, season data, comments, elements, clans, map/lore/OST.
- `applyAllData()` khôi phục các trường Novel.
- ZIP export/import dùng `backup.json`.
Không đưa game payload vào `collectAllData()` hoặc `applyAllData()`; không đổi key backup Novel. Nhúng game bằng iframe để hai ứng dụng có storage và vòng đời riêng. Hiện chưa triển khai postMessage bridge.

## Ghi chú phục hồi mã nguồn
Bản `main` được kiểm tra có `index.html` chỉ 20,366 bytes và kết thúc giữa hàm `nav()`; file game đầy đủ trước đó có khoảng 102 KB. Nhánh sửa phục hồi toàn bộ file, giữ phần CSS/ensure/shards-wins mới nhất, và giữ các sửa selector đã kiểm tra. Không merge/deploy cho tới khi review PR và kiểm thử.

## Nhúng game vào Novel
Xem `NOVEL_INTEGRATION.md` để dùng iframe an toàn và giữ backup Novel tách biệt.
