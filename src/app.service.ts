import { Injectable } from '@nestjs/common';
import puppeteer, { Page } from 'puppeteer';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async crawlMultipleWebsites() {
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

    try {
      const [otherDataPage] = await browser.pages();
      const [exchangeData, otherData] = await Promise.all([
        this.crawlExchangeRate(),
        this.crawlOtherData(otherDataPage),
      ]);

      await browser.close();
      return {
        status: 'success',
        exchange: { ...otherData, ...exchangeData },
      };
    } catch (error) {
      await browser.close();
      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  async crawlExchangeRate() {
    try {
      const response = await axios.get(
        'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx',
        {
          responseType: 'text',
        },
      );

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
      });

      const jsonObj = parser.parse(response.data);

      const exrateList = jsonObj.ExrateList;
      const updatedDate = exrateList.DateTime;
      const source = exrateList.Source;
      const exrates = Array.isArray(exrateList.Exrate)
        ? exrateList.Exrate
        : [exrateList.Exrate];

      const result = exrates
        .map((item) => ({
          countryCode: item.CurrencyCode?.slice(0, 2)?.toLowerCase(),
          currencyNote: item.CurrencyCode,
          currencyName: item.CurrencyName,
          buyCash: item.Buy,
          buyTransfer: item.Transfer,
          sellCash: item.Sell,
        }))
        .concat({
          countryCode: 'vn',
          currencyNote: 'VND',
          currencyName: 'Vietnamese Dong',
          buyCash: '1.00',
          buyTransfer: '1.00',
          sellCash: '1.00',
        });

      return {
        updatedDate,
        source,
        result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  private async crawlOtherData(page: Page) {
    await page.goto('https://webgia.com/ty-gia/vietcombank/', {
      waitUntil: 'networkidle2',
    });

    const otherData = await page.evaluate(() => {
      const sidebar = document.querySelector('#sidebar');
      const sections = sidebar?.querySelectorAll('table');
      const currencyUnit =
        document.querySelector('div.donvi')?.textContent?.trim() || '';

      let gold = null;
      let oil: any[] = [];
      let petrol: any[] = [];

      sections?.forEach((section) => {
        const label =
          section.querySelector('a')?.textContent?.toLowerCase() || '';

        if (label.includes('giá vàng thế giới')) {
          const row = section.querySelector('tbody tr');
          const cols = row?.querySelectorAll('td');
          if (cols?.length >= 3) {
            gold = {
              price: cols[0]?.textContent?.trim() || '',
              change: cols[1]?.textContent?.trim() || '',
              percentChange: cols[2]?.textContent?.trim() || '',
            };
          }
        }

        // Dầu thô
        if (label.includes('giá dầu thô')) {
          const rows = section.querySelectorAll('tbody tr');
          rows.forEach((row) => {
            const cols = row.querySelectorAll('td');
            oil.push({
              type: cols[0]?.textContent?.trim(),
              price: cols[1]?.textContent?.trim(),
              change: cols[2]?.textContent?.trim(),
              percentChange: cols[3]?.textContent?.trim(),
            });
          });
        }

        // Xăng dầu
        if (label.includes('giá bán lẻ xăng dầu')) {
          const rows = section.querySelectorAll('tbody tr');
          rows.forEach((row, idx) => {
            if (idx === 0) return;
            const cols = row.querySelectorAll('td, th');
            petrol.push({
              product: cols[0]?.textContent?.trim(),
              region1: cols[1]?.textContent?.trim(),
              region2: cols[2]?.textContent?.trim(),
            });
          });
        }
      });

      const updatedDate =
        document.querySelector('h1.h-head')?.textContent?.trim() || '';
      return { gold, oil, petrol, updatedDate, currencyUnit };
    });

    return otherData;
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
        document.querySelector('div.donvi')?.textContent?.trim() || '';

      const source =
        document.querySelector('div.source')?.textContent?.trim() || '';

      const updatedDate =
        document.querySelector('h1.h-head')?.textContent?.trim() || '';

      const rows = document.querySelectorAll('table.table-exchanges tbody tr');
      const result: any[] = [];

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;

        const iconSpan = cells[0].querySelector('span.cur-icon');
        const countryCode =
          (iconSpan?.className || '').split('ci-')?.[1]?.slice(0, 2) || '';

        const currencyNote =
          cells[0]?.textContent?.trim().replace(/[()]/g, '') || '';
        const currencyName = cells[1]?.textContent?.trim() || '';
        const buyCash = cells[2]?.textContent?.trim() || '';
        const buyTransfer = cells[3]?.textContent?.trim() || '';
        const sellCash = cells[4]?.textContent?.trim() || '';

        result.push({
          countryCode,
          currencyNote,
          currencyName,
          buyCash,
          buyTransfer,
          sellCash,
        });
      });

      const sidebar = document.querySelector('#sidebar');
      const sections = sidebar?.querySelectorAll('table');

      let gold = null;
      let oil = [];
      let petrol = [];

      sections?.forEach((section) => {
        const label =
          section.querySelector('a')?.textContent?.toLowerCase() || '';

        if (label.includes('giá vàng thế giới')) {
          const row = section.querySelector('tbody tr');
          const cols = row?.querySelectorAll('td');
          if (cols?.length >= 3) {
            gold = {
              price: cols[0]?.textContent?.trim() || '',
              change: cols[1]?.textContent?.trim() || '',
              percentChange: cols[2]?.textContent?.trim() || '',
            };
          }
        }

        // Dầu thô
        if (label.includes('giá dầu thô')) {
          const rows = section.querySelectorAll('tbody tr');
          rows.forEach((row) => {
            const cols = row.querySelectorAll('td');
            oil.push({
              type: cols[0]?.textContent?.trim(),
              price: cols[1]?.textContent?.trim(),
              change: cols[2]?.textContent?.trim(),
              percentChange: cols[3]?.textContent?.trim(),
            });
          });
        }

        // Xăng dầu
        if (label.includes('giá bán lẻ xăng dầu')) {
          const rows = section.querySelectorAll('tbody tr');
          rows.forEach((row, idx) => {
            if (idx === 0) return;
            const cols = row.querySelectorAll('td, th');
            petrol.push({
              product: cols[0]?.textContent?.trim(),
              region1: cols[1]?.textContent?.trim(),
              region2: cols[2]?.textContent?.trim(),
            });
          });
        }
      });

      return { currencyUnit, result, source, updatedDate, gold, oil, petrol };
    });

    await browser.close();
    return { status: 'success', exchange };
  }
}
