# Google Maps Crawler API

Cập nhật: 19/10/2026.

API tìm địa điểm theo địa chỉ/tên, trả danh sách để người dùng chọn, sau đó lấy thông tin chi tiết của địa điểm đã chọn. Backend sử dụng Puppeteer mở Google Maps bằng browser headless và trả JSON.

## 1. Thông tin chung

| Thuộc tính | Giá trị |
|---|---|
| Base URL local | `http://localhost:3000/api/v1` |
| Base URL deploy | `https://<your-domain>/api/v1` — thay bằng domain triển khai thực tế |
| Method | `GET` |
| Response | `application/json` |
| Authentication | Phiên bản hiện tại chưa yêu cầu token hoặc API key |
| Request body | Không có; truyền bằng query params |
| Swagger local | `http://localhost:3000/docs` |

Chạy local:

```bash
npm install
npm run start:dev
```

Nếu dùng Chrome đã cài trên macOS thay cho browser mặc định của Puppeteer:

```bash
PUPPETEER_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run start:dev
```

## 2. Luồng tích hợp

1. Người dùng nhập địa chỉ hoặc tên địa điểm.
2. Gọi `GET /crawler/maps/search?query=...`.
3. Hiển thị `results` để người dùng chọn; kết quả luôn là một mảng, kể cả khi chỉ có một địa điểm.
4. Lấy `googleMapsUrl` của phần tử được chọn.
5. Truyền URL đó vào `GET /crawler/maps/detail?url=...`.
6. Dùng `name`, `address`, `lat`, `lng` từ detail; xử lý các trường thiếu bằng `null`.

Nếu đã có link Maps đầy đủ hoặc short link, có thể gọi detail trực tiếp, bỏ qua search. Hai API không yêu cầu giữ session hoặc browser giữa các lần gọi.

## 3. API Search

```http
GET /api/v1/crawler/maps/search
```

### Params

| Param | Kiểu | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|---|
| `query` | string | Có | — | Địa chỉ hoặc tên địa điểm; sau khi trim phải dài 1–500 ký tự |
| `limit` | integer | Không | `10` | Số kết quả tối đa trả về; từ `1` đến `20` |

`query` nhận nội dung tìm kiếm, không nhận nguyên link Google Maps search. Backend tự encode nội dung thành URL Google Maps. Gọi API không tự mở Maps trên trình duyệt của người dùng.

### cURL: tìm theo địa chỉ

```bash
curl --get 'http://localhost:3000/api/v1/crawler/maps/search' \
  --data-urlencode 'query=82 Dương Quảng Hàm, An Nhơn, Hồ Chí Minh' \
  --data-urlencode 'limit=5'
```

### cURL: tìm theo tên quán, nhận danh sách

```bash
curl --get 'http://localhost:3000/api/v1/crawler/maps/search' \
  --data-urlencode 'query=Phở Khô Gia Lai Hồ Chí Minh' \
  --data-urlencode 'limit=2'
```

### Response HTTP 200

Ví dụ minh họa với hai địa điểm lấy từ kết quả kiểm thử thực tế; các URL minh họa đã bỏ query params theo dõi. Thứ tự và số kết quả có thể thay đổi theo thời điểm truy cập Google Maps.

```json
{
  "status": "success",
  "query": "Phở Khô Gia Lai Hồ Chí Minh",
  "count": 2,
  "limit": 2,
  "hasMore": true,
  "results": [
    {
      "name": "Phở khô Gia Lai Thùy Linh",
      "address": "34 Đ. Số 2",
      "lat": 10.744513,
      "lng": 106.7057761,
      "googleMapsUrl": "https://www.google.com/maps/place/Ph%E1%BB%9F+kh%C3%B4+Gia+Lai+Th%C3%B9y+Linh/data=!4m7!3m6!1s0x31752f945a587f83:0x5c088c006de13c35!8m2!3d10.744513!4d106.7057761!16s%2Fg%2F11tjdjg76h!19sChIJg39YWpQvdTERNTzhbQCMCFw",
      "placeId": "ChIJg39YWpQvdTERNTzhbQCMCFw"
    },
    {
      "name": "Phở khô gia lai 79",
      "address": "40 Âu Dương Lân",
      "lat": 10.7473966,
      "lng": 106.6820635,
      "googleMapsUrl": "https://www.google.com/maps/place/Ph%E1%BB%9F+kh%C3%B4+gia+lai+79/data=!4m7!3m6!1s0x31752f005286eb55:0x7edc615c6c8c30be!8m2!3d10.7473966!4d106.6820635!16s%2Fg%2F11nhdbg687!19sChIJVeuGUgAvdTERvjCMbFxh3H4",
      "placeId": "ChIJVeuGUgAvdTERvjCMbFxh3H4"
    }
  ],
  "warning": null
}
```

