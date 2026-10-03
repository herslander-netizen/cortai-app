import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FAMILIAS_DE_TEMA, familiaDoTema } from "@/lib/familias-tema";
import { TEMAS, type PaginaConfig, type TemaId } from "@/lib/pagina-config";
import { definicaoDoSegmento } from "@/lib/segmentos";

export function SecaoTema({
  config,
  segmento,
  escolher,
}: {
  config: PaginaConfig;
  segmento: unknown;
  escolher: (tema: TemaId) => void;
}) {
  const recomendadas = new Set(definicaoDoSegmento(segmento).familiasRecomendadas);
  const atual = familiaDoTema(config.tema);
  const ordenadas = [...FAMILIAS_DE_TEMA].sort(
    (a, b) => Number(recomendadas.has(b.id)) - Number(recomendadas.has(a.id)),
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Tema">
        {ordenadas.map((familia) => {
          const ativa = atual.id === familia.id;
          const cores = TEMAS[familia.variantes[0]!.tema].cores;
          return (
            <Button
              key={familia.id}
              type="button"
              variant="ghost"
              size="bloco"
              aria-pressed={ativa}
              onClick={() => escolher(familia.variantes[0]!.tema)}
              className={`whitespace-normal rounded-lg border p-3 text-left ${ativa ? "border-gold bg-gold/10" : "border-line"}`}
            >
              <span className="mb-3 flex gap-1" aria-hidden>
                {[cores.fundo, cores.principal, cores.destaque, cores.texto].map((cor, i) => (
                  <i
                    key={`${familia.id}-${i}`}
                    className="h-5 flex-1 rounded-sm border border-line"
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </span>
              <span className="flex items-center justify-between gap-2 text-xs font-semibold text-paper">
                {familia.nome}
                {ativa ? <Check size={14} className="text-gold" aria-hidden /> : null}
              </span>
              {recomendadas.has(familia.id) ? (
                <span className="mt-1 inline-block rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">
                  Recomendado
                </span>
              ) : null}
              <small className="mt-1 block text-xs text-mute">{familia.descricao}</small>
            </Button>
          );
        })}
      </div>
      {atual.variantes.length > 1 ? (
        <div>
          <p className="text-xs font-medium text-mute">Variação de {atual.nome}</p>
          <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Variação">
            {atual.variantes.map((v) => (
              <Button
                key={v.tema}
                type="button"
                variant="outline"
                className={`h-12 ${config.tema === v.tema ? "border-gold bg-gold/10" : ""}`}
                aria-pressed={config.tema === v.tema}
                onClick={() => escolher(v.tema)}
              >
                {v.rotulo}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
