import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ListOrdered, LogOut, Settings } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { BotaoAssistente } from "@/components/ia/BotaoAssistente";
import { sair } from "@/lib/guarda";
import { getSessao } from "@/lib/sessao.functions";
import { GRUPOS_DE_NAVEGACAO, MODULOS_DE_NAVEGACAO } from "@/lib/navegacao-barbeiro";
import { rotuloDoPapel } from "@/lib/navigation";

export const Route = createFileRoute("/barbeiro/mais")({
  head: () => ({ meta: [
    { title: "Mais — CortAI Gestão" },
    { name: "description", content: "Produtos, serviços, marca e recursos da sua barbearia." },
    { property: "og:title", content: "Mais — CortAI Gestão" },
    { property: "og:description", content: "Configurações e recursos da barbearia." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MaisPage,
});

function MaisPage() {
  const { data: sessao } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao(), staleTime: 300000 });
  const visiveis = MODULOS_DE_NAVEGACAO.filter((item) => sessao?.permissoes.includes(item.permissao));
  return <Screen title="Mais" subtitle={rotuloDoPapel(sessao?.papelNaEquipe)}><div data-guia="mais-lista" className="space-y-8">{GRUPOS_DE_NAVEGACAO.map((titulo) => { const itens = visiveis.filter((item) => item.grupo === titulo); if (!itens.length) return null; return <section key={titulo}><h2 className="mb-2 text-xs font-semibold uppercase text-mute2">{titulo}</h2><ul className="divide-y divide-line border-y border-line">{itens.map((item) => { const Icon = item.icon; return <li key={item.to}><Link to={item.to} className="nav-list-item"><span className="nav-list-icon"><Icon size={18} /></span><span className="min-w-0"><span className="block text-sm font-semibold text-paper">{item.label}</span><span className="mt-1 block text-xs text-mute">{item.detail}</span></span><ChevronRight size={17} className="text-mute2" /></Link></li>; })}</ul></section>; })}<section><h2 className="mb-2 text-xs font-semibold uppercase text-mute2">Conta</h2><Link to="/barbeiro/conta" className="nav-list-item border-y border-line"><span className="nav-list-icon"><Settings size={18}/></span><span className="min-w-0"><span className="block text-sm font-semibold text-paper">Conta e barbearia</span><span className="mt-1 block text-xs text-mute">Dados pessoais, senha e página pública</span></span><ChevronRight size={17} className="text-mute2" /></Link></section></div><div className="mt-8 rounded-lg border border-line bg-ink2 p-4"><p className="text-xs font-semibold text-paper">Fila de espera</p><p className="mt-1 text-xs text-mute">Fica junto da operação da Agenda.</p><Link to="/barbeiro/fila" className="mt-3 inline-flex items-center gap-2 text-xs text-gold"><ListOrdered size={14} /> Abrir fila</Link></div><section className="mt-8"><h2 className="mb-2 text-xs font-semibold uppercase text-mute2">Ajuda</h2><div className="border-t border-line"><Link to="/barbeiro/configurar" className="flex w-full items-center gap-3 border-b border-line py-4 text-left"><span className="text-sm text-paper">Primeiros passos</span></Link><BotaoAssistente variante="linha" /></div></section><PreferenciasDicas /><button type="button" onClick={() => void sair()} className="mt-10 flex min-h-11 w-full items-center justify-center gap-2 border-t border-line pt-6 text-xs text-mute"><LogOut size={15} /> Sair da conta</button></Screen>;
}