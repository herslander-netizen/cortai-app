import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLANOS_COMERCIAIS } from "@/lib/planos-comerciais";
import { useAcesso } from "./acesso";
import { DivisorDeOndas } from "./Ondas";
import { Revelar } from "./Revelar";

const essencial = PLANOS_COMERCIAIS.find((p) => p.chave === "essencial")!;
const LIMITE = essencial.agendamentosMes ?? 50;

/** Faixa em destaque com a oferta: o plano Essencial grátis, com a barra dos agendamentos do mês enchendo. */
export function OfertaGratis() {
  const reduzir = useReducedMotion();
  const { comecar } = useAcesso();
  return (
    <section className="relative bg-[var(--painel)] px-4 py-14 sm:py-20">
      <DivisorDeOndas />
      <Revelar className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,var(--figaro-primary),#5b55f0_55%,#1b2687)] p-6 text-white shadow-[0_30px_60px_-30px_rgba(61,79,224,0.7)] sm:p-12">
          <div
            aria-hidden
            className="absolute -right-16 -top-16 size-64 rounded-full bg-white/15 blur-2xl"
          />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] opacity-90">
                Oferta de lançamento
              </p>
              <h2 className="mt-3 font-serif text-[34px] font-bold leading-[1.05] sm:text-[48px]">
                Grátis até {LIMITE} agendamentos por mês.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed opacity-95">
                Comece sem cartão e sem prazo. Agenda, clientes, comanda, página do negócio e
                lembretes no WhatsApp — tudo liberado no plano Essencial.
              </p>
              <ul className="mt-5 space-y-2 text-[14px]">
                {[
                  "1 profissional",
                  "Todas as funcionalidades liberadas",
                  "Sem cartão de crédito",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="grid size-5 place-items-center rounded-full bg-white/25">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                data-cta-propria
                size="lg"
                variant="secondary"
                className="mt-7 w-full bg-white text-[#1b2687] hover:bg-white/90 sm:w-auto"
              >
                <Link to={comecar.to}>
                  {comecar.texto ?? "Quero começar grátis"} <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
            <div className="rounded-[24px] bg-white/14 p-5 backdrop-blur-sm ring-1 ring-white/25">
              <p className="text-[12px] font-semibold opacity-90">Seu mês no Essencial</p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="font-serif text-[56px] font-bold leading-none">R$ 0</span>
                <span className="text-[14px] opacity-90">/ mês</span>
              </p>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/25">
                <motion.div
                  className="h-full origin-left rounded-full bg-white"
                  initial={{ scaleX: reduzir ? 0.86 : 0 }}
                  whileInView={{ scaleX: 0.86 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, ease: [0.2, 0, 0, 1], delay: 0.3 }}
                />
              </div>
              <p className="mt-2 flex justify-between text-[12px] opacity-90">
                <span>43 de {LIMITE} agendamentos</span>
                <span>ainda sobra espaço</span>
              </p>
              <p className="mt-4 text-[12px] leading-snug opacity-85">
                Precisa de mais profissionais ou agendamentos sem limite? O plano Studio libera até
                10 profissionais.
              </p>
            </div>
          </div>
        </div>
      </Revelar>
    </section>
  );
}
