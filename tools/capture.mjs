// Проверка сайта через Chrome DevTools Protocol: скриншоты + тесты фильтров.
// Запуск: node tools/capture.mjs <width> <height> <mobile:0|1> <prefix>
import fs from 'node:fs';
import path from 'node:path';

const [widthArg, heightArg, mobileArg, prefix] = process.argv.slice(2);
const width = Number(widthArg || 1440);
const height = Number(heightArg || 1000);
const mobile = mobileArg === '1';
const name = prefix || 'desktop';
const base = 'http://127.0.0.1:8080/';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getTarget() {
  const response = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await response.json();
  return targets.find((target) => target.type === 'page');
}

const target = await getTarget();
if (!target) throw new Error('No Chrome page target found');

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let messageId = 0;
const pending = new Map();
const events = new Map();

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  } else if (message.method && events.has(message.method)) {
    events.get(message.method).forEach((handler) => handler(message.params));
  }
};

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function once(method) {
  return new Promise((resolve) => {
    const handler = (params) => {
      events.get(method).delete(handler);
      resolve(params);
    };
    if (!events.has(method)) events.set(method, new Set());
    events.get(method).add(handler);
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Evaluation failed');
  }
  return result.result.value;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: mobile ? 2 : 1,
  mobile,
  screenWidth: width,
  screenHeight: height
});

const loaded = once('Page.loadEventFired');
await send('Page.navigate', { url: base });
await loaded;
await sleep(2200);

const metrics = await evaluate(`(() => ({
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  scrollWidth: document.documentElement.scrollWidth,
  bodyScrollWidth: document.body.scrollWidth,
  cards: document.querySelectorAll('.game-card').length,
  visibleCards: [...document.querySelectorAll('.game-card')].filter(c => !c.hidden).length,
  navDisplay: getComputedStyle(document.querySelector('.nav')).display,
  burgerDisplay: getComputedStyle(document.querySelector('#burger')).display,
  h1Width: document.querySelector('h1').getBoundingClientRect().width,
  fontsReady: document.fonts.status
}))()`);

const viewportShot = await send('Page.captureScreenshot', { format: 'png' });
fs.mkdirSync('screenshots', { recursive: true });
fs.writeFileSync(path.join('screenshots', `${name}-viewport.png`), Buffer.from(viewportShot.data, 'base64'));

// Прокручиваем страницу, чтобы сработали reveal-анимации, и возвращаемся наверх.
await evaluate(`(async () => {
  const step = Math.round(window.innerHeight * 0.7);
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 70));
  }
  window.scrollTo(0, document.documentElement.scrollHeight);
  await new Promise(r => setTimeout(r, 500));
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 500));
  return true;
})()`);

const layout = await send('Page.getLayoutMetrics');
const content = layout.cssContentSize;
const maxHeight = Math.min(content.height, 12000);
const fullShot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: { x: 0, y: 0, width: content.width, height: maxHeight, scale: 1 }
});
fs.writeFileSync(path.join('screenshots', `${name}-full.png`), Buffer.from(fullShot.data, 'base64'));

// Тесты каталога
const testResults = await evaluate(`(() => {
  const results = {};
  const cards = () => [...document.querySelectorAll('.game-card')];
  const visible = () => cards().filter(c => !c.hidden).length;
  const activeGenre = () => document.querySelector('[data-filter].is-active')?.dataset.filter;

  document.querySelector('[data-filter="horror"]').click();
  results.horror = visible();
  results.horrorActive = activeGenre();

  document.querySelector('[data-platform="playgama"]').click();
  results.horrorPlaygama = visible();

  document.querySelector('[data-filter="all"]').click();
  results.playgamaOnly = visible();

  document.querySelector('[data-platform="all"]').click();
  const input = document.getElementById('gameSearch');
  input.value = 'сант';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  results.searchSanta = visible();

  input.value = 'нет такой игры';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  results.searchEmpty = visible();
  results.emptyVisible = !document.getElementById('emptyState').hidden;

  document.getElementById('resetFilters').click();
  results.afterReset = visible();
  results.counterText = document.querySelector('.section-head__count').textContent.trim();

  results.localLinks = [...document.querySelectorAll('a[href]')].filter(a => {
    const href = a.getAttribute('href');
    return !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:');
  }).map(a => a.getAttribute('href'));

  results.badExternal = [...document.querySelectorAll('a[href^="http"]')]
    .map(a => a.href)
    .filter(href => !href.startsWith('https://'));

  results.duplicateIds = (() => {
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  })();

  return results;
})()`);

console.log(JSON.stringify({ name, metrics, testResults }, null, 2));
ws.close();
