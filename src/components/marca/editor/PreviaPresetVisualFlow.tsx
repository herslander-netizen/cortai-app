import { ImageIcon, Palette, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { presetDoSegmento, preverPresetVisual } from "@/lib/flow-visual-presets";
import { visualRecomendado } from "@/lib/flow-visual-library";
import { TEMAS, type PaginaConfig } from "@/lib/pagina-config";
import { SEGMENTOS_CONFIG, type Segmento } from "@/lib/segmentos";

/**
 * A comparação não altera marca, fotos ou publicação.
 * Apenas a ação Aplicar muda o estado local já gerenciado pelo editor existente.
 */
export function PreviaPresetVisualFlow({
  segmento, config, onAplicar,
}: {
  segmento: Segmento;
  config?: PaginaConfig;
  onAplicar?: (pagina: PaginaConfig) => void;
}) {
  const [aberta, setAberta] = useState(false);
  const preset = presetDoSegmento(segmento);
  const cores = TEMAS[preset.tema].cores;
  const hero = visualRecomendado(segmento, "hero");

  return (
    <section className="overflow-hidden rounded-[28px] bg-ink2" aria-label="Preset visual recomendado">
      <Button
        type="button"
        variant="ghost"
        aria-expanded={aberta}
        aria-controls="flow-preset-previa"
        className="min-h-16 w-full justify-start gap-3 rounded-none px-4 py-3 text-left"
        onClick={() => setAberta((antes) => !antes)}
      >
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-ink3 text-gold">
          <Palette size={22} />
        </span>
        <span className="min-w-0 flex-1 whitespace-normal">
          <span className="block text-sm font-semibold text-paper">Visual recomendado</span>
          <span className="block text-xs leading-5 text-mute">
            {preset.nome} · {SEGMENTOS_CONFIG[segmento].rotulo}
          </span>
        </span>
        <ChevronDown aria-hidden className={aberta ? "rotate-180 transition-transform motion-reduce:transition-none" : "transition-transform motion-reduce:transition-none"} size={19} />
      </Button>

      {aberta ? (
        <div id="flow-preset-previa" className="space-y-3 border-t border-line p-4">
          {hero ? (
            <div className="relative aspect-[16/9] overflow-hidden rounded-[20px] bg-ink3">
              <img
                src={hero.src}
                alt="Imagem ilustrativa recomendada para o segmento"
                width={800}
                height={450}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-ink/80 px-3 py-2 text-xs font-medium text-paper">
                Referência ilustrativa · não é foto do estabelecimento
              </span>
            </div>
          ) : (
            <div className="flex min-h-24 items-center justify-center gap-2 rounded-[20px] bg-ink3 text-sm text-mute">
              <ImageIcon size={20} aria-hidden />
              Sugestão neutra do Flow
            </div>
          )}
          <div className="flex items-center gap-2" aria-label="Cores sugeridas">
            {[cores.fundo, cores.principal, cores.secundaria, cores.botao].map((cor, index) => (
              <span
                key={index}
                className="size-9 rounded-full border border-line"
                style={{ backgroundColor: cor }}
                title={cor}
                aria-label={cor}
                role="img"
              />
            ))}
            <span className="pl-1 text-xs text-mute">Paleta {TEMAS[preset.tema].nome}</span>
          </div>
          <p className="text-sm leading-relaxed text-paper">{preset.fraseExemplo}</p>
          <p className="text-xs leading-relaxed text-mute">
            A prévia usa fotos ilustrativas. Fotos próprias, conteúdo, layout e estados de publicação permanecem intactos.
          </p>
          {config && onAplicar ? (
            <Button
              type="button"
              className="w-full"
              onClick={() => onAplicar(preverPresetVisual(config, segmento))}
            >
              Aplicar cores e fontes ao rascunho
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
