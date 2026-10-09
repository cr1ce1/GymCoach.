import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'OPENAI_API_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) console.warn(`Missing environment variables: ${missing.join(', ')}`);
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));

async function requireUser(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || !supabase) return res.status(401).json({ error: 'Потрібно увійти в акаунт.' });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Сесія недійсна. Увійди ще раз.' });
    req.user = data.user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Не вдалося перевірити сесію.' });
  }
}

app.post('/api/chat', requireUser, async (req, res) => {
  if (!openai) return res.status(503).json({ error: 'Сервер не налаштований: додай OPENAI_API_KEY у змінні середовища.' });
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'Напиши запитання.' });
  if (message.length > 4000) return res.status(413).json({ error: 'Запит задовгий. Скороти його до 4000 символів.' });
  const profile = req.body?.profile && typeof req.body.profile === 'object' ? req.body.profile : {};
  const plan = req.body?.plan && typeof req.body.plan === 'object' ? req.body.plan : null;
  const safeProfile = {
    age: Number.isFinite(Number(profile.age)) ? Number(profile.age) : undefined,
    level: String(profile.level || 'beginner').slice(0, 40),
    goal: String(profile.goal || 'maintain').slice(0, 40),
    place: String(profile.place || 'home').slice(0, 40),
    days: Math.max(2, Math.min(5, Number(profile.days) || 3)),
    duration: Math.max(15, Math.min(120, Number(profile.duration) || 30)),
    notes: String(profile.notes || '').slice(0, 300)
  };
  const planSummary = plan ? JSON.stringify(plan).slice(0, 5000) : 'Немає активного плану';
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 700,
      messages: [
        { role: 'system', content: `Ти GYM TRAINER AI — обережний, дружній тренер з фізичної активності. Відповідай українською, чітко й практично. Використовуй профіль лише як контекст. Надавай безпечні рекомендації, пояснюй, що важливі регулярність, техніка, відновлення і поступове збільшення навантаження. Не діагностуй хвороби, не призначай лікування, не заохочуй екстремальні дієти чи тренування через біль. Якщо користувач неповнолітній, не радь максимальні підйоми, небезпечні навантаження чи суворі дієти; рекомендуй нагляд тренера/дорослого для складних вправ. За болю, травми, запаморочення або інших тривожних симптомів порадь зупинитися й звернутися до дорослого/медичного фахівця. Не стверджуй, що ти лікар. Якщо бракує даних — запитай уточнення. Не вигадуй наукових джерел.
Профіль: ${JSON.stringify(safeProfile)}
Поточний план: ${planSummary}` },
        { role: 'user', content: message }
      ]
    });
    const reply = response.choices?.[0]?.message?.content?.trim();
    if (!reply) return res.status(502).json({ error: 'ШІ не повернув відповідь. Спробуй ще раз.' });
    return res.json({ reply });
  } catch (error) {
    console.error('OpenAI request failed:', error?.status || error?.message || 'unknown error');
    return res.status(502).json({ error: 'Не вдалося отримати відповідь від ШІ. Перевір налаштування API та спробуй ще раз.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, authConfigured: Boolean(supabase), aiConfigured: Boolean(openai) }));
// Serve only the public frontend files; never expose server.js, SQL or environment files.
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/config.js', (_req, res) => res.sendFile(path.join(__dirname, 'config.js')));
app.listen(port, () => console.log(`GYM TRAINER AI listening on ${port}`));
