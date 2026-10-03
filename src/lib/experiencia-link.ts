/** Regras puras da experiência do link (Direta / Vitrine / Conversa). */
import type { ExperienciaDoLink } from "@/lib/pagina-config";

export type FluxoDoAgendamento = "passo_a_passo" | "conversa";

/** cortai.dev/{slug}: direta e conversa vão ao agendamento; vitrine vai à página. */
export function destinoDoLinkCurto(slug: string, experiencia: ExperienciaDoLink, searchStr = "") {
  const base = experiencia === "vitrine" ? `/b/${slug}` : `/agendar/${slug}`;
  return `${base}${searchStr}`;
}

/** /b/{slug} redireciona ao agendamento fora da Vitrine, exceto com ?ver=pagina. */
export function vitrineDeveRedirecionar(experiencia: ExperienciaDoLink, searchStr: string) {
  if (experiencia === "vitrine") return false;
  return new URLSearchParams(searchStr).get("ver") !== "pagina";
}

/** Fluxo em /agendar: direta → passo a passo; conversa → conversa; vitrine → chat.modo. */
export function fluxoDoAgendamento(
  experiencia: ExperienciaDoLink,
  chatModo: string | null | undefined,
): FluxoDoAgendamento {
  if (experiencia === "direta") return "passo_a_passo";
  if (experiencia === "conversa") return "conversa";
  return chatModo === "conversa" ? "conversa" : "passo_a_passo";
}
