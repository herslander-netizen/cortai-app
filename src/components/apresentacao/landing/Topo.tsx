import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import { IconeWhatsapp } from "@/components/entrada/historias/IconeWhatsapp";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { Button } from "@/components/ui/button";
import { OndasDaEntrada } from "@/components/entrada/OndasDaEntrada";
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
  { src: "/exemplos/profissional-1.webp", x: "left-[6%] bottom-[6%]", t: 13, d: 2.1 },
  { src: "/exemplos/galeria-5.webp", x: "right-[5%] bottom-[10%]", t: 11, d: 0.6 },
] as const;

export function Cabecalho() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--linha)]/70 bg-[var(--fundo)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <MarcaFlow variante="escura" className="h-auto w-24" />
        <nav className="flex items-center gap-1" aria-label="Acesso">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/comecar">Começar grátis</Link>
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
          className={`absolute hidden size-32 rounded-[28px] object-cover shadow-[0_18px_40px_-18px_rgba(40,40,120,0.45)] ring-4 ring-white/80 lg:block xl:size-40 ${f.x}`}
          animate={reduzir ? { y: 0 } : { y: [0, -14, 0] }}
          transition={{ duration: f.t, repeat: Infinity, ease: "easeInOut", delay: f.d }}
        />
      ))}
    </>
  );
}

/** Avisos de confirmação do WhatsApp sobre as fotos, cada um de um ramo diferente. */
function Balao({
  titulo,
  detalhe,
  className,
  atraso,
}: {
  titulo: string;
  detalhe: string;
  className: string;
  atraso: number;
}) {
  return (
    <motion.span
      className={`absolute z-10 flex items-center gap-2 rounded-[18px] bg-white px-3 py-2.5 text-left shadow-[0_16px_32px_-14px_rgba(20,60,40,0.55)] ring-1 ring-black/5 ${className}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...MOLA.padraoEspacial, delay: atraso }}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--sage)] text-white">
        <IconeWhatsapp size={16} />
      </span>
      <span className="min-w-0 text-[12px] leading-tight text-[#12131c]">
        <b className="block">{titulo}</b>
        <span className="text-[#5b5f75]">{detalhe}</span>
      </span>
    </motion.span>
  );
}

/** No celular as fotos entram em um mosaico abaixo do texto, sem competir com o título. */
function MosaicoMobile() {
  const reduzir = useReducedMotion();
  const itens = [
    { src: "/exemplos/profissional-2.webp", c: "mt-6", d: 0 },
    { src: "/exemplos/galeria-2.webp", c: "-mt-2", d: 0.8 },
    { src: "/exemplos/profissional-1.webp", c: "mt-10", d: 1.6 },
  ];
  return (
    <div className="relative mb-28 mt-8 grid w-full grid-cols-3 gap-3 sm:hidden" aria-hidden>
      {itens.map((f) => (
        <motion.img
          key={f.src}
          src={f.src}
          alt=""
          className={`aspect-[3/4] w-full rounded-[22px] object-cover shadow-[0_18px_36px_-18px_rgba(40,40,120,0.5)] ring-4 ring-white/80 ${f.c}`}
          animate={reduzir ? { y: 0 } : { y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: f.d }}
        />
      ))}
      <Balao
        titulo="Corte e barba confirmado ✓"
        detalhe="Sex, 14/11 às 15:00 · SIM"
        className="-bottom-3 left-0 w-[70%]"
        atraso={0.5}
      />
      <Balao
        titulo="Sobrancelha confirmada ✓"
        detalhe="Sáb, 15/11 às 10:30 · SIM"
        className="-bottom-[76px] right-0 w-[70%]"
        atraso={0.9}
      />
    </div>
  );
}

export function Heroi({ conteudo }: { conteudo: ConteudoApresentacao["hero"] }) {
  const reduzir = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-[var(--fundo)]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[
          "left-[-20%] top-[-25%] bg-[var(--entrada-ciano)]",
          "right-[-25%] top-[10%] bg-[var(--entrada-rosa)]",
          "left-[20%] bottom-[-45%] bg-[var(--entrada-lilas)]",
        ].map((c, i) => (
          <motion.span
            key={c}
            className={`absolute block size-[480px] rounded-full opacity-25 blur-[90px] ${c}`}
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
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--figaro-tertiary-container)] px-3.5 py-1.5 text-[12px] font-bold tracking-wide text-[var(--figaro-on-tertiary-container)]"
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
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/comecar">
              {conteudo.cta} <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link to="/login">Já tenho conta</Link>
          </Button>
        </motion.div>
        <MosaicoMobile />
        <ul
          className="mt-8 flex flex-wrap justify-center gap-2"
          aria-label="Para qualquer negócio de serviços"
        >
          {SEGMENTOS.map((nome) => (
            <li
              key={nome}
              className="rounded-full bg-[var(--cartao)]/80 px-3.5 py-1.5 text-[13px] font-semibold text-[var(--texto)] ring-1 ring-[var(--linha)]"
            >
              {nome}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
