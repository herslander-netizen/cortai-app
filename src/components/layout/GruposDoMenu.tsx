import { Link } from "@tanstack/react-router";
import { ChevronDown, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { itemDeNavegacaoAtivo } from "@/lib/navegacao-barbeiro";

type ItemDoMenu = { label: string; to: string; icon: LucideIcon };
type GrupoDoMenu = { titulo: string; rotulo: string; itens: ItemDoMenu[] };

/** Grupos recolhíveis do menu lateral: título, chevron e os itens em bloco. */
export function GruposDoMenu({
  grupos,
  abertos,
  caminho,
  onAlternar,
  onNavegar,
}: {
  grupos: GrupoDoMenu[];
  abertos: string[];
  caminho: string;
  onAlternar: (titulo: string) => void;
  onNavegar: () => void;
}) {
  return (
    <div className="mt-6 space-y-4">
      {grupos.map((grupo) =>
        grupo.itens.length ? (
          <section key={grupo.titulo}>
            <Button
              variant="ghost"
              className="min-h-12 w-full justify-between pl-[30px] pr-2 text-base font-semibold text-menu-icone hover:bg-transparent"
              aria-expanded={abertos.includes(grupo.titulo)}
              aria-controls={`menu-grupo-${grupo.titulo.replace(/\s+/g, "-")}`}
              onClick={() => onAlternar(grupo.titulo)}
            >
              {grupo.rotulo}
              <ChevronDown
                className={`size-5 transition-transform duration-[120ms] motion-reduce:transition-none ${abertos.includes(grupo.titulo) ? "rotate-180" : ""}`}
                aria-hidden
              />
            </Button>
            {abertos.includes(grupo.titulo) ? (
              <ul
                id={`menu-grupo-${grupo.titulo.replace(/\s+/g, "-")}`}
                className="space-y-2 animate-in fade-in-0 duration-[120ms] motion-reduce:animate-none"
              >
                {grupo.itens.map((item, indice) => {
                  const Icon = item.icon;
                  const ativo = itemDeNavegacaoAtivo(caminho, item.to);
                  const raio =
                    grupo.itens.length === 1
                      ? "rounded-[24px]"
                      : indice === 0
                        ? "rounded-t-[24px] rounded-b-[9px]"
                        : indice === grupo.itens.length - 1
                          ? "rounded-t-[9px] rounded-b-[24px]"
                          : "rounded-[9px]";
                  return (
                    <li key={`${grupo.titulo}-${item.label}`}>
                      <Link
                        to={item.to as never}
                        preload="intent"
                        onClick={onNavegar}
                        aria-current={ativo ? "page" : undefined}
                        className={`grid min-h-[70px] grid-cols-[28px_minmax(0,1fr)] items-center gap-5 border border-drawer-borda bg-drawer-card px-6 py-3 text-[17px] font-medium text-paper active:brightness-110 ${raio} ${ativo ? "ring-2 ring-primary/30" : ""}`}
                      >
                        <Icon className="size-7 text-menu-icone" strokeWidth={2} aria-hidden />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ) : null,
      )}
    </div>
  );
}
