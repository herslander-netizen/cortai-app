/**
 * Capítulo "Gestão completa": o menu do painel de verdade (`ManagementDrawer` + `DrawerDestaques` + `GruposDoMenu`), em
 * miniatura. Logo e nome do negócio com "pessoa · papel", o cartão Sua Página ligado à faixa de desempenho dos últimos
 * 7 dias (visitas, agendamentos e conversão), o cartão Agenda e o grupo "Dia a dia". O toque abre o desempenho e depois
 * a Agenda. Dados ilustrativos; negócio sem logo mostra o ícone do Flow, como no sistema.
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  Banknote,
  CalendarDays,
  ChevronDown,
  ContactRound,
  Gauge,
  Hourglass,
  Link2,
  Settings,
  Share2,
  TrendingUp,
} from "lucide-react";

import { IconeFlow } from "@/components/marca/MarcaFlow";
import { MOLA } from "@/lib/movimento-figaro";
import { Contador, TelaDaHistoria, Toque, usePassos } from "./base";

export const PASSOS_GESTAO = [1300, 1100, 1900, 1300] as const;

const DIA_A_DIA = [
  { icone: Gauge, nome: "Hoje" },
  { icone: Hourglass, nome: "Lista de espera" },
  { icone: ContactRound, nome: "Clientes" },
  { icone: Banknote, nome: "Financeiro" },
];

/** Cantos do grupo de linhas do Figaro: 28 nas pontas, 4 entre as linhas. */
function forma(i: number, total: number) {
  if (i === 0) return "rounded-t-[18px] rounded-b-[4px]";
  if (i === total - 1) return "rounded-b-[18px] rounded-t-[4px]";
  return "rounded-[4px]";
}

export function HistoriaGestao() {
  const passo = usePassos(PASSOS_GESTAO);
  const aberta = passo >= 2;
  const toque = [
    { x: 50, y: 40, visivel: false },
    { x: 40, y: 34, apertando: true },
    { x: 40, y: 34, visivel: false },
    { x: 50, y: aberta ? 60 : 47, apertando: true },
  ][passo]!;

  return (
    <TelaDaHistoria rotulo="menu do painel com sua página, desempenho da semana e agenda do dia">
      <div className="flex h-full flex-col gap-[3px] bg-[var(--figaro-surface)] px-2.5 pt-2">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-[var(--figaro-surface-container)]">
            <IconeFlow className="size-8" />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <b className="block text-[12px]">Studio Aurora</b>
            <span className="text-[9px] text-[var(--figaro-on-surface-variant)]">Ana · Dona</span>
          </span>
          <Settings size={14} className="text-[var(--figaro-on-surface-variant)]" />
        </div>

        <div className="flex items-center gap-2 rounded-t-[18px] rounded-b-[4px] bg-[var(--figaro-surface-container)] px-2.5 py-2">
          <Link2 size={15} className="text-[var(--sage)]" />
          <span className="flex-1 leading-tight">
            <b className="block text-[11px]">Sua Página</b>
            <span className="flex items-center gap-1 text-[8px] text-[var(--figaro-on-surface-variant)]">
              <span className="size-[5px] rounded-full bg-[var(--sage)]" /> Online
            </span>
          </span>
          <Share2 size={13} className="text-[var(--figaro-primary)]" />
        </div>
        <motion.div
          layout="position"
          transition={MOLA.padraoEspacial}
          className="rounded-b-[18px] rounded-t-[4px] bg-[var(--figaro-surface-container-high)] pb-1"
        >
          <AnimatePresence initial={false}>
            {aberta ? (
              <motion.div
                key="numeros"
                className="grid grid-cols-3 gap-1.5 px-2 pt-2"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={MOLA.padraoEspacial}
              >
                {[
                  { r: "Visitas", v: <Contador ate={124} /> },
                  { r: "Agend.", v: <Contador ate={36} /> },
                  {
                    r: "Conversão",
                    v: <Contador ate={29} formatar={(n) => `${Math.round(n)}%`} />,
                  },
                ].map((b) => (
                  <div key={b.r} className="rounded-[12px] bg-[var(--figaro-surface)] px-2 py-1.5">
                    <p className="text-[15px] font-semibold leading-tight tabular-nums">{b.v}</p>
                    <p className="text-[8px] text-[var(--figaro-on-surface-variant)]">{b.r}</p>
                  </div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
          <motion.p
            layout="position"
            className="flex items-center gap-1 px-2.5 pt-1 text-[9px] text-[var(--figaro-on-surface-variant)]"
            animate={{ scale: passo === 1 ? 0.97 : 1 }}
            transition={MOLA.rapidaEspacial}
          >
            <TrendingUp size={10} />
            {aberta ? "Desempenho dos últimos 7 dias" : "Ver desempenho · últimos 7 dias"}
          </motion.p>
        </motion.div>

        <motion.div
          layout="position"
          className="mt-2.5 flex items-center gap-2.5 rounded-[18px] bg-[var(--figaro-surface-container)] px-3 py-2.5"
          animate={{ scale: passo === 3 ? 0.97 : 1 }}
          transition={MOLA.padraoEspacial}
        >
          <CalendarDays size={16} className="text-[var(--figaro-primary)]" />
          <span className="flex-1 leading-tight">
            <b className="block text-[12px]">Agenda</b>
            <span className="text-[10px] text-[var(--figaro-on-surface-variant)]">
              Hoje · 8 atendimentos
            </span>
          </span>
          <span className="size-[6px] rounded-full bg-[var(--sage)]" />
        </motion.div>

        <motion.div layout="position" transition={MOLA.padraoEspacial} className="mt-2.5">
          <p className="flex items-center justify-between px-3 pb-1 text-[10px] text-[var(--figaro-primary)]">
            Dia a dia <ChevronDown size={12} />
          </p>
          <div className="flex flex-col gap-[3px]">
            {DIA_A_DIA.map((item, i) => {
              const Icone = item.icone;
              return (
                <div
                  key={item.nome}
                  className={`flex items-center gap-2.5 bg-[var(--figaro-surface-container)] px-3 py-2 text-[11px] ${forma(i, DIA_A_DIA.length)}`}
                >
                  <Icone size={14} strokeWidth={1.75} className="text-[var(--figaro-primary)]" />
                  {item.nome}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
      <Toque {...toque} />
    </TelaDaHistoria>
  );
}
