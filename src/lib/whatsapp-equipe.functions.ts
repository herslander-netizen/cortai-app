import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Situação do WhatsApp da pessoa logada (equipe) junto ao CortAI. */
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
