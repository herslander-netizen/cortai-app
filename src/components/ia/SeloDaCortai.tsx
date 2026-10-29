import { SELO_DA_CORTAI, type EstadoDaCortai } from "@/lib/brain/estado-cortai";

const COR_DO_TOM = {
  ok: "border-sage/40 text-sage",
  aviso: "border-rosa/40 text-rosa",
  parada: "border-brick/40 text-brick",
} as const;

/** Selo curto do estado da Flow IA: Ativa, Desligada, Pausada, Limite... */
export function SeloDaCortai({
  estado,
  mostrarAtiva = false,
}: {
  estado: EstadoDaCortai | null;
  mostrarAtiva?: boolean;
}) {
  if (!estado || (estado === "ativa" && !mostrarAtiva)) return null;
  const selo = SELO_DA_CORTAI[estado];
  return (
    <span
      title={selo.texto}
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${COR_DO_TOM[selo.tom]}`}
    >
      {selo.rotulo}
    </span>
  );
}

/** Ponto do estado sobre o ícone do cabeçalho; some quando a Flow IA está ativa. */
export function PontoDaCortai({ estado }: { estado: EstadoDaCortai | null }) {
  if (!estado || estado === "ativa") return null;
  const tom = SELO_DA_CORTAI[estado].tom;
  return (
    <span
      aria-hidden
      className={`absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-ink ${tom === "parada" ? "bg-brick" : "bg-rosa"}`}
    />
  );
}
