import iconAsset from "@/assets/cortai-symbol-urban.png";
import blackAsset from "@/assets/cortai-logo-urban.png";
import whiteAsset from "@/assets/cortai-logo-urban-negative.png";

const marcas = {
  preta: blackAsset.url,
  clara: whiteAsset,
  escura: blackAsset.url,
  branca: whiteAsset,
} as const;

export const iconeCortaiUrl = iconAsset;

export function IconeCortai({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <img
      src={iconeCortaiUrl}
      alt="Símbolo do Cortaí"
      width={1024}
      height={1024}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

export function MarcaCortai({
  variante = "automatica",
  className = "h-auto w-40",
  prioridade = false,
}: {
  variante?: keyof typeof marcas | "automatica";
  className?: string;
  prioridade?: boolean;
}) {
  if (variante === "automatica") {
    return (
      <span className={`brand-logo-auto ${className}`} role="img" aria-label="Cortaí">
        <img src={marcas.branca} alt="" width={1536} height={768} loading={prioridade ? "eager" : "lazy"} fetchPriority={prioridade ? "high" : "auto"} className="brand-logo-on-dark h-full w-full object-contain" />
        <img src={marcas.escura} alt="" width={1536} height={768} loading={prioridade ? "eager" : "lazy"} fetchPriority={prioridade ? "high" : "auto"} className="brand-logo-on-light h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <img
      src={marcas[variante]}
      alt="Cortaí"
      width={1536}
      height={768}
      loading={prioridade ? "eager" : "lazy"}
      fetchPriority={prioridade ? "high" : "auto"}
      className={`object-contain ${className}`}
    />
  );
}