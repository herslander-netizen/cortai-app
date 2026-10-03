import { Switch } from "@/components/ui/switch";
import type { MarcaForm } from "@/lib/marca.functions";
import type { PaginaConfig } from "@/lib/pagina-config";
import type { TermosDoSegmento } from "@/lib/segmentos";
import { Campo, fieldClass } from "./campos";
import type { SetPagina } from "./tipos";

export function SecaoTextos({
  config,
  setPagina,
  form,
  setMarca,
  vocabulario,
}: {
  config: PaginaConfig;
  setPagina: SetPagina;
  form: MarcaForm;
  setMarca: <K extends keyof MarcaForm>(key: K, value: MarcaForm[K]) => void;
  vocabulario: TermosDoSegmento;
}) {
  return (
    <div className="space-y-5">
      <Campo
        label={`Nome ${vocabulario.de}`}
        value={form.nome}
        onChange={(value) => setMarca("nome", value)}
      />
      <Campo
        label="Frase principal"
        value={config.frase}
        onChange={(value) => setPagina("frase", value)}
      />
      <label className="block text-xs font-medium text-mute">
        Sobre {vocabulario.comArtigo}
        <textarea
          className={`${fieldClass} min-h-32 resize-y`}
          maxLength={1200}
          value={config.sobre}
          onChange={(event) => setPagina("sobre", event.target.value)}
        />
      </label>
      <Campo
        label="Texto do botão principal"
        value={config.cta}
        onChange={(value) => setPagina("cta", value)}
      />
      <label className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-line px-4 py-2">
        <span className="text-sm text-paper">Botão fixo no celular</span>
        <Switch
          checked={config.botaoFixo}
          onCheckedChange={(checked) => setPagina("botaoFixo", checked)}
        />
      </label>
      <Campo
        label="Endereço"
        value={form.endereco}
        onChange={(value) => setMarca("endereco", value || null)}
      />
    </div>
  );
}
