// Пошаговая проверка reveal-анимаций и скриншоты секций.
import fs from 'node:fs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const target = targets.find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

let id = 0;
const pending = new Map();
const handlers = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result);
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: 'http://127.0.0.1:8080/' });
await sleep(2500);

const selectors = ['#games', '#platforms', '#about', '#faq', '#contact'];
const report = [];

for (const selector of selectors) {
  await evaluate(`document.querySelector('${selector}').scrollIntoView({block:'start'})`);
  await sleep(1200);
  const state = await evaluate(`(() => {
    const section = document.querySelector('${selector}');
    const items = [...section.querySelectorAll('[data-reveal]')];
    return {
      selector: '${selector}',
      scrollY: Math.round(window.scrollY),
      items: items.map(el => ({
        cls: el.className,
        visible: el.classList.contains('is-visible'),
        opacity: getComputedStyle(el).opacity,
        rectTop: Math.round(el.getBoundingClientRect().top),
        height: Math.round(el.getBoundingClientRect().height)
      }))
    };
  })()`);
  report.push(state);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const name = selector.replace('#', '');
  fs.writeFileSync(`screenshots/section-${name}.png`, Buffer.from(shot.data, 'base64'));
}

await evaluate('window.scrollTo(0, 0)');
await sleep(900);
console.log(JSON.stringify(report, null, 2));
ws.close();
