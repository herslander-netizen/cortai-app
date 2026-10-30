import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, MessageCircle } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { AvisosParaClientes } from "@/components/notificacoes/AvisosParaClientes";
import { PreferenciasDeAvisos } from "@/components/notificacoes/PreferenciasDeAvisos";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
import {
  GrupoDeLinhas,
  LinhaDeConfiguracao,
  SecaoDeConfiguracao,
} from "@/components/ui/formulario/LinhasDeConfiguracao";
import { textosDoWhatsapp } from "@/lib/avisos-do-menu";
import { getAvisosDosClientes } from "@/lib/avisos-clientes.functions";
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
 * Notificações, no desenho do Figaro (`NotificationSettingsScreen`): abas "Para clientes" e "Para a equipe"
 * (`NotificationAudience`). Clientes: saldo de mensagens do WhatsApp, os quatro eventos do agendamento (cada linha
 * abre a folha com o canal e, no lembrete, a antecedência) e o atalho da automação. Equipe: onde cada pessoa recebe
 * os avisos do negócio.
 */
function NotificacoesPage() {
  const consultar = useServerFn(statusDoWhatsappAutomatico);
  const { data: cota } = useQuery({
    queryKey: ["whatsapp-limite", "pagina"],
    queryFn: () => consultar(),
    staleTime: 60_000,
  });
  const carregarClientes = useServerFn(getAvisosDosClientes);
  const clientes = useQuery({
    queryKey: ["avisos-dos-clientes"],
    queryFn: () => carregarClientes(),
  });
  const [escolhida, setEscolhida] = useState<"clientes" | "equipe" | null>(null);
  // Quem não configura as automações começa pelos próprios avisos (aba da equipe).
  const aba = escolhida ?? (clientes.data && !clientes.data.podeEditar ? "equipe" : "clientes");
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
        <OpcoesConectadas
          rotulo="Público dos avisos"
          valor={aba}
          opcoes={[
            { valor: "clientes", texto: "Para clientes" },
            { valor: "equipe", texto: "Para a equipe" },
          ]}
          onChange={setEscolhida}
        />
        {aba === "clientes" ? (
          <>
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
            <AvisosParaClientes />
            <SecaoDeConfiguracao titulo="Mensagens para clientes">
              <GrupoDeLinhas>
                <LinhaDeConfiguracao
                  para="/barbeiro/automacao"
                  icone={Bot}
                  titulo="Automação do WhatsApp"
                  suporte="Conexão, a IA no WhatsApp e o histórico de envios"
                />
              </GrupoDeLinhas>
            </SecaoDeConfiguracao>
          </>
        ) : (
          <PreferenciasDeAvisos />
        )}
      </div>
    </Screen>
  );
}
