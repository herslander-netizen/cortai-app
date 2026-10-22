import type { PaginaConfig } from "@/lib/pagina-config";
import { CORES_AGENDAMENTO } from "@/lib/cor-marca";
import type { ValoresDeEstilo } from "@/lib/estilos-chat";

/** Esboço de uma conversa com o estilo escolhido (formas dos balões, cabeçalho, fundo e botões). */
export function MiniaturaDoChat({
  valores,
  cores,
  destaque,
  className = "",
}: {
  valores: ValoresDeEstilo;
  cores: PaginaConfig["cores"];
  destaque: string;
  className?: string;
}) {
  const sup = {
    padrao: { fundo: CORES_AGENDAMENTO.pagina, texto: CORES_AGENDAMENTO.texto },
    tema: { fundo: cores.fundo, texto: cores.texto },
    clara: { fundo: "#FFFFFF", texto: "#1B1B1F" },
    escura: { fundo: "#0F1218", texto: "#F1F3F8" },
  }[valores.superficie];
  const mistura = (pct: number) => `color-mix(in oklab, ${sup.fundo} ${100 - pct}%, ${sup.texto})`;
  const e = valores.estilo;
  const raioIa =
    e === "suave"
      ? "14px 14px 14px 5px"
      : e === "elegante"
        ? "3px 9px 9px 9px"
        : e === "minimo"
          ? "0"
          : "10px 10px 10px 3px";
  const raioCliente =
    e === "suave"
      ? "14px 14px 5px 14px"
      : e === "elegante"
        ? "9px 3px 9px 9px"
        : e === "minimo"
          ? "0"
          : "10px 10px 3px 10px";
  const bolhaIa =
    e === "minimo"
      ? { borderLeft: `2px solid ${destaque}`, paddingLeft: 5 }
      : e === "elegante"
        ? { border: `1px solid ${mistura(22)}`, background: mistura(4) }
        : e === "suave"
          ? { background: `color-mix(in oklab, ${destaque} 12%, ${sup.fundo})` }
          : e === "classico"
            ? { background: mistura(10) }
            : {
                background: mistura(3),
                border: `1px solid ${mistura(14)}`,
                boxShadow: "0 3px 8px -5px rgb(0 0 0 / .4)",
              };
  const bolhaCliente =
    e === "minimo"
      ? { borderRight: `2px solid ${sup.texto}`, paddingRight: 5 }
      : e === "elegante"
        ? { border: `1px solid ${destaque}`, color: destaque }
        : e === "classico"
          ? { background: destaque, color: "#fff" }
          : e === "suave"
            ? { background: `color-mix(in oklab, ${destaque} 24%, ${sup.fundo})` }
            : {
                background: `color-mix(in oklab, ${destaque} 14%, ${sup.fundo})`,
                border: `1px solid color-mix(in oklab, ${destaque} 30%, transparent)`,
              };
  const raioChip = valores.chips === "cartao" ? 5 : 99;
  return (
    <span
      aria-hidden
      className={`flex flex-col overflow-hidden text-[8px] leading-tight ${className}`}
      style={{ background: sup.fundo, color: sup.texto }}
    >
      <span
        className="flex items-center gap-1 px-2 py-1.5"
        style={
          valores.cabecalho === "cartao"
            ? {
                margin: 4,
                border: `1px solid ${mistura(14)}`,
                borderRadius: 8,
                boxShadow: "0 3px 8px -5px rgb(0 0 0 / .4)",
              }
            : { borderBottom: `1px solid ${mistura(12)}` }
        }
      >
        <i
          className="block size-3.5 shrink-0"
          style={{ background: destaque, borderRadius: valores.avatar === "quadrado" ? 4 : 99 }}
        />
        <b className="font-bold">Lisa</b>
        <i className="ml-auto size-1.5 rounded-full" style={{ background: "#2BB673" }} />
      </span>
      <span className="flex flex-1 flex-col gap-1.5 p-2">
        <span className="max-w-[80%] px-2 py-1.5" style={{ borderRadius: raioIa, ...bolhaIa }}>
          Olá! Qual serviço?
        </span>
        <span
          className="ml-auto max-w-[70%] px-2 py-1.5"
          style={{ borderRadius: raioCliente, ...bolhaCliente }}
        >
          Corte
        </span>
      </span>
      <span className="flex gap-1 px-2 pb-2">
        {["Sem preferência", "Ana"].map((t) => (
          <i
            key={t}
            className="px-1.5 py-1 not-italic"
            style={{
              borderRadius: raioChip,
              border: `1px solid ${mistura(24)}`,
              background: valores.chips === "cartao" ? mistura(5) : "transparent",
            }}
          >
            {t}
          </i>
        ))}
      </span>
    </span>
  );
}
