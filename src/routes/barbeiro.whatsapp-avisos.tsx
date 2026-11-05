import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle } from "lucide-react";

import { EsqueletoPainel } from "@/components/layout/Esqueleto";
import { RouteError, mensagemDeAcessoNegado } from "@/components/layout/RouteError";
import { Screen } from "@/components/layout/Screen";
import { AvisosParaClientes } from "@/components/notificacoes/AvisosParaClientes";
import { Aviso } from "@/components/ui/aviso";
import {
  GrupoDeLinhas,
  LinhaDeConfiguracao,
  SecaoDeConfiguracao,
} from "@/components/ui/formulario/LinhasDeConfiguracao";
import { InterruptorDosAvisos } from "@/components/whatsapp/InterruptorDosAvisos";
import { RetornoETom } from "@/components/whatsapp/RetornoETom";
import { textosDoWhatsapp } from "@/lib/avisos-do-menu";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { getPainelDoCortai, type PainelDoCortai } from "@/lib/whatsapp.functions";
import { statusDoWhatsappAutomatico } from "@/lib/whatsapp-limite.functions";

export const Route = createFileRoute("/barbeiro/whatsapp-avisos")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "secretaria_whatsapp"),
  ssr: false,
  head: () => ({
    meta: [
      { title: "Avisos do WhatsApp · Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: RouteError,
  component: AvisosDoWhatsappPage,
});

/**
 * WhatsApp → Avisos (reorganização do dono, 05/11/2026): o único lugar dos avisos automáticos aos clientes.
 * Interruptor geral, um interruptor por aviso (`AvisosParaClientes`, a fonte que o envio respeita), retorno e tom,
 * e o saldo de mensagens quando há limite. Os avisos da equipe continuam em Ajustes → Notificações.
 */
function AvisosDoWhatsappPage() {
  const painel = useQuery({
    queryKey: ["cortai-painel"],
    queryFn: () => getPainelDoCortai() as Promise<PainelDoCortai>,
  });
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
      title="WhatsApp"
      subtitle="Avisos automáticos para os clientes."
    >
      {painel.isLoading ? <EsqueletoPainel /> : null}
      {painel.isError ? (
        <Aviso tom="acao">
          {mensagemDeAcessoNegado(painel.error)
            ? "Você não tem acesso a esta área"
            : "Não conseguimos carregar os avisos agora. Tente de novo em instantes."}
        </Aviso>
      ) : null}
      {painel.data ? (
        <div className="space-y-4 pb-8">
          <InterruptorDosAvisos painel={painel.data} />
          {cotaEmUso ? (
            <SecaoDeConfiguracao
              titulo="Mensagens do WhatsApp"
              rodape="Cada mensagem automática usa 1 crédito no período de teste."
              className="mt-0"
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
          <RetornoETom painel={painel.data} />
        </div>
      ) : null}
    </Screen>
  );
}
