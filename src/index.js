/**
 * Точка входа Cloudflare Worker.
 *
 * Роутинг (см. wrangler.jsonc → assets):
 *   - файл есть в public/     → отдаётся как статика (index.html, видео, гифки)
 *   - файла нет, путь /api/*  → выполняется этот скрипт
 *   - в остальных случаях     → статика через ASSETS binding
 */
import { handleLiquidityRequest, handleHealth, json } from "./api.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/liquidity-request" || pathname === "/liquidity-request") {
      if (request.method !== "POST") {
        return json({ ok: false, error: "method not allowed" }, 405);
      }
      return handleLiquidityRequest(request, env);
    }

    if (pathname === "/api/health") {
      return handleHealth(env);
    }

    if (pathname.startsWith("/api/")) {
      return json({ ok: false, error: "Not Found" }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