### Các trường response

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `status` | string | `success`, `empty` hoặc `error` |
| `query` | string | Nội dung tìm kiếm sau khi trim |
| `count` | integer | Số phần tử thực tế trong `results`; không phải tổng kết quả trên Google |
| `limit` | integer | Giới hạn kết quả của request |
| `hasMore` | boolean | Có kết quả khác hoặc có thể còn kết quả chưa tải; chưa hỗ trợ phân trang/next-page token |
| `results` | array | Danh sách địa điểm để chọn |
| `warning` | string hoặc null | Cảnh báo tải dữ liệu, CAPTCHA/consent hoặc lỗi; thông báo có thể thay đổi |

Mỗi phần tử trong `results`:

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `name` | string | Tên địa điểm hoặc tên ghim địa chỉ |
| `address` | string hoặc null | Địa chỉ đọc từ danh sách; có thể là địa chỉ rút gọn |
| `lat` | number hoặc null | Vĩ độ địa điểm nếu lấy được |
| `lng` | number hoặc null | Kinh độ địa điểm nếu lấy được |
| `googleMapsUrl` | string | Link địa điểm; truyền nguyên giá trị này vào API detail |
| `placeId` | string hoặc null | Place ID nếu có rõ ràng trong URL |

### Trạng thái Search

| Status | Ý nghĩa | Xử lý phía client |
|---|---|---|
| `success` | Có ít nhất một kết quả; vẫn có thể kèm `warning` nếu dữ liệu chưa đầy đủ | Hiển thị danh sách và cảnh báo nếu có |
| `empty` | Không tìm thấy kết quả, không có lỗi được ghi nhận | Hiển thị không có kết quả, đề nghị bổ sung địa chỉ |
| `error` | Không đọc được kết quả do lỗi tải trang, timeout, CAPTCHA/consent… | Hiển thị lỗi; tránh gửi lại liên tục |

Ví dụ không có kết quả:

```json
{
  "status": "empty",
  "query": "địa chỉ không có kết quả",
  "count": 0,
  "limit": 10,
  "hasMore": false,
  "results": [],
  "warning": null
}
```

Ví dụ lỗi nghiệp vụ do gặp màn hình xác minh, vẫn trả HTTP 200:

```json
{
  "status": "error",
  "query": "Phở Khô Gia Lai Hồ Chí Minh",
  "count": 0,
  "limit": 10,
  "hasMore": false,
  "results": [],
  "warning": "Google Maps requested consent or CAPTCHA verification"
}
```

## 4. API Detail

```http
GET /api/v1/crawler/maps/detail
```

### Params

| Param | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `url` | string | Có | `googleMapsUrl` từ Search, link địa điểm Maps đầy đủ hoặc short link Maps |

Các dạng URL được hỗ trợ:

- `https://www.google.com/maps/place/...`
- `https://google.com/maps/place/...`
- `https://maps.google.com/...`
- `https://maps.app.goo.gl/...`
- `https://goo.gl/maps/...`

Chỉ nhận HTTPS; không nhận URL có username/password hoặc port tùy chỉnh. Các domain Maps theo quốc gia khác chưa được hỗ trợ. Link chỉ đường `/maps/dir...` truyền trực tiếp bị từ chối. Không truyền địa chỉ dạng văn bản vào `url`; hãy dùng Search cho địa chỉ.

