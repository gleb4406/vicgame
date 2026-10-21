// Функциональная проверка сайта через CDP.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const target = targets.find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

let id = 0;
const pending = new Map();
const handlers = new Map();
const failures = [];
const consoleErrors = [];

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result);
  }
  if (message.method === 'Network.loadingFailed' && !message.params.canceled) {
    failures.push(message.params.errorText + ' ' + (message.params.requestId || ''));
  }
  if (message.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(message.params.exceptionDetails.text);
  }
  if (message.method && handlers.has(message.method)) {
    handlers.get(message.method).forEach((fn) => fn(message.params));
  }
};

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const messageId = ++id;
  pending.set(messageId, { resolve, reject });
  ws.send(JSON.stringify({ id: messageId, method, params }));
});

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'eval failed');
  return result.result.value;
};

function once(method) {
  return new Promise((resolve) => {
    const handler = (params) => {
      handlers.get(method).delete(handler);
      resolve(params);
    };
    if (!handlers.has(method)) handlers.set(method, new Set());
    handlers.get(method).add(handler);
  });
}

async function navigate(url) {
  failures.length = 0;
  consoleErrors.length = 0;
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url });
  await loaded;
  await sleep(1300);
  return {
    failures: [...failures],
    consoleErrors: [...consoleErrors]
  };
}

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const base = 'http://127.0.0.1:8080/';
const report = {};

let load = await navigate(base);

// Прокрутка до низа: запускает lazy-load изображений и reveal-анимации.
await evaluate(`(async () => {
  for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 90));
  }
  window.scrollTo(0, document.documentElement.scrollHeight);
  await new Promise(r => setTimeout(r, 800));
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 600));
})()`);

report.home = await evaluate(`(() => {
  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => {
    try { JSON.parse(s.textContent); return 'ok'; } catch (e) { return 'invalid: ' + e.message; }
  });
  const images = [...document.images].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.getAttribute('src'));
  const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
  const duplicates = [...new Set(ids.filter((value, index) => ids.indexOf(value) !== index))];
  return {
    title: document.title,
    descriptionLength: document.querySelector('meta[name="description"]')?.content.length,
    h1: document.querySelector('h1')?.innerText.replace(/\\n/g, ' '),
    cards: document.querySelectorAll('.game-card').length,
    platformCards: document.querySelectorAll('.platform-card').length,
    faqItems: document.querySelectorAll('.faq-item').length,
    contactCard: !!document.querySelector('.contact-card'),
    localLinks: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(href => !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')),
    brokenImages: images,
    duplicateIds: duplicates,
    jsonLd,
    fontStatus: document.fonts.status,
    headingFont: getComputedStyle(document.querySelector('h1')).fontFamily,
    year: document.getElementById('year')?.textContent,
    socialLinks: [...document.querySelectorAll('.social-link')].map(a => a.href),
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
  };
})()`);
report.home.load = load;

load = await navigate(base + '?genre=horror&platform=google');
report.deepLink = await evaluate(`(() => {
  const visible = [...document.querySelectorAll('.game-card')].filter(c => !c.hidden).map(c => c.dataset.title);
  return {
    visible,
    activeGenre: document.querySelector('[data-filter].is-active')?.dataset.filter,
    activePlatform: document.querySelector('[data-platform].is-active')?.dataset.platform,
    counter: document.querySelector('.section-head__count')?.textContent.trim()
  };
})()`);
report.deepLink.load = load;

// Мобильное меню
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
load = await navigate(base);
report.mobile = await evaluate(`(() => {
  const burger = document.getElementById('burger');
  burger.click();
  const open = {
    expanded: burger.getAttribute('aria-expanded'),
    navVisible: !document.getElementById('mobileNav').hidden,
    bodyLocked: document.body.classList.contains('no-scroll')
  };
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  const closed = {
    expanded: burger.getAttribute('aria-expanded'),
    navHidden: document.getElementById('mobileNav').hidden
  };
  return {
    viewport: [window.innerWidth, window.innerHeight],
    scrollWidth: document.documentElement.scrollWidth,
    burgerDisplay: getComputedStyle(burger).display,
    open,
    closed
  };
})()`);
report.mobile.load = load;

// Политика конфиденциальности
load = await navigate(base + 'privacy.html');
report.privacy = await evaluate(`(() => ({
  title: document.title,
  h1: document.querySelector('h1')?.innerText,
  sections: document.querySelectorAll('.legal-card h2').length,
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  localLinks: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(href => href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:'))
}))()`);
report.privacy.load = load;

// Страница 404
load = await navigate(base + '404.html');
report.notFound = await evaluate(`(() => ({
  title: document.title,
  h1: document.querySelector('h1')?.innerText,
  buttons: document.querySelectorAll('.not-found__actions a').length,
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth
}))()`);
report.notFound.load = load;

await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
console.log(JSON.stringify(report, null, 2));
ws.close();
