import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useGuia } from "./GuiaProvider";

export function PreferenciasDicas() {
  const { prefs, definirAtivo, reiniciar } = useGuia();
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-mute">Experiência</h2>
      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={prefs.ativo}
          onChange={(e) => {
            definirAtivo(e.target.checked);
            setAviso(e.target.checked ? null : "Dicas desligadas.");
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
        />
        <span>
          <span className="block text-sm font-semibold text-paper">Mostrar dicas do Flow</span>
          <span className="mt-1 block text-xs text-mute">
            Receba orientações enquanto aprende a usar a Flow IA.
          </span>
        </span>
      </label>
      <Button
        variant="text"
        type="button"
        onClick={() => {
          reiniciar();
          setAviso("Dicas reiniciadas. Elas voltam a aparecer nas próximas telas.");
        }}
        className="mt-2 h-12 px-0 text-xs text-gold"
      >
        Reiniciar dicas
      </Button>
      {aviso ? <p className="mt-3 text-xs text-mute2">{aviso}</p> : null}
    </section>
  );
}
