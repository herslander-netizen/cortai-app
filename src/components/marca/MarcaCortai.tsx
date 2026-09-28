import iconAsset from "@/assets/cortai-symbol-oficial.png";
import colorOnLightAsset from "@/assets/cortai-logo-oficial-light.png";
import colorOnDarkAsset from "@/assets/cortai-logo-oficial-dark.png";
import monoDarkAsset from "@/assets/cortai-logo-oficial-mono-dark.png";
import monoLightAsset from "@/assets/cortai-logo-oficial-mono-light.png";

const marcas = {
  preta: monoDarkAsset,
  clara: colorOnDarkAsset,
  escura: colorOnLightAsset,
  branca: monoLightAsset,
} as const;

export const iconeCortaiUrl = iconAsset;

export function IconeCortai({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <img
      src={iconeCortaiUrl}
      alt="Ícone do Cortaí"
      width={128}
      height={356}
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
        <img src={marcas.clara} alt="" width={1296} height={383} loading={prioridade ? "eager" : "lazy"} fetchPriority={prioridade ? "high" : "auto"} className="brand-logo-on-dark h-full w-full object-contain" />
        <img src={marcas.escura} alt="" width={1296} height={383} loading={prioridade ? "eager" : "lazy"} fetchPriority={prioridade ? "high" : "auto"} className="brand-logo-on-light h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <img
      src={marcas[variante]}
      alt="Cortaí"
      width={1296}
      height={383}
      loading={prioridade ? "eager" : "lazy"}
      fetchPriority={prioridade ? "high" : "auto"}
      className={`object-contain ${className}`}
    />
  );
}