Nên truyền link của địa điểm đã chọn. Link tìm kiếm nhiều kết quả có thể trả `multiple_results`; link chỉ chứa vị trí tâm bản đồ có thể không xác định được tọa độ địa điểm.

### cURL: detail bằng short link

```bash
curl --get 'http://localhost:3000/api/v1/crawler/maps/detail' \
  --data-urlencode 'url=https://maps.app.goo.gl/3BCpuMso7sGQBGHJ8'
```

### cURL: detail bằng link đầy đủ

```bash
curl --get 'http://localhost:3000/api/v1/crawler/maps/detail' \
  --data-urlencode 'url=https://www.google.com/maps/place/Ph%E1%BB%9F+Kh%C3%B4+2+T%C3%B4+Gia+Lai/@10.8251616,106.6918943,17z/data=!3m1!4b1!4m6!3m5!1s0x31752900060e78e1:0xfb189aa9e445c2c!8m2!3d10.8251563!4d106.6944692!16s%2Fg%2F11n3mv4yj2'
```

### Response HTTP 200

Ví dụ dựa trên kết quả kiểm thử short link; URL minh họa đã bỏ các query params theo dõi:

```json
{
  "status": "resolved",
  "name": "Phở Khô 2 Tô Gia Lai",
  "address": "82 Dương Quảng Hàm, An Nhơn, Hồ Chí Minh 700000, Việt Nam",
  "lat": 10.8251563,
  "lng": 106.6944692,
  "googleMapsUrl": "https://www.google.com/maps/place/Ph%E1%BB%9F+Kh%C3%B4+2+T%C3%B4+Gia+Lai/@10.8251616,106.6918943,17z/data=!3m1!4b1!4m6!3m5!1s0x31752900060e78e1:0xfb189aa9e445c2c!8m2!3d10.8251563!4d106.6944692!16s%2Fg%2F11n3mv4yj2",
  "placeId": null,
  "warning": null
}
```

### Các trường response

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `status` | string | Trạng thái xử lý detail theo bảng bên dưới |
| `name` | string hoặc null | Tên địa điểm hoặc tên ghim địa chỉ |
| `address` | string hoặc null | Địa chỉ hiển thị trên trang chi tiết |
| `lat` | number hoặc null | Vĩ độ địa điểm |
| `lng` | number hoặc null | Kinh độ địa điểm |
| `googleMapsUrl` | string | URL đích khi đọc được; nếu tải thất bại sớm có thể vẫn là URL đầu vào |
| `placeId` | string hoặc null | Place ID khi trích xuất được; không đồng nhất với CID hoặc mã `/g/...` |
| `warning` | string hoặc null | Cảnh báo hoặc lỗi trong quá trình đọc trang |

### Trạng thái Detail

| Status | Ý nghĩa | Xử lý phía client |
|---|---|---|
| `resolved` | Đã đọc được tên, địa chỉ và lat/lng | Có thể dùng thông tin; kiểm tra thêm `warning` nếu có |
| `coordinates_only` | Có lat/lng nhưng chưa đủ tên hoặc địa chỉ; các trường khác vẫn có thể có giá trị | Dùng tọa độ nếu phù hợp, cho phép người dùng bổ sung thông tin |
| `multiple_results` | Trang là danh sách kết quả, chưa chọn địa điểm | Gọi Search và yêu cầu người dùng chọn một kết quả |
| `unresolved` | Chưa xác định được tọa độ đáng tin cậy; có thể vẫn đọc được tên/địa chỉ | Đọc `warning`, đề nghị chọn lại địa điểm hoặc kiểm tra link |

`resolved` xác nhận dữ liệu đã được đọc từ Maps, không xác minh độc lập độ chính xác ngoài thực tế. `placeId: null` không có nghĩa địa điểm không tồn tại hoặc không có Place ID.

## 5. HTTP errors và input không hợp lệ

Thiếu/sai params trả HTTP 400 theo định dạng NestJS:

```json
{
  "message": "query must contain 1 to 500 characters",
  "error": "Bad Request",
  "statusCode": 400
}
```

Các thông báo validation hiện có:

