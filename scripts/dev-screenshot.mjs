// Drive the game with playwright: title → play → walk up the stairs → attack → dash.
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? '/tmp/shots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 760 } });
page.on('console', (m) => console.log('[console]', m.type(), m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto('http://localhost:4199/');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/1-title.png` });

// enter play
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/2-spawn.png` });

// walk north-east toward the west stairway (spawn 128,384 → stairs at x≈340,y≈270)
const canvas = page.locator('#game');
const box = await canvas.boundingBox();
const aim = (wx, wy) => page.mouse.move(box.x + box.width * wx, box.y + box.height * wy);
await aim(0.7, 0.3);

await page.keyboard.down('KeyD');
await page.waitForTimeout(1400);
await page.keyboard.down('KeyW');
await page.waitForTimeout(500);
await page.keyboard.up('KeyD');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/3-approach.png` });

// keep climbing the stairs to the street (tier 1)
await page.waitForTimeout(900);
await page.keyboard.up('KeyW');
await page.screenshot({ path: `${OUT}/4-stairs.png` });

// attack a few times toward the mouse
await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.4);
await page.waitForTimeout(250);
await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.4);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/5-attack.png` });

// dash west
await page.keyboard.down('KeyA');
await page.keyboard.press('Space');
await page.waitForTimeout(300);
await page.keyboard.up('KeyA');
await page.screenshot({ path: `${OUT}/6-dash.png` });

// fire the shardcaster (right mouse)
await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4, { button: 'right' });
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/7-shard.png` });

await browser.close();
console.log('done');
