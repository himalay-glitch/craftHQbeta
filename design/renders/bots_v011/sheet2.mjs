import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
// playwright-core: an installed copy, or point PLAYWRIGHT_CORE at one (e.g. from `npx -y playwright-core --version`'s cache).
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const here = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch();
for (const [hash, name] of [["", "team_reference.png"], ["#black", "team_reference_black.png"]]) {
  const p = await b.newPage({ viewport: { width: 1680, height: 470 }, deviceScaleFactor: 2 });
  await p.goto("file://" + path.join(here, "sheet2.html") + hash); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(here, "out", name), fullPage: true });
  console.log("SHEET", name); await p.close();
}
await b.close();