| Trường hợp | Message |
|---|---|
| Thiếu/rỗng `query`, hoặc dài hơn 500 ký tự sau trim | `query must contain 1 to 500 characters` |
| `limit` không phải số nguyên 1–20 | `limit must be an integer between 1 and 20` |
| Thiếu/rỗng `url` | `url is required` |
| `url` không parse được | `url must be a Google Maps HTTPS URL` |
| Domain/protocol/credentials/port không được hỗ trợ | `Only Google Maps URLs and Maps short links are supported` |
| Truyền trực tiếp link chỉ đường | `Use a place link rather than a directions link` |

Phân biệt hai lớp lỗi:

- HTTP 400: sửa params trước khi gọi lại.
- HTTP 200: tiếp tục kiểm tra `status` và `warning`; HTTP 200 không bảo đảm lấy được dữ liệu.
- Lỗi HTTP 5xx, mất kết nối hoặc timeout ở tầng triển khai: xử lý riêng như lỗi hệ thống; response có thể không theo schema thành công ở trên.

Không nên dùng nội dung chính xác của `warning` làm mã lỗi cố định vì có thể chứa thông báo runtime hoặc timeout từ browser.

## 6. Ví dụ tích hợp JavaScript

```javascript
const API_BASE_URL = 'http://localhost:3000/api/v1';

async function getJson(path, params) {
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function searchPlaces(query, limit = 5) {
  const data = await getJson('/crawler/maps/search', { query, limit });
  if (data.status === 'error') {
    throw new Error(data.warning || 'Không thể tìm kiếm địa điểm');
  }
  // Hiển thị data.results; empty tương ứng danh sách rỗng.
  // Khi có data.warning, hiển thị cảnh báo dữ liệu có thể chưa đầy đủ.
  return data;
}

async function onSelectPlace(selectedResult) {
  const detail = await getJson('/crawler/maps/detail', {
    url: selectedResult.googleMapsUrl,
  });
  if (detail.status !== 'resolved') {
    // Tùy giao diện: hiển thị dữ liệu một phần hoặc yêu cầu chọn lại.
    console.warn(detail.status, detail.warning);
  }
  return detail;
}

// Bước 1: const search = await searchPlaces('Phở Khô Gia Lai Hồ Chí Minh');
// Bước 2: hiển thị search.results cho người dùng chọn.
// Bước 3: khi click một phần tử, gọi onSelectPlace(phầnTửĐãChọn).
```

Sử dụng `URLSearchParams` hoặc `curl --data-urlencode` để encode params đúng một lần. Đặc biệt, không nối trực tiếp link Maps có dấu `&` vào query string vì sẽ làm tách sai params.

## 7. Tương thích endpoint cũ

```http
GET /api/v1/crawler/maps?url=...
```

Endpoint này vẫn hoạt động với cùng params và response như Detail. Tích hợp mới nên sử dụng `/crawler/maps/detail`.

## 8. Giới hạn hiện tại

- Search trả tối đa `limit`, không cam kết lấy toàn bộ kết quả Google Maps; chưa hỗ trợ phân trang.
- Địa chỉ trong danh sách có thể rút gọn; gọi Detail để đọc địa chỉ đầy đủ nếu có.
- Tìm một số nhà có thể trả ghim địa chỉ thay vì tên quán tại địa chỉ đó. Một địa chỉ có thể chứa nhiều doanh nghiệp.
- Tọa độ địa điểm được phân biệt với tọa độ tâm khung nhìn `@lat,lng`; không lấy tâm bản đồ làm vị trí quán.
- Mỗi request hiện mở rồi đóng một browser; chưa cache kết quả Maps và chưa tái sử dụng browser giữa các request.
- Độ trễ phụ thuộc mạng, Google và môi trường triển khai; không có SLA. Client cần xử lý trạng thái chờ, timeout và lỗi.
- Có thể gặp CAPTCHA, consent, thay đổi giao diện hoặc giới hạn truy cập. Bộ nhận diện hiện tại không bảo đảm nhận diện mọi trường hợp chặn; không tự giải CAPTCHA hoặc xử lý form consent.
- Đã kiểm thử local. Kết quả local không bảo đảm hiệu năng hoặc tỷ lệ thành công trên Vercel/server khác.
