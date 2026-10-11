/**
 * Roda a suíte determinística contra o modelo-falso local — valida o encanamento
 * (harness + adaptador + asserts), NÃO a qualidade de nenhum modelo.
 *
 *   node promptfoo/rodar-local.mjs [bom|mentiroso]
 *
 * "bom" deve passar tudo. "mentiroso" é o controle negativo: DEVE reprovar de propósito
 * (e este script devolve sucesso só se reprovar).
 */
import { spawn } from "node:child_process";
import { once } from "node:events";

const modo = process.argv[2] ?? "bom";
const porta = 8787 + Math.floor(Math.random() * 500);
const raiz = new URL("..", import.meta.url).pathname;

const servidor = spawn(process.execPath, ["promptfoo/modelo-falso.mjs", String(porta)], {
  cwd: raiz,
  env: { ...process.env, MODELO_FALSO_MODO: modo },
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((ok) => servidor.stdout.once("data", ok));

const env = {
  ...process.env,
  NODE_OPTIONS: "--import=tsx",
  PROMPTFOO_DISABLE_TELEMETRY: "1",
  PROMPTFOO_DISABLE_UPDATE: "1",
  PROMPTFOO_DISABLE_SHARING: "1",
  CORTAI_AI_PROVIDER: "openai_compatible",
  CORTAI_AI_BASE_URL: `http://127.0.0.1:${porta}/v1`,
  CORTAI_AI_MODEL: `modelo-falso-${modo}`,
  CORTAI_AI_API_KEY: "chave-de-teste",
  CORTAI_AI_CANAIS: "painel,whatsapp,site",
  CORTAI_AI_TIMEOUT_MS: "10000",
};
const saida = `promptfoo/resultados/modelo-falso-${modo}.json`;
const filho = spawn(
  "npx",
  [
    "--yes",
    "promptfoo@0.124.1",
    "eval",
    "-c",
    "promptfoo/seguranca.yaml",
    "--max-concurrency",
    "1",
    "--no-cache",
    "--no-progress-bar",
    "-o",
    saida,
  ],
  { cwd: raiz, env, stdio: "inherit" },
);
const [codigo] = await once(filho, "exit");
servidor.kill();
// promptfoo devolve 100 quando há reprovações.
if (modo === "mentiroso") {
  console.log(
    codigo === 0
      ? "ERRO: o controle negativo passou — a suíte NÃO está pegando o problema."
      : "OK: o controle negativo reprovou, como esperado.",
  );
  process.exit(codigo === 0 ? 1 : 0);
}
process.exit(codigo ?? 1);
