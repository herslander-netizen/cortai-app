/** Funil anônimo da página pública: regras puras + envio "dispara e esquece". */

export const ETAPAS_FUNIL = [
  "vitrine_visita",
  "agendamento_aberto",
  "servico_escolhido",
  "horario_escolhido",
  "dados_enviados",
  "confirmado",
] as const;
export const ORIGENS_FUNIL = [
  "instagram",
  "whatsapp",
  "google",
  "facebook",
  "tiktok",
  "qr",
  "compartilhar",
  "link",
  "direto",
  "outro",
] as const;
export type EtapaFunil = (typeof ETAPAS_FUNIL)[number];
export type OrigemFunil = (typeof ORIGENS_FUNIL)[number];
export type ExperienciaFunil = "vitrine" | "direta" | "conversa";
export type FluxoFunil = "passo_a_passo" | "conversa" | null;

const DOMINIOS: [RegExp, OrigemFunil][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$/, "facebook"],
  [/(^|\.)whatsapp\.com$|(^|\.)wa\.me$/, "whatsapp"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
];

/** ?origem= (ou utm_source) > domínio do referrer > direto. */
export function detectarOrigem(search: string, referrer: string, hostAtual = ""): OrigemFunil {
  const params = new URLSearchParams(search);
  const bruto = (params.get("origem") || params.get("utm_source") || "").trim().toLowerCase();
  if (bruto) {
    if ((ORIGENS_FUNIL as readonly string[]).includes(bruto)) return bruto as OrigemFunil;
    if (bruto === "ig") return "instagram";
    if (bruto === "fb") return "facebook";
    if (bruto === "wa") return "whatsapp";
    return "outro";
  }
  if (!referrer) return "direto";
  let host = "";
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "direto";
  }
  if (!host || (hostAtual && host === hostAtual.toLowerCase())) return "direto";
  for (const [re, origem] of DOMINIOS) if (re.test(host)) return origem;
  return "outro";
}

/** /agendar vindo dos botões da vitrine → vitrine; senão, a experiência publicada. */
export function detectarExperiencia(
  search: string,
  experienciaPublicada: ExperienciaFunil | null | undefined,
): ExperienciaFunil {
  if (new URLSearchParams(search).get("de") === "vitrine") return "vitrine";
  return experienciaPublicada ?? "vitrine";
}

/** Busca para os botões de agendar da vitrine (mantém a origem da visita). */
export function buscaParaAgendar(origem: OrigemFunil) {
  return { origem, de: "vitrine" as const };
}

const enviadas = new Set<string>();

/** Nunca bloqueia, nunca mostra erro; cada etapa conta uma vez por carregamento. */
export function registrarEtapa(evento: {
  slug: string;
  etapa: EtapaFunil;
  experiencia: ExperienciaFunil;
  fluxo: FluxoFunil;
  origem: OrigemFunil;
}) {
  if (typeof window === "undefined") return;
  const chave = `${evento.slug}:${evento.etapa}`;
  if (enviadas.has(chave)) return;
  enviadas.add(chave);
  try {
    const corpo = JSON.stringify(evento);
    const blob = new Blob([corpo], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/public/funil", blob)) return;
    void fetch("/api/public/funil", {
      method: "POST",
      body: corpo,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* medição nunca atrapalha a página */
  }
}

/** Origem da visita atual (lida no navegador). */
export function origemDaVisita(): OrigemFunil {
  if (typeof window === "undefined") return "direto";
  return detectarOrigem(window.location.search, document.referrer, window.location.hostname);
}
