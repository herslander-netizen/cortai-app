import { variantesDoTelefone } from "@/lib/telefone";

import {
  decidirConsentimentoWhatsapp,
  FINALIDADES_DE_SERVICO,
  FINALIDADES_WHATSAPP,
  telefoneEmE164,
  type AcaoConsentimentoWhatsapp,
  type FinalidadeWhatsapp,
} from "./consentimento";

type ErroDb = { message: string; code?: string } | null;
type RespostaDb = { data: unknown; error: ErroDb };

interface ConsultaConsentimento extends PromiseLike<RespostaDb> {
  select(colunas?: string): ConsultaConsentimento;
  insert(valores: Record<string, unknown> | Record<string, unknown>[]): ConsultaConsentimento;
  update(valores: Record<string, unknown>): ConsultaConsentimento;
  eq(coluna: string, valor: unknown): ConsultaConsentimento;
  is(coluna: string, valor: null): ConsultaConsentimento;
  order(coluna: string, opcoes: { ascending: boolean }): ConsultaConsentimento;
  limit(quantidade: number): ConsultaConsentimento;
  maybeSingle(): Promise<RespostaDb>;
}

interface BancoConsentimento {
  from(tabela: "whatsapp_consent_events" | "whatsapp_suppressions"): ConsultaConsentimento;
}

type Evidencia = Record<string, unknown>;

const VERSAO_DA_POLITICA = "flow-whatsapp-2026-11-05";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function bancoDeConsentimento(db: unknown): BancoConsentimento {
  // As duas tabelas são novas e ficam tipadas aqui até a próxima geração dos tipos Supabase.
  return db as BancoConsentimento;
}

function exigirTelefoneE164(telefone: string): string {
  const e164 = telefoneEmE164(telefone);
  if (!e164) throw new Error("Telefone inválido para registrar consentimento WhatsApp.");
  return e164;
}

function exigirFonte(fonte: string): string {
  const valor = fonte.trim();
  if (valor.length < 2 || valor.length > 80) throw new Error("Origem do consentimento inválida.");
  return valor;
}

function evento(
  input: {
    tenantId: string;
    clienteId?: string | null;
    telefoneE164: string;
    fonte: string;
    evidencia: Evidencia;
    textoConsentimento?: string | null;
    criadoPor?: string | null;
  },
  finalidade: FinalidadeWhatsapp,
  acao: AcaoConsentimentoWhatsapp,
) {
  return {
    tenant_id: input.tenantId,
    customer_id: input.clienteId ?? null,
    phone_e164: input.telefoneE164,
    purpose: finalidade,
    action: acao,
    source: input.fonte,
    evidence: input.evidencia,
    consent_text: input.textoConsentimento ?? null,
    policy_version: VERSAO_DA_POLITICA,
    created_by: input.criadoPor ?? null,
  };
}

