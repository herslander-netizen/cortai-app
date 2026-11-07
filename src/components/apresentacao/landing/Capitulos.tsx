import { Fragment, useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

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

/**
 * Cada capítulo toca em laço enquanto está na tela (dono, 07/11/2026: "os pequenos vídeos ficarem repetindo"): a cada
 * `duracao` a história é remontada do começo; ao sair da tela para e, ao voltar, recomeça. O bate-papo do WhatsApp
 * troca de ramo a cada volta (salão, barbearia, estética). Com "reduzir movimento" fica parada no resultado.
 */
function CelularDoCapitulo({ capitulo, escuro }: { capitulo: Capitulo; escuro: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduzir = useReducedMotion();
  const naTela = useInView(ref, { margin: "0px 0px -20% 0px" });
  const [jaViu, setJaViu] = useState(false);
  const [ciclo, setCiclo] = useState(0);

  useEffect(() => {
    if (!naTela) return;
    // Voltou para a tela depois de sair: recomeça do início.
    if (jaViu) setCiclo((c) => c + 1);
    setJaViu(true);
    if (reduzir) return;
    const t = window.setInterval(() => setCiclo((c) => c + 1), capitulo.duracao);
    return () => window.clearInterval(t);
    // `jaViu` só decide se é a primeira vez; não deve reiniciar o intervalo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naTela, reduzir, capitulo.duracao]);

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
      {jaViu ? (
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
          <Fragment key={ciclo}>
            {capitulo.id === "whatsapp" ? (
              <HistoriaWhatsapp cenario={CENARIOS_DA_PAGINA[ciclo % CENARIOS_DA_PAGINA.length]!} />
            ) : (
              capitulo.historia()
            )}
          </Fragment>
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
