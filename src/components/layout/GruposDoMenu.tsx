import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, type LucideIcon } from "lucide-react";

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
            {/* Cabeçalho de seção do Figaro: 32 dp, 18 dp de recuo, título e seta em primary (setas 20 dp
                que giram de 0° aberto a −90° fechado). */}
            <button
              type="button"
              data-menu-secao=""
              className="flex h-9 w-full items-center gap-2 pl-[18px] pr-2 text-left text-primary"
              aria-expanded={abertos.includes(grupo.titulo)}
              aria-controls={`menu-grupo-${grupo.titulo.replace(/\s+/g, "-")}`}
              onClick={() => onAlternar(grupo.titulo)}
            >
              <span className="min-w-0 flex-1 truncate">{rotuloDoGrupo(grupo, segmento)}</span>
              <ChevronDown
                className={`size-5 shrink-0 transition-transform duration-[var(--mola-padrao-duracao)] ease-[var(--mola-padrao)] motion-reduce:transition-none ${abertos.includes(grupo.titulo) ? "" : "-rotate-90"}`}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {abertos.includes(grupo.titulo) ? (
                <motion.ul
                  {...abrirFechar}
                  id={`menu-grupo-${grupo.titulo.replace(/\s+/g, "-")}`}
                  className="flex flex-col gap-[3px] overflow-hidden pt-2"
                >
                  {grupo.itens.map((item, indice) => {
                    const Icon = item.icon;
                    const ativo = itemDeNavegacaoAtivo(caminho, item.to);
                    const total = grupo.itens.length;
                    // Grupo de linhas do Figaro: 56 dp de altura (M3), 28 dp nos cantos de fora, 4 dp entre as linhas, 3 dp de vão.
                    const forma =
                      total <= 1
                        ? "rounded-[28px]"
                        : indice === 0
                          ? "rounded-t-[28px] rounded-b-[4px]"
                          : indice === total - 1
                            ? "rounded-b-[28px] rounded-t-[4px]"
                            : "rounded-[4px]";
                    return (
                      <li key={`${grupo.titulo}-${item.label}`}>
                        <Link
                          data-menu-item=""
                          to={item.to as never}
                          preload="intent"
                          onClick={onNavegar}
                          aria-current={ativo ? "page" : undefined}
                          className={`flex min-h-[56px] w-full items-center gap-4 bg-drawer-card px-4 text-paper transition-[filter,transform] duration-[var(--mola-toque-duracao)] ease-[var(--mola-toque)] active:scale-[0.99] active:brightness-95 motion-reduce:transition-none ${forma}`}
                        >
                          <Icon
                            className="size-6 shrink-0 text-primary"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
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
