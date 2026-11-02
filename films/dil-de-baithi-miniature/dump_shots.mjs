// Writes data/shots.json (the shot/clock table) without rendering frames.
import { openDemo, closeServer } from '/home/user/lemomo-ai/lemo-opuscar/core/render/page.mjs';
import fs from 'fs';
const F = process.argv[2];
const { browser, page } = await openDemo(F, { w: 320, h: 180 });
const shots = await page.evaluate(() => window.SHOTS);
fs.writeFileSync(F + '/data/shots.json', JSON.stringify(shots, null, 1));
await browser.close(); await closeServer?.(); console.log(shots.length, 'shots'); process.exit(0);
