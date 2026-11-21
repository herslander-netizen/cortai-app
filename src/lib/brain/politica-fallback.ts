/** Guardas conservadoras de compatibilidade; sem chamadas de rede ou cobranças.
 * Fonte: https://developers.cloudflare.com/changelog/post/2026-11-05-planned-model-deprecations/
 * Workers AI: modelos retirados em 20/11/2026 (HTTP 410, erro 5028).
 * Revise a lista quando o catálogo oficial mudar.
 */
const MODELOS_WORKERS_AI_RETIRADOS = new Set([
  "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
  "@cf/nvidia/nemotron-3-120b-a12b",
  "@cf/deepseek-ai/deepseek-v4-pro-0813",
  "@cf/deepseek-ai/deepseek-v4-flash-0731",
  "@cf/qwen/qwq-32b",
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/moonshotai/kimi-k2.6",
  "@cf/moonshotai/kimi-k2.7-code",
  "@cf/zai-org/glm-5.2",
  "@cf/zai-org/glm-5.3-flash",
  "@cf/meta-llama/llama-2-7b-chat-hf-lora",
  "@cf/google/gemma-2b-it-lora",
  "@cf/google/gemma-7b-it-lora",
  "@cf/meta/llama-3.1-8b-instruct-fp8",
  "@cf/meta/llama-3.2-1b-instruct",
  "@cf/meta/llama-3.2-3b-instruct",
  "@cf/myshell-ai/melotts",
  "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  "@cf/runwayml/stable-diffusion-v1-5-inpainting",
  "@cf/bytedance/stable-diffusion-xl-lightning",
  "@cf/lykon/dreamshaper-8-lcm",
  "@cf/openai/whisper-tiny-en",
  "@cf/llava-hf/llava-1.5-7b-hf",
  "@cf/google/embeddinggemma-300m",
]);

export function modeloWorkersAiRetirado(provedor: string, modelo: string): boolean {
  const nome = provedor.trim().toLowerCase();
  return (
    (nome === "workers_ai" || nome === "api.cloudflare.com") &&
    MODELOS_WORKERS_AI_RETIRADOS.has(modelo.trim())
  );
}

/** 410 representa recurso removido; 429 e 5xx são falhas elegíveis a fallback.
 * Nunca mascarar 401, 402, 403 ou erros de entrada (400/404).
 */
export function falhaPermiteFallback(status: number): boolean {
  return status === 410 || status === 429 || (status >= 500 && status < 600);
}
