import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarCheck, MessageCircle, Sparkles } from "lucide-react";

import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { Button } from "@/components/ui/button";
import { MOLA } from "@/lib/movimento-figaro";
import type { ConteudoApresentacao } from "@/lib/apresentacao-conteudo";

const FOTOS = [
  { src: "/exemplos/profissional-1.webp", x: "left-[2%] top-[8%]", t: 12, d: 0 },
  { src: "/exemplos/galeria-2.webp", x: "right-[3%] top-[2%]", t: 14, d: 1.2 },
  { src: "/exemplos/profissional-3.webp", x: "left-[6%] bottom-[6%]", t: 13, d: 2.1 },
  { src: "/exemplos/galeria-5.webp", x: "right-[5%] bottom-[10%]", t: 11, d: 0.6 },
] as const;

export function Cabecalho() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--linha)]/70 bg-[var(--fundo)]/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <MarcaFlow className="h-auto w-24" />
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
      <FotosFlutuantes />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 pb-16 pt-14 text-center sm:pt-20">
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
        <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-[var(--texto-suave)]">
          <li className="flex items-center gap-1.5">
            <CalendarCheck size={15} /> Agenda e clientes
          </li>
          <li className="flex items-center gap-1.5">
            <MessageCircle size={15} /> Lembretes no WhatsApp
          </li>
          <li className="flex items-center gap-1.5">
            <Sparkles size={15} /> Sem cartão para começar
          </li>
        </ul>
      </div>
    </section>
  );
}
