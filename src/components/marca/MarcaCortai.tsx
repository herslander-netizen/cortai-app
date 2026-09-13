import { cn } from "@/lib/utils";

type MarcaCortaiProps = {
  compacta?: boolean;
  assinatura?: boolean;
  className?: string;
  tamanho?: "sm" | "md" | "lg";
};

const TAMANHOS = {
  sm: { icone: "h-9 w-9", nome: "text-lg", assinatura: "text-[7px]" },
  md: { icone: "h-11 w-11", nome: "text-2xl", assinatura: "text-[8px]" },
  lg: { icone: "h-14 w-14", nome: "text-[32px]", assinatura: "text-[9px]" },
} as const;

/** Marca da plataforma. Em espaços compactos, mostra somente o símbolo oficial. */
export function MarcaCortai({ compacta = false, assinatura = true, className, tamanho = "md" }: MarcaCortaiProps) {
  const escala = TAMANHOS[tamanho];
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-3", className)} aria-label="Cortaí — Agendamento para barbearias">
      <img
        src="/icone-cortai-192.png"
        alt=""
        width={tamanho === "lg" ? 56 : tamanho === "md" ? 44 : 36}
        height={tamanho === "lg" ? 56 : tamanho === "md" ? 44 : 36}
        className={cn("shrink-0 rounded-[22%] object-contain", escala.icone)}
      />
      {!compacta ? (
        <span className="min-w-0 leading-none">
          <span className={cn("block font-bold text-paper", escala.nome)}>Cortaí</span>
          {assinatura ? (
            <span className={cn("mt-1.5 block whitespace-nowrap font-semibold uppercase text-gold", escala.assinatura)}>
              Agendamento para barbearias
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export function SimboloCortai({ className }: { className?: string }) {
  return <img src="/icone-cortai-192.png" alt="" width={40} height={40} className={cn("h-10 w-10 rounded-[22%] object-contain", className)} />;
}