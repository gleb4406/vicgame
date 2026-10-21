# VicGames — сайт студии

Статический сайт для домена **https://vicgames.ru**: каталог из 10 игр с описаниями, ссылками на Google Play, RuStore и Playgama, фильтрами по жанрам и платформам, поиском, политикой конфиденциальности и SEO-разметкой.

Сайт не требует сборки и серверной части: это HTML + CSS + JavaScript. Достаточно загрузить папку на любой хостинг.

## Структура

```
index.html               Главная страница (hero, каталог, платформы, о студии, FAQ, контакты)
privacy.html             Политика конфиденциальности
404.html                 Страница ошибки
css/style.css            Все стили
css/fonts.css            Локальные @font-face (Manrope + Unbounded, кириллица)
js/main.js               Меню, фильтры, поиск, анимации
assets/fonts/            Шрифты woff2 (сайт не зависит от Google Fonts)
assets/img/games/        Иконки и обложки игр (скачаны из официальных карточек)
assets/img/og-image.png  Баннер для соцсетей 1200×630
favicon.svg, favicon-*.png, apple-touch-icon.png
robots.txt, sitemap.xml
CNAME                    Домен для GitHub Pages (vicgames.ru)
.nojekyll                Отключает обработку Jekyll на GitHub Pages
tools/                   Служебные скрипты: генерация иконок/OG и проверки в Chrome
```

## Локальный запуск

Из корня проекта:

```powershell
python -m http.server 8080
```

Затем откройте http://localhost:8080. Подойдёт и `npx serve .`, и Live Server в VS Code.

## Деплой на vicgames.ru

### Вариант 1. GitHub Pages

1. Создайте репозиторий и загрузите туда файлы проекта (папка `tools` не обязательна).
2. В Settings → Pages выберите ветку `main` и каталог `/ (root)`.
3. Убедитесь, что в корне лежит файл `CNAME` с содержимым `vicgames.ru` (он уже есть).
4. У регистратора домена настройте DNS:
   - для apex-домена `vicgames.ru` — A-записи на `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`;
   - для `www` — CNAME на `<ваш-логин>.github.io`.
5. Дождитесь проверки DNS и включите **Enforce HTTPS** в настройках Pages.

Официальная инструкция: https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site

### Вариант 2. Cloudflare Pages / Netlify / Vercel

1. Загрузите папку проекта как статический сайт (build command не нужен, output directory — корень).
2. Добавьте домен `vicgames.ru` в настройках проекта и пропишите выданные DNS-записи у регистратора.
3. HTTPS-сертификат выпустится автоматически.

Для этих площадок файл `CNAME` можно оставить или удалить — он используется только GitHub Pages.

### Вариант 3. Обычный хостинг (reg.ru, Beget, Timeweb)

1. Загрузите содержимое проекта в `public_html` (или `www`) по FTP/SFTP.
2. Привяжите домен к хостингу и включите бесплатный SSL (Let's Encrypt).
3. Настройте редирект с `http://` на `https://` и с `www` на основной домен.

### После запуска

- Проверьте, что открываются `https://vicgames.ru/`, `https://vicgames.ru/privacy.html`, `https://vicgames.ru/robots.txt`, `https://vicgames.ru/sitemap.xml`.
- Добавьте сайт в **Яндекс Вебмастер** и **Google Search Console**, отправьте `sitemap.xml` на индексацию.
- Проверьте карточки соцсетей через валидатор Open Graph (например, https://developers.facebook.com/tools/debug/).
- Для Google Play в поле «Сайт» и «Политика конфиденциальности» можно указать `https://vicgames.ru/` и `https://vicgames.ru/privacy.html`.

## Как редактировать игры

Карточки находятся в `index.html` внутри `<div class="games-grid" id="gamesGrid">`. У каждой карточки:

- `data-genres` — жанры через пробел: `horror`, `puzzle`, `arcade`, `hidden`, `creative`, `online`;
- `data-platforms` — платформы через пробел: `google`, `rustore`, `playgama`;
- `data-title` — название для поиска;
- ссылки в блоках `.game-card__links`.

Если добавляете новый жанр или платформу, обновите массивы `validGenres` / `validPlatforms` и кнопки фильтра в `js/main.js`. Не забудьте добавить игру в `ItemList` JSON-LD в `<head>` и в раздел «Платформы».

## Источники данных

Названия, описания, возрастные рейтинги и иконки взяты из официальных карточек игр в Google Play и RuStore, обложки браузерных игр — с Playgama. Ссылки на игры перечислены в файле `Ссылки на Игры.txt`.

## Контакты

- Почта: vicgame44@gmail.com
- Facebook: https://www.facebook.com/groups/vicgame
- X (Twitter): https://twitter.com/VIt40680951
- YouTube: https://www.youtube.com/channel/UClowsW1garCcz-3X1Kv3A2A
- Разработчик: Плюхин Виталий Александрович, г. Иркутск
