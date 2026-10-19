import { BadRequestException, Injectable } from '@nestjs/common';
import { AppService } from './app.service';
import type { Page } from 'puppeteer';

export type MapsStatus =
  | 'resolved'
  | 'coordinates_only'
  | 'multiple_results'
  | 'unresolved';

export interface MapsSearchItem {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  googleMapsUrl: string;
  placeId: string | null;
}

function decoded(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function mapsUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new BadRequestException('url must be a Google Maps HTTPS URL');
  }
  const googleMaps =
    ['google.com', 'www.google.com', 'maps.google.com'].includes(
      url.hostname,
    ) &&
    (url.pathname === '/maps' ||
      url.pathname.startsWith('/maps/') ||
      url.hostname === 'maps.google.com');
  const short =
    url.hostname === 'maps.app.goo.gl' ||
    (url.hostname === 'goo.gl' && url.pathname.startsWith('/maps/'));
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !(googleMaps || short)
  ) {
    throw new BadRequestException(
      'Only Google Maps URLs and Maps short links are supported',
    );
  }
  return url;
}

// @lat,lng is the camera position, not necessarily the selected place.
export function coordinates(url: URL): { lat: number; lng: number } | null {
  const data = decoded(url.pathname + (url.searchParams.get('data') || ''));
  const pair = data.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const query = (
    url.searchParams.get('query') ||
    url.searchParams.get('q') ||
    ''
  ).match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  const match = pair || query;
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export function placeId(url: URL): string | null {
  const id =
    url.searchParams.get('query_place_id') ||
    url.searchParams.get('place_id') ||
    url.searchParams.get('q')?.match(/^place_id:(.+)$/)?.[1] ||
    decoded(url.pathname + (url.searchParams.get('data') || '')).match(
      /!(?:1|19)s(ChI[^!/?]+)/,
    )?.[1];
  return id || null;
}

@Injectable()
export class MapsService {
  constructor(private readonly app: AppService) {}

  async search(input: string, limit = 10) {
    if (
      typeof input !== 'string' ||
      !input.trim() ||
      input.trim().length > 500
    ) {
      throw new BadRequestException('query must contain 1 to 500 characters');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      throw new BadRequestException(
        'limit must be an integer between 1 and 20',
      );
    }
    const query = input.trim();
    const url = new URL('https://www.google.com/maps/search/');
    url.searchParams.set('api', '1');
    url.searchParams.set('query', query);
    url.searchParams.set('hl', 'vi');
    let browser: Awaited<ReturnType<AppService['launchBrowser']>>;
    const found = new Map<string, MapsSearchItem>();
    let exhausted = false;
    let warning: string = null;
    try {
      browser = await this.app.launchBrowser();
      const page = await this.preparePage(browser);
      await page.goto(url.href, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });
      await page.waitForFunction(
        () =>
          !!document.querySelector(
            'h1.DUwDvf, [role="feed"] a[href*="/maps/place/"], #captcha-form, form[action*="consent"]',
          ) ||
          /không tìm thấy|không có kết quả|couldn't find|no results found/i.test(
            document.body.innerText,
          ),
      );
      // A single result renders its heading before Maps updates the shareable URL.
      const singlePlace = await page.evaluate(
        () =>
          !!document.querySelector('h1.DUwDvf') &&
          !document.querySelector('[role="feed"]'),
      );
      if (singlePlace) {
        await page.waitForFunction(() =>
          location.pathname.startsWith('/maps/place/'),
        );
      }
      for (let round = 0; round < 4; round++) {
        const snapshot = await page.evaluate(() => {
          const feed = document.querySelector('[role="feed"]');
          const heading = document.querySelector('h1.DUwDvf');
          const blocked =
            !!document.querySelector(
              '#captcha-form, iframe[src*="recaptcha"], form[action*="consent"]',
            ) || location.hostname === 'consent.google.com';
          const empty =
            /không tìm thấy|không có kết quả|couldn't find|no results found/i.test(
              document.body.innerText,
            );
          if (!feed && heading) {
            const button = document.querySelector('[data-item-id="address"]');
            return {
              blocked,
              empty,
              exhausted: true,
              items: [
                {
                  name: heading.textContent?.trim() || '',
                  address:
                    button?.querySelector('.Io6YTe')?.textContent?.trim() ||
                    button
                      ?.getAttribute('aria-label')
                      ?.replace(/^(Address|Địa chỉ):\s*/i, '')
                      .trim() ||
                    document
                      .querySelector(
                        '[role="main"] [role="img"][aria-label="Địa chỉ"], [role="main"] [role="img"][aria-label="Address"]',
                      )
                      ?.closest('.LCF4w')
                      ?.querySelector('.DkEaL')
                      ?.textContent?.trim() ||
                    null,
                  url: location.href,
                },
              ],
            };
          }
          const items = Array.from(
            feed?.querySelectorAll<HTMLAnchorElement>(
              'a[href*="/maps/place/"]',
            ) || [],
          ).map((link) => {
            const card = link.closest('.Nv2PK');
            // The first metadata row contains category and address; later rows contain hours/reviews.
            const metadata = card?.querySelector('.W4Efsd .W4Efsd');
            const parts = Array.from(metadata?.children || [])
              .map((span) => span.textContent?.trim())
              .filter(Boolean);
            const address =
              parts.length > 1
                ? parts[parts.length - 1].replace(/^[·\s]+/, '')
                : null;
            return {
              name:
                link.getAttribute('aria-label')?.trim() ||
                card?.querySelector('.qBF1Pd')?.textContent?.trim() ||
                '',
              address,
              url: link.href,
            };
          });
          return {
            blocked,
            empty,
            items,
            exhausted:
              !!feed &&
              /bạn đã xem hết|you.ve reached the end/i.test(
                feed.textContent || '',
              ),
          };
        });
        if (snapshot.blocked)
          throw new Error(
            'Google Maps requested consent or CAPTCHA verification',
          );
        for (const item of snapshot.items) {
          if (!item.name) continue;
          const link = mapsUrl(item.url);
          const location = coordinates(link);
          found.set(link.href, {
            name: item.name,
            address: item.address,
            lat: location?.lat ?? null,
            lng: location?.lng ?? null,
            googleMapsUrl: link.href,
            placeId: placeId(link),
          });
        }
        exhausted = snapshot.exhausted || snapshot.empty;
        if (exhausted || found.size >= limit) break;
        if (round === 3) break;
        const previousCount = snapshot.items.length;
        await page.evaluate(() => {
          const feed = document.querySelector('[role="feed"]');
          if (feed) feed.scrollTop = feed.scrollHeight;
        });
        try {
          await page.waitForFunction(
            (count) => {
              const feed = document.querySelector('[role="feed"]');
              return (
                (feed?.querySelectorAll('a[href*="/maps/place/"]').length ||
                  0) > count ||
                /bạn đã xem hết|you.ve reached the end/i.test(
                  feed?.textContent || '',
                )
              );
            },
            { timeout: 2500 },
            previousCount,
          );
        } catch {
          warning = 'Only currently loaded results are available';
          break;
        }
      }
    } catch (error) {
      warning =
        error instanceof Error ? error.message : 'Unable to search Google Maps';
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
    const results = Array.from(found.values()).slice(0, limit);
    if (!results.length && !exhausted && !warning) {
      warning = 'Google Maps did not return readable search results';
    }
    return {
      status: results.length ? 'success' : warning ? 'error' : 'empty',
      query,
      count: results.length,
      limit,
      hasMore: found.size > limit || (!exhausted && results.length > 0),
      results,
      warning,
    };
  }

  private async preparePage(
    browser: Awaited<ReturnType<AppService['launchBrowser']>>,
  ) {
    // Both launch paths expose the same Page API, even if npm resolves two versions.
    const page = (await browser.newPage()) as unknown as Page;
    page.setDefaultTimeout(12000);
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    });
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const target = new URL(request.url());
      const host = target.hostname;
      const allowed =
        target.protocol === 'https:' &&
        (host === 'google.com' ||
          host.endsWith('.google.com') ||
          host === 'maps.app.goo.gl' ||
          host === 'goo.gl' ||
          host.endsWith('.gstatic.com') ||
          host.endsWith('.googleusercontent.com'));
      // Validate every top-level redirect as well as the submitted URL.
      let navigationAllowed = true;
      if (
        request.isNavigationRequest() &&
        request.frame() === page.mainFrame()
      ) {
        try {
          mapsUrl(target.href);
        } catch {
          navigationAllowed = false;
        }
        if (host === 'consent.google.com') navigationAllowed = true;
      }
      void (
        allowed && navigationAllowed ? request.continue() : request.abort()
      ).catch(() => undefined);
    });
    return page;
  }

  async crawl(input: string) {
    if (typeof input !== 'string' || !input.trim()) {
      throw new BadRequestException('url is required');
    }
    const original = mapsUrl(input.trim());
    if (original.pathname.startsWith('/maps/dir')) {
      throw new BadRequestException(
        'Use a place link rather than a directions link',
      );
    }
    let finalUrl = original;
    let browser: Awaited<ReturnType<AppService['launchBrowser']>>;
    let name: string = null;
    let address: string = null;
    let multiple = false;
    let warning: string = null;
    try {
      browser = await this.app.launchBrowser();
      const page = await this.preparePage(browser);
      await page.goto(original.href, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });
      try {
        await page.waitForFunction(
          () =>
            (!!document.querySelector('h1.DUwDvf') &&
              !!document.querySelector(
                '[data-item-id="address"], [role="main"] [role="img"][aria-label="Địa chỉ"], [role="main"] [role="img"][aria-label="Address"]',
              )) ||
            !!document.querySelector(
              '[role="feed"], #captcha-form, form[action*="consent"]',
            ),
        );
      } catch {
        warning = 'Place details did not load before the timeout';
      }
      finalUrl = mapsUrl(page.url());
      const details = await page.evaluate(() => {
        const heading = document.querySelector('h1.DUwDvf');
        const addressButton = document.querySelector(
          '[data-item-id="address"]',
        );
        return {
          name: heading?.textContent?.trim() || null,
          address:
            addressButton?.querySelector('.Io6YTe')?.textContent?.trim() ||
            addressButton
              ?.getAttribute('aria-label')
              ?.replace(/^(Address|Địa chỉ):\s*/i, '')
              .trim() ||
            document
              .querySelector(
                '[role="main"] [role="img"][aria-label="Địa chỉ"], [role="main"] [role="img"][aria-label="Address"]',
              )
              ?.closest('.LCF4w')
              ?.querySelector('.DkEaL')
              ?.textContent?.trim() ||
            null,
          multiple: !heading && !!document.querySelector('[role="feed"]'),
          blocked: !!document.querySelector(
            '#captcha-form, iframe[src*="recaptcha"]',
          ),
        };
      });
      name = details.name;
      address = details.address;
      multiple = details.multiple;
      if (details.blocked)
        warning = 'Google Maps requested CAPTCHA verification';
    } catch (error) {
      warning =
        error instanceof Error ? error.message : 'Unable to load Google Maps';
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
    const location = multiple ? null : coordinates(finalUrl);
    const status: MapsStatus = multiple
      ? 'multiple_results'
      : name && address && location
        ? 'resolved'
        : location
          ? 'coordinates_only'
          : 'unresolved';
    return {
      status,
      name,
      address,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      googleMapsUrl: finalUrl.href,
      placeId: multiple ? null : placeId(finalUrl),
      warning,
    };
  }
}
