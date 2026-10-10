import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { itemDeNavegacaoAtivo } from "@/lib/navegacao-barbeiro";
import { termos } from "@/lib/segmentos";

type ItemDoMenu = { label: string; to: string; icon: LucideIcon };
type GrupoDoMenu = { titulo: string; rotulo?: string; itens: ItemDoMenu[] };

/** "Negócio" vira o nome do segmento ("Sua barbearia", "Seu salão"...). */
function rotuloDoGrupo(grupo: GrupoDoMenu, segmento: Parameters<typeof termos>[0]) {
  if (grupo.rotulo) return grupo.rotulo;
  if (grupo.titulo !== "Negócio") return grupo.titulo;
  const possessivo = termos(segmento).possessivo;
  return possessivo.charAt(0).toUpperCase() + possessivo.slice(1);
}

/** Grupos recolhíveis do menu lateral: título, chevron e os itens em bloco. */
export function GruposDoMenu({
  grupos,
  segmento,
  abertos,
  caminho,
  onAlternar,
  onNavegar,
}: {
  grupos: GrupoDoMenu[];
  segmento?: Parameters<typeof termos>[0];
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
              {rotuloDoGrupo(grupo, segmento)}
              <ChevronRight
                className={`size-5 transition-transform duration-[120ms] motion-reduce:transition-none ${abertos.includes(grupo.titulo) ? "rotate-90" : ""}`}
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
