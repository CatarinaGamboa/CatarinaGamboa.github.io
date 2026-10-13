// Usage: node check_page.js <dir with node_modules/playwright-core> <out dir> <url path, e.g. /papers/<name>/>
// Needs a local server on :8765 from the repo root. Loads the page at 1360 px and 390 px, reports script
// errors, failed requests and horizontal scroll, and saves one screenshot per section for you to look at.
const [pwDir, outDir, path] = process.argv.slice(2);
const { chromium } = require(pwDir + '/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome' });
  for (const w of [1360, 390]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    const errs = [], bad = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    await p.goto('http://localhost:8765' + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const ids = await p.evaluate(() => [...document.querySelectorAll('main.pp > section')].map((s, i) => s.id || 'hero' + i));
    for (const id of ids) {
      const sel = id.startsWith('hero') ? 'main.pp > section.pp-hero' : '#' + id;
      await p.locator(sel).first().screenshot({ path: `${outDir}/${w}-${id}.png` });
    }
    console.log(w, 'px | errors:', errs, '| failed:', bad, '| horizontal scroll:', wide, '| sections:', ids.join(', '));
    await p.close();
  }
  await b.close();
})();
