import { AlertCircle, CheckCircle2, CircleDot } from "lucide-react";

import { estadoDoEditor } from "./estadoDoEditor";
import { IndicadorDeCarregamento } from "@/components/ui/IndicadorDeCarregamento";

const ESTILO = {
  info: "border-line bg-ink2 text-paper",
  pendente: "border-gold/40 bg-gold-soft text-paper",
  erro: "border-brick/40 bg-brick-soft text-paper",
  ok: "border-sage/40 bg-sage-soft text-paper",
} as const;

/** Faixa única de estado: salvando, publicando, não salvo, pendente de publicar, sucesso ou erro. */
export function FaixaDeEstado(props: Parameters<typeof estadoDoEditor>[0]) {
  const estado = estadoDoEditor(props);
  if (!estado) return null;
  const Icone =
    estado.tom === "erro" ? AlertCircle : estado.tom === "ok" ? CheckCircle2 : CircleDot;
  return (
    <p
      role={estado.tom === "erro" ? "alert" : "status"}
      className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm transition-opacity duration-200 ${ESTILO[estado.tom]}`}
    >
      {estado.ocupado ? (
        <IndicadorDeCarregamento tamanho={20} decorativo className="-my-0.5 text-current" />
      ) : (
        <Icone
          aria-hidden
          className={`mt-0.5 size-4 shrink-0 ${estado.tom === "ok" ? "animate-in fade-in zoom-in-50 duration-200" : ""}`}
        />
      )}
      <span>{estado.texto}</span>
    </p>
  );
}
