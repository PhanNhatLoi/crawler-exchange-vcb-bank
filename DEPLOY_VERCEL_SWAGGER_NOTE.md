# NestJS Swagger on Vercel (Practical Note)

## Mục tiêu

Hiển thị được Swagger UI trên Vercel, không chỉ trả về `docs-json`.

## Triệu chứng thường gặp

- `GET /docs-json` trả JSON bình thường.
- `GET /docs` ra trang trắng hoặc không có CSS/JS.

## Nguyên nhân chính

1. Entrypoint khác nhau giữa local và Vercel:
- Local thường chạy `src/main.ts`.
- Vercel project này chạy `api/index.ts`.
- Nếu chỉ setup Swagger ở `main.ts`, deploy lên Vercel sẽ thiếu config UI.

2. Asset Swagger UI không load ổn trong môi trường serverless/rewrite:
- HTML của `/docs` vẫn trả về.
- Nhưng file JS/CSS của Swagger UI có thể fail, dẫn tới màn hình trắng.

## Cách fix đã áp dụng trong project này

### 1. Setup Swagger ở cả 2 nơi

- `src/main.ts` (chạy local)
- `api/index.ts` (chạy trên Vercel)

Nếu không đồng bộ 2 entrypoint, local và production sẽ lệch hành vi.

### 2. Dùng CDN cho Swagger UI assets

Thay vì phụ thuộc static asset nội bộ của swagger-ui-express, cấu hình:

- `customCssUrl`: `https://unpkg.com/swagger-ui-dist/swagger-ui.css`
- `customJs`:
  - `https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js`
  - `https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js`

### 3. Set rõ URL swagger json

- `jsonDocumentUrl: 'docs-json'`
- `swaggerOptions.url: '/docs-json'`

Mục tiêu là ép UI gọi đúng spec URL khi chạy qua Vercel route.

## Mẫu cấu hình

```ts
const swaggerConfig = new DocumentBuilder()
  .setTitle('Crawler Exchange API')
  .setDescription('API documentation for crawler exchange service')
  .setVersion('1.0')
  .build();

const swaggerDocument = SwaggerModule.createDocument(appOrNestApp, swaggerConfig);

SwaggerModule.setup('docs', appOrNestApp, swaggerDocument, {
  jsonDocumentUrl: 'docs-json',
  customCssUrl: 'https://unpkg.com/swagger-ui-dist/swagger-ui.css',
  customJs: [
    'https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js',
    'https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js',
  ],
  swaggerOptions: {
    url: '/docs-json',
  },
});
```

## Checklist debug nhanh

1. Kiểm tra `api/index.ts` có Swagger setup chưa.
2. Deploy lại rồi test:
- `/docs-json`
- `/docs`
3. Nếu `/docs` vẫn trắng, mở browser DevTools:
- Tab Network: kiểm tra 3 file CDN ở trên có 200 không.
- Tab Console: kiểm tra lỗi JS runtime hoặc CSP.
4. Xem logs deploy:
- `vercel logs <deployment-url> --since 1h`

## Endpoints tham chiếu

- `https://<your-domain>/docs`
- `https://<your-domain>/docs-json`

## Lưu ý vận hành

- Nếu môi trường production chặn gọi CDN ngoài (CSP/firewall), cần host static assets nội bộ hoặc dùng docs JSON + external Swagger viewer.
- Có thể tắt Swagger ở production nếu không cần public docs.
