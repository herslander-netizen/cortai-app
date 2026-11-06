import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";

import { Signature } from "@/components/layout/Signature";
import { Button } from "@/components/ui/button";
import type { ConteudoApresentacao } from "@/lib/apresentacao-conteudo";
import { PLANOS_COMERCIAIS, precoComercial } from "@/lib/planos-comerciais";
import { OndasDaEntrada } from "@/components/entrada/OndasDaEntrada";
import { useAcesso } from "./acesso";
import { DivisorDeOndas, LinhasDeOnda } from "./Ondas";
import { Revelar } from "./Revelar";
import { TEMA_CLARO, TEMA_ESCURO } from "./tema";

// Alterna rostos e ambientes (barbearia, unhas, estética) para falar com homens e mulheres.
const GALERIA = [2, 1, 5, 6, 4, 3].map((n) => `/exemplos/galeria-${n}.webp`);

/** Faixa de fotos que desliza devagar: mostra que o Flow serve a vários tipos de negócio de serviços. */
export function FaixaDeFotos() {
  const reduzir = useReducedMotion();
  const fotos = [...GALERIA, ...GALERIA];
  return (
    <section style={TEMA_CLARO} className="overflow-hidden bg-[var(--fundo)] py-12">
      <p className="mb-6 px-4 text-center text-[13px] font-semibold text-[var(--texto-suave)]">
        Beleza, barbearia, estética e outros negócios de serviços
      </p>
      <motion.div
        className="flex w-max gap-4"
        animate={reduzir ? { x: 0 } : { x: ["0%", "-50%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        {fotos.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            className="size-44 shrink-0 rounded-[28px] object-cover shadow-[0_18px_34px_-20px_rgba(40,40,120,0.5)] sm:size-56"
          />
        ))}
      </motion.div>
    </section>
  );
}

