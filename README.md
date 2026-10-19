# 🕷️ crawler-exchange-vcb-bank

A **NestJS + Puppeteer** crawler project to fetch:

- 🪙 Gold exchange rates  
- 🛢️ Crude oil and gasoline prices  
- 💱 Currency exchange rates  

from the [Vietcombank official website](https://www.vietcombank.com.vn).

---

## ⚙️ Technologies Used

- [NestJS](https://nestjs.com/) — Scalable backend framework
- [Puppeteer](https://pptr.dev/) — Headless browser automation

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/PhanNhatLoi/crawler-exchange-vcb-bank.git
cd crawler-exchange-vcb-bank
```
2. Install dependencies
```bash
npm install
# or
yarn
```
3. Install Puppeteer and Chromium
Puppeteer automatically downloads a compatible version of Chromium when you install it. However, you can also configure it explicitly.

```bash
npm install puppeteer
# or
yarn add puppeteer
```
Note: This will download a recent version of Chromium (~300MB). If you're deploying in a headless environment (e.g., Docker or Linux server), consider installing additional system dependencies like libx11, libxss1, or using puppeteer-core with a custom browser.

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

### Google Maps crawler

The selection flow uses two APIs:

```bash
# 1. Search by address or business name; results is always an array.
curl --get 'http://localhost:3000/api/v1/crawler/maps/search' \
  --data-urlencode 'query=Phở Khô Gia Lai Hồ Chí Minh' \
  --data-urlencode 'limit=5'

# 2. Pass googleMapsUrl from the selected result, or a shared short link.
curl --get 'http://localhost:3000/api/v1/crawler/maps/detail' \
  --data-urlencode 'url=https://maps.app.goo.gl/3BCpuMso7sGQBGHJ8'
```

Search requires `query` (1–500 characters). Optional `limit` defaults to 10,
with a maximum of 20. It returns `{ status, query, count, limit, hasMore, results,
warning }`. Status is `success`, `empty` (no matches), or `error` (loading failed).
Each result contains `name`, `address`, `lat`, `lng`, `googleMapsUrl`, and
`placeId`; unavailable values are `null`. List addresses may be abbreviated;
detail reads the full address. A plain street address can resolve to an address
pin rather than a business at that address; the API preserves Google's result.

Search reads the first loaded results and scrolls at most three times, within the
requested limit. `count` is the number returned, not Google's total result count.
`hasMore` indicates additional results exist or may remain unloaded; this version
does not provide pagination. The frontend shows results and calls detail with
the selected `googleMapsUrl`, without keeping a browser session between requests.

The old endpoint below remains available as an alias for detail.

`GET /api/v1/crawler/maps?url=<URL-encoded Google Maps link>` accepts full
Google Maps place links and shared links from `maps.app.goo.gl` or `goo.gl/maps`.
Use URL encoding so the Maps link's own `&` parameters remain inside `url`:

```bash
curl --get 'http://localhost:3000/api/v1/crawler/maps' \
  --data-urlencode 'url=https://maps.app.goo.gl/3BCpuMso7sGQBGHJ8'
```

Example data verified against both supplied links on 2026-10-19:

```json
{
  "status": "resolved",
  "name": "Phở Khô 2 Tô Gia Lai",
  "address": "82 Dương Quảng Hàm, An Nhơn, Hồ Chí Minh 700000, Việt Nam",
  "lat": 10.8251563,
  "lng": 106.6944692,
  "googleMapsUrl": "https://www.google.com/maps/place/...",
  "placeId": null,
  "warning": null
}
```

Statuses: `resolved` means name, address and place coordinates were read;
`coordinates_only` means coordinates are available but place details are incomplete;
`multiple_results` means a search returned a list without a selected place;
`unresolved` means no reliable place coordinates were found. Missing fields are
`null`. A loading failure returns partial data with `warning`; malformed or
unsupported input returns HTTP 400. Plain address text and directions links are
not supported by this endpoint.

Coordinates come from the selected place's `!3d...!4d...` URL data or an explicit
coordinate query, never the `@lat,lng` map camera position. Place IDs are returned
only when explicitly present in the resolved URL (including `!19sChIJ...`); hex CIDs and `/g/...` IDs are
not presented as Place IDs. Google UI changes, consent and CAPTCHA can prevent
resolution. The Vercel browser path still needs deployment-level testing.

For local Chrome, optionally set `PUPPETEER_EXECUTABLE_PATH`. Otherwise Puppeteer
uses its downloaded browser. Build and rerun the real-browser regression check:

```bash
npm run build
PUPPETEER_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node scripts/test-maps.cjs
# Live HTTP search → detail tests and Markdown/JSON reports:
PUPPETEER_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node scripts/test-maps-search.cjs
```

### Existing test commands

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
