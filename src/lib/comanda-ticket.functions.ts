import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import {
  estadoDoTicket,
  prefixoDeCodigo,
  type DadosDoTicket,
  type EstadoDoTicket,
} from "@/lib/comanda-ticket";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function dataHora(iso: string, fuso: string) {
  const d = new Date(iso);
  const data = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const horario = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return { data, horario };
}

const SELECAO =
  "id, codigo, status, subtotal_centavos, desconto_centavos, total_centavos, criado_em, clientes(nome, telefone), agendamentos(inicio, forma_pagamento), pagamentos(forma_pagamento, status, estornado_em, criado_em)";

function ultimoPagamento(lista: any[] | null | undefined) {
  return [...(lista ?? [])].sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))[0] ?? null;
}

/** Comanda pronta para o ticket. Só membros do próprio negócio; nunca cruza negócios. */
export const getTicketComanda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ comandaId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<DadosDoTicket> => {
    const tenantId = await tenantIdDoMembro(context);
    const db = await admin();
    const [{ data: c }, { data: itens }, { data: tenant }, { data: config }] = await Promise.all([
      db.from("comandas").select(SELECAO).eq("id", data.comandaId).eq("tenant_id", tenantId).maybeSingle(),
      db
        .from("comanda_itens")
        .select("tipo, descricao, quantidade, valor_total_centavos")
        .eq("comanda_id", data.comandaId)
        .eq("tenant_id", tenantId)
        .order("criado_em"),
      db.from("tenants").select("nome, logo_url, fuso").eq("id", tenantId).maybeSingle(),
      db
        .from("configuracoes_financeiras")
        .select("pix_ativo, pix_chave")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);
    if (!c) throw new Error("Comanda não encontrada.");
    const comanda: any = c;
    const fuso = tenant?.fuso || "America/Sao_Paulo";
    const quando = dataHora(comanda.agendamentos?.inicio ?? comanda.criado_em, fuso);
    const pagamento = ultimoPagamento(comanda.pagamentos);
    const forma = pagamento?.forma_pagamento ?? comanda.agendamentos?.forma_pagamento ?? null;
    const mapa = (tipo: string) =>
      ((itens ?? []) as any[])
        .filter((i) => i.tipo === tipo)
        .map((i) => ({
          quantidade: i.quantidade,
          descricao: i.descricao,
          totalCentavos: i.valor_total_centavos,
        }));
    return {
      id: comanda.id,
      codigo: comanda.codigo ?? comanda.id.slice(0, 8).toUpperCase(),
      negocio: { nome: tenant?.nome?.trim() || null, logoUrl: tenant?.logo_url || null },
      data: quando.data,
      horario: quando.horario,
      cliente: {
        nome: comanda.clientes?.nome ?? "Cliente",
        telefone: comanda.clientes?.telefone ?? null,
      },
      servicos: mapa("servico"),
      produtos: mapa("produto"),
      subtotalCentavos: comanda.subtotal_centavos,
      descontoCentavos: comanda.desconto_centavos,
      totalCentavos: comanda.total_centavos,
      forma,
      estado: estadoDoTicket(comanda.status, pagamento),
      pixChave: config?.pix_ativo && config.pix_chave ? config.pix_chave : null,
    };
  });

export type ResultadoDaBusca = {
  id: string;
  codigo: string;
  cliente: string;
  quando: string;
  totalCentavos: number;
  forma: string | null;
  estado: EstadoDoTicket;
};

/** Busca por código (ou parte), data dd/mm/aaaa, nome ou telefone do cliente. */
export const buscarComandas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        termo: z.string().trim().max(60),
        estado: z.enum(["todos", "pago", "pendente", "cancelado"]).default("todos"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ResultadoDaBusca[]> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "visualizar_financeiro");
    const db = await admin();
    const { data: tenant } = await db.from("tenants").select("fuso").eq("id", tenantId).maybeSingle();
    const fuso = tenant?.fuso || "America/Sao_Paulo";
    let q = db.from("comandas").select(SELECAO).eq("tenant_id", tenantId);
    const termo = data.termo;
    const prefixo = termo ? prefixoDeCodigo(termo) : null;
    if (prefixo) q = q.ilike("codigo", `${prefixo}%`);
    else if (termo.length >= 2) {
      const digitos = termo.replace(/\D/g, "");
      const seguro = termo.replace(/[%,()]/g, " ");
      const filtro =
        digitos.length >= 4 ? `nome.ilike.%${seguro}%,telefone.ilike.%${digitos}%` : `nome.ilike.%${seguro}%`;
      const { data: clientes } = await db
        .from("clientes")
        .select("id")
        .eq("tenant_id", tenantId)
        .or(filtro)
        .limit(50);
      const ids = (clientes ?? []).map((c: any) => c.id);
      if (!ids.length) return [];
      q = q.in("cliente_id", ids);
    }
    const { data: lista } = await q.order("criado_em", { ascending: false }).limit(40);
    return ((lista ?? []) as any[])
      .map((c) => {
        const pagamento = ultimoPagamento(c.pagamentos);
        const { data: dia, horario } = dataHora(c.agendamentos?.inicio ?? c.criado_em, fuso);
        return {
          id: c.id,
          codigo: c.codigo ?? c.id.slice(0, 8),
          cliente: c.clientes?.nome ?? "Cliente",
          quando: `${dia} · ${horario}`,
          totalCentavos: c.total_centavos,
          forma: pagamento?.forma_pagamento ?? c.agendamentos?.forma_pagamento ?? null,
          estado: estadoDoTicket(c.status, pagamento),
        };
      })
      .filter((r) => data.estado === "todos" || r.estado === data.estado);
  });