export async function verificarConsentimentoWhatsapp(input: {
  tenantId: string;
  telefone: string;
  finalidade: FinalidadeWhatsapp;
}): Promise<{ pode: true } | { pode: false; motivo: string }> {
  const telefoneE164 = telefoneEmE164(input.telefone);
  if (!telefoneE164) return { pode: false, motivo: "Cliente sem WhatsApp válido." };

  try {
    const db = bancoDeConsentimento(await admin());
    const [supressao, ultimoEvento] = await Promise.all([
      db
        .from("whatsapp_suppressions")
        .select("id, reason")
        .eq("tenant_id", input.tenantId)
        .eq("phone_e164", telefoneE164)
        .is("released_at", null)
        .limit(1)
        .maybeSingle(),
      db
        .from("whatsapp_consent_events")
        .select("action")
        .eq("tenant_id", input.tenantId)
        .eq("phone_e164", telefoneE164)
        .eq("purpose", input.finalidade)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (supressao.error || ultimoEvento.error) {
      return { pode: false, motivo: "Não foi possível confirmar o consentimento agora." };
    }

    const suprimido = supressao.data !== null;
    const acao = ultimoEvento.data &&
      typeof ultimoEvento.data === "object" &&
      "action" in ultimoEvento.data &&
      (ultimoEvento.data.action === "concedido" ||
        ultimoEvento.data.action === "revogado" ||
        ultimoEvento.data.action === "reconsentimento_solicitado")
      ? ultimoEvento.data.action
      : null;

    return decidirConsentimentoWhatsapp({ suprimido, ultimaAcao: acao });
  } catch {
    // Falha de leitura nunca libera uma mensagem proativa.
    return { pode: false, motivo: "Não foi possível confirmar o consentimento agora." };
  }
}

/**
 * Registra a autorização que a equipe confirmou ter obtido do cliente.
 * A confirmação é granular; a conversa recebida por si só nunca chama esta função.
 */
export async function registrarConsentimentoWhatsapp(input: {
  tenantId: string;
  clienteId: string;
  telefone: string;
  finalidades?: readonly FinalidadeWhatsapp[];
  fonte: string;
  evidencia: Evidencia;
  textoConsentimento: string;
  criadoPor?: string | null;
}): Promise<void> {
  const telefoneE164 = exigirTelefoneE164(input.telefone);
  const fonte = exigirFonte(input.fonte);
  const finalidades = [...new Set(input.finalidades ?? FINALIDADES_DE_SERVICO)];
  if (!finalidades.length) throw new Error("Selecione ao menos uma finalidade de comunicação.");
  if (input.textoConsentimento.trim().length < 12) {
    throw new Error("O texto informado para o consentimento está incompleto.");
  }
  for (const finalidade of finalidades) {
    if (!(FINALIDADES_WHATSAPP as readonly string[]).includes(finalidade)) {
      throw new Error("Finalidade de consentimento inválida.");
    }
  }

  const db = bancoDeConsentimento(await admin());
  const dados = {
    tenantId: input.tenantId,
    clienteId: input.clienteId,
    telefoneE164,
    fonte,
    evidencia: input.evidencia,
    textoConsentimento: input.textoConsentimento.trim(),
    criadoPor: input.criadoPor,
  };
  const { error } = await db
    .from("whatsapp_consent_events")
    .insert(finalidades.map((finalidade) => evento(dados, finalidade, "concedido")));
  if (error) throw new Error("Não foi possível registrar o consentimento: " + error.message);

  // A supressão só é liberada depois do registro da nova autorização explícita.
  const { error: erroLiberacao } = await db
    .from("whatsapp_suppressions")
    .update({
      released_at: new Date().toISOString(),
      released_by: input.criadoPor ?? null,
      release_evidence: {
        source: fonte,
        evidence: input.evidencia,
        purposes: finalidades,
      },
    })
    .eq("tenant_id", input.tenantId)
    .eq("phone_e164", telefoneE164)
    .is("released_at", null)
    .select("id");
  if (erroLiberacao) {
    throw new Error("Consentimento salvo, mas não foi possível atualizar a supressão: " + erroLiberacao.message);
  }

  if (input.clienteId) {
    const dbAdmin = await admin();
    const { error: erroCliente } = await dbAdmin
      .from("clientes")
      .update({
        opt_in_whatsapp: true,
        opt_in_em: new Date().toISOString(),
        whatsapp_parado_em: null,
        whatsapp_parado_motivo: null,
      })
      .eq("id", input.clienteId)
      .eq("tenant_id", input.tenantId);
    if (erroCliente) throw new Error("Consentimento registrado, mas a ficha não foi sincronizada.");
  }
}

/** Registra uma revogação manual sem transformar a ação em bloqueio de número. */
export async function revogarConsentimentoWhatsapp(input: {
  tenantId: string;
  clienteId: string;
  telefone: string;
  fonte: string;
  evidencia: Evidencia;
  revogadoPor?: string | null;
  finalidades?: readonly FinalidadeWhatsapp[];
}): Promise<void> {
  const telefoneE164 = exigirTelefoneE164(input.telefone);
  const fonte = exigirFonte(input.fonte);
  // A desativação geral da ficha revoga todas as finalidades, inclusive marketing.
  const finalidades = [...new Set(input.finalidades ?? FINALIDADES_WHATSAPP)];
  const db = bancoDeConsentimento(await admin());
  const dados = {
    tenantId: input.tenantId,
    clienteId: input.clienteId,
    telefoneE164,
    fonte,
    evidencia: input.evidencia,
    criadoPor: input.revogadoPor,
  };
  const { error } = await db
    .from("whatsapp_consent_events")
    .insert(finalidades.map((finalidade) => evento(dados, finalidade, "revogado")));
  if (error) throw new Error("Não foi possível registrar a revogação: " + error.message);

  const dbAdmin = await admin();
  const { error: erroCliente } = await dbAdmin
    .from("clientes")
    .update({ opt_in_whatsapp: false })
    .eq("id", input.clienteId)
    .eq("tenant_id", input.tenantId);
  if (erroCliente) throw new Error("Revogação registrada, mas a ficha não foi sincronizada.");
}

/**
 * Registra SAIR ou número errado por tenant+telefone, mesmo sem cliente cadastrado.
 * A supressão é criada antes dos eventos; se o histórico falhar, a trava continua ativa.
 */
export async function suprimirWhatsapp(input: {
  tenantId: string;
  telefone: string;
  motivo: "opt_out" | "wrong_number" | "staff_block";
  fonte: string;
  evidencia: Evidencia;
  clienteId?: string | null;
}): Promise<void> {
  const telefoneE164 = exigirTelefoneE164(input.telefone);
  const fonte = exigirFonte(input.fonte);
  const db = bancoDeConsentimento(await admin());
  const dadosSupressao = {
    tenant_id: input.tenantId,
    phone_e164: telefoneE164,
    reason: input.motivo,
    source: fonte,
    evidence: input.evidencia,
  };

  const { data: atual, error: erroConsulta } = await db
    .from("whatsapp_suppressions")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("phone_e164", telefoneE164)
    .is("released_at", null)
    .limit(1)
    .maybeSingle();
  if (erroConsulta) throw new Error("Não foi possível confirmar a supressão do WhatsApp.");

  if (!atual) {
    const { error } = await db.from("whatsapp_suppressions").insert(dadosSupressao);
    if (error && error.code !== "23505") {
      throw new Error("Não foi possível registrar o bloqueio WhatsApp: " + error.message);
    }
  }

  const dadosEvento = {
    tenantId: input.tenantId,
    clienteId: input.clienteId,
    telefoneE164,
    fonte,
    evidencia: input.evidencia,
  };
  const { error: erroEventos } = await db
    .from("whatsapp_consent_events")
    .insert(
      FINALIDADES_WHATSAPP.map((finalidade) =>
        evento(dadosEvento, finalidade, "revogado"),
      ),
    );
  if (erroEventos) {
    // A trava ativa já existe, então a falha de auditoria não libera mensagens.
    throw new Error("Bloqueio aplicado; não foi possível completar o histórico de consentimento.");
  }

  const dbAdmin = await admin();
  const { error: erroClientes } = await dbAdmin
    .from("clientes")
    .update({
      opt_in_whatsapp: false,
      whatsapp_parado_em: new Date().toISOString(),
      whatsapp_parado_motivo: input.motivo === "wrong_number" ? "numero_errado" : "sair",
    })
    .eq("tenant_id", input.tenantId)
    .in("telefone", variantesDoTelefone(input.telefone));
  if (erroClientes) throw new Error("Bloqueio registrado; não foi possível sincronizar as fichas.");
}

/** VOLTAR é um pedido, não uma autorização. Nada é reativado até novo consentimento. */
export async function solicitarReconsentimentoWhatsapp(input: {
  tenantId: string;
  telefone: string;
  fonte: string;
  evidencia: Evidencia;
  clienteId?: string | null;
}): Promise<void> {
  const telefoneE164 = exigirTelefoneE164(input.telefone);
  const fonte = exigirFonte(input.fonte);
  const db = bancoDeConsentimento(await admin());
  const dados = {
    tenantId: input.tenantId,
    clienteId: input.clienteId,
    telefoneE164,
    fonte,
    evidencia: input.evidencia,
  };
  const { error } = await db
    .from("whatsapp_consent_events")
    .insert(
      FINALIDADES_DE_SERVICO.map((finalidade) =>
        evento(dados, finalidade, "reconsentimento_solicitado"),
      ),
    );
  if (error) throw new Error("Não foi possível registrar o pedido de reconsentimento.");
}
