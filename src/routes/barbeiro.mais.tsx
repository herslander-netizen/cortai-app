import { PrimeirosPassos } from "@/components/onboarding/PrimeirosPassos";
import { termos } from "@/lib/segmentos";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarCog,
  Clock,
  CreditCard,
  Globe,
  ListChecks,
  LogOut,
  Settings,
  Store,
} from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import {
  GrupoDeLinhas,
  LinhaDeConfiguracao,
  SecaoDeConfiguracao,
} from "@/components/ui/formulario/LinhasDeConfiguracao";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { BotaoAssistente } from "@/components/ia/BotaoAssistente";
import { SobreOCortai } from "@/components/sistema/SobreOCortai";

import { sair } from "@/lib/guarda";
import { getSessao } from "@/lib/sessao.functions";
import { rotuloDoPapel } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { TrocarPainel } from "@/components/acesso/TrocarPainel";

export const Route = createFileRoute("/barbeiro/mais")({
  head: () => ({
    meta: [
      { title: "Mais — Flow" },
      { name: "description", content: "Produtos, serviços, marca e recursos do seu negócio." },
      { property: "og:title", content: "Mais — Flow" },
      { property: "og:description", content: "Configurações e recursos do negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MaisPage,
});

function MaisPage() {
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300000,
  });
  const tSeg = termos(sessao?.segmento ?? "outro");
  const barbeiroSeg = sessao?.segmento === "barbearia";
  return (
    <Screen title="Ajustes e ajuda" subtitle={rotuloDoPapel(sessao?.papelNaEquipe)}>
      <div data-guia="mais-lista">
        <div className="mt-4">
          <TrocarPainel />
        </div>
        {/* Mesmos grupos das opções do Figaro: o negócio, o agendamento e a conta, cada um num grupo de linhas. */}
        <SecaoDeConfiguracao titulo={`Seu ${tSeg.nome}`}>
          <GrupoDeLinhas>
            <LinhaDeConfiguracao
              para="/barbeiro/negocio"
              icone={Store}
              titulo="Informações básicas"
              suporte="Nome, logo e contato"
            />
            <LinhaDeConfiguracao
              para="/barbeiro/agendamento"
              icone={CalendarCog}
              titulo="Opções de agendamento"
              suporte="Horários oferecidos, antecedência e cancelamento"
            />
            <LinhaDeConfiguracao
              para="/barbeiro/notificacoes"
              icone={Bell}
              titulo="Notificações"
              suporte="Onde receber cada aviso"
            />
            <LinhaDeConfiguracao
              para="/barbeiro/horarios"
              icone={Clock}
              titulo="Horários de funcionamento"
              suporte="Dias e horários em que você atende"
            />
            <LinhaDeConfiguracao
              para="/barbeiro/marca"
              icone={Globe}
              titulo="Sua Página"
              suporte="Layout, tema e seções da página pública"
            />
          </GrupoDeLinhas>
        </SecaoDeConfiguracao>
        <SecaoDeConfiguracao titulo="Conta">
          <GrupoDeLinhas>
            <LinhaDeConfiguracao
              para="/barbeiro/conta"
              icone={Settings}
              titulo="Opções da conta"
              suporte="Perfil, formas de entrar e segurança"
            />
            <LinhaDeConfiguracao
              para="/barbeiro/plano"
              icone={CreditCard}
              titulo="Minha assinatura"
              suporte="Plano, cobranças e histórico"
            />
            <LinhaDeConfiguracao
              para="/barbeiro/barbearias"
              icone={Store}
              titulo={barbeiroSeg ? "Minhas barbearias" : "Meus negócios"}
              suporte="Trocar o negócio em uso"
            />
          </GrupoDeLinhas>
        </SecaoDeConfiguracao>
      </div>
      <SecaoDeConfiguracao titulo="Ajuda e preferências">
        <GrupoDeLinhas>
          <LinhaDeConfiguracao
            para="/barbeiro/configurar"
            icone={ListChecks}
            titulo="Rever configuração inicial"
          />
          <BotaoAssistente variante="grupo" />
        </GrupoDeLinhas>
      </SecaoDeConfiguracao>
      <PrimeirosPassos />
      <PreferenciasDicas />
      <SobreOCortai />
      <Button
        variant="ghost"
        type="button"
        onClick={() => void sair()}
        className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] text-sm text-mute"
      >
        <LogOut size={15} /> Sair da conta
      </Button>
    </Screen>
  );
}
