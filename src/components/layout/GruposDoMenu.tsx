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

/**
 * Menu mobile com categorias em blocos únicos e linhas compactas.
 * Facilita percorrer muitas opções sem transformar cada destino em um cartão isolado.
 */
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
    <div className="mt-5 space-y-3">
      {grupos.map((grupo) =>
        grupo.itens.length ? (
          <section key={grupo.titulo}>
            <Button
              variant="ghost"
              className="min-h-12 w-full justify-between pl-5 pr-2 text-base font-semibold text-menu-icone hover:bg-transparent"
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
                className="overflow-hidden rounded-[24px] border border-drawer-borda bg-drawer-card animate-in fade-in-0 duration-[120ms] motion-reduce:animate-none"
              >
                {grupo.itens.map((item, indice) => {
                  const Icon = item.icon;
                  const ativo = itemDeNavegacaoAtivo(caminho, item.to);
                  return (
                    <li
                      key={`${grupo.titulo}-${item.label}`}
                      className={indice < grupo.itens.length - 1 ? "border-b border-drawer-borda" : ""}
                    >
                      <Link
                        to={item.to as never}
                        preload="intent"
                        onClick={onNavegar}
                        aria-current={ativo ? "page" : undefined}
                        className={`grid min-h-14 grid-cols-[24px_minmax(0,1fr)] items-center gap-4 px-5 py-2 text-base font-medium text-paper transition-colors active:brightness-110 motion-reduce:transition-none ${ativo ? "bg-drawer-band" : ""}`}
                      >
                        <Icon
                          className={`size-6 ${ativo ? "text-primary" : "text-menu-icone"}`}
                          strokeWidth={1.9}
                          aria-hidden
                        />
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
