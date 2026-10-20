import { PrimeirosPassos } from "@/components/onboarding/PrimeirosPassos";
import { termos } from "@/lib/segmentos";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, CreditCard, LogOut, Settings, Store } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { PreferenciasDeAvisos } from "@/components/notificacoes/PreferenciasDeAvisos";
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
      { title: "Mais — Cortaí Gestão" },
      { name: "description", content: "Produtos, serviços, marca e recursos do seu negócio." },
      { property: "og:title", content: "Mais — Cortaí Gestão" },
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
  const sistema = [
    {
      to: "/barbeiro/conta",
      label: barbeiroSeg ? "Conta e barbearia" : `Conta e ${tSeg.nome}`,
      detail: "Dados pessoais e do negócio",
      icon: Settings,
    },
    {
      to: "/barbeiro/plano",
      label: "Minha assinatura",
      detail: "Plano, cobranças e histórico",
      icon: CreditCard,
    },
    {
      to: "/barbeiro/barbearias",
      label: barbeiroSeg ? "Minhas barbearias" : "Meus negócios",
      detail: "Trocar o negócio em uso",
      icon: Store,
    },
  ] as const;
  return (
    <Screen title="Ajustes e ajuda" subtitle={rotuloDoPapel(sessao?.papelNaEquipe)}>
      <div data-guia="mais-lista" className="space-y-8">
        <div className="mt-6">
          <TrocarPainel />
        </div>
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase text-mute2">Sistema</h2>
          <ul className="divide-y divide-line border-y border-line">
            {sistema.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link to={item.to} className="nav-list-item">
                    <span className="nav-list-icon">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-paper">{item.label}</span>
                      <span className="mt-1 block text-xs text-mute">{item.detail}</span>
                    </span>
                    <ChevronRight size={17} className="text-mute2" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <section className="mt-8">
        <h2 className="mb-2 text-xs font-semibold uppercase text-mute2">Ajuda e preferências</h2>
        <div className="border-t border-line">
          <Link
            to="/barbeiro/configurar"
            className="flex w-full items-center gap-3 border-b border-line py-4 text-left"
          >
            <span className="text-sm text-paper">Rever configuração inicial</span>
          </Link>
          <BotaoAssistente variante="linha" />
        </div>
      </section>
      <PrimeirosPassos />
      <PreferenciasDeAvisos />
      <PreferenciasDicas />
      <SobreOCortai />
      <Button
        variant="ghost"
        type="button"
        onClick={() => void sair()}
        className="mt-10 flex min-h-11 w-full items-center justify-center gap-2 border-t border-line pt-6 text-xs text-mute"
      >
        <LogOut size={15} /> Sair da conta
      </Button>
    </Screen>
  );
}
