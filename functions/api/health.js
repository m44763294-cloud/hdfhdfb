/** GET /api/health — показывает, какому боту принадлежит BOT_TOKEN. */

export async function onRequestGet({ env }) {
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

function json(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