export function Planos({ conteudo }: { conteudo: ConteudoApresentacao["planos"] }) {
  const { comecar } = useAcesso();
  return (
    <section
      style={TEMA_CLARO}
      className="relative bg-[var(--painel)] px-4 py-16 text-[var(--texto)] sm:py-24"
    >
      <DivisorDeOndas />
      <Revelar className="mx-auto max-w-4xl text-center">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--figaro-primary)]">
          {conteudo.etiqueta}
        </p>
        <h2 className="mt-3 font-serif text-[30px] font-bold leading-[1.08] sm:text-[40px]">
          {conteudo.titulo}
        </h2>
        {conteudo.texto ? (
          <p className="mx-auto mt-3 max-w-xl text-[var(--texto-suave)]">{conteudo.texto}</p>
        ) : null}
      </Revelar>
      <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
        {PLANOS_COMERCIAIS.map((p, i) => {
          const gratis = p.precoCentavos <= 0;
          return (
            <Revelar key={p.chave} atraso={i * 0.08}>
              <div
                className={`h-full rounded-[28px] p-6 ${
                  gratis
                    ? "bg-[var(--figaro-primary)] text-[var(--figaro-on-primary)] shadow-[0_24px_50px_-28px_rgba(61,79,224,0.8)]"
                    : "bg-[var(--cartao)] shadow-[0_22px_44px_-28px_rgba(40,40,120,0.45)] ring-1 ring-[var(--linha)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-[22px] font-bold">{p.nome}</h3>
                  {p.destaque ? (
                    <span className="rounded-full bg-white/25 px-3 py-1 text-[12px] font-bold">
                      {p.destaque}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3">
                  <span className="font-serif text-[40px] font-bold">
                    {gratis ? "R$ 0" : `R$ ${precoComercial(p.precoCentavos)}`}
                  </span>
                  <span className="text-[14px] opacity-80"> / mês</span>
                </p>
                <p className="mt-1 text-[13px] opacity-85">
                  {p.profissionais === 1
                    ? "1 profissional"
                    : `Até ${p.profissionais} profissionais`}
                  {" · "}
                  {p.agendamentosMes
                    ? `até ${p.agendamentosMes} agendamentos/mês`
                    : "agendamentos sem limite"}
                </p>
                <ul className="mt-5 space-y-2 text-[14px]">
                  {[...(p.herda ? [p.herda] : []), ...p.itens].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  data-cta-propria
                  variant={gratis ? "secondary" : "outline"}
                  className={`mt-6 w-full ${gratis ? "bg-white text-[#1b2687] hover:bg-white/90" : ""}`}
                >
                  <Link to={comecar.to}>
                    {comecar.texto ?? (gratis ? "Começar grátis" : "Testar o Studio")}
                  </Link>
                </Button>
              </div>
            </Revelar>
          );
        })}
      </div>
    </section>
  );
}

export function Perguntas({
  bloco,
  perguntas,
}: {
  bloco: ConteudoApresentacao["duvidas"];
  perguntas: ConteudoApresentacao["perguntas"];
}) {
  return (
    <section
      style={TEMA_ESCURO}
      className="relative bg-[var(--fundo)] px-4 py-16 text-[var(--texto)] sm:py-24"
    >
      <DivisorDeOndas />
      <OndasDaEntrada className="absolute inset-0 z-0 h-full w-full opacity-70" />
      <LinhasDeOnda />
      <div className="relative mx-auto max-w-2xl">
        <Revelar>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--figaro-primary)]">
            {bloco.etiqueta}
          </p>
          <h2 className="mt-3 font-serif text-[30px] font-bold sm:text-[40px]">{bloco.titulo}</h2>
        </Revelar>
        <div className="mt-8 divide-y divide-[var(--linha)] rounded-[24px] bg-[var(--cartao)] px-5 shadow-[0_28px_56px_-32px_rgba(0,0,0,0.7)] ring-1 ring-white/5">
          {perguntas.map((q) => (
            <details key={q.pergunta} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold">
                {q.pergunta}
                <ChevronDown
                  size={18}
                  className="shrink-0 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--texto-suave)]">
                {q.resposta}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ChamadaFinal({ conteudo }: { conteudo: ConteudoApresentacao["final"] }) {
  const { comecar } = useAcesso();
  return (
    <section
      style={TEMA_CLARO}
      className="relative bg-[var(--fundo)] px-4 pb-28 pt-14 text-[var(--texto)] sm:pb-10 sm:pt-24"
    >
      <DivisorDeOndas />
      <OndasDaEntrada className="absolute inset-0 z-0 h-full w-full" />
      <Revelar className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <h2 className="font-serif text-[34px] font-bold leading-[1.05] sm:text-[48px]">
          {conteudo.titulo}
        </h2>
        <p className="mt-3 text-[16px] text-[var(--texto-suave)]">{conteudo.texto}</p>
        <Button
          asChild
          data-cta-propria
          size="lg"
          className="mt-7 w-full shadow-[0_16px_30px_-14px_rgba(49,85,237,0.7)] sm:w-auto"
        >
          <Link to={comecar.to}>
            {comecar.texto ?? "Criar minha conta grátis"} <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </Revelar>
      <div className="relative mt-12 [&_.brand-logo-on-dark]:!hidden [&_.brand-logo-on-light]:!block">
        <Signature />
      </div>
    </section>
  );
}

/**
 * Botão fixo no celular: só aparece quando nenhum outro botão de "começar" está na tela (abertura, oferta, planos e
 * chamada final têm o seu). Observa os próprios botões, não as seções: sem piscar e sem cobrir o botão da seção.
 */
export function BarraDoCelular() {
  const { comecar } = useAcesso();
  const [comBotaoNaTela, setComBotaoNaTela] = useState(true);
  useEffect(() => {
    const alvos = [...document.querySelectorAll("[data-cta-propria]")];
    const visiveis = new Set<Element>();
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visiveis.add(e.target);
          else visiveis.delete(e.target);
        }
        setComBotaoNaTela(visiveis.size > 0);
      },
      { threshold: 0 },
    );
    alvos.forEach((a) => obs.observe(a));
    return () => obs.disconnect();
  }, []);
  return (
    <AnimatePresence>
      {!comBotaoNaTela ? (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-30 bg-[var(--fundo)] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-1px_0_var(--linha),0_-14px_28px_-16px_rgba(40,40,120,0.4)] sm:hidden"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            asChild
            size="lg"
            className="w-full shadow-[0_14px_26px_-12px_rgba(49,85,237,0.7)]"
          >
            <Link to={comecar.to}>{comecar.texto ?? "Começar grátis · sem cartão"}</Link>
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
