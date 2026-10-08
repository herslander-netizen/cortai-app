import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  calcularContaVerificada,
  mascararTelefone,
  type PapelDaConta,
} from "@/lib/seguranca-conta";

/**
 * Estado de verificação da conta autenticada. Fontes de verdade:
 * e-mail = auth.users.email_confirmed_at; WhatsApp = telefones_da_equipe.verificado_em
 * (via statusDaVerificacao). Nada vem do navegador; nenhum dado sensível sai daqui.
 */
export const statusDaConta = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = (getRequest()?.headers.get("authorization") ?? "").replace("Bearer ", "");
    const { data: usuario } = await context.supabase.auth.getUser(token);
    const emailVerificado = Boolean(usuario?.user?.email_confirmed_at);

    // Vínculo ativo real do usuário autenticado (nunca tenant/papel vindo da tela).
    const { data: vinculos } = await context.supabase
      .from("tenant_usuarios")
      .select("papel")
      .eq("user_id", context.userId)
      .eq("ativo", true);
    const lista = (vinculos ?? []) as { papel: string }[];
    const papel: PapelDaConta = lista.some((v) => v.papel === "dono")
      ? "dono"
      : lista.length
        ? "profissional"
        : "cliente";

    let whatsappVerificado = false;
    let telefoneMascarado: string | null = null;
    if (papel !== "cliente") {
      const { statusDaVerificacao } = await import("@/lib/whatsapp/identidade.server");
      const status = await statusDaVerificacao(context.userId);
      whatsappVerificado = Boolean(status.verificadoEm);
      telefoneMascarado = mascararTelefone(status.telefone);
    }

    return {
      papel,
      emailVerificado,
      whatsappVerificado,
      telefoneMascarado,
      contaVerificada: calcularContaVerificada({ papel, emailVerificado, whatsappVerificado }),
    };
  });
