# Voh

Voh là ứng dụng web giúp người Việt ở nước ngoài nghe lại các chương trình của Đài Radio VOH một cách nhanh, gọn và dễ dùng.

## Mục tiêu

- Giúp người dùng tìm và nghe lại các tập đã phát sóng của VOH.
- Tối ưu trải nghiệm nghe trên web, đặc biệt cho người dùng ở xa Việt Nam.
- Giảm thao tác: vào chương trình, chọn tập, bấm phát là nghe ngay.

## Tính năng hiện tại

- Trang chủ hiển thị danh sách chương trình dưới dạng thẻ.
- Route động theo mã chương trình: /program/:id
- Trang chương trình hiển thị danh sách tập đã phát (title).
- Bấm Phát để lấy audio URL và phát ngay trên trình duyệt.

## Công nghệ sử dụng

- Angular
- Tailwind CSS
- Angular Router
- HttpClient + RxJS

## Cấu trúc dữ liệu

Ứng dụng gọi qua proxy nextdata để lấy dữ liệu JSON từ trang VOH:

1. Lấy danh sách tập theo program id.
2. Lấy chi tiết từng tập theo slug để đọc audioUrl.

Toàn bộ logic fetch dữ liệu nằm trong thư mục services.

## Chạy dự án ở môi trường local

Yêu cầu:

- Node.js
- npm

Cài dependencies:

```bash
npm install
```

Chạy ứng dụng:

```bash
npm start
```

Ứng dụng có thể truy cập trực tiếp tại:

- [https://hintdesk.github.io/voh/](https://hintdesk.github.io/voh/)

## Scripts hữu ích

- Chạy dev server: npm start
- Build production: npm run build
- Chạy unit test: npm test

## Định hướng mở rộng

- Bổ sung thêm nhiều program id trong cấu hình service.
- Thêm bộ lọc hoặc tìm kiếm theo tên tập.
- Lưu lịch sử nghe gần đây cho người dùng.
