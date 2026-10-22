import { FONTES, type PaginaConfig } from "@/lib/pagina-config";
import { contraste } from "@/lib/cor-marca";
import { SelectNative, fieldClass } from "./campos";
import type { SetPagina } from "./tipos";

/** Atalhos de cor (valores escolhidos pelo dono, não tokens de interface). */
const PALETA_RAPIDA = [
  "#1B2A4A",
  "#2F5BEA",
  "#E85A8A",
  "#111110",
  "#F4F5F2",
  "#FFFFFF",
  "#C9A96A",
  "#19C37D",
  "#B4533C",
];

export function SecaoAjustesFinos({
  config,
  setPagina,
}: {
  config: PaginaConfig;
  setPagina: SetPagina;
}) {
  const textoSobreFundo = contraste(config.cores.texto, config.cores.fundo);
  const baixo = textoSobreFundo < 4.5;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectNative
          label="Fonte dos títulos"
          value={config.fonteTitulo}
          options={FONTES}
          onChange={(value) => setPagina("fonteTitulo", value as PaginaConfig["fonteTitulo"])}
        />
        <SelectNative
          label="Fonte do texto"
          value={config.fonteTexto}
          options={FONTES}
          onChange={(value) => setPagina("fonteTexto", value as PaginaConfig["fonteTexto"])}
        />
        <SelectNative
          label="Espaçamento"
          value={config.densidade}
          options={{
            compacta: "Compacto",
            equilibrada: "Equilibrado",
            espacosa: "Espaçoso",
          }}
          onChange={(value) => setPagina("densidade", value as PaginaConfig["densidade"])}
        />
        <SelectNative
          label="Cantos"
          value={config.bordas}
          options={{
            quadrado: "Quadrados",
            suave: "Suaves",
            moderno: "Modernos",
            arredondado: "Arredondados",
          }}
          onChange={(value) => setPagina("bordas", value as PaginaConfig["bordas"])}
        />
        <SelectNative
          label="Botões"
          value={config.botoes}
          options={{
            solido: "Sólidos",
            contorno: "Contorno",
            minimalista: "Minimalistas",
          }}
          onChange={(value) => setPagina("botoes", value as PaginaConfig["botoes"])}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Object.entries(config.cores).map(([key, value]) => {
          const trocar = (cor: string) =>
            setPagina("cores", { ...config.cores, [key]: cor.toUpperCase() });
          return (
            <div key={key} className="text-xs capitalize text-mute">
              {key}
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`Escolher cor ${key}`}
                  className="h-12 w-12 shrink-0 rounded-md border border-line bg-ink2 p-1"
                  value={value}
                  onChange={(event) => trocar(event.target.value)}
                />
                <input
                  aria-label={`Código da cor ${key}`}
                  className={`${fieldClass} h-12 uppercase`}
                  defaultValue={value}
                  key={value}
                  maxLength={7}
                  onBlur={(event) => {
                    const v = event.target.value.trim();
                    const hex = v.startsWith("#") ? v : `#${v}`;
                    if (/^#[0-9a-fA-F]{6}$/.test(hex)) trocar(hex);
                    else event.target.value = value;
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {PALETA_RAPIDA.map((cor, indice) => (
                  <button
                    key={`${key}-${cor}-${indice}`}
                    type="button"
                    aria-label={`Usar ${cor}`}
                    onClick={() => trocar(cor)}
                    className={`h-9 w-9 rounded-full border ${value.toUpperCase() === cor ? "border-paper ring-2 ring-gold" : "border-line"}`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p role="status" className={`text-xs ${baixo ? "text-brick" : "text-sage"}`}>
        {baixo
          ? `Contraste baixo entre texto e fundo (${textoSobreFundo.toFixed(1)}:1). Use pelo menos 4,5:1 para leitura fácil.`
          : `Contraste entre texto e fundo aprovado (${textoSobreFundo.toFixed(1)}:1).`}
      </p>
    </div>
  );
}
