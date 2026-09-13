import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, BarChart3, Bot, ChevronRight, ListOrdered, LogOut, Megaphone, Package, Palette, Scissors, Settings, Sparkles, Star, Store, UserRound, UserSquare2, UsersRound } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { sair } from "@/lib/guarda";

export const Route = createFileRoute("/barbeiro/mais")({
  head: () => ({ meta: [
    { title: "Mais — Cortaí Gestão" },
    { name: "description", content: "Produtos, serviços, marca e recursos da sua barbearia." },
    { property: "og:title", content: "Mais — Cortaí Gestão" },
    { property: "og:description", content: "Configurações e recursos da barbearia." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MaisPage,
});

const grupos = [
  { titulo: "Operação", itens: [
    { to: "/barbeiro/caixa", label: "Caixa", detail: "Entradas e valores em aberto", icon: Banknote },
    { to: "/barbeiro/produtos", label: "Loja e estoque", detail: "Produtos, vendas e alertas", icon: Store },
    { to: "/barbeiro/profissionais", label: "Profissionais", detail: "Perfis e portfólios", icon: UserSquare2 },
    { to: "/barbeiro/servicos", label: "Serviços", detail: "Preços e duração", icon: Scissors },
  ] },
  { titulo: "Gestão", itens: [
    { to: "/barbeiro/financeiro", label: "Relatórios", detail: "Faturamento e movimentações", icon: BarChart3 },
    { to: "/barbeiro/crescimento", label: "Crescimento", detail: "Ocupação, recorrência e números", icon: Sparkles },
    { to: "/barbeiro/indicacoes", label: "Marketing", detail: "Indicações e novos clientes", icon: Megaphone },
    { to: "/barbeiro/avaliacoes", label: "Avaliações", detail: "Notas e convite público", icon: Star },
    { to: "/barbeiro/fidelidade", label: "Voltaí", detail: "Seu cliente corta. Ganha. Volta.", icon: Star },
  ] },
  { titulo: "Configurações", itens: [
    { to: "/barbeiro/equipe", label: "Equipe e permissões", detail: "Quem entra e o que pode fazer", icon: UsersRound },
    { to: "/barbeiro/conta", label: "Conta e barbearia", detail: "Dados, senha e configurações", icon: Settings },
    { to: "/barbeiro/marca", label: "Página e marca", detail: "Identidade e página pública", icon: Palette },
    { to: "/barbeiro/integracoes", label: "Integrações", detail: "Atendimento inteligente da ALVO", icon: Bot },
  ] },
] as const;

function MaisPage() {
  return <Screen title="Mais" subtitle="Gestão completa, sem lotar sua navegação."><div data-guia="mais-lista" className="space-y-8">{grupos.map((grupo) => <section key={grupo.titulo}><h2 className="mb-2 text-xs font-semibold uppercase text-mute2">{grupo.titulo}</h2><ul>{grupo.itens.map((item) => { const Icon = item.icon; return <li key={item.to} className="border-b border-line"><Link to={item.to} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink2 text-gold"><Icon size={18} /></span><span className="min-w-0"><span className="block text-sm font-semibold text-paper">{item.label}</span><span className="mt-1 block text-xs text-mute">{item.detail}</span></span><ChevronRight size={17} className="text-mute2" /></Link></li>; })}</ul></section>)}</div><div className="mt-8 rounded-lg border border-line bg-ink2 p-4"><p className="text-xs font-semibold text-paper">Agenda completa</p><p className="mt-1 text-xs text-mute">Fila, profissionais e bloqueios ficam juntos na Agenda.</p><Link to="/barbeiro/fila" className="mt-3 inline-flex items-center gap-2 text-xs text-gold"><ListOrdered size={14} /> Abrir fila</Link></div><PreferenciasDicas /><button type="button" onClick={() => void sair()} className="mt-10 flex w-full items-center justify-center gap-2 border-t border-line pt-6 text-xs text-mute"><LogOut size={15} /> Sair da conta</button></Screen>;
}