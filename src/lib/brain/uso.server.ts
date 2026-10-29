/**
 * Controle de uso e créditos da IA do Flow.
 *
 * - Cada turno do cérebro fica em `acoes_de_ia_log` (acao `cerebro.<canal>`),
 *   o que serve de auditoria e de contador — sem tabela nova.
 * - Limites por negócio/dia e por pessoa/hora protegem custo e abuso.
 * - 402/403 do gateway pausam a IA do negócio (persistido); WhatsApp e site
 *   voltam às regras fixas e o painel mostra o aviso, sem travar a operação.
 */
import type { Canal } from "./acoes.server";
import { bloqueioDaConfig } from "./estado-cortai";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const LIMITE_POR_PESSOA_HORA: Record<Canal, number> = { painel: 120, whatsapp: 20, site: 15 };
const LIMITE_EQUIPE = { dia: 200, hora: 60 };

function chaveDoUso(canal: Canal, equipe: boolean) {
  return equipe ? `cerebro.${canal}.equipe` : `cerebro.${canal}`;
}

export const LIMITE_DIARIO_PADRAO: Record<Canal, number> = {
  painel: 1000,
  whatsapp: 400,
  site: 300,
};

/** Provedor registrado na pausa; pausas antigas, sem registro, ficam como "legado". */
export function pausaDoProvedor(motivo: string | null | undefined): string {
  const marca = (motivo ?? "").split("@")[1]?.trim();
  return marca || "legado";
}

export type Bloqueio = "desligada" | "pausada" | "limite_diario" | "limite_pessoa" | null;

export async function bloqueioDeUso(
  tenantId: string,
  canal: Canal,
  ator: string,
  /** Equipe no WhatsApp tem cota própria: não consome a do atendimento ao cliente. */
  equipe = false,
): Promise<Bloqueio> {
  try {
    const db = await admin();
    // `*` mantém a leitura válida antes e depois da coluna `cortai_ativa` existir no banco.
    const { data: cfg } = await db
      .from("config_atendimento_ia")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const daConfig = bloqueioDaConfig(cfg);
    if (daConfig === "desligada") return daConfig;
    if (daConfig === "pausada") {
      // A pausa por falta de crédito é do PROVEDOR que recusou ("gateway_402@<provedor>"). Se o
      // provedor do canal mudou (ex.: passou para um gratuito), a pausa antiga não vale.
      const { identidadeDoModelo } = await import("./gateway.server");
      const pausadoPor = pausaDoProvedor(cfg?.ia_pausa_motivo);
      if (pausadoPor === identidadeDoModelo(canal).provedor) return "pausada";
    }

    const umDia = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const umaHora = new Date(Date.now() - 60 * 60_000).toISOString();
    const chave = chaveDoUso(canal, equipe);
    const limiteDia = equipe
      ? LIMITE_EQUIPE.dia
      : canal === "whatsapp"
        ? (cfg?.ia_limite_diario_whatsapp ?? LIMITE_DIARIO_PADRAO.whatsapp)
        : LIMITE_DIARIO_PADRAO[canal];
    const [{ count: dia }, { count: hora }] = await Promise.all([
      db
        .from("acoes_de_ia_log")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("acao", chave)
        .gte("criado_em", umDia),
      db
        .from("acoes_de_ia_log")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("acao", chave)
        .eq("intencao", ator.slice(0, 120))
        .gte("criado_em", umaHora),
    ]);
    if ((dia ?? 0) >= limiteDia) return "limite_diario";
    if ((hora ?? 0) >= (equipe ? LIMITE_EQUIPE.hora : LIMITE_POR_PESSOA_HORA[canal]))
      return "limite_pessoa";
    return null;
  } catch {
    // Falha de leitura nunca libera custo sem controle no canal automático.
    return canal === "painel" ? null : "limite_diario";
  }
}

/** Registra o turno (auditoria + contador). `intencao` guarda o ator para o limite por pessoa. */
export async function registrarTurno(entrada: {
  tenantId: string;
  canal: Canal;
  ator: string;
  conversaId?: string | null;
  acoes: { nome: string; sucesso: boolean; erro?: string | null }[];
  sucesso: boolean;
  erro?: string | null;
  equipe?: boolean;
}) {
  try {
    const db = await admin();
    await db.from("acoes_de_ia_log").insert({
      tenant_id: entrada.tenantId,
      conversa_id: entrada.canal === "whatsapp" ? (entrada.conversaId ?? null) : null,
      acao: chaveDoUso(entrada.canal, entrada.equipe === true),
      intencao: entrada.ator.slice(0, 120),
      entrada: { acoes: entrada.acoes } as never,
      sucesso: entrada.sucesso,
      erro: entrada.erro ?? null,
    });
  } catch {
    /* auditoria nunca derruba a conversa */
  }
}

/** Registra uma ação executada (escrita/leitura) para auditoria. */
export async function registrarAcao(entrada: {
  tenantId: string;
  canal: Canal;
  conversaId?: string | null;
  acao: string;
  dados: unknown;
  resultado: unknown;
  sucesso: boolean;
  erro?: string | null;
  equipe?: boolean;
}) {
  try {
    const db = await admin();
    await db.from("acoes_de_ia_log").insert({
      tenant_id: entrada.tenantId,
      conversa_id: entrada.canal === "whatsapp" ? (entrada.conversaId ?? null) : null,
      acao: `cerebro_acao.${entrada.acao}`,
      intencao: entrada.canal,
      entrada: (entrada.dados ?? {}) as never,
      resultado: (entrada.resultado ?? null) as never,
      sucesso: entrada.sucesso,
      erro: entrada.erro ?? null,
    });
  } catch {
    /* idem */
  }
}

export async function pausarIa(tenantId: string, motivo: string) {
  try {
    const db = await admin();
    await db
      .from("config_atendimento_ia")
      .upsert(
        { tenant_id: tenantId, ia_pausada_em: new Date().toISOString(), ia_pausa_motivo: motivo },
        { onConflict: "tenant_id" },
      );
  } catch {
    /* sem pausa persistida, o limite diário ainda protege */
  }
}

/** Uma resposta bem-sucedida encerra a pausa anterior. */
export async function retomarIa(tenantId: string) {
  try {
    const db = await admin();
    await db
      .from("config_atendimento_ia")
      .update({ ia_pausada_em: null, ia_pausa_motivo: null })
      .eq("tenant_id", tenantId)
      .not("ia_pausada_em", "is", null);
  } catch {
    /* ok */
  }
}
