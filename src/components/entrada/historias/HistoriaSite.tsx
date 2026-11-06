/**
 * Capítulo "Seu site" no roteiro do vídeo de referência do dono (06/11/2026: "trazer exatamente o fluxo de site do
 * vídeo e colocar o site no início"; fotos da equipe e da galeria aproveitadas do vídeo, sem nome nem marca): capa escura; um toque troca o tema da página com um círculo que se abre a partir
 * do dedo, outro toque volta; a página rola por Equipe (faixa diagonal), Serviços ("Mais procurados" aberto),
 * categorias e Galeria, volta aos serviços e o toque cai em "Agendar". Conteúdo do Flow: nomes neutros, iniciais no
 * imagem neutra da marca na capa. Só transform/opacity.
 */
import { motion } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronUp, Clock3, Flame, Menu } from "lucide-react";

import { MOLA } from "@/lib/movimento-figaro";
import { TelaDaHistoria, Toque, usePassos } from "./base";

export const PASSOS_SITE = [1300, 1500, 1200, 1300, 1300, 1200, 1100, 900] as const;

/** Onde a página está em cada passo (px da tela de 360). */
const ROLAGEM = [0, 0, 0, -330, -545, -600, -545, -545];
const TOQUES = [
  { x: 50, y: 50, visivel: false },
  { x: 30, y: 58, apertando: true },
  { x: 62, y: 46, apertando: true },
  { x: 62, y: 46, visivel: false },
  { x: 62, y: 46, visivel: false },
  { x: 62, y: 46, visivel: false },
  { x: 84, y: 34, apertando: false },
  { x: 84, y: 32, apertando: true },
];

const EQUIPE = [
  { nome: "Lucas M.", papel: "Profissional", foto: "/entrada/historias/equipe-1.webp" },
  { nome: "Rafael C.", papel: "Profissional", foto: "/entrada/historias/equipe-2.webp" },
  { nome: "Diego A.", papel: "Profissional", foto: "/entrada/historias/equipe-3.webp" },
];
const SERVICOS = [
  { nome: "Corte e finalização", preco: "R$ 85,00", min: 45 },
  { nome: "Escova modeladora", preco: "R$ 65,00", min: 40 },
  { nome: "Hidratação profunda", preco: "R$ 95,00", min: 50 },
];
const CAPA = "/marca/flow/flow-capa-neutra.png";

/** Capa da página em um dos dois temas (o escuro do negócio e o tema novo que o dono escolhe). */
function Capa({ tema }: { tema: "escuro" | "novo" }) {
  const novo = tema === "novo";
  return (
    <div
      className={`relative flex h-[360px] flex-col px-4 pb-9 pt-3 ${
        novo
          ? "bg-[var(--figaro-tertiary-container)] text-[var(--figaro-on-tertiary-container)]"
          : "text-[var(--figaro-inverse-on-surface)]"
      }`}
    >
      {novo ? null : (
        <>
          <img src={CAPA} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[var(--figaro-inverse-surface)]/60" />
        </>
      )}
      <div className="relative flex items-start justify-between">
        <b className="font-serif text-[13px] leading-tight">
          Studio
          <br />
          Aurora
        </b>
        <Menu size={15} />
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <p className={`font-serif text-[28px] leading-[1.08] ${novo ? "font-bold italic" : ""}`}>
          Seu tempo,
          <br />
          seu jeito
        </p>
        <p className="mt-2.5 max-w-[230px] text-[9px] leading-snug opacity-90">
          Um espaço feito para quem busca cuidado, técnica e um atendimento sem pressa.
        </p>
        <span
          className={`mt-5 flex items-center gap-1.5 px-5 py-2.5 text-[10px] font-semibold ${
            novo
              ? "rounded-full bg-[var(--figaro-primary)] text-[var(--figaro-on-primary)]"
              : "rounded-[4px] bg-[var(--figaro-inverse-on-surface)] text-[var(--figaro-inverse-surface)]"
          }`}
        >
          <CalendarDays size={11} /> Agendar agora
        </span>
      </div>
      <p className="relative flex flex-col items-center text-[8px] opacity-80">
        Saiba mais sobre o espaço
        <ChevronDown size={12} />
      </p>
    </div>
  );
}

