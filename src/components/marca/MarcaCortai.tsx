import { cn } from "@/lib/utils";
import logoOficial from "@/assets/cortai-logo-transparente.png.asset.json";

type MarcaCortaiProps = {
  compacta?: boolean;
  assinatura?: boolean;
  className?: string;
  tamanho?: "sm" | "md" | "lg";
};

const TAMANHOS = {
  sm: { icone: "h-9 w-9", logo: "h-9 w-[117px]" },
  md: { icone: "h-11 w-11", logo: "h-11 w-[143px]" },
  lg: { icone: "h-14 w-14", logo: "h-14 w-[183px]" },
} as const;

/** Marca da plataforma. Em espaços compactos, mostra somente o símbolo oficial. */
export function MarcaCortai({ compacta = false, assinatura = true, className, tamanho = "md" }: MarcaCortaiProps) {
  const escala = TAMANHOS[tamanho];
  return (
    <span className={cn("inline-flex min-w-0 items-center", className)} aria-label="Cortaí — Agendamento para barbearias">
      {compacta ? (
        <img
          src="/icone-cortai-192.png"
          alt=""
          width={tamanho === "lg" ? 56 : tamanho === "md" ? 44 : 36}
          height={tamanho === "lg" ? 56 : tamanho === "md" ? 44 : 36}
          className={cn("shrink-0 rounded-[22%] object-contain", escala.icone)}
        />
      ) : (
        <img
          src={logoOficial.url}
          alt=""
          width={900}
          height={276}
          className={cn("brand-lockup shrink-0 object-contain object-left", escala.logo, assinatura ? "" : "object-left")}
        />
      )}
    </span>
  );
}

export function SimboloCortai({ className }: { className?: string }) {
  return <img src="/icone-cortai-192.png" alt="" width={40} height={40} className={cn("h-10 w-10 rounded-[22%] object-contain", className)} />;
}