import pkg from './node_modules/playwright/index.js';
const { chromium } = pkg;

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);

await page.goto('http://localhost:3099/awq/conciliacao', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
console.log('URL:', page.url());

await page.screenshot({ path: '/tmp/conciliacao-1-load.png', fullPage: true });

const body = await page.locator('body').innerText().catch(() => '');
const checks = {
  'Vincular button':        body.includes('Vincular'),
  'Sincronizar 2026':       body.includes('2026 completo'),
  'Sincronizar mês':        body.includes('Sincronizar mês'),
  'Conciliar direto':       body.includes('Conciliar direto'),
  'Login form':             body.toLowerCase().includes('senha') || body.toLowerCase().includes('entrar'),
  'Conciliação page title': body.includes('Conciliação'),
  'Has transactions':       body.includes('Movimentações') || body.includes('pendentes'),
};
for (const [k, v] of Object.entries(checks)) {
  console.log(`${v ? '✅' : '❌'} ${k}`);
}
console.log('\nBody (first 400 chars):', body.slice(0, 400).replace(/\n+/g, ' | '));

await browser.close();
console.log('Screenshot saved: /tmp/conciliacao-1-load.png');
