import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Circle } from "lucide-react";

import { useGuia } from "@/components/guia/GuiaProvider";
import {
  getConfiguracaoInicial,
  ITENS_DO_CHECKLIST,
  marcarItemDoChecklist,
} from "@/lib/onboarding.functions";

/** Cartão de progresso do início. O que já está feito é detectado de verdade. */
export function PrimeirosPassos() {
  const marcar = useServerFn(marcarItemDoChecklist);
  const queryClient = useQueryClient();
  const { guiaDisponivel, abrirGuia } = useGuia();
  const { data } = useQuery({ queryKey: ["configuracao-inicial"], queryFn: () => getConfiguracaoInicial() });

  if (!data) return null;
  const feitos = ITENS_DO_CHECKLIST.filter((i) => data.itens[i.chave]).length;
  if (feitos === ITENS_DO_CHECKLIST.length) return null;

  return (
    <section data-guia="dash-primeiros-passos" className="mt-6 rounded-xl border border-line bg-ink2 px-5 py-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-paper">Primeiros passos</h2>
        <span className="text-xs text-mute">
          {feitos} de {ITENS_DO_CHECKLIST.length}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink3">
        <div
          className="h-full rounded-full bg-gold"
          style={{ width: `${Math.round((feitos / ITENS_DO_CHECKLIST.length) * 100)}%` }}
        />
      </div>

      <ul className="mt-4 space-y-1">
        {ITENS_DO_CHECKLIST.map((item) => {
          const feito = Boolean(data.itens[item.chave]);
          return (
            <li key={item.chave}>
              <Link
                to={item.destino}
                className="flex items-center gap-3 py-2"
                onClick={async () => {
                  if (feito) return;
                  await marcar({ data: { chave: item.chave, feito: true } });
                  void queryClient.invalidateQueries({ queryKey: ["configuracao-inicial"] });
                }}
              >
                {feito ? (
                  <Check size={16} className="shrink-0 text-sage" aria-hidden />
                ) : (
                  <Circle size={16} className="shrink-0 text-mute2" aria-hidden />
                )}
                <span className={`text-sm ${feito ? "text-mute line-through" : "text-paper"}`}>{item.rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {guiaDisponivel && !data.tourVisto ? (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-4">
          <button type="button" className="btn-primary flex-1 py-2.5 text-sm" onClick={abrirGuia}>
            Começar tour
          </button>
          <button
            type="button"
            className="btn-tertiary text-sm"
            onClick={async () => {
              const { marcarTourVisto } = await import("@/lib/onboarding.functions");
              await marcarTourVisto();
              void queryClient.invalidateQueries({ queryKey: ["configuracao-inicial"] });
            }}
          >
            Explorar sozinho
          </button>
        </div>
      ) : null}
    </section>
  );
}
