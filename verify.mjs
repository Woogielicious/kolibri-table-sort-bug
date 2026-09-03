import { chromium } from 'playwright';

const URL = 'http://localhost:4173/';

function findTable(root, depth = 0) {
	if (depth > 6) return null;
	const direct = root.querySelector?.('table');
	if (direct) return direct;
	for (const el of Array.from(root.querySelectorAll?.('*') ?? [])) {
		if (el.shadowRoot) {
			const found = findTable(el.shadowRoot, depth + 1);
			if (found) return found;
		}
	}
	return null;
}

const snapshotFn = `(() => {
  const findTable = ${findTable.toString()};
  const table = findTable(document);
  if (!table) return null;
  const sorted = Array.from(table.querySelectorAll('th[aria-sort]'))
    .filter(th => th.getAttribute('aria-sort') !== 'none')
    .map(th => th.textContent.trim() + ' = ' + th.getAttribute('aria-sort'));
  const first = Array.from(table.querySelectorAll('tbody tr:first-child td')).map(td => td.textContent.trim()).slice(0,3);
  return { sort: sorted.join(', ') || 'none', firstRow: first.join(' | ') };
})()`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const snap = () => page.evaluate(snapshotFn);

async function run(label) {
	console.log(`\n===== ${label} =====`);
	console.log('vor Sortierung  :', JSON.stringify(await snap()));

	// Sortier-Button in der Spalte "Name" klicken
	await page.getByRole('button', { name: 'Name', exact: true }).first().click();
	await page.waitForTimeout(600);
	const afterSort = await snap();
	console.log('nach Klick Name :', JSON.stringify(afterSort));

	// Erstes Scrollen
	await page.mouse.wheel(0, 400);
	await page.waitForTimeout(900);
	const afterScroll = await snap();
	console.log('nach 1. Scroll  :', JSON.stringify(afterScroll));

	const lost = afterSort.sort !== afterScroll.sort || afterSort.firstRow !== afterScroll.firstRow;
	console.log(lost ? '>>> SORTIERUNG VERLOREN' : '>>> Sortierung bleibt erhalten');
	return lost;
}

const bug = await run('Bug-Modus (instabile _headers/_data)');

// In den Fix-Modus schalten: beide Checkboxen aus
await page.locator('.switch input').nth(0).uncheck();
await page.locator('.switch input').nth(1).uncheck();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1200);

const fixed = await run('Fix-Modus (memoized)');

console.log('\n--- Ergebnis ---');
console.log('Bug-Modus verliert Sortierung :', bug);
console.log('Fix-Modus verliert Sortierung :', fixed);

await page.screenshot({ path: '/tmp/claude-0/-home-claude/b31ba14d-6c4d-5c3c-86bb-1a12115fafbd/scratchpad/repro.png', fullPage: false });
await browser.close();
