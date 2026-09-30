import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ContactRound,
  CreditCard,
  HeartHandshake,
  LifeBuoy,
  ListOrdered,
  MapPin,
  Menu,
  MessageSquareText,
  Package,
  Palette,
  Scissors,
  Settings,
  ShieldCheck,
  Star,
  Store,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SinoDeAvisos } from "@/components/notificacoes/SinoDeAvisos";
import { IconeCortai } from "@/components/marca/MarcaCortai";
import { getSessao } from "@/lib/sessao.functions";
import { hojeNoFuso, horarioDoDia, normalizarFuso } from "@/lib/horarios";
import { definirFusoDasTelas } from "@/lib/format";
import { getCapacidades } from "@/lib/capacidades.functions";
import { CAPACIDADES } from "@/lib/capacidades";
import { getAgendaDia } from "@/lib/barbeiro.functions";
import { rotuloDoPapel } from "@/lib/navigation";
import type { ChaveDePermissao } from "@/lib/permissoes";
import { AcoesRapidas } from "@/components/barbeiro/AcoesRapidas";
import { ModeShortcut } from "@/components/layout/ThemeToggle";
import { aplicarIdentidade, aplicarModo, identidadeValida, MODE_KEY } from "@/lib/aparencia";

type ItemDoMenu = {
  label: string;
  to: string;
  icon: typeof CalendarDays;
  permissao?: ChaveDePermissao;
  rotaDaCapacidade?: string;
  search?: { acao: "agendamento" };
};

const GRUPOS: ReadonlyArray<{ titulo: string; itens: readonly ItemDoMenu[] }> = [
  {
    titulo: "Operação",
    itens: [
      {
        label: "Agenda",
        to: "/barbeiro",
        icon: CalendarDays,
        permissao: "criar_agendamento",
        rotaDaCapacidade: "/barbeiro/agenda",
      },
      {
        label: "Novo agendamento",
        to: "/barbeiro/agenda",
        icon: CalendarDays,
        permissao: "criar_agendamento",
        rotaDaCapacidade: "/barbeiro/agenda",
        search: { acao: "agendamento" },
      },
      {
        label: "Atendimentos",
        to: "/barbeiro/agendamentos",
        icon: CheckCircle2,
        permissao: "visualizar_clientes",
      },
      {
        label: "Clientes",
        to: "/barbeiro/clientes",
        icon: ContactRound,
        permissao: "visualizar_clientes",
        rotaDaCapacidade: "/barbeiro/clientes",
      },
      {
        label: "Fila",
        to: "/barbeiro/fila",
        icon: ListOrdered,
        permissao: "criar_agendamento",
        rotaDaCapacidade: "/barbeiro/fila",
      },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      {
        label: "Equipe",
        to: "/barbeiro/equipe",
        icon: UsersRound,
        permissao: "gerenciar_permissoes",
        rotaDaCapacidade: "/barbeiro/equipe",
      },
      {
        label: "Serviços",
        to: "/barbeiro/servicos",
        icon: Scissors,
        permissao: "alterar_preco",
        rotaDaCapacidade: "/barbeiro/servicos",
      },
      {
        label: "Vendas",
        to: "/barbeiro/produtos",
        icon: Package,
        permissao: "visualizar_estoque",
        rotaDaCapacidade: "/barbeiro/produtos",
      },
      {
        label: "Financeiro",
        to: "/barbeiro/financeiro",
        icon: BarChart3,
        permissao: "visualizar_financeiro",
      },
    ],
  },
  {
    titulo: "Relacionamento",
    itens: [
      {
        label: "Voltaí",
        to: "/barbeiro/fidelidade",
        icon: HeartHandshake,
        permissao: "gerenciar_voltai",
        rotaDaCapacidade: "/barbeiro/fidelidade",
      },
      {
        label: "Avaliações",
        to: "/barbeiro/avaliacoes",
        icon: Star,
        permissao: "alterar_dados_barbearia",
      },
      {
        label: "Campanhas",
        to: "/barbeiro/indicacoes",
        icon: MessageSquareText,
        permissao: "relatorios",
        rotaDaCapacidade: "/barbeiro/indicacoes",
      },
      {
        label: "CortAI · conversas",
        to: "/barbeiro/cortai",
        icon: Bot,
        permissao: "ver_cortai",
        rotaDaCapacidade: "/barbeiro/cortai",
      },
    ],
  },
  {
    titulo: "Barbearia",
    itens: [
      {
        label: "Página pública",
        to: "/barbeiro/marca",
        icon: Store,
        permissao: "alterar_dados_barbearia",
        rotaDaCapacidade: "/barbeiro/marca",
      },
      {
        label: "Horários",
        to: "/barbeiro/horarios",
        icon: Clock3,
        permissao: "alterar_dados_barbearia",
      },
      {
        label: "Localização",
        to: "/barbeiro/configurar",
        icon: MapPin,
        permissao: "alterar_dados_barbearia",
      },
      {
        label: "Marca",
        to: "/barbeiro/temas",
        icon: Palette,
        permissao: "alterar_dados_barbearia",
        rotaDaCapacidade: "/barbeiro/temas",
      },
    ],
  },
  {
    titulo: "Conta",
    itens: [
      { label: "Configurações", to: "/barbeiro/conta", icon: Settings },
      { label: "Plano", to: "/barbeiro/plano", icon: CreditCard },
      {
        label: "Permissões",
        to: "/barbeiro/equipe",
        icon: ShieldCheck,
        permissao: "gerenciar_permissoes",
      },
      { label: "Suporte", to: "/barbeiro/mais", icon: LifeBuoy },
    ],
  },
];

