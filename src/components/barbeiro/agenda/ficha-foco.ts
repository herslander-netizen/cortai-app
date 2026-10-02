import type { PreferenciasCliente } from "@/lib/preferencias-cliente";

/** Campos privados que podem aparecer na ficha operacional do atendimento. */
export function fichaFocoVisivel(preferencias: PreferenciasCliente, observacao: string | null) {
  return {
    atencao: preferencias.atencao ?? null,
    conversa: preferencias.conversa ?? null,
    ar: preferencias.ar ?? null,
    bebida: preferencias.bebida ?? null,
    musica: preferencias.musica ?? null,
    corte: preferencias.corte_habitual ?? null,
    assuntos: preferencias.assuntos ?? null,
    observacao,
  };
}