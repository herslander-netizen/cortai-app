/**
 * Registro das conversas que saíram do fluxo (tabela `atendimento_ocorrencias`, migração 0059). Nunca lança: o
 * aprendizado jamais atrasa nem impede uma resposta ao cliente. Texto sempre mascarado antes de gravar.
 */
import {
  chaveDeGrupo,
  mascararDados,
  type MotivoDeOcorrencia,
  type OrigemDaOcorrencia,
} from "./aprendizado";

export async function registrarOcorrencia(input: {
  tenantId: string;
  conversaId?: string | null;
  mensagemExternaId?: string | null;
  motivo: MotivoDeOcorrencia;
  origem: OrigemDaOcorrencia;
  texto?: string | null;
  intencao?: string | null;
  etapa?: string | null;
  detalhe?: string | null;
}): Promise<void> {
  try {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const texto = mascararDados(input.texto ?? "");
    const { error } = await db.from("atendimento_ocorrencias").insert({
      tenant_id: input.tenantId,
      conversa_id: input.conversaId ?? null,
      mensagem_externa_id: input.mensagemExternaId ?? null,
      motivo: input.motivo,
      origem: input.origem,
      texto,
      texto_normalizado: chaveDeGrupo(texto),
      intencao: input.intencao?.slice(0, 60) ?? null,
      etapa: input.etapa?.slice(0, 60) ?? null,
      detalhe: input.detalhe ? mascararDados(input.detalhe).slice(0, 300) : null,
    });
    // 23505: a mesma mensagem já gerou esta ocorrência (reentrega). 42P01: migração 0059 ainda não aplicada.
    if (error && error.code !== "23505" && error.code !== "42P01")
      console.error("[aprendizado] não registrou ocorrência", error.code);
  } catch (e) {
    console.error("[aprendizado] falha ao registrar", e instanceof Error ? e.message : e);
  }
}
