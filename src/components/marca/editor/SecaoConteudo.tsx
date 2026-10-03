import { Switch } from "@/components/ui/switch";
import { componenteIds, type PaginaConfig } from "@/lib/pagina-config";
import type { SetPagina } from "./tipos";

const NOMES: Record<(typeof componenteIds)[number], string> = {
  apresentacao: "Apresentação",
  servicos: "Serviços",
  profissionais: "Profissionais",
  galeria: "Galeria",
  avaliacoes: "Avaliações",
  produtos: "Produtos",
  instagram: "Instagram",
  localizacao: "Localização",
  horarios: "Horários",
  whatsapp: "WhatsApp",
  cta_final: "Chamada final",
};

export function SecaoConteudo({
  config,
  setPagina,
}: {
  config: PaginaConfig;
  setPagina: SetPagina;
}) {
  return (
    <div>
      <p className="mb-3 text-xs leading-relaxed text-mute">
        Cada bloco só aparece quando houver informação real cadastrada.
      </p>
      <div className="divide-y divide-line rounded-lg border border-line">
        {componenteIds.map((id) => (
          <label key={id} className="flex min-h-12 items-center justify-between gap-4 px-4 py-2">
            <span className="text-sm text-paper">{NOMES[id]}</span>
            <Switch
              checked={config.componentes[id] ?? false}
              onCheckedChange={(checked) =>
                setPagina("componentes", { ...config.componentes, [id]: checked })
              }
            />
          </label>
        ))}
      </div>
    </div>
  );
}
