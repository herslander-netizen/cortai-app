import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronRight, Circle } from "lucide-react";

import { getSessao } from "@/lib/sessao.functions";
import { getConfiguracaoInicial, ITENS_DO_CHECKLIST, marcarItemDoChecklist } from "@/lib/onboarding.functions";

/**
 * Primeiros passos na tela inicial. Só para quem cuida da barbearia.
 * Cada item é detectado de verdade; a lista some quando tudo estiver feito.
 */
export function PrimeirosPassos() {
  const marcar = useServerFn(marcarItemDoChecklist);
  const queryClient = useQueryClient();
  const { data: sessao } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao(), staleTime: 300_000 });
  const cuidaDaBarbearia = Boolean(sessao?.permissoes.includes("alterar_dados_barbearia"));
  const { data } = useQuery({
    queryKey: ["configuracao-inicial"],
    queryFn: () => getConfiguracaoInicial(),
    enabled: cuidaDaBarbearia,
    staleTime: 60_000,
  });

  if (!cuidaDaBarbearia || !data) return null;

  if (!data.concluidoEm) {
    return (
      <Link
        to="/barbeiro/configurar"
        className="mt-4 flex min-h-14 items-center gap-3 rounded-xl border border-line2 bg-ink2 px-4"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-paper">Termine de configurar</span>
          <span className="block text-xs text-mute">Faltam poucos passos para seu link ficar pronto.</span>
        </span>
        <ChevronRight size={16} className="text-mute" aria-hidden />
      </Link>
    );
  }

  const feitos = ITENS_DO_CHECKLIST.filter((i) => data.itens[i.chave]).length;
  if (feitos === ITENS_DO_CHECKLIST.length) return null;

  return (
    <section className="mt-4 surface px-4 py-3" aria-label="Primeiros passos">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-paper">Primeiros passos</h2>
        <span className="text-xs text-mute">
          {feitos} de {ITENS_DO_CHECKLIST.length}
        </span>
      </div>
      <ul className="mt-1">
        {ITENS_DO_CHECKLIST.map((item) => {
          const feito = Boolean(data.itens[item.chave]);
          return (
            <li key={item.chave}>
              <Link
                to={item.destino}
                className="flex min-h-12 items-center gap-3"
                onClick={() => {
                  // Compartilhar o link é o único que não dá para detectar sozinho.
                  if (feito || item.chave !== "compartilhar_link") return;
                  void marcar({ data: { chave: item.chave, feito: true } }).then(() =>
                    queryClient.invalidateQueries({ queryKey: ["configuracao-inicial"] }),
                  );
                }}
              >
                {feito ? (
                  <Check size={16} className="shrink-0 text-paper" aria-hidden />
                ) : (
                  <Circle size={16} className="shrink-0 text-mute2" aria-hidden />
                )}
                <span className={`text-sm ${feito ? "text-mute line-through" : "text-paper"}`}>{item.rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
