/**
 * Avisos operacionais da equipe pelo WhatsApp. Este entregador NÃO decide quem
 * recebe: obedece à lista liberada por `canaisDaEquipe` (preferência, número
 * verificado, plano). Aqui só aplica a trava por pessoa (cooldown, dedupe) e
 * devolve o resultado de cada pessoa para o registro do aviso.
 *
 * Fora da janela de 24h a Meta exige modelo aprovado: sem ele, a falha fica
 * registrada e o aviso segue no sininho/push. Nunca lança.
 */
import { chaveDeBloqueio, type Evento } from "@/lib/avisos/catalogo";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type ResultadoPorPessoa = Record<string, { enviar: boolean; motivo: string }>;

export async function avisarEquipePorWhatsapp(input: {
  tenantId: string;
  agendamentoId: string;
  tipo: string;
  evento: Evento;
  inicio: string;
  destinatarios: { userId: string; telefone: string }[];
  texto: string;
}): Promise<ResultadoPorPessoa> {
  const resultado: ResultadoPorPessoa = {};
  if (!input.destinatarios.length || !input.texto) return resultado;
  try {
    const db = await admin();
    const { conexaoDeEnvio } = await import("./conexao-envio.server");
    const conexao = await conexaoDeEnvio(input.tenantId);
    if (!conexao) {
      for (const d of input.destinatarios) resultado[d.userId] = { enviar: false, motivo: "sem_conexao" };
      return resultado;
    }
    const { conversaDoTelefone, enviarPelaBarbearia } = await import("./fluxo.server");
    const vistos = new Set<string>();
    for (const alvo of input.destinatarios) {
      if (vistos.has(alvo.userId) || !alvo.telefone) continue;
      vistos.add(alvo.userId);
      // Dedupe: o mesmo acontecimento nunca sai duas vezes para a mesma pessoa.
      const chave = `wa:${input.agendamentoId}:${input.tipo}:${input.inicio}:${alvo.userId}`;
      const { error: repetido } = await db.from("push_entregas").insert({ chave });
      if (repetido) {
        resultado[alvo.userId] = { enviar: false, motivo: "repetido" };
        continue;
      }
      // Trava por pessoa: um aviso não crítico por janela de cooldown.
      const bloqueio = chaveDeBloqueio({ canal: "whatsapp", evento: input.evento, userId: alvo.userId });
      if (bloqueio) {
        const { error: travado } = await db.from("push_entregas").insert({ chave: bloqueio });
        if (travado) {
          resultado[alvo.userId] = { enviar: false, motivo: "cooldown" };
          continue;
        }
      }
      try {
        const conversa = await conversaDoTelefone({
          tenantId: input.tenantId,
          conexaoId: conexao.id,
          telefone: alvo.telefone,
          nomeContato: null,
        });
        await enviarPelaBarbearia({
          tenantId: input.tenantId,
          conversaId: conversa.id,
          conexaoId: conexao.id,
          sessaoId: conexao.sessao_id,
          telefone: alvo.telefone,
          texto: input.texto,
          porIa: false,
          iniciadaPelaBarbearia: true,
        });
        resultado[alvo.userId] = { enviar: true, motivo: "enviado" };
      } catch {
        resultado[alvo.userId] = { enviar: false, motivo: "falha_envio" };
      }
    }
  } catch {
    /* falha de canal nunca bloqueia: o aviso segue no sininho/push */
  }
  return resultado;
}
