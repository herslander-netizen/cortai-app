import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, MessageCircle } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { PreferenciasDeAvisos } from "@/components/notificacoes/PreferenciasDeAvisos";
import {
  GrupoDeLinhas,
  LinhaDeConfiguracao,
  SecaoDeConfiguracao,
} from "@/components/ui/formulario/LinhasDeConfiguracao";
import { textosDoWhatsapp } from "@/lib/avisos-do-menu";
import { statusDoWhatsappAutomatico } from "@/lib/whatsapp-limite.functions";

export const Route = createFileRoute("/barbeiro/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Flow" },
      {
        name: "description",
        content: "Onde você recebe cada aviso e o uso das mensagens do WhatsApp.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificacoesPage,
});

/**
 * Notificações, no desenho do Figaro (`NotificationSettingsScreen`): saldo de mensagens do WhatsApp, lista de
 * avisos em grupo (cada linha abre a folha com os canais) e atalho para as mensagens que o negócio manda ao cliente.
 */
function NotificacoesPage() {
  const consultar = useServerFn(statusDoWhatsappAutomatico);
  const { data: cota } = useQuery({
    queryKey: ["whatsapp-limite", "pagina"],
    queryFn: () => consultar(),
    staleTime: 60_000,
  });
  const cotaEmUso =
    cota && cota.faixa !== "livre"
      ? textosDoWhatsapp(cota.faixa, cota.enviados, cota.limite)
      : null;

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Notificações"
      subtitle="Escolha onde receber cada aviso e acompanhe as mensagens do WhatsApp."
    >
      <div className="space-y-4 pb-8 pt-2">
        {cotaEmUso ? (
          <SecaoDeConfiguracao
            titulo="Mensagens do WhatsApp"
            rodape="Cada mensagem automática usa 1 crédito no período de teste."
            className="mt-0 mb-4"
          >
            <GrupoDeLinhas>
              <LinhaDeConfiguracao
                icone={MessageCircle}
                titulo={cotaEmUso.titulo}
                suporte={cotaEmUso.corpo}
              />
            </GrupoDeLinhas>
          </SecaoDeConfiguracao>
        ) : null}
        <PreferenciasDeAvisos />
        <SecaoDeConfiguracao titulo="Mensagens para clientes">
          <GrupoDeLinhas>
            <LinhaDeConfiguracao
              para="/barbeiro/automacao"
              icone={Bot}
              titulo="Automação do WhatsApp"
              suporte="Lembretes, confirmações e a IA no WhatsApp"
            />
          </GrupoDeLinhas>
        </SecaoDeConfiguracao>
      </div>
    </Screen>
  );
}
