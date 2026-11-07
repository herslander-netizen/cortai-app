import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

import { Celular } from "@/components/entrada/historias/Celular";
import { HistoriaWhatsapp } from "@/components/entrada/historias/HistoriaWhatsapp";
import { CAPITULOS, type Capitulo } from "@/components/entrada/historias/capitulos";
import { TEMA_CLARO, TEMA_ESCURO } from "./tema";
import { OndasDaEntrada } from "@/components/entrada/OndasDaEntrada";
import { CENARIOS_DA_PAGINA } from "./cenarios";
import { DivisorDeOndas, LinhasDeOnda } from "./Ondas";
import { Revelar } from "./Revelar";
import { TEXTOS_DOS_CAPITULOS } from "./textos-dos-capitulos";

/** O WhatsApp abre a sequência (é o foco do produto); depois lembretes, agenda, site e gestão. */
const ORDEM = (["whatsapp", "lembretes", "fila", "agenda", "site", "gestao"] as const).map((id) =>
  CAPITULOS.find((c) => c.id === id)!,
);

/** O bate-papo do WhatsApp troca de ramo a cada volta (salão, barbearia, estética) para mostrar que serve a todos. */
function ConversaVariada({ duracao }: { duracao: number }) {
  const [indice, setIndice] = useState(0);
  useEffect(() => {
    const t = window.setInterval(
      () => setIndice((i) => (i + 1) % CENARIOS_DA_PAGINA.length),
      duracao,
    );
    return () => window.clearInterval(t);
  }, [duracao]);
  return <HistoriaWhatsapp key={indice} cenario={CENARIOS_DA_PAGINA[indice]!} />;
}

/** Remonta a história quando a seção entra na tela, para o cliente ver o passo a passo desde o começo. */
function CelularDoCapitulo({ capitulo, escuro }: { capitulo: Capitulo; escuro: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const visivel = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const [l1, l2] = capitulo.frase.split("\n");
  return (
    <div
      ref={ref}
      className="mx-auto h-[420px] w-full max-w-[360px]"
      style={{
        ...TEMA_CLARO,
        background: "transparent",
        // Em seção escura o corpo do celular sobe um tom para não sumir no fundo.
        ...(escuro
          ? { "--figaro-inverse-surface": "#252944", "--figaro-inverse-on-surface": "#f4f5fb" }
          : {}),
      }}
    >
      {visivel ? (
        <Celular
          legenda={
            <>
              <b className="text-[13px]">{capitulo.rotulo}</b>
              <p className="mt-1 text-[12px] leading-snug opacity-85">
                {l1}
                <br />
                {l2}
              </p>
            </>
          }
        >
          {capitulo.id === "whatsapp" ? (
            <ConversaVariada duracao={capitulo.duracao + 1500} />
          ) : (
            capitulo.historia()
          )}
        </Celular>
      ) : null}
    </div>
  );
}

export function Capitulos() {
  return (
    <>
      {ORDEM.map((capitulo, i) => {
        const t = TEXTOS_DOS_CAPITULOS[capitulo.id]!;
        const escuro = i % 2 === 0;
        return (
          <section
            key={capitulo.id}
            style={escuro ? TEMA_ESCURO : TEMA_CLARO}
            className="relative bg-[var(--fundo)] px-4 py-12 text-[var(--texto)] sm:py-24"
          >
            <DivisorDeOndas />
            <OndasDaEntrada className="absolute inset-0 z-0 h-full w-full opacity-70" />
            <LinhasDeOnda />
            <div
              className={`relative mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-2 md:gap-16 ${
                i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
              }`}
            >
              <Revelar>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--figaro-primary)]">
                  {t.etiqueta}
                </p>
                <h2 className="mt-3 font-serif text-[30px] font-bold leading-[1.08] sm:text-[40px]">
                  {t.titulo}
                </h2>
                <p className="mt-4 text-[16px] leading-relaxed text-[var(--texto-suave)]">
                  {t.texto}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {t.itens.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[15px]">
                      <span className="size-2 rounded-full bg-[var(--figaro-primary)]" /> {item}
                    </li>
                  ))}
                </ul>
              </Revelar>
              <Revelar atraso={0.1}>
                <CelularDoCapitulo capitulo={capitulo} escuro={escuro} />
              </Revelar>
            </div>
          </section>
        );
      })}
    </>
  );
}
