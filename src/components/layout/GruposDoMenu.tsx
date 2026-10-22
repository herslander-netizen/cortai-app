import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMenosMovimento } from "@/hooks/useMovimento";
import { MOLA } from "@/lib/movimento-figaro";
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
  const menosMovimento = useMenosMovimento();
  // Grupo recolhível do Figaro (`FigarooDrawerCollapsibleSection`): o conteúdo abre e fecha em altura com
  // esmaecer (mola 1/400) e a seta gira com a mola padrão (1/1500). Inventário D1.
  const abrirFechar = menosMovimento
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { height: 0, opacity: 0 },
        animate: { height: "auto", opacity: 1 },
        exit: { height: 0, opacity: 0 },
        transition: MOLA.tamanho,
      };
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
                className={`size-5 transition-transform duration-[var(--mola-padrao-duracao)] ease-[var(--mola-padrao)] motion-reduce:transition-none ${abertos.includes(grupo.titulo) ? "rotate-90" : ""}`}
                aria-hidden
              />
            </Button>
            <AnimatePresence initial={false}>
              {abertos.includes(grupo.titulo) ? (
                <motion.ul
                  {...abrirFechar}
                  id={`menu-grupo-${grupo.titulo.replace(/\s+/g, "-")}`}
                  className="overflow-hidden rounded-[24px] border border-drawer-borda bg-drawer-card"
                >
                  {grupo.itens.map((item, indice) => {
                    const Icon = item.icon;
                    const ativo = itemDeNavegacaoAtivo(caminho, item.to);
                    return (
                      <li
                        key={`${grupo.titulo}-${item.label}`}
                        className={
                          indice < grupo.itens.length - 1 ? "border-b border-drawer-borda" : ""
                        }
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
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </section>
        ) : null,
      )}
    </div>
  );
}
