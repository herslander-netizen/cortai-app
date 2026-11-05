import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { AvisosDaPlataforma } from "@/components/notificacoes/AvisosDaPlataforma";
import { PreferenciasDeAvisos } from "@/components/notificacoes/PreferenciasDeAvisos";
import {
  GrupoDeLinhas,
  LinhaDeConfiguracao,
  SecaoDeConfiguracao,
} from "@/components/ui/formulario/LinhasDeConfiguracao";

export const Route = createFileRoute("/barbeiro/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Flow" },
      {
        name: "description",
        content: "Onde cada pessoa da equipe recebe os avisos do negócio.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificacoesPage,
});

/**
 * Notificações da EQUIPE: onde cada pessoa recebe os avisos do negócio. Os avisos para clientes saíram daqui para
 * WhatsApp → Avisos (reorganização do dono, 05/11/2026), com atalho no fim da tela.
 */
function NotificacoesPage() {
  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Notificações"
      subtitle="Onde cada pessoa da equipe recebe os avisos do negócio."
    >
      <div className="space-y-4 pb-8 pt-2">
        <PreferenciasDeAvisos />
        <AvisosDaPlataforma />
        <SecaoDeConfiguracao titulo="Avisos para clientes">
          <GrupoDeLinhas>
            <LinhaDeConfiguracao
              para="/barbeiro/whatsapp-avisos"
              icone={MessageCircle}
              titulo="Avisos do WhatsApp"
              suporte="Confirmação, lembretes, reagendamento e cancelamento"
            />
          </GrupoDeLinhas>
        </SecaoDeConfiguracao>
      </div>
    </Screen>
  );
}
