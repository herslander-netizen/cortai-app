/**
 * Barbearia de demonstração do Cortaí.
 *
 * Tudo aqui é fictício e vive num tenant isolado. O visitante entra numa conta
 * dedicada, criada e mantida só no servidor: nenhuma credencial aparece na tela.
 * A agenda é reposta em relação ao dia de hoje para a demonstração nunca parecer
 * abandonada — sem tocar em nenhum tenant real.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const TENANT_DEMO = "0de00000-0000-4000-8000-000000000001";
export const SLUG_DEMO = "demonstracao";
const EMAIL_DEMO = "demonstracao@cortai.dev";

/** A visita opera a barbearia, mas não muda a estrutura do negócio. */
const PERMISSOES_DA_DEMO = [
  "criar_agendamento",
  "agendamento_manual",
  "cancelar_agendamento",
  "confirmar_pagamento",
  "registrar_venda",
  "visualizar_estoque",
  "visualizar_clientes",
  "editar_clientes",
  "visualizar_financeiro",
  "relatorios",
  "ver_cortai",
  "gerenciar_conversas",
  "assumir_conversa",
  "conceder_desconto",
  "caixa_abrir_fechar",
  "caixa_movimentar",
  "comissao_visualizar_todas",
];

const PROFISSIONAIS = [
  "0de01000-0000-4000-8000-000000000001",
  "0de01000-0000-4000-8000-000000000002",
  "0de01000-0000-4000-8000-000000000003",
  "0de01000-0000-4000-8000-000000000004",
];

const SERVICOS: { id: string; duracao: number; valor: number }[] = [
  { id: "0de02000-0000-4000-8000-000000000001", duracao: 40, valor: 5000 },
  { id: "0de02000-0000-4000-8000-000000000002", duracao: 30, valor: 4000 },
  { id: "0de02000-0000-4000-8000-000000000003", duracao: 70, valor: 8000 },
  { id: "0de02000-0000-4000-8000-000000000004", duracao: 45, valor: 6000 },
  { id: "0de02000-0000-4000-8000-000000000005", duracao: 30, valor: 4000 },
  { id: "0de02000-0000-4000-8000-000000000006", duracao: 40, valor: 7000 },
];

const CLIENTES = Array.from(
  { length: 8 },
  (_, i) => `0de03000-0000-4000-8000-00000000000${i + 1}`,
);

/** Data/hora local da barbearia (São Paulo) convertida para instante real. */
function emSaoPaulo(diasAFrente: number, hora: number, minuto: number): Date {
  const agora = new Date();
  const base = new Date(agora.getTime() - 3 * 60 * 60 * 1000); // UTC-3
  base.setUTCDate(base.getUTCDate() + diasAFrente);
  base.setUTCHours(hora, minuto, 0, 0);
  return new Date(base.getTime() + 3 * 60 * 60 * 1000);
}

