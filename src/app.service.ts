import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async crawlWebsite() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://webgia.com/ty-gia/mbbank/', {
      waitUntil: 'networkidle2',
    });

    const exchange = await page.evaluate(() => {
      const currencyUnit =
        document.querySelector('div.donvi')?.textContent?.trim() || '';

      const source =
        document.querySelector('div.source')?.textContent?.trim() || '';

      const updatedDate =
        document.querySelector('h1.h-head')?.textContent?.trim() || '';

      const rows = document.querySelectorAll('.table-exchanges tbody tr');
      const result: any[] = [];

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 6) return;

        const currencyCode =
          cells[0].querySelector('span')?.textContent?.trim().split(' ')[0] ||
          '';
        const currencyNote =
          cells[0]
            .querySelector('span span')
            ?.textContent?.trim()
            .replace(/[()]/g, '') || '';
        const currencyName = cells[1]?.textContent?.trim() || '';
        const buyCash = cells[2]?.textContent?.trim() || '';
        const buyTransfer = cells[3]?.textContent?.trim() || '';
        const sellCash = cells[4]?.textContent?.trim() || '';
        const sellTransfer = cells[5]?.textContent?.trim() || '';

        result.push({
          currencyCode,
          currencyNote,
          currencyName,
          buyCash,
          buyTransfer,
          sellCash,
          sellTransfer,
        });
      });

      return { currencyUnit, result, source, updatedDate };
    });

    await browser.close();
    return { status: 'success', exchange };
  }
}
