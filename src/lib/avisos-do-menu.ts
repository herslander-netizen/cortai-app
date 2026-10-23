import { LIMITE_WHATSAPP_NO_TESTE, faixaDoLimite, type FaixaDoLimite } from "@/lib/teste-gratis";

/**
 * Avisos de configuração do menu lateral, na regra do Figaro (`buildAgendaDrawerEntrySpecs`, spec 2 §1.7):
 * e-mail pendente, notificações do aparelho e alerta de WhatsApp. O de WhatsApp **não** aparece quando
 * o de e-mail e o de notificações já estão na tela juntos.
 */
export function avisosDoMenu(entrada: {
  emailPendente: boolean;
  avisosDoAparelhoVisivel: boolean;
  faixaDoWhatsapp: FaixaDoLimite;
  whatsappDispensado: boolean;
}) {
  const email = entrada.emailPendente;
  const whatsapp =
    entrada.faixaDoWhatsapp !== "livre" &&
    !entrada.whatsappDispensado &&
    !(email && entrada.avisosDoAparelhoVisivel);
  return { email, whatsapp };
}

/** "dd/MM" do primeiro dia do mês seguinte: quando a cota mensal do teste volta a zero. */
export function renovacaoDaCota(agora = new Date()): string {
  const proximo = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1));
  return `01/${String(proximo.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function textosDoWhatsapp(
  faixa: Exclude<FaixaDoLimite, "livre">,
  enviados: number,
  limite = LIMITE_WHATSAPP_NO_TESTE,
  renova = renovacaoDaCota(),
) {
  if (faixa === "pausado")
    return {
      titulo: "Mensagens do WhatsApp pausadas",
      corpo: `Voltam em ${renova} · o app segue funcionando`,
    };
  const restantes = Math.max(0, limite - enviados);
  return {
    titulo: "Mensagens do WhatsApp acabando",
    corpo: `${restantes} de ${limite} restantes neste mês · renova em ${renova}`,
  };
}

export { faixaDoLimite };
