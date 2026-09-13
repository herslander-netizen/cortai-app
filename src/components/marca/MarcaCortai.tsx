import iconAsset from "@/assets/cortai-icon-official.png.asset.json";
import blackAsset from "@/assets/cortai-logo-black.png.asset.json";
import lightBackgroundAsset from "@/assets/cortai-logo-light-bg.png.asset.json";
import darkBackgroundAsset from "@/assets/cortai-logo-dark-bg.png.asset.json";
import whiteAsset from "@/assets/cortai-logo-white.png.asset.json";

const marcas = {
  preta: blackAsset.url,
  clara: lightBackgroundAsset.url,
  escura: darkBackgroundAsset.url,
  branca: whiteAsset.url,
} as const;

export const iconeCortaiUrl = iconAsset.url;

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
  variante = "escura",
  className = "h-auto w-40",
  prioridade = false,
}: {
  variante?: keyof typeof marcas;
  className?: string;
  prioridade?: boolean;
}) {
  return (
    <img
      src={marcas[variante]}
      alt="Cortaí"
      width={1774}
      height={887}
      loading={prioridade ? "eager" : "lazy"}
      fetchPriority={prioridade ? "high" : "auto"}
      className={`object-contain ${className}`}
    />
  );
}