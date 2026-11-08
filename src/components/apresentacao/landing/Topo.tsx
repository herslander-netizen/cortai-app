import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { Button } from "@/components/ui/button";
import { OndasDaEntrada } from "@/components/entrada/OndasDaEntrada";
import { linkDeInteresseFlow } from "./whatsapp";
import { BaloesDeConfirmacao } from "./BaloesDeConfirmacao";
import { TEMA_ESCURO } from "./tema";
import { LinhasDeOnda } from "./Ondas";
import { MOLA } from "@/lib/movimento-figaro";
import type { ConteudoApresentacao } from "@/lib/apresentacao-conteudo";

const SEGMENTOS = [
  "Barbearia",
  "Salão",
  "Estética",
  "Unhas",
  "Clínicas",
  "Estúdios",
  "e mais",
] as const;

const FOTOS = [
  { src: "/exemplos/profissional-2.webp", x: "left-[2%] top-[8%]", t: 12, d: 0 },
  { src: "/exemplos/galeria-2.webp", x: "right-[3%] top-[2%]", t: 14, d: 1.2 },
  { src: "/exemplos/profissional-1.webp", x: "left-[6%] bottom-[20%]", t: 13, d: 2.1 },
  { src: "/exemplos/profissional-3.webp", x: "right-[5%] bottom-[22%]", t: 11, d: 0.6 },
] as const;

export function Cabecalho() {
  return (
    <header
      style={TEMA_ESCURO}
      className="sticky top-0 z-30 bg-[var(--fundo)] text-[var(--texto)] shadow-[0_1px_0_var(--linha),0_10px_24px_-14px_rgba(0,0,0,0.6)]"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <MarcaFlow variante="clara" className="h-auto w-24" />
        <nav className="flex items-center gap-2" aria-label="Contato">
          <Button asChild variant="outline" size="sm">
            <a href={linkDeInteresseFlow()} target="_blank" rel="noopener noreferrer">
              Falar no WhatsApp
            </a>
          </Button>
        </nav>
      </div>
    </header>
  );
}

/** Fotos de apoio que flutuam devagar nas laterais (só em telas largas, para não competir com o texto no celular). */
function FotosFlutuantes() {
  const reduzir = useReducedMotion();
  return (
    <>
      {FOTOS.map((f) => (
        <motion.img
          key={f.src}
          src={f.src}
          alt=""
          loading="lazy"
          className={`absolute hidden size-32 rounded-[28px] object-cover shadow-[0_18px_40px_-18px_rgba(40,40,120,0.45)] ring-4 ring-white lg:block xl:size-40 ${f.x}`}
          animate={reduzir ? { y: 0 } : { y: [0, -14, 0] }}
          transition={{ duration: f.t, repeat: Infinity, ease: "easeInOut", delay: f.d }}
        />
      ))}
    </>
  );
}

