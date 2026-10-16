import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

export const TIPOS_DE_PROJETO = [
  { valor: "aplicativo", rotulo: "Aplicativo personalizado" },
  { valor: "sistema_web", rotulo: "Sistema web" },
  { valor: "site", rotulo: "Site" },
  { valor: "agendamento", rotulo: "Agendamento" },
  { valor: "integracao", rotulo: "Integração/automação" },
  { valor: "outro", rotulo: "Outro" },
] as const;

const esquema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  empresa: z.string().trim().max(160).optional(),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido.").max(30),
  email: z.string().trim().email("E-mail inválido.").max(255).optional().or(z.literal("")),
  tipo: z.enum(["aplicativo", "sistema_web", "site", "agendamento", "integracao", "outro"]),
  mensagem: z.string().trim().min(5, "Conte em poucas linhas o que você precisa.").max(2000),
});

export type PedidoDeProjeto = z.infer<typeof esquema>;

/** Limites por minuto do formulário público: por IP e por WhatsApp. */
const LIMITE_POR_IP = 3;
const LIMITE_POR_WHATSAPP = 2;

/**
 * Recebe pedidos comerciais da Alvo Digital. Público por natureza: só grava, nunca lê.
 * Grava pelo servidor, depois do limite de tentativas: o visitante não insere direto no banco.
 */
export const enviarPedidoDeProjeto = createServerFn({ method: "POST" })
  .validator((input: PedidoDeProjeto) => esquema.parse(input))
  .handler(async ({ data }) => {
    const { ipDaChamada, consumirLimite, BALDE_SEM_IP } =
      await import("@/lib/webhook-guard.server");
    let ip: string | null = null;
    try {
      ip = ipDaChamada(getRequest());
    } catch {
      ip = null;
    }
    const whatsapp = data.whatsapp.replace(/\D/g, "");
    // Sem IP identificável: balde próprio e mais folgado, para não travar ninguém.
    const okIp = await consumirLimite(
      `pub:pedido_projeto|ip:${ip ?? BALDE_SEM_IP}`,
      ip ? LIMITE_POR_IP : LIMITE_POR_IP * 10,
    );
    const okWhatsapp = await consumirLimite(
      `pub:pedido_projeto|tel:${whatsapp}`,
      LIMITE_POR_WHATSAPP,
    );
    if (!okIp || !okWhatsapp)
      throw new Error("Muitos envios em pouco tempo. Aguarde um minuto e tente de novo.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("pedidos_de_projeto").insert({
      nome: data.nome,
      empresa: data.empresa || null,
      whatsapp: data.whatsapp,
      email: data.email || null,
      tipo: data.tipo,
      mensagem: data.mensagem,
    });
    if (error)
      throw new Error("Não foi possível enviar seu pedido agora. Tente novamente em instantes.");
    return { ok: true as const };
  });

/**
 * Contato público da plataforma (WhatsApp e redes da Alvo Digital).
 * Lido no servidor para que visitantes não precisem de acesso direto ao banco.
 */
export const getContatoDaPlataforma = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ whatsapp: string | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("contato_da_plataforma");
    if (error) return { whatsapp: null };
    const linha = Array.isArray(data) ? data[0] : null;
    const digitos = String(linha?.whatsapp_alvo ?? "").replace(/\D/g, "");
    return { whatsapp: digitos.length >= 10 ? `https://wa.me/${digitos}` : null };
  },
);
