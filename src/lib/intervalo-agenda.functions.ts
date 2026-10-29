import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";

const entrada = z.object({
  dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  acao: z.enum(["salvar", "restaurar"]),
  intervaloInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  intervaloFim: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
});

/**
 * Ajusta somente uma data. A operação transacional e a validação de concorrência
 * são executadas pela RPC segura do banco, compartilhando os locks do agendamento.
 */
export const salvarIntervaloDoDia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const data = entrada.parse(input);
    const [ano, mes, dia] = data.dia.split("-").map(Number);
    const dataReal = new Date(Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia ?? 0));
    if (dataReal.toISOString().slice(0, 10) !== data.dia) throw new Error("Data inválida.");
    if (data.acao === "salvar" && ((data.intervaloInicio === null) !== (data.intervaloFim === null))) {
      throw new Error("Informe o início e o fim do intervalo, ou deixe os dois vazios.");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const { error } = await context.supabase.rpc("salvar_intervalo_agenda_dia", {
      _tenant_id: tenantId,
      _dia: data.dia,
      _acao: data.acao,
      _intervalo_inicio: data.intervaloInicio,
      _intervalo_fim: data.intervaloFim,
    });
    if (error) {
      const mensagem = error.message.toLowerCase();
      if (mensagem.includes("sem permissao")) {
        throw new Error("Você não tem permissão para alterar o intervalo deste dia.");
      }
      if (mensagem.includes("so podem ser feitos")) {
        throw new Error("Ajustes de intervalo só podem ser feitos para hoje ou uma data futura.");
      }
      if (mensagem.includes("dia esta fechado")) {
        throw new Error("Este dia está fechado no horário de funcionamento.");
      }
      if (mensagem.includes("comecar depois da abertura")) {
        throw new Error("O intervalo precisa começar depois da abertura.");
      }
      if (mensagem.includes("fim precisa ser posterior")) {
        throw new Error("O fim precisa ser posterior ao início do intervalo.");
      }
      if (mensagem.includes("terminar antes do fechamento")) {
        throw new Error("O intervalo precisa terminar antes do fechamento.");
      }
      if (mensagem.includes("ja existe atendimento")) {
        throw new Error("Já existe atendimento nesse período. Remarque ou cancele antes de ajustar o intervalo.");
      }
      if (mensagem.includes("inicio e o fim")) {
        throw new Error("Informe o início e o fim do intervalo, ou deixe os dois vazios.");
      }
      throw new Error("Não foi possível salvar o intervalo. Confira os horários e tente novamente.");
    }
    return { ok: true as const, dia: data.dia };
  });
