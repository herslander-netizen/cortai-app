// Gera public/temas/<tema>.webp a partir da tela "Ver Exemplo" (negócio fictício) rodando em dev.
// Uso (com a sessão do rig de teste): node scripts/gerar-capas-dos-temas.mjs <url-base>
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const base = process.argv[2] ?? "http://127.0.0.1:5199";
const temas = ["figaro-classico", "figaro-rock-n-roll", "figaro-retro", "feminino-rose", "feminino-lavanda", "feminino-pessego"];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 36000;
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "11111111-1111-4111-8111-111111111111", role: "authenticated", exp })}.assinatura`;
const user = { id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: "dono@exemplo.com", email_confirmed_at: new Date().toISOString(), app_metadata: { provider: "email" }, user_metadata: {}, created_at: new Date().toISOString() };
const sessao = { access_token: jwt, refresh_token: "r", expires_at: exp, expires_in: 36000, token_type: "bearer", user };

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-proxy-server"] });
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript((s) => { try { localStorage.setItem("sb-127-auth-token", JSON.stringify(s)); } catch {} }, sessao);
const p = await ctx.newPage();
for (const tema of temas) {
  await p.goto(`${base}/barbeiro/marca/layout-tema/preview?layout=figaro-site-completo&tema=${tema}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(3000);
  await p.getByRole("button", { name: /Rejeitar todos/ }).click().catch(() => {});
  await p.locator('button[aria-label="Prévia no computador"]').click({ timeout: 5000 });
  await p.waitForTimeout(1200);
  const quadro = p.locator("div.shadow-\\[var\\(--elevacao-3\\)\\]").first();
  const caixa = await quadro.boundingBox();
  const png = await p.screenshot({ type: "png", clip: { x: caixa.x, y: caixa.y, width: Math.min(caixa.width, 1180), height: Math.min(caixa.width, 1180) / 2.9 } });
  const webp = await p.evaluate(async (b64png) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64png; await img.decode();
    const c = document.createElement("canvas"); c.width = 870; c.height = 300;
    c.getContext("2d").drawImage(img, 0, 0, 870, 300);
    return c.toDataURL("image/webp", 0.85).split(",")[1];
  }, png.toString("base64"));
  writeFileSync(`public/temas/${tema}.webp`, Buffer.from(webp, "base64"));
  console.log(tema);
}
await nav.close();
