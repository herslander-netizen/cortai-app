/**
 * Conferência do comando (pura, sem rede): lista de verificações que a pessoa VÊ antes de gravar
 * e um veredito calculado por regra — nunca opinião do modelo.
 *
 *  - "pronto"    → tudo conferido; pode gravar;
 *  - "atencao"   → há pontos que a pessoa precisa olhar (ex.: cliente não confirmado por busca);
 *  - "bloqueado" → algo impede (cliente/serviço inexistente, horário ocupado, regra da agenda);
 *                  não se cria confirmação: não há o que confirmar.
 *
 * Os itens vêm de duas fontes: (1) o que o backend verifica de verdade (entidades do negócio,
 * regras oficiais da agenda) e (2) as provas colhidas no turno (cliente sem ambiguidade,
 * horário vindo da consulta oficial). Ambas alimentam o mesmo veredito.
 */
import type { Evidencias } from "./execucao-direta";

export type EstadoDeItem = "ok" | "atencao" | "erro";

export type ItemDeConferencia = {
  id: string;
  rotulo: string;
  valor: string;
  estado: EstadoDeItem;
  detalhe?: string | null;
};

export type Veredito = "pronto" | "atencao" | "bloqueado";

export type Conferencia = {
  itens: ItemDeConferencia[];
  veredito: Veredito;
  /** Frase pronta para a tela. */
  resumo: string;
};

/** Interruptor de segurança: `CORTAI_CONFERENCIA=false` (ou 0/off) volta ao fluxo sem conferência. */
export function conferenciaLigada(env: Record<string, string | undefined> = process.env) {
  const v = (env["CORTAI_CONFERENCIA"] ?? "").trim().toLowerCase();
  return !(v === "false" || v === "0" || v === "off" || v === "nao");
}

export function vereditoDe(itens: readonly ItemDeConferencia[]): Veredito {
  if (itens.some((i) => i.estado === "erro")) return "bloqueado";
  if (itens.some((i) => i.estado === "atencao")) return "atencao";
  return "pronto";
}

export function montarConferencia(itens: ItemDeConferencia[]): Conferencia {
  const veredito = vereditoDe(itens);
  const primeiroErro = itens.find((i) => i.estado === "erro");
  const resumo =
    veredito === "pronto"
      ? "Tudo conferido: pode gravar."
      : veredito === "atencao"
        ? "Confira os pontos marcados antes de confirmar."
        : `Não dá para gravar: ${primeiroErro?.detalhe || primeiroErro?.valor || "há um problema no pedido"}`;
  return { itens, veredito, resumo };
}

/** Motivo curto do primeiro bloqueio (para o modelo explicar em uma frase). */
export function motivoDoBloqueio(c: Conferencia): string {
  const e = c.itens.find((i) => i.estado === "erro");
  return e ? (e.detalhe ?? `${e.rotulo}: ${e.valor}`) : "O pedido não passou na conferência.";
}

const texto = (v: unknown) => (typeof v === "string" && v ? v : null);

/**
 * Provas do turno para `criar_agendamento`: o modelo não escolhe ids "do nada".
 * Mesmas exigências da política de execução direta, agora visíveis ao usuário.
 */
export function itensDeProvasDoAgendamento(
  dados: Record<string, unknown>,
  ctx: { papel?: string | null; profissionalId?: string | null },
  ev: Evidencias,
): ItemDeConferencia[] {
  const clienteId = texto(dados["clienteId"]);
  const servicoId = texto(dados["servicoId"]);
  const ms = texto(dados["inicio"]) ? Date.parse(String(dados["inicio"])) : Number.NaN;
  const profissionalId =
    ctx.papel === "profissional" && ctx.profissionalId
      ? ctx.profissionalId
      : texto(dados["profissionalId"]);

  const clienteResolvido = Boolean(clienteId && ev.clientes.has(clienteId));
  const horarioOficial =
    Number.isFinite(ms) &&
    ev.horarios.some(
      (h) => h.inicioMs === ms && h.profissionalId === profissionalId && h.servicoId === servicoId,
    );
  return [
    {
      id: "prova-cliente",
      rotulo: "Cliente identificado",
      valor: clienteResolvido ? "Sem ambiguidade" : "Não confirmado por busca",
      estado: clienteResolvido ? "ok" : "atencao",
      detalhe: clienteResolvido
        ? null
        : ev.buscasAmbiguas > 0
          ? "Havia mais de um cliente com esse nome. Confira se é o certo."
          : "O cliente não foi localizado por busca neste pedido.",
    },
    {
      id: "prova-servico",
      rotulo: "Serviço no catálogo",
      valor: servicoId && ev.servicos.has(servicoId) ? "Confirmado" : "Não consultado",
      estado: servicoId && ev.servicos.has(servicoId) ? "ok" : "atencao",
      detalhe:
        servicoId && ev.servicos.has(servicoId) ? null : "O serviço não veio da lista do negócio.",
    },
    {
      id: "prova-horario",
      rotulo: "Horário da agenda oficial",
      valor: horarioOficial ? "Livre na consulta" : "Não veio da consulta de horários",
      estado: horarioOficial ? "ok" : "atencao",
      detalhe: horarioOficial ? null : "Esse horário não foi conferido na agenda deste pedido.",
    },
  ];
}
