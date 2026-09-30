import iconAsset from "@/assets/cortai-simbolo-oficial.png.asset.json";
import colorOnLightAsset from "@/assets/cortai-logo-escura-oficial.png.asset.json";
import colorOnDarkAsset from "@/assets/cortai-logo-clara-oficial.png.asset.json";

const marcas = {
  preta: colorOnLightAsset.url,
  clara: colorOnDarkAsset.url,
  escura: colorOnLightAsset.url,
  branca: colorOnDarkAsset.url,
} as const;

export const iconeCortaiUrl = iconAsset.url;

export function IconeCortai({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <img
      src={iconeCortaiUrl}
      alt="Ícone do Cortaí"
      width={1254}
      height={1254}
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
        <img
          src={marcas.clara}
          alt=""
          width={1920}
          height={714}
          loading={prioridade ? "eager" : "lazy"}
          fetchPriority={prioridade ? "high" : "auto"}
          className="brand-logo-on-dark h-full w-full object-contain"
        />
        <img
          src={marcas.escura}
          alt=""
          width={1920}
          height={640}
          loading={prioridade ? "eager" : "lazy"}
          fetchPriority={prioridade ? "high" : "auto"}
          className="brand-logo-on-light h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <img
      src={marcas[variante]}
      alt="Cortaí"
      width={1920}
      height={variante === "clara" || variante === "branca" ? 714 : 640}
      loading={prioridade ? "eager" : "lazy"}
      fetchPriority={prioridade ? "high" : "auto"}
      className={`object-contain ${className}`}
    />
  );
}
