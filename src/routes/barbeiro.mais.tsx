import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ListOrdered, Package, Palette, Scissors, Sparkles, Star, TrendingUp, UserSquare2 } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";

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

const itens = [
  { to: "/barbeiro/crescimento", label: "Crescimento", detail: "Novos clientes, retorno e indicações", icon: TrendingUp },
  { to: "/barbeiro/indicacoes", label: "Indicações", detail: "Cliente que traz cliente", icon: Sparkles },
  { to: "/barbeiro/avaliacoes", label: "Avaliações", detail: "Notas e convite público", icon: Star },
  { to: "/barbeiro/produtos", label: "Produtos e estoque", detail: "Catálogo, vendas e alertas", icon: Package },
  { to: "/barbeiro/servicos", label: "Serviços", detail: "Preços e duração", icon: Scissors },
  { to: "/barbeiro/fila", label: "Lista de espera", detail: "Ocupe horários vagos", icon: ListOrdered },
  { to: "/barbeiro/fidelidade", label: "Fidelidade", detail: "Progresso e clientes elegíveis", icon: Star },
  { to: "/barbeiro/profissionais", label: "Profissionais", detail: "Descrição e portfólio", icon: UserSquare2 },
  { to: "/barbeiro/marca", label: "Página e marca", detail: "Personalize e compartilhe", icon: Palette },
] as const;

function MaisPage() {
  return <Screen title="Cortaí Gestão" subtitle="Tudo da sua barbearia em um só lugar."><ul data-guia="mais-lista">{itens.map((item) => { const Icon = item.icon; return <li key={item.to} className="border-b border-line"><Link to={item.to} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink2 text-gold"><Icon size={18} /></span><span className="min-w-0"><span className="block text-sm font-semibold text-paper">{item.label}</span><span className="mt-1 block text-xs text-mute">{item.detail}</span></span><ChevronRight size={17} className="text-mute2" /></Link></li>; })}</ul><PreferenciasDicas /></Screen>;
}