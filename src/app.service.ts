import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async crawlWebsite() {
    const browser = await puppeteer.launch({
      headless: 'shell',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--start-maximized',
        '--window-size=1920,1080',
      ],
    });
    const page = await browser.newPage();
    await page.goto('https://webgia.com/ty-gia/vietcombank/', {
      waitUntil: 'networkidle2',
    });

    const exchange = await page.evaluate(() => {
      const currencyUnit =
        document.querySelector('div.donvi')?.textContent?.trim() || ''; //done

      const source =
        document.querySelector('div.source')?.textContent?.trim() || ''; //done

      const updatedDate =
        document.querySelector('h1.h-head')?.textContent?.trim() || ''; //done

      const rows = document.querySelectorAll('table.table-exchanges tbody tr');
      const result: any[] = [];

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;

        const iconSpan = cells[0].querySelector('span.cur-icon');
        const currencyCode =
          (iconSpan?.className || '').split('ci-')?.[1] || '';

        const currencyToCountry = {
          usd: 'us',
          vnd: 'vn',
          eur: 'eu',
          jpy: 'jp',
          gbp: 'gb',
          aud: 'au',
          cad: 'ca',
          chf: 'ch',
          cny: 'cn',
        };

        const countryCode = currencyToCountry[currencyCode] || currencyCode; //done
        const currencyNote =
          cells[0]?.textContent?.trim().replace(/[()]/g, '') || ''; //done
        const currencyName = cells[1]?.textContent?.trim() || ''; // done
        const buyCash = cells[2]?.textContent?.trim() || ''; //done
        const buyTransfer = cells[3]?.textContent?.trim() || ''; //done
        const sellCash = cells[4]?.textContent?.trim() || ''; //done

        result.push({
          currencyCode,
          countryCode,
          currencyNote,
          currencyName,
          buyCash,
          buyTransfer,
          sellCash,
        });
      });

      return { currencyUnit, result, source, updatedDate };
    });

    await browser.close();
    return { status: 'success', exchange };
  }
}
