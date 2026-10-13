import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  CalendarDays,
  ContactRound,
  Hourglass,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { getSessao } from "@/lib/sessao.functions";
import { itemDeNavegacaoAtivo, itensDaBarra } from "@/lib/navegacao-barbeiro";
import { Button } from "@/components/ui/button";

const CHAVE = "cortai-lateral-recolhida";

function useItens() {
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300_000,
  });
  const icones = {
    "/barbeiro": CalendarDays,
    "/barbeiro/clientes": ContactRound,
    "/barbeiro/caixa": Banknote,
    "/barbeiro/fila": Hourglass,
  } as const;
  return itensDaBarra(sessao?.permissoes).map((item) => ({
    ...item,
    icon: icones[item.to as keyof typeof icones],
  }));
}

/** Lateral recolhível de desktop/tablet, com a Agenda primeiro. */
export function NavegacaoEquipe() {
  const itens = useItens();
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const [recolhida, setRecolhida] = useState(false);

  useEffect(() => {
    setRecolhida(window.localStorage.getItem(CHAVE) === "1");
  }, []);
  useEffect(() => {
    document.documentElement.dataset["lateral"] = recolhida ? "recolhida" : "aberta";
  }, [recolhida]);

  function alternar() {
    setRecolhida((v) => {
      window.localStorage.setItem(CHAVE, v ? "0" : "1");
      return !v;
    });
  }

  return (
    <nav className="equipe-lateral" aria-label="Navegação principal">
      <ul>
        {itens.map((item) => {
          const Icon = item.icon;
          const on = itemDeNavegacaoAtivo(caminho, item.to);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                preload="intent"
                activeOptions={{ exact: true }}
                aria-current={on ? "page" : undefined}
                title={item.label}
                className="equipe-lateral-link"
              >
                <Icon size={19} strokeWidth={1.75} aria-hidden />
                <span className="equipe-lateral-rotulo">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Button
            type="button"
            variant="ghost"
            title="Menu"
            className="equipe-lateral-link h-auto min-h-12 w-full justify-start"
            onClick={() => window.dispatchEvent(new Event("cortai:abrir-menu"))}
          >
            <Menu size={19} strokeWidth={1.75} aria-hidden />
            <span className="equipe-lateral-rotulo">Menu</span>
          </Button>
        </li>
      </ul>
      <Button
        type="button"
        variant="ghost"
        onClick={alternar}
        className="equipe-lateral-link equipe-lateral-alternar h-auto min-h-12 justify-start"
        aria-label={recolhida ? "Expandir barra lateral" : "Recolher barra lateral"}
      >
        {recolhida ? (
          <PanelLeftOpen size={19} strokeWidth={1.75} aria-hidden />
        ) : (
          <PanelLeftClose size={19} strokeWidth={1.75} aria-hidden />
        )}
        <span className="equipe-lateral-rotulo">Recolher</span>
      </Button>
    </nav>
  );
}
