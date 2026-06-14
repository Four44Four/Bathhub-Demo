import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const info = await page.evaluate(() => {
  const phone = document.querySelector('main > .relative');
  const pr = phone?.getBoundingClientRect();
  const btn = [...document.querySelectorAll('button')].find(b => b.querySelector('img[src*="find"]') || [...b.querySelectorAll('img')].some(i => i.getAttribute('src')?.includes('E4E4FF')));
  const br = btn?.getBoundingClientRect();
  return {
    phone: pr ? { l: pr.left, r: pr.right, t: pr.top, b: pr.bottom, w: pr.width, h: pr.height } : null,
    button: br ? { l: br.left, r: br.right, t: br.top, b: br.bottom, w: br.width, h: br.height } : null,
    insidePhone: pr && br ? br.left >= pr.left && br.right <= pr.right && br.top >= pr.top && br.bottom <= pr.bottom : false,
    marginRight: pr && br ? pr.right - br.right : null,
    marginBottom: pr && br ? pr.bottom - br.bottom : null,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
