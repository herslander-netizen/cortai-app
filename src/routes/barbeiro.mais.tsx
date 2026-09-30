import { termos } from "@/lib/segmentos";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ListOrdered, LogOut, Settings } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { PreferenciasDeAvisos } from "@/components/notificacoes/PreferenciasDeAvisos";
import { BotaoAssistente } from "@/components/ia/BotaoAssistente";
import { SobreOCortai } from "@/components/sistema/SobreOCortai";

import { sair } from "@/lib/guarda";
import { getSessao } from "@/lib/sessao.functions";
import { GRUPOS_DE_NAVEGACAO, modulosDeNavegacao } from "@/lib/navegacao-barbeiro";
import { rotuloDoPapel } from "@/lib/navigation";
import { getCapacidades } from "@/lib/capacidades.functions";
import { CAPACIDADES } from "@/lib/capacidades";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/barbeiro/mais")({
  head: () => ({ meta: [
    { title: "Mais — Cortaí Gestão" },
    { name: "description", content: "Produtos, serviços, marca e recursos do seu negócio." },
    { property: "og:title", content: "Mais — Cortaí Gestão" },
    { property: "og:description", content: "Configurações e recursos do negócio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: MaisPage,
});

function MaisPage() {
  const { data: sessao } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao(), staleTime: 300000 });
  const { data: capacidades } = useQuery({
    queryKey: ["capacidades"],
    queryFn: () => getCapacidades(),
    staleTime: 300000,
  });
  // Um módulo some do menu quando o plano do negócio não inclui a capacidade dele.
  const rotaBloqueada = (rota: string) => {
    const cap = CAPACIDADES.find((c) => c.rota === rota);
    if (!cap || !cap.recurso || !capacidades) return false;
    return capacidades.liberados[cap.recurso] === false;
  };
  const visiveis = modulosDeNavegacao(sessao?.segmento ?? "outro").filter(
    (item) => sessao?.permissoes.includes(item.permissao) && !rotaBloqueada(item.to),
  );
  const tSeg = termos(sessao?.segmento ?? "outro");
  const barbeiroSeg = sessao?.segmento === "barbearia";
  return <Screen title="Mais" subtitle={rotuloDoPapel(sessao?.papelNaEquipe)}><div data-guia="mais-lista" className="space-y-8">{GRUPOS_DE_NAVEGACAO.map((titulo) => { const itens = visiveis.filter((item) => item.grupo === titulo); if (!itens.length) return null; return <section key={titulo}><h2 className="mb-2 text-xs font-semibold uppercase text-mute2">{titulo}</h2><ul className="divide-y divide-line border-y border-line">{itens.map((item) => { const Icon = item.icon; return <li key={item.to}><Link to={item.to} className="nav-list-item"><span className="nav-list-icon"><Icon size={18} /></span><span className="min-w-0"><span className="block text-sm font-semibold text-paper">{item.label === "Profissionais" ? "Equipe" : item.label}</span><span className="mt-1 block text-xs text-mute">{item.detail}</span></span><ChevronRight size={17} className="text-mute2" /></Link></li>; })}</ul></section>; })}<section><h2 className="mb-2 text-xs font-semibold uppercase text-mute2">Conta</h2><Link to="/barbeiro/conta" className="nav-list-item border-y border-line"><span className="nav-list-icon"><Settings size={18}/></span><span className="min-w-0"><span className="block text-sm font-semibold text-paper">{barbeiroSeg ? "Conta e barbearia" : `Conta e ${tSeg.nome}`}</span><span className="mt-1 block text-xs text-mute">Dados pessoais, senha e página pública</span></span><ChevronRight size={17} className="text-mute2" /></Link></section></div><div className="mt-8 border-y border-line py-4"><p className="text-xs font-semibold text-paper">Fila de espera</p><p className="mt-1 text-xs text-mute">Fica junto da operação da Agenda.</p><Link to="/barbeiro/fila" className="mt-3 inline-flex items-center gap-2 text-xs text-gold"><ListOrdered size={14} /> Abrir fila</Link></div><section className="mt-8"><h2 className="mb-2 text-xs font-semibold uppercase text-mute2">Ajuda</h2><div className="border-t border-line"><Link to="/barbeiro/configurar" className="flex w-full items-center gap-3 border-b border-line py-4 text-left"><span className="text-sm text-paper">{barbeiroSeg ? "Configuração da barbearia" : `Configuração ${tSeg.de}`}</span></Link><Link to="/barbeiro/plano" className="flex w-full items-center gap-3 border-b border-line py-4 text-left"><span className="text-sm text-paper">{barbeiroSeg ? "Plano da barbearia" : `Plano ${tSeg.de}`}</span></Link><Link to="/barbeiro/barbearias" className="flex w-full items-center gap-3 border-b border-line py-4 text-left"><span className="text-sm text-paper">{barbeiroSeg ? "Minhas barbearias" : "Meus negócios"}</span></Link><BotaoAssistente variante="linha" /></div></section><PreferenciasDeAvisos /><PreferenciasDicas /><SobreOCortai /><Button variant="ghost" type="button" onClick={() => void sair()} className="mt-10 flex min-h-11 w-full items-center justify-center gap-2 border-t border-line pt-6 text-xs text-mute"><LogOut size={15} /> Sair da conta</Button></Screen>;
}