export function HistoriaSite() {
  const passo = usePassos(PASSOS_SITE);
  const temaNovo = passo === 1;
  // O círculo nasce no dedo: no primeiro toque traz o tema novo, no segundo leva de volta ao escuro.
  const circulo = passo === 1 ? { x: "30%", y: "58%" } : { x: "62%", y: "46%" };

  return (
    <TelaDaHistoria rotulo="página pública do negócio com troca de tema, equipe, serviços e galeria">
      <motion.div
        className="relative"
        initial={false}
        animate={{ y: ROLAGEM[passo] ?? 0 }}
        transition={{ duration: 1.05, ease: [0.2, 0, 0, 1] }}
      >
        <div className="relative h-[360px] overflow-hidden">
          <Capa tema="escuro" />
          {/* Tema novo: o círculo cresce a partir do toque e a capa nova aparece por cima dele. */}
          <motion.span
            className="absolute block size-[40px] rounded-full bg-[var(--figaro-tertiary-container)]"
            style={{ left: circulo.x, top: circulo.y, marginLeft: -20, marginTop: -20 }}
            initial={false}
            animate={{ scale: passo === 1 ? 22 : 0, opacity: passo === 1 ? 1 : 0 }}
            transition={{ duration: passo === 1 ? 0.65 : 0.5, ease: [0.2, 0, 0, 1] }}
          />
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: temaNovo ? 1 : 0 }}
            transition={{ duration: 0.3, delay: temaNovo ? 0.3 : 0 }}
          >
            <Capa tema="novo" />
          </motion.div>
        </div>

        {/* Equipe com o corte em V do vídeo: a parte clara sobe sobre a capa e uma linha na cor da marca marca a borda. */}
        <section className="relative h-[200px] bg-[var(--figaro-surface)] px-4 pt-7">
          <svg
            aria-hidden
            viewBox="0 0 100 12"
            preserveAspectRatio="none"
            className="absolute -top-[22px] left-0 block h-[23px] w-full"
          >
            <polygon points="0,5 24,12 100,0 100,12 0,12" fill="var(--figaro-surface)" />
            <polyline
              points="0,5 24,12 100,0"
              fill="none"
              stroke="var(--figaro-tertiary)"
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <b className="relative font-serif text-[18px]">Equipe</b>
          <div className="relative mt-3 grid grid-cols-3 gap-2">
            {EQUIPE.map((p, i) => (
              <motion.span
                key={p.nome}
                className="flex flex-col items-center"
                initial={false}
                animate={{ opacity: passo >= 2 ? 1 : 0, y: passo >= 2 ? 0 : 10 }}
                transition={{ ...MOLA.padraoEspacial, delay: 0.25 + i * 0.08 }}
              >
                <img
                  src={p.foto}
                  alt=""
                  className="h-[78px] w-full rounded-[4px] object-cover shadow-[var(--elevacao-1)]"
                />
                <b className="mt-1 text-[9px]">{p.nome}</b>
                <span className="text-[8px] text-[var(--figaro-on-surface-variant)]">
                  {p.papel}
                </span>
              </motion.span>
            ))}
          </div>
        </section>

        {/* Serviços: "Mais procurados" aberto, categorias recolhidas e a galeria. */}
        <section className="bg-[var(--figaro-surface)] px-4 pb-6">
          <b className="block pt-3 font-serif text-[18px]">Serviços</b>
          <p className="mt-2 flex items-center justify-between border-y border-[var(--figaro-outline-variant)]/50 py-2 text-[10px] font-semibold">
            <span className="flex items-center gap-1">
              Mais procurados <Flame size={10} className="text-[var(--figaro-tertiary)]" />
            </span>
            <ChevronUp size={11} />
          </p>
          {SERVICOS.map((s, i) => (
            <motion.div
              key={s.nome}
              className="flex items-center justify-between gap-2 border-b border-[var(--figaro-outline-variant)]/40 py-2"
              initial={false}
              animate={{ opacity: passo >= 4 ? 1 : 0.35 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
            >
              <span className="min-w-0">
                <b className="block truncate text-[11px]">{s.nome}</b>
                <span className="flex items-center gap-1.5 text-[8px] text-[var(--figaro-on-surface-variant)]">
                  {s.preco}
                  <span className="flex items-center gap-0.5">
                    <Clock3 size={8} /> {s.min} min
                  </span>
                </span>
              </span>
              <motion.span
                className="shrink-0 rounded-[4px] bg-[var(--figaro-inverse-surface)] px-3 py-1.5 text-[9px] font-semibold text-[var(--figaro-inverse-on-surface)]"
                animate={{ scale: i === 0 && passo === 7 ? 0.9 : 1 }}
                transition={MOLA.rapidaEspacial}
              >
                Agendar
              </motion.span>
            </motion.div>
          ))}
          {["Cabelo · 3", "Unhas · 2"].map((c) => (
            <p
              key={c}
              className="flex items-center justify-between border-b border-[var(--figaro-outline-variant)]/40 py-2 text-[10px] font-semibold"
            >
              {c}
              <ChevronDown size={11} />
            </p>
          ))}
          <b className="mt-4 block font-serif text-[16px]">Galeria de fotos</b>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map((n) => (
              <img
                key={n}
                src={`/entrada/historias/galeria-${n}.webp`}
                alt=""
                className="h-[78px] w-full rounded-[4px] object-cover"
              />
            ))}
          </div>
        </section>
      </motion.div>
      <Toque {...TOQUES[passo]!} />
    </TelaDaHistoria>
  );
}
