const puppeteer = require('puppeteer');
const path = require('path');

const sites = [
  { url: 'https://kandykrush.co.uk/', file: 'kandy-krush' },
  { url: 'https://ashdabash2926.github.io/bolivian-pal/', file: 'bolivian-pal' },
  { url: 'https://ashdabash2926.github.io/sacred-ember/sauna2.html', file: 'sacred-ember' },
  { url: 'https://ashdabash2926.github.io/coffee-shop/', file: 'artisan-coffee' },
  { url: 'https://ashdabash2926.github.io/blade-co/', file: 'blade-co' },
  { url: 'https://ashdabash2926.github.io/stone-table/', file: 'stone-table' },
  { url: 'https://ashdabash2926.github.io/peak-form/', file: 'peak-form' },
  { url: 'https://ashdabash2926.github.io/still-strong/', file: 'still-strong' },
  { url: 'https://ashdabash2926.github.io/heather-lane-therapy/', file: 'heather-lane' },
  { url: 'https://ashdabash2926.github.io/solace-massage/', file: 'solace' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const site of sites) {
    console.log(`Capturing ${site.url}...`);
    try {
      await page.goto(site.url, { waitUntil: 'networkidle2', timeout: 30000 });
      // Let animations settle
      await new Promise(r => setTimeout(r, 1500));
      const outPath = path.join(__dirname, 'images', `${site.file}.png`);
      await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
      console.log(`  ✓ Saved ${site.file}.png`);
    } catch (e) {
      console.error(`  ✗ Failed: ${e.message}`);
    }
  }

  await browser.close();
  console.log('Done.');
})();
