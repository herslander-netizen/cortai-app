import { createFileRoute, Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, ListOrdered, LogOut, Package, Palette, Scissors, ShieldCheck, SlidersHorizontal, Sparkles, Star, TrendingUp, UserRound, UserSquare2, Users, WalletCards } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { useContextoBarbearia } from "@/hooks/useContextoBarbearia";
import { sair } from "@/lib/guarda";

export const Route = createFileRoute("/barbeiro/mais")({
  head: () => ({ meta: [
    { title: "Mais — Cortaí Gestão" },
    { name: "description", content: "Operação, vendas, relacionamento e configurações da sua barbearia." },
    { property: "og:title", content: "Mais — Cortaí Gestão" },
    { property: "og:description", content: "Central organizada da barbearia no Cortaí." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MaisPage,
});

type Item = { to: LinkProps["to"]; label: string; detail: string; icon: LucideIcon };

function MaisPage() {
  const { carregando, pode, ativo } = useContextoBarbearia();

  const grupos: { titulo: string; itens: (Item | false)[] }[] = [
    { titulo: "Operação", itens: [
      pode("visualizar_clientes") && { to: "/barbeiro/clientes", label: "Clientes", detail: "Histórico e preferências", icon: Users },
      pode("visualizar_financeiro") && { to: "/barbeiro/financeiro", label: "Financeiro", detail: "Receitas e movimentações", icon: WalletCards },
      { to: "/barbeiro/servicos", label: "Serviços", detail: "Preços e duração", icon: Scissors },
      pode("gerenciar_profissionais") && { to: "/barbeiro/profissionais", label: "Profissionais", detail: "Descrição e portfólio", icon: UserSquare2 },
    ] },
    { titulo: "Vendas", itens: [
      ativo("produtos_estoque") && pode("visualizar_estoque") && { to: "/barbeiro/produtos", label: "Produtos e estoque", detail: "Catálogo, vendas e alertas", icon: Package },
    ] },
    { titulo: "Relacionamento", itens: [
      ativo("fidelidade") && { to: "/barbeiro/fidelidade", label: "Fidelidade", detail: "Progresso e clientes elegíveis", icon: Star },
      ativo("fila_espera") && { to: "/barbeiro/fila", label: "Lista de espera", detail: "Ocupe horários vagos", icon: ListOrdered },
      ativo("indicacoes") && { to: "/barbeiro/indicacoes", label: "Indicações", detail: "Cliente que traz cliente", icon: Sparkles },
      ativo("avaliacoes") && { to: "/barbeiro/avaliacoes", label: "Avaliações", detail: "Notas e convite público", icon: Star },
    ] },
    { titulo: "Crescimento", itens: [
      ativo("crescimento") && pode("relatorios") && { to: "/barbeiro/crescimento", label: "Crescimento", detail: "Retorno, metas e oportunidades", icon: TrendingUp },
    ] },
    { titulo: "Aparência", itens: [
      pode("alterar_dados_barbearia") && { to: "/barbeiro/marca", label: "Página e marca", detail: "Personalize e compartilhe", icon: Palette },
    ] },
    { titulo: "Equipe e segurança", itens: [
      pode("gerenciar_permissoes") && { to: "/barbeiro/equipe", label: "Equipe e permissões", detail: "Perfis e acessos por pessoa", icon: ShieldCheck },
      pode("gerenciar_permissoes") && { to: "/barbeiro/auditoria", label: "Auditoria", detail: "Histórico de ações críticas", icon: ClipboardList },
    ] },
    { titulo: "Conta", itens: [
      pode("alterar_dados_barbearia") && { to: "/barbeiro/recursos", label: "Recursos da barbearia", detail: "Ative somente o que você usa", icon: SlidersHorizontal },
      { to: "/barbeiro/conta", label: "Conta e barbearia", detail: "Seus dados e plano", icon: UserRound },
    ] },
  ];

  return (
    <Screen title="Cortaí Gestão" subtitle="Só o que sua barbearia usa hoje.">
      {carregando ? <Carregando texto="Carregando…" /> : (
        <div data-guia="mais-lista" className="space-y-7">
          {grupos.map((grupo) => {
            const itens = grupo.itens.filter(Boolean) as Item[];
            if (!itens.length) return null;
            return (
              <section key={grupo.titulo}>
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-mute2">{grupo.titulo}</h2>
                <ul className="mt-1">
                  {itens.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.to} className="border-b border-line">
                        <Link to={item.to} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4">
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink2 text-gold"><Icon size={18} /></span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-paper">{item.label}</span>
                            <span className="mt-0.5 block truncate text-xs text-mute">{item.detail}</span>
                          </span>
                          <ChevronRight size={17} className="text-mute2" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <PreferenciasDicas />
      <button type="button" onClick={() => void sair()} className="mt-10 flex w-full items-center justify-center gap-2 border-t border-line pt-6 text-xs text-mute"><LogOut size={15} /> Sair da conta</button>
    </Screen>
  );
}
