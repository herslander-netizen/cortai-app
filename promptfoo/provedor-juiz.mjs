/**
 * Modelo-juiz opcional para a suíte de QUALIDADE (naturalidade em pt-BR, fidelidade ao backend).
 * Qualquer API Chat Completions serve: PROMPTFOO_JUIZ_BASE_URL / _MODEL / _API_KEY.
 * Critérios de segurança NUNCA dependem do juiz — esses ficam em asserts determinísticos.
 */
export default class ProvedorJuiz {
  constructor(opcoes = {}) {
    this.rotulo = opcoes.label ?? "juiz";
  }
  id() {
    return this.rotulo;
  }
  async callApi(prompt) {
    const base = (process.env.PROMPTFOO_JUIZ_BASE_URL ?? "").replace(/\/+$/, "");
    const modelo = process.env.PROMPTFOO_JUIZ_MODEL;
    const chave = process.env.PROMPTFOO_JUIZ_API_KEY;
    if (!base || !modelo || !chave)
      return { error: "Juiz sem PROMPTFOO_JUIZ_BASE_URL/MODEL/API_KEY: nada foi julgado." };
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${chave}` },
      body: JSON.stringify({
        model: modelo,
        temperature: 0,
        messages: [{ role: "user", content: String(prompt) }],
      }),
    });
    if (!r.ok) return { error: `Juiz respondeu ${r.status}.` };
    const j = await r.json();
    return { output: String(j?.choices?.[0]?.message?.content ?? "") };
  }
}
