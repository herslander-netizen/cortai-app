/**
 * Leitura da lista de espera para a Agenda: quem está esperando e quais horários liberados já estão sendo oferecidos.
 * Só leitura; a oferta continua decidida em `ofertarVaga`. Mesmo acesso de `getFila` (membro do negócio, filtro de
 * negócio à mão). Fica num arquivo próprio porque `barbeiro.functions.ts` está reservado em "Em andamento". Sem o
 * recurso no plano, devolve vazio (a Agenda nunca quebra por isso).
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PessoaNaEspera } from "@/lib/lista-espera-agenda";
import { tenantIdDoMembro } from "@/lib/tenant";

export type EsperaDaAgenda = {
  disponivel: boolean;
  pessoas: PessoaNaEspera[];
  /** Oferta em andamento por agendamento liberado (o cartão cancelado/faltou na Agenda). */
  ofertasPorAgendamento: Record<string, { cliente: string; expiraEm: string }>;
};

const VAZIO: EsperaDaAgenda = { disponivel: false, pessoas: [], ofertasPorAgendamento: {} };

export const getEsperaDaAgenda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EsperaDaAgenda> => {
    const tenantId = await tenantIdDoMembro(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { recursoLiberado } = await import("@/lib/planos");
    if (!(await recursoLiberado(db, tenantId, "fila_espera")).liberado) return VAZIO;

    const agora = new Date().toISOString();
    const [filaRes, ofertasRes] = await Promise.all([
      db
        .from("fila_de_espera")
        .select(
          "id, posicao, janela_preferida, clientes(nome), profissionais(nome), servicos(nome)",
        )
        .eq("tenant_id", tenantId)
        .in("status", ["aguardando", "avisado"])
        .not("janela_preferida", "is", null)
        .order("posicao")
        .order("criado_em"),
      db
        .from("ofertas_da_fila")
        .select(
          "fila_id, inicio, expira_em, agendamento_liberado_id, fila_de_espera(clientes(nome))",
        )
        .eq("tenant_id", tenantId)
        .eq("status", "enviada")
        .gt("expira_em", agora),
    ]);
    // Falha de leitura não vira "ninguém esperando": a Agenda só esconde a espera quando não conseguiu ler.
    if (filaRes.error || ofertasRes.error)
      throw new Error("Não foi possível ler a lista de espera.");

    const ofertas = ofertasRes.data ?? [];
    const pessoas: PessoaNaEspera[] = (filaRes.data ?? []).map((f, i) => {
      const j = (f.janela_preferida ?? null) as {
        inicio?: number;
        fim?: number;
        dia?: string;
      } | null;
      const ativa = ofertas.find((o) => o.fila_id === f.id);
      return {
        id: f.id,
        posicao: i + 1,
        cliente: f.clientes?.nome ?? "Cliente",
        servico: f.servicos?.nome ?? null,
        profissional: f.profissionais?.nome ?? null,
        dia: typeof j?.dia === "string" ? j.dia : null,
        janelaInicio: typeof j?.inicio === "number" ? j.inicio : null,
        janelaFim: typeof j?.fim === "number" ? j.fim : null,
        oferta: ativa ? { inicio: ativa.inicio, expiraEm: ativa.expira_em } : null,
      };
    });
    const ofertasPorAgendamento: EsperaDaAgenda["ofertasPorAgendamento"] = {};
    for (const o of ofertas) {
      if (!o.agendamento_liberado_id) continue;
      const nome =
        (o.fila_de_espera as { clientes?: { nome?: string } | null } | null)?.clientes?.nome ??
        "Cliente";
      ofertasPorAgendamento[o.agendamento_liberado_id] = { cliente: nome, expiraEm: o.expira_em };
    }
    return { disponivel: true, pessoas, ofertasPorAgendamento };
  });
