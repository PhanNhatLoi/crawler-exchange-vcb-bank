// Self-contained: Puppeteer serializes this function into the browser context.
export function readMapsPage() {
  const clean = (value: string | null | undefined) =>
    value
      ?.replace(/[\uE000-\uF8FF]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || null;

  const photo = (root: Element | null, listing: boolean): string | null => {
    if (!root) return null;
    const selector = listing
      ? 'img'
      : 'button[jsaction*="heroHeaderImage"] img, .aoRNLd img';
    for (const img of Array.from(
      root.querySelectorAll<HTMLImageElement>(selector),
    )) {
      const source = img.currentSrc || img.getAttribute('src');
      if (!source) continue;
      try {
        const url = new URL(source, location.href);
        const host = url.hostname;
        // Exclude icons, avatars and static map tiles. A place's hero may be Street View.
        const placePhoto =
          (host.endsWith('.googleusercontent.com') ||
            host.endsWith('.ggpht.com')) &&
          /^\/(p|gps-cs-s|grass-cs|places)\//.test(url.pathname);
        if (
          url.protocol === 'https:' &&
          (placePhoto || host === 'streetviewpixels-pa.googleapis.com')
        ) {
          return url.href;
        }
      } catch {
        // Ignore placeholder/data URLs and malformed image sources.
      }
    }
    return null;
  };

  const feed = document.querySelector('[role="feed"]');
  const heading = document.querySelector('h1.DUwDvf');
  const selected = !feed && !!heading;
  const blocked =
    !!document.querySelector(
      '#captcha-form, iframe[src*="recaptcha"], form[action*="consent"]',
    ) || location.hostname === 'consent.google.com';
  const empty =
    !feed &&
    !heading &&
    /không tìm thấy|không có kết quả|couldn't find|no results found/i.test(
      document.body.innerText,
    );
  const main =
    heading?.closest('[role="main"]') ||
    document.querySelector('[role="main"]');
  const addressButton = main?.querySelector('[data-item-id="address"]');
  const detail = {
    name: clean(heading?.textContent),
    address:
      clean(addressButton?.querySelector('.Io6YTe')?.textContent) ||
      clean(
        addressButton
          ?.getAttribute('aria-label')
          ?.replace(/^(Address|Địa chỉ):\s*/i, ''),
      ) ||
      clean(
        main
          ?.querySelector(
            '[role="img"][aria-label="Địa chỉ"], [role="img"][aria-label="Address"]',
          )
          ?.closest('.LCF4w')
          ?.querySelector('.DkEaL')?.textContent,
      ),
    openingStatus: clean(
      main?.querySelector(
        '.OqCZI .ZDu9vd, [data-item-id="oh"] .ZDu9vd, .MkV9 .ZDu9vd',
      )?.textContent,
    ),
    imageUrl: photo(main, false),
    url: location.href,
  };
  const items = selected
    ? [detail]
    : Array.from(
        feed?.querySelectorAll<HTMLAnchorElement>('a[href*="/maps/place/"]') ||
          [],
      ).map((link) => {
        const card = link.closest('.Nv2PK');
        const metadata = card?.querySelector('.W4Efsd .W4Efsd');
        const parts = Array.from(metadata?.children || [])
          .map((span) => clean(span.textContent))
          .filter(Boolean);
        const statusRow = Array.from(
          card?.querySelectorAll('.W4Efsd') || [],
        ).find(
          (row) =>
            !row.querySelector('.W4Efsd') &&
            /^(đang mở cửa|đã đóng cửa|đóng cửa|mở cửa|sắp đóng cửa|sắp mở cửa|tạm đóng cửa|open\b|closed\b|closes\b|opens\b|temporarily closed|permanently closed)/i.test(
              clean(row.textContent) || '',
            ),
        );
        return {
          name:
            clean(link.getAttribute('aria-label')) ||
            clean(card?.querySelector('.qBF1Pd')?.textContent),
          address:
            parts.length > 1
              ? clean(parts[parts.length - 1].replace(/^[·\s]+/, ''))
              : null,
          openingStatus: clean(statusRow?.textContent),
          imageUrl: photo(card, true),
          url: link.href,
        };
      });
  return {
    detail,
    items,
    blocked,
    empty,
    selected,
    multiple: !heading && !!feed,
    exhausted:
      selected ||
      (!!feed &&
        /bạn đã xem hết|you.ve reached the end/i.test(feed.textContent || '')),
  };
}
