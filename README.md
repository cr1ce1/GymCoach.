# GYM TRAINER AI PRO

Це повний комплект для наступної версії сайту: тренування з підходами/повтореннями/вагою, таймер відпочинку, історія та статистика, базові особисті рекорди, календар з перенесенням занять, Supabase Auth і серверний endpoint для OpenAI.

## Важливо про розміщення

**GitHub Pages сам по собі не запускає Node.js-сервер.** Для справжньої реєстрації, хмарного збереження та ШІ потрібен backend. Цей проєкт має `server.js`; його можна розгорнути як Node web service на Render/Railway/Fly.io. Для найпростішого запуску весь сайт (включно з `index.html`) роздає той самий сервер. Не розміщуй `OPENAI_API_KEY` у `config.js` або HTML.

## 1. Створи Supabase-проєкт

1. Відкрий https://supabase.com/ і створи проєкт.
2. Відкрий **SQL Editor**, створи запит і виконай `supabase/schema.sql`.
3. У **Project Settings → API** скопіюй Project URL і publishable/anon key.
4. Встав їх у `config.js` замість `YOUR_PROJECT_ID` та `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`. Це публічний браузерний ключ; захист забезпечує RLS. Ніколи не використовуй `service_role` у браузері.
5. У Supabase **Authentication → URL Configuration** додай URL розгорнутого сайту в Site URL і Redirect URLs. Для першого тесту можна вимкнути email confirmation, але для публічного сайту краще залишити підтвердження адреси.

## 2. Налаштуй серверний OpenAI API

1. Створи API key на https://platform.openai.com/api-keys і перевір, що для проєкту налаштовано billing/ліміти. ChatGPT Plus/Free не включає API-кредити автоматично.
2. У хостингу Node-сервера додай environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, опційно `OPENAI_MODEL=gpt-4o-mini`.
3. **Не додавай `.env` у GitHub.** Він внесений у `.gitignore`.
4. Build command: `npm install`; Start command: `npm start`; Runtime: Node 20+.
5. Відкрий `/api/health` на сервері: `authConfigured` та `aiConfigured` мають бути `true`.

## 3. Локальний запуск

```bash
cp .env.example .env
# заповни .env реальними значеннями
npm install
npm start
```

Відкрий http://localhost:3000.

## 4. GitHub

Завантаж усі файли з цієї папки у репозиторій. Якщо хочеш залишити GitHub Pages, він може хостити лише фронтенд; у такому випадку потрібно окремо розгорнути `server.js` і змінити виклик `/api/chat` у `index.html` на URL backend-сервера, а в Supabase додати URL Pages до Redirect URLs. Для початку простіше розгорнути весь комплект як Node web service.

## Функції

- Auth: email/пароль через Supabase; після signup може знадобитися підтвердження email.
- Профіль і історія: таблиці з RLS, щоб користувач читав/змінював лише власні дані.
- Workout mode: чекбокс завершення, підходи, повторення, вага, таймер, заміна вправи.
- Статистика: кількість тренувань, хвилини, щотижневий графік і рекорди з введених даних.
- Calendar: створення, видалення та перенесення тренувань.
- AI: захищений `/api/chat`, який перевіряє Supabase session і використовує OpenAI на сервері.

Дані, записані раніше в старій локальній демоверсії, не зливаються автоматично з хмарною історією. За потреби експортуй їх у старій версії та імпортуй окремо.
