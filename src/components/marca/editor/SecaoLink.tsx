import { useId } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MarcaForm } from "@/lib/marca.functions";
import { Campo, fieldClass } from "./campos";
import { hostPublico, urlPublica } from "@/lib/origem-publica";

export function SecaoLink({
  slug,
  setSlug,
  slugInicial,
  busy,
  salvarSlug,
  form,
  setMarca,
}: {
  slug: string;
  setSlug: (slug: string) => void;
  slugInicial: string;
  busy: boolean;
  salvarSlug: () => void;
  form: MarcaForm;
  setMarca: <K extends keyof MarcaForm>(key: K, value: MarcaForm[K]) => void;
}) {
  const slugId = useId();
  return (
    <div className="space-y-5">
      <div>
        <div>
          <label htmlFor={slugId} className="block text-xs font-medium text-mute">
            Endereço personalizado
          </label>
          <div className="mt-2 flex items-stretch gap-2">
            <span className="flex items-center rounded-lg border border-line2 bg-ink3 px-3 text-xs text-mute">
              {hostPublico()}/
            </span>
            <input
              id={slugId}
              className={`${fieldClass} mt-0 min-w-0 flex-1`}
              value={slug}
              maxLength={60}
              onChange={(event) =>
                setSlug(
                  event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "")
                    .replace(/-+/g, "-"),
                )
              }
            />
            <Button
              type="button"
              className="min-h-12"
              disabled={busy || slug === slugInicial || slug.length < 3}
              onClick={salvarSlug}
            >
              Salvar
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-mute">
          O endereço antigo permanece ativo para não quebrar links já enviados.
        </p>
        <Button type="button" variant="outline" className="mt-3 min-h-12" asChild>
          <a href={urlPublica(`/${slug}`)} target="_blank" rel="noreferrer">
            <ExternalLink />
            Abrir agendamento
          </a>
        </Button>
      </div>
      <Campo
        label="Telefone"
        value={form.telefone}
        onChange={(value) => setMarca("telefone", value || null)}
      />
    </div>
  );
}
