/**
 * Emissor único de avisos da Flow IA.
 *
 * Grava uma linha por destinatário em `notificacoes` (sininho), com evento,
 * prioridade, chave de dedupe e a decisão de canais. Entregadores existentes
 * (push, WhatsApp) passam a ler essa decisão nas próximas etapas.
 * Nunca lança: falha aqui jamais desfaz a operação que gerou o evento.
 */
import {
  EVENTOS,
  type DecisaoDeCanal,
  chaveDeDedupe,
  decidirCanais,
  type Contexto,
  type Destinatario,
  type Evento,
} from "./catalogo";

export type AlvoDoAviso = {
  destinatario: Destinatario;
  /** user_id (equipe) ou null = todo o negócio (gestor sem pessoa definida). */
  userId?: string | null;
  clienteId?: string | null;
  contexto?: Contexto;
};

export type EmissaoDeAviso = {
  tenantId: string;
  evento: Evento;
  corpo: string | null;
  link: string | null;
  agendamentoId?: string | null;
  /** Referência do dedupe (padrão: agendamento ou link). */
  referencia?: string;
  versao?: string | null;
  titulo?: string;
  alvos: AlvoDoAviso[];
};

export async function emitirAviso(input: EmissaoDeAviso): Promise<{ gravados: number; decisoes: DecisaoDeCanal[][] }> {
  let gravados = 0;
  const decisoes: DecisaoDeCanal[][] = [];
  try {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const def = EVENTOS[input.evento];
    const referencia = input.referencia ?? input.agendamentoId ?? input.link ?? "geral";
    for (const alvo of input.alvos) {
      const decisao = decidirCanais(input.evento, alvo.destinatario, alvo.contexto ?? {});
      decisoes.push(decisao);
      if (decisao.length === 0) continue;
      const chave = chaveDeDedupe({
        evento: input.evento,
        destinatario: alvo.destinatario,
        alvo: alvo.userId ?? alvo.clienteId ?? "negocio",
        referencia,
        versao: input.versao,
      });
      const { error } = await db.from("notificacoes").insert({
        tenant_id: input.tenantId,
        user_id: alvo.userId ?? null,
        cliente_id: alvo.clienteId ?? null,
        agendamento_id: input.agendamentoId ?? null,
        tipo: input.evento,
        evento: input.evento,
        destinatario_tipo: alvo.destinatario,
        prioridade: def.prioridade,
        titulo: input.titulo ?? def.titulo,
        corpo: input.corpo,
        link: input.link,
        chave_dedupe: chave,
        canais: Object.fromEntries(decisao.map((d) => [d.canal, { enviar: d.enviar, motivo: d.motivo }])),
      });
      // 23505 = já emitido nesta versão: dedupe esperado.
      if (!error) gravados++;
      else if (error.code !== "23505") console.error("[avisos] emitir:", error.message);
    }
  } catch (e) {
    console.error("[avisos] emitir falhou:", e instanceof Error ? e.message : e);
  }
  return { gravados, decisoes };
}