export function ManagementHeader() {
  const [aberto, setAberto] = useState(false);
  const caminho = useRouterState({ select: (state) => state.location.pathname });
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300_000,
  });
  const { data: capacidades } = useQuery({
    queryKey: ["capacidades"],
    queryFn: () => getCapacidades(),
    staleTime: 300_000,
    enabled: aberto,
  });
  // Dia real da barbearia (fuso do negócio), o mesmo usado pela agenda.
  const hoje = hojeNoFuso(normalizarFuso(sessao?.tenantFuso));
  const { data: agenda } = useQuery({
    queryKey: ["agenda-dia", hoje],
    queryFn: () => getAgendaDia({ data: { dia: hoje } }),
    staleTime: 60_000,
    enabled: aberto,
  });
  const horarioDeHoje = agenda ? horarioDoDia(hoje, agenda.horarios) : null;
  const operacaoAberta = horarioDeHoje ? !horarioDeHoje.fechado : null;

  useEffect(() => {
    aplicarIdentidade(identidadeValida(sessao?.identidadeApp));
    if (sessao?.tenantModo && !window.localStorage.getItem(MODE_KEY))
      aplicarModo(sessao.tenantModo, true);
  }, [sessao?.identidadeApp, sessao?.tenantModo]);
  useEffect(() => {
    definirFusoDasTelas(sessao?.tenantFuso);
  }, [sessao?.tenantFuso]);

  const grupos = useMemo(
    () =>
      GRUPOS.map((grupo) => ({
        ...grupo,
        itens: grupo.itens.filter((item) => {
          if (item.permissao && !sessao?.permissoes.includes(item.permissao)) return false;
          if (!item.rotaDaCapacidade || !capacidades) return true;
          const capacidade = CAPACIDADES.find((entrada) => entrada.rota === item.rotaDaCapacidade);
          return !capacidade?.recurso || capacidades.liberados[capacidade.recurso] !== false;
        }),
      })),
    [capacidades, sessao?.permissoes],
  );

  return (
    <header className="management-header">
      <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center justify-between gap-3 px-4 md:px-8">
        <Sheet open={aberto} onOpenChange={setAberto}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="h-11 min-w-0 justify-start gap-2.5 rounded-lg px-2 text-left hover:bg-ink3"
              aria-label="Abrir navegação"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-paper">
                <Menu size={18} strokeWidth={1.75} aria-hidden />
              </span>
              <IconeCortai className="h-7 w-7 shrink-0 rounded-md" />
              <span className="min-w-0 truncate text-[15px] font-semibold leading-tight text-paper">
                {sessao?.tenantNome ?? "Cortaí"}
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="management-drawer w-[88vw] max-w-[360px] border-line bg-ink2 p-0 duration-200"
          >
            <div className="border-b border-line px-5 pb-4 pt-5 pr-12">
              <SheetTitle className="truncate text-base text-paper">
                {sessao?.tenantNome ?? "Minha barbearia"}
              </SheetTitle>
              <SheetDescription className="mt-1 truncate text-xs text-mute">
                {sessao?.nome ?? "Conta conectada"} · {rotuloDoPapel(sessao?.papelNaEquipe)}
              </SheetDescription>
              <div className="mt-3 flex items-center gap-2 text-xs text-mute">
                <span
                  className={`h-2 w-2 rounded-full ${operacaoAberta === false ? "bg-brick" : "bg-sage"}`}
                />
                {operacaoAberta === null
                  ? "Carregando operação…"
                  : operacaoAberta
                    ? `Aberta hoje · ${horarioDeHoje?.abre}–${horarioDeHoje?.fecha}`
                    : "Fechada hoje"}
              </div>
            </div>

            <nav aria-label="Módulos da barbearia" className="px-3 py-3">
              {grupos.map((grupo) =>
                grupo.itens.length ? (
                  <section key={grupo.titulo} className="mb-4">
                    <h2 className="px-2 pb-1.5 text-xs font-bold uppercase text-mute2">
                      {grupo.titulo}
                    </h2>
                    <ul>
                      {grupo.itens.map((item) => {
                        const Icon = item.icon;
                        const ativo =
                          item.to === "/barbeiro"
                            ? caminho === "/barbeiro" || caminho === "/barbeiro/agenda"
                            : caminho.startsWith(item.to);
                        return (
                          <li key={`${grupo.titulo}-${item.label}`}>
                            <Link
                              to={item.to as never}
                              search={item.search as never}
                              preload="intent"
                              onClick={() => setAberto(false)}
                              className={`drawer-link ${ativo ? "drawer-link-active" : ""}`}
                            >
                              <Icon size={17} strokeWidth={1.8} aria-hidden />
                              <span>{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null,
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-1">
          <ModeShortcut />
          {caminho === "/barbeiro" || caminho === "/barbeiro/agenda" ? null : <AcoesRapidas />}
          <SinoDeAvisos />
        </div>
      </div>
    </header>
  );
}