/** No celular as fotos entram em um mosaico abaixo do texto, sem competir com o título. */
function MosaicoMobile() {
  const reduzir = useReducedMotion();
  // Dono (07/11): três cartões maiores, na ordem mulher, homem cortando cabelo e outra mulher.
  const itens = [
    { src: "/exemplos/profissional-1.webp", c: "mt-5", d: 0 },
    { src: "/exemplos/galeria-2.webp", c: "-mt-1", d: 0.7 },
    { src: "/exemplos/profissional-3.webp", c: "mt-5", d: 1.4 },
  ];
  return (
    <div className="mt-8 w-full sm:hidden" aria-hidden>
      <div className="grid grid-cols-3 gap-3">
        {itens.map((f) => (
          <motion.img
            key={f.src}
            src={f.src}
            alt=""
            className={`aspect-[3/4] w-full rounded-[22px] object-cover shadow-[0_18px_36px_-18px_rgba(0,0,0,0.7)] ring-4 ring-white ${f.c}`}
            animate={reduzir ? { y: 0 } : { y: [0, -7, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: f.d }}
          />
        ))}
      </div>
      <BaloesDeConfirmacao />
    </div>
  );
}

/**
 * Segmentos passando da direita para a esquerda, sem parar (dono, 07/11/2026): saem por um lado e voltam pelo outro,
 * na velocidade das ondas (uma largura de tela a cada ~11 s). A lista é repetida 4 vezes (cobre telas largas) e a faixa anda uma cópia (-25 %),
 * então o laço não dá salto. Com "reduzir movimento" fica parada, com quebra de linha.
 */
function FaixaDeSegmentos() {
  const reduzir = useReducedMotion();
  const chip =
    "shrink-0 whitespace-nowrap rounded-full bg-[var(--cartao)]/80 px-3.5 py-1.5 text-[13px] font-semibold text-[var(--texto)] ring-1 ring-[var(--linha)]";
  if (reduzir) {
    return (
      <ul
        className="mt-8 flex flex-wrap justify-center gap-2"
        aria-label="Para qualquer negócio de serviços"
      >
        {SEGMENTOS.map((nome) => (
          <li key={nome} className={chip}>
            {nome}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div
      className="relative left-1/2 mt-8 w-screen -translate-x-1/2 overflow-hidden [-webkit-mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)] [mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)]"
      role="group"
      aria-label="Para qualquer negócio de serviços"
    >
      <motion.ul
        className="flex w-max gap-2 pr-2"
        animate={{ x: ["0%", "-25%"] }}
        transition={{ duration: 19, repeat: Infinity, ease: "linear" }}
      >
        {[...SEGMENTOS, ...SEGMENTOS, ...SEGMENTOS, ...SEGMENTOS].map((nome, i) => (
          <li key={`${nome}-${i}`} className={chip} aria-hidden={i >= SEGMENTOS.length}>
            {nome}
          </li>
        ))}
      </motion.ul>
    </div>
  );
}

export function Heroi({ conteudo }: { conteudo: ConteudoApresentacao["hero"] }) {
  const reduzir = useReducedMotion();
  return (
    <section
      style={TEMA_ESCURO}
      className="relative overflow-hidden bg-[var(--fundo)] text-[var(--texto)]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[
          "left-[-20%] top-[-25%] bg-[var(--entrada-ciano)]",
          "right-[-25%] top-[10%] bg-[var(--figaro-primary)]",
          "left-[20%] bottom-[-45%] bg-[var(--entrada-lilas)]",
        ].map((c, i) => (
          <motion.span
            key={c}
            className={`absolute block size-[480px] rounded-full opacity-30 blur-[90px] ${c}`}
            animate={reduzir ? { x: 0, y: 0 } : { x: [0, 40, 0], y: [0, 24, 0] }}
            transition={{ duration: 9 + i * 2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
      <OndasDaEntrada className="absolute inset-0 z-0 h-full w-full" />
      <LinhasDeOnda />
      <FotosFlutuantes />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 pb-14 pt-10 text-center sm:pt-20">
        <motion.span
          className="inline-flex items-center gap-1.5 rounded-full bg-[#ffd44d] px-3.5 py-1.5 text-[12px] font-extrabold tracking-wide text-[#1d1500] shadow-[0_10px_26px_-10px_rgba(255,212,77,0.7)]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={MOLA.padraoEspacial}
        >
          <Sparkles size={13} /> {conteudo.etiqueta}
        </motion.span>
        <motion.h1
          className="mt-5 whitespace-pre-line font-serif text-[38px] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[58px]"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...MOLA.padraoEspacial, delay: 0.08 }}
        >
          {conteudo.titulo}
        </motion.h1>
        <motion.p
          className="mt-5 max-w-xl text-[16px] leading-relaxed text-[var(--texto-suave)] sm:text-[18px]"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...MOLA.padraoEspacial, delay: 0.16 }}
        >
          {conteudo.texto}
        </motion.p>
        <motion.div
          className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...MOLA.padraoEspacial, delay: 0.24 }}
        >
          <Button
            asChild
            data-cta-propria
            size="lg"
            className="w-full shadow-[0_16px_30px_-14px_rgba(49,85,237,0.7)] sm:w-auto"
          >
            <a href={linkDeInteresseFlow()} target="_blank" rel="noopener noreferrer">
              Quero conhecer o Flow <ArrowRight className="ml-2 size-4" />
            </a>
          </Button>
        </motion.div>
        <MosaicoMobile />
        <FaixaDeSegmentos />
      </div>
    </section>
  );
}
