import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Situação do WhatsApp da pessoa logada (equipe) junto à Flow IA. */
export const meuWhatsappNoCortai = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { statusDaVerificacao } = await import("@/lib/whatsapp/identidade.server");
    return statusDaVerificacao(context.userId);
  });

/** Gera o código que a pessoa envia do próprio WhatsApp para ser reconhecida. */
export const gerarCodigoDoMeuWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: membro } = await context.supabase
      .from("tenant_usuarios")
      .select("tenant_id")
      .eq("user_id", context.userId)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();
    if (!membro) throw new Error("Disponível só para a equipe de um negócio.");
    const { data: perfil } = await context.supabase
      .from("perfis")
      .select("telefone")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { gerarCodigoDeVerificacao } = await import("@/lib/whatsapp/identidade.server");
    const { codigo, telefone } = await gerarCodigoDeVerificacao(context.userId, perfil?.telefone ?? "");
    const { conexaoDeEnvio } = await import("@/lib/whatsapp/conexao-envio.server");
    const conexao = await conexaoDeEnvio(membro.tenant_id);
    let numero: string | null = null;
    if (conexao) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("conexoes_whatsapp")
        .select("numero")
        .eq("id", conexao.id)
        .maybeSingle();
      numero = data?.numero ?? null;
    }
    return { codigo, telefone, numero };
  });

/** Tipos de aviso que já existem no catálogo de preferências (sem eventos novos). */
export const TIPOS_DE_AVISO_DA_EQUIPE = [
  "agendamento_novo",
  "agendamento_cancelado",
  "agendamento_remarcado",
  "cliente_chegou",
  "fila",
  "fiado",
  "pix",
] as const;

export type StatusWhatsappDaEquipe = "nao_configurado" | "aguardando" | "verificado";

export type MembroWhatsapp = {
  userId: string;
  nome: string | null;
  papel: string;
  profissional: string | null;
  telefone: string | null;
  status: StatusWhatsappDaEquipe;
  avisosLigados: number;
};

async function exigirGestor(context: { supabase: any; userId: string }) {
  const { tenantIdDoMembro } = await import("@/lib/tenant");
  const tenantId = await tenantIdDoMembro(context as never);
  const { data: pode } = await context.supabase.rpc("has_tenant_permission", {
    _tenant_id: tenantId,
    _permission: "gerenciar_permissoes",
  });
  if (!pode) throw new Error("Você não tem permissão para gerenciar a equipe.");
  return tenantId;
}

/** Equipe do negócio + estado do WhatsApp de cada pessoa (sem códigos nem chaves). */
export const whatsappDaEquipe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MembroWhatsapp[]> => {
    const tenantId = await exigirGestor(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: membros } = await db
      .from("tenant_usuarios")
      .select("user_id, papel")
      .eq("tenant_id", tenantId)
      .eq("ativo", true);
    const ids = (membros ?? []).map((m) => m.user_id);
    if (!ids.length) return [];
    const [perfis, tels, profs, prefs] = await Promise.all([
      db.from("perfis").select("user_id, nome, telefone").in("user_id", ids),
      db.from("telefones_da_equipe").select("user_id, telefone, verificado_em").in("user_id", ids),
      db.from("profissionais").select("user_id, nome").eq("tenant_id", tenantId).eq("ativo", true).in("user_id", ids),
      db
        .from("notificacoes_preferencias")
        .select("user_id, no_whatsapp")
        .eq("tenant_id", tenantId)
        .eq("no_whatsapp", true)
        .in("user_id", ids),
    ]);
    return (membros ?? []).map((m) => {
      const perfil = perfis.data?.find((p) => p.user_id === m.user_id);
      const tel = tels.data?.find((t) => t.user_id === m.user_id);
      const prof = profs.data?.find((p) => p.user_id === m.user_id);
      const status: StatusWhatsappDaEquipe = tel?.verificado_em
        ? "verificado"
        : tel
          ? "aguardando"
          : "nao_configurado";
      return {
        userId: m.user_id,
        nome: perfil?.nome ?? prof?.nome ?? null,
        papel: m.papel,
        profissional: prof?.nome ?? null,
        telefone: tel?.telefone ?? perfil?.telefone ?? null,
        status,
        avisosLigados: (prefs.data ?? []).filter((p) => p.user_id === m.user_id).length,
      };
    });
  });

/**
 * Liga/desliga o canal WhatsApp das preferências de aviso já existentes de um
 * membro. Não toca na verificação do telefone: sem número verificado o envio
 * continua bloqueado pelo fluxo atual.
 */
export const definirWhatsappDoMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const d = input as { userId?: unknown; ligado?: unknown };
    if (typeof d?.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(d.userId) || typeof d.ligado !== "boolean")
      throw new Error("Dados inválidos.");
    return { userId: d.userId, ligado: d.ligado };
  })
  .handler(async ({ data, context }) => {
    const tenantId = await exigirGestor(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: membro } = await db
      .from("tenant_usuarios")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", data.userId)
      .eq("ativo", true)
      .maybeSingle();
    if (!membro) throw new Error("Essa pessoa não faz parte da equipe.");
    const { data: atuais } = await db
      .from("notificacoes_preferencias")
      .select("tipo, no_app, no_push")
      .eq("tenant_id", tenantId)
      .eq("user_id", data.userId);
    const linhas = TIPOS_DE_AVISO_DA_EQUIPE.map((tipo) => {
      const a = atuais?.find((x) => x.tipo === tipo);
      return {
        tenant_id: tenantId,
        user_id: data.userId,
        tipo,
        no_app: a?.no_app ?? true,
        no_push: a?.no_push ?? true,
        no_whatsapp: data.ligado,
        atualizado_em: new Date().toISOString(),
      };
    });
    const { error } = await db
      .from("notificacoes_preferencias")
      .upsert(linhas, { onConflict: "tenant_id,user_id,tipo" });
    if (error) throw new Error("Não foi possível salvar agora.");
    await context.supabase.rpc("registrar_auditoria_barbearia", {
      _tenant_id: tenantId,
      _acao: data.ligado ? "equipe.whatsapp_ligado" : "equipe.whatsapp_desligado",
      _alvo: data.userId,
      _detalhes: {},
    });
    return { ok: true };
  });