/** Garante a conta de visita da demonstração e devolve o id dela. */
async function garantirUsuarioDaDemo(): Promise<string> {
  const { data: lista } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existente = lista?.users.find((u) => u.email?.toLowerCase() === EMAIL_DEMO);
  if (existente) return existente.id;

  const senha = `demo-${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: EMAIL_DEMO,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: "Visita de demonstração" },
  });
  if (error || !data.user) throw new Error("Não foi possível abrir a demonstração agora.");
  return data.user.id;
}

async function garantirVinculo(userId: string) {
  await supabaseAdmin
    .from("perfis")
    .upsert({ user_id: userId, nome: "Visita de demonstração", tipo: "barbeiro" }, { onConflict: "user_id" });

  const { data: vinculo } = await supabaseAdmin
    .from("tenant_usuarios")
    .select("id")
    .eq("user_id", userId)
    .eq("tenant_id", TENANT_DEMO)
    .maybeSingle();

  if (vinculo) {
    await supabaseAdmin
      .from("tenant_usuarios")
      .update({ papel: "gerente", permissoes: PERMISSOES_DA_DEMO, ativo: true })
      .eq("id", vinculo.id);
    return;
  }
  await supabaseAdmin.from("tenant_usuarios").insert({
    tenant_id: TENANT_DEMO,
    user_id: userId,
    papel: "gerente",
    permissoes: PERMISSOES_DA_DEMO,
    ativo: true,
    aceito_em: new Date().toISOString(),
  });
}

/** Repõe a agenda fictícia quando o dia de hoje ainda não tem movimento. */
async function garantirAgendaViva() {
  const inicioDoDia = emSaoPaulo(0, 0, 0).toISOString();
  const { count } = await supabaseAdmin
    .from("agendamentos")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", TENANT_DEMO)
    .gte("inicio", inicioDoDia);
  if ((count ?? 0) > 0) return;

  const linhas: {
    tenant_id: string;
    cliente_id: string;
    profissional_id: string;
    servico_id: string;
    inicio: string;
    fim: string;
    status: string;
    valor_centavos: number;
    origem: string;
    forma_pagamento?: string;
  }[] = [];
  const empurrar = (dia: number, hora: number, minuto: number, i: number, status: string) => {
    const servico = SERVICOS[i % SERVICOS.length]!;
    const inicio = emSaoPaulo(dia, hora, minuto);
    linhas.push({
      tenant_id: TENANT_DEMO,
      cliente_id: CLIENTES[i % CLIENTES.length]!,
      profissional_id: PROFISSIONAIS[i % PROFISSIONAIS.length]!,
      servico_id: servico.id,
      inicio: inicio.toISOString(),
      fim: new Date(inicio.getTime() + servico.duracao * 60000).toISOString(),
      status,
      valor_centavos: servico.valor,
      origem: i % 3 === 0 ? "manual" : "app",
      ...(status === "concluido" ? { forma_pagamento: i % 2 ? "pix" : "credito" } : {}),
    });
  };

  // Últimos 21 dias de histórico concluído.
  let i = 0;
  for (let dia = -21; dia < 0; dia += 1) {
    if (new Date(emSaoPaulo(dia, 12, 0)).getUTCDay() === 0) continue;
    for (const hora of [9, 11, 14, 16, 18]) {
      empurrar(dia, hora, 30, i++, "concluido");
    }
  }
  // Hoje: dia cheio, com alguns já atendidos.
  for (const [pos, hora] of [9, 10, 11, 14, 15, 16, 17, 18, 19].entries()) {
    empurrar(0, hora, pos % 2 ? 0 : 30, i++, hora < 13 ? "concluido" : "confirmado");
  }
  // Próximos dias já com reservas.
  for (let dia = 1; dia <= 6; dia += 1) {
    for (const hora of [10, 13, 16, 18]) {
      empurrar(dia, hora, 0, i++, "confirmado");
    }
  }

  await supabaseAdmin.from("agendamentos").insert(linhas);
}

/** Caixa e comandas do dia, para o financeiro não aparecer zerado. */
async function garantirFinanceiro(userId: string) {
  const { count } = await supabaseAdmin
    .from("comandas")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", TENANT_DEMO);
  if ((count ?? 0) > 0) return;

  const hoje = emSaoPaulo(0, 10, 0).toISOString();
  for (const [pos, servico] of SERVICOS.slice(0, 4).entries()) {
    const comissao = Math.round(servico.valor * 0.5);
    const { data: comanda } = await supabaseAdmin
      .from("comandas")
      .insert({
        tenant_id: TENANT_DEMO,
        cliente_id: CLIENTES[pos]!,
        profissional_id: PROFISSIONAIS[pos % PROFISSIONAIS.length]!,
        status: "paga",
        subtotal_centavos: servico.valor,
        total_centavos: servico.valor,
        comissao_total_centavos: comissao,
        aberta_por: userId,
        finalizada_por: userId,
        finalizada_em: hoje,
      })
      .select("id")
      .single();
    if (!comanda) continue;

    await supabaseAdmin.from("comanda_itens").insert({
      comanda_id: comanda.id,
      tipo: "servico",
      servico_id: servico.id,
      descricao: "Serviço da demonstração",
      quantidade: 1,
      valor_unitario_centavos: servico.valor,
      valor_total_centavos: servico.valor,
      comissao_percentual: 50,
      comissao_centavos: comissao,
    });

    await supabaseAdmin.from("caixa_movimentos").insert({
      tenant_id: TENANT_DEMO,
      comanda_id: comanda.id,
      cliente_id: CLIENTES[pos]!,
      profissional_id: PROFISSIONAIS[pos % PROFISSIONAIS.length]!,
      tipo: "entrada",
      categoria: "atendimento",
      descricao: "Atendimento concluído",
      valor_centavos: servico.valor,
      forma_pagamento: pos % 2 ? "pix" : "cartao",
      criado_por: userId,
    });
  }
}

/**
 * Prepara a demonstração e devolve um token de entrada de uso único, que o
 * navegador troca por uma sessão. Nenhuma senha trafega para a tela.
 */
export async function prepararEntradaNaDemonstracao(): Promise<{ tokenHash: string; email: string }> {
  const userId = await garantirUsuarioDaDemo();
  await garantirVinculo(userId);
  await garantirAgendaViva();
  await garantirFinanceiro(userId);

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: EMAIL_DEMO,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) throw new Error("Não foi possível abrir a demonstração agora.");
  return { tokenHash, email: EMAIL_DEMO };
}
