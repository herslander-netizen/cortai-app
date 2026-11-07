import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { IconeWhatsapp } from "@/components/entrada/historias/IconeWhatsapp";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { Button } from "@/components/ui/button";
import { OndasDaEntrada } from "@/components/entrada/OndasDaEntrada";
import { useAcesso } from "./acesso";
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
  { src: "/exemplos/profissional-1.webp", x: "left-[6%] bottom-[6%]", t: 13, d: 2.1 },
  { src: "/exemplos/profissional-3.webp", x: "right-[5%] bottom-[10%]", t: 11, d: 0.6 },
] as const;

export function Cabecalho() {
  const { logado, entrar } = useAcesso();
  return (
    <header
      style={TEMA_ESCURO}
      className="sticky top-0 z-30 bg-[var(--fundo)] text-[var(--texto)] shadow-[0_1px_0_var(--linha),0_10px_24px_-14px_rgba(0,0,0,0.6)]"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <MarcaFlow variante="clara" className="h-auto w-24" />
        <nav className="flex items-center gap-2" aria-label="Acesso">
          <Button asChild variant="outline" size="sm">
            <Link to={entrar.to}>{entrar.texto}</Link>
          </Button>
          {/* No celular a ação principal é a barra de baixo; aqui só em tela larga. */}
          {logado ? null : (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/comecar">Começar grátis</Link>
            </Button>
          )}
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

/**
 * Aviso de confirmação do WhatsApp, pequeno e abaixo das fotos (dono, 06/11/2026: "diminua bastante e tire o exagero de
 * ficar na frente das fotos"). Tamanho único, título em uma linha, visto verde de confirmado. Cada um de um serviço
 * diferente do de barbearia.
 */
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
  const reduzir = useReducedMotion();
  return (
    <motion.span
      className={`relative z-10 flex h-[46px] w-[74%] items-center gap-2 rounded-[16px] bg-white/95 px-2.5 text-left shadow-[0_10px_22px_-12px_rgba(0,0,0,0.6)] ring-1 ring-black/5 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduzir ? { duration: 0 } : { ...MOLA.padraoEspacial, delay: atraso }}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--sage)] text-white">
        <IconeWhatsapp size={14} />
      </span>
      <span className="min-w-0 flex-1 leading-tight text-[#12131c]">
        <b className="block truncate text-[11.5px]">{titulo}</b>
        <span className="block truncate text-[10px] text-[#5b5f75]">{detalhe}</span>
      </span>
      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[var(--sage)] text-white">
        <Check size={10} strokeWidth={3.4} />
      </span>
    </motion.span>
  );
}

/** No celular as fotos entram em um mosaico abaixo do texto, sem competir com o título. */
function MosaicoMobile() {
  const reduzir = useReducedMotion();
  // Homens e mulheres de serviços diferentes (barbearia, cabelo e estética).
  const itens = [
    { src: "/exemplos/profissional-2.webp", c: "mt-4", d: 0 },
    { src: "/exemplos/galeria-2.webp", c: "-mt-1", d: 0.6 },
    { src: "/exemplos/profissional-1.webp", c: "mt-4", d: 1.2 },
    { src: "/exemplos/profissional-3.webp", c: "-mt-1", d: 1.8 },
  ];
  return (
    <div className="mt-8 w-full sm:hidden" aria-hidden>
      <div className="grid grid-cols-4 gap-2">
        {itens.map((f) => (
          <motion.img
            key={f.src}
            src={f.src}
            alt=""
            className={`aspect-[3/4] w-full rounded-[16px] object-cover shadow-[0_14px_28px_-16px_rgba(0,0,0,0.7)] ring-[3px] ring-white ${f.c}`}
            animate={reduzir ? { y: 0 } : { y: [0, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: f.d }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <Balao
          titulo="Massagem confirmada"
          detalhe="Sex, 14/11 às 15:00"
          className="self-start"
          atraso={0.4}
        />
        <Balao
          titulo="Manicure confirmada"
          detalhe="Sáb, 15/11 às 10:30"
          className="self-end"
          atraso={0.7}
        />
      </div>
    </div>
  );
}

export function Heroi({ conteudo }: { conteudo: ConteudoApresentacao["hero"] }) {
  const reduzir = useReducedMotion();
  const { logado, comecar } = useAcesso();
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
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--figaro-primary-container)] px-3.5 py-1.5 text-[12px] font-bold tracking-wide text-[var(--figaro-on-primary-container)]"
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
            <Link to={comecar.to}>
              {comecar.texto ?? conteudo.cta} <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          {logado ? null : (
            <Link
              to="/login"
              className="text-[14px] font-semibold text-[var(--texto-suave)] underline-offset-4 hover:underline"
            >
              Já tenho conta
            </Link>
          )}
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
