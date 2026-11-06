/**
 * Capítulo "Gestão completa" (inspiração do dono, 06/11/2026): o painel do negócio com a página no ar, visitas,
 * agendamentos e conversão (as mesmas métricas do funil do Flow), desempenho da semana, próximo agendamento e atalhos.
 * Dados ilustrativos; ícone neutro no lugar do logo do negócio.
 */
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Eye,
  Link2,
  List,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";

import { MOLA } from "@/lib/movimento-figaro";
import { Contador, TelaDaHistoria, Toque, usePassos } from "./base";

export const PASSOS_GESTAO = [1300, 1500, 1500, 1300] as const;

const COLUNAS = [24, 40, 62, 30, 58, 42, 86];
const ATALHOS = [
  { icone: CalendarDays, nome: "Agenda" },
  { icone: Users, nome: "Clientes" },
  { icone: List, nome: "Serviços" },
];

export function HistoriaGestao() {
  const passo = usePassos(PASSOS_GESTAO);
  const cartao =
    "rounded-[14px] bg-[var(--figaro-surface-container)] ring-1 ring-[var(--figaro-outline-variant)]/40";
  return (
    <TelaDaHistoria rotulo="painel do negócio com página no ar, números da semana e próximo agendamento">
      <div className="flex h-full flex-col gap-2 px-3 pt-1">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[12px] bg-[var(--figaro-tertiary)]/15 text-[var(--figaro-tertiary)]">
            <Sparkles size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[13px] leading-tight">Studio Aurora</b>
            <span className="text-[10px] text-[var(--figaro-on-surface-variant)]">
              Ana Souza · Proprietária
            </span>
          </span>
          <SlidersHorizontal size={15} className="text-[var(--figaro-on-surface-variant)]" />
        </div>

        <div className={`${cartao} flex items-center gap-2.5 px-3 py-2`}>
          <Link2 size={16} className="text-[var(--sage)]" />
          <span className="flex-1">
            <b className="block text-[11px] leading-tight">Sua Página</b>
            <span className="flex items-center gap-1 text-[9px] text-[var(--figaro-on-surface-variant)]">
              <span className="size-1.5 rounded-full bg-[var(--sage)]" /> Online
            </span>
          </span>
          <Share2 size={13} className="text-[var(--figaro-on-surface-variant)]" />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { icone: Eye, r: "Visitas", v: <Contador ate={124} /> },
            { icone: CalendarDays, r: "Agend.", v: <Contador ate={36} /> },
            {
              icone: BarChart3,
              r: "Conversão",
              v: <Contador ate={29} formatar={(n) => `${Math.round(n)}%`} />,
            },
          ].map((c) => {
            const Icone = c.icone;
            return (
              <div key={c.r} className={`${cartao} px-2 py-1.5`}>
                <Icone size={12} className="text-[var(--figaro-primary)]" />
                <p className="mt-0.5 text-[15px] font-bold leading-tight">{c.v}</p>
                <p className="text-[8px] text-[var(--figaro-on-surface-variant)]">{c.r}</p>
              </div>
            );
          })}
        </div>

        <div className={`${cartao} px-3 pb-2 pt-1.5`}>
          <p className="text-[10px] font-semibold">Desempenho dos últimos 7 dias</p>
          <div className="mt-1.5 flex h-[46px] items-end justify-between gap-2 border-t border-[var(--figaro-outline-variant)]/40 px-1 pt-1">
            {COLUNAS.map((v, i) => (
              <motion.span
                key={i}
                className="block flex-1 origin-bottom rounded-[4px] bg-[var(--figaro-primary)]/55"
                style={{ height: `${v}%` }}
                initial={{ scaleY: 0.08 }}
                animate={{ scaleY: passo >= 1 ? 1 : 0.08 }}
                transition={{ ...MOLA.padraoEspacial, delay: i * 0.05 }}
              />
            ))}
          </div>
        </div>

        <motion.div
          className="flex items-center gap-2.5 rounded-[14px] bg-[var(--figaro-tertiary)]/12 px-3 py-2 text-[var(--figaro-on-surface)] ring-1 ring-[var(--figaro-tertiary)]/25"
          animate={{ scale: passo === 3 ? 0.97 : 1 }}
          transition={MOLA.rapidaEspacial}
        >
          <CalendarDays size={17} className="text-[var(--figaro-tertiary)]" />
          <span className="min-w-0 flex-1">
            <b className="block text-[11px] leading-tight">Próximo agendamento</b>
            <span className="text-[9px] text-[var(--figaro-on-surface-variant)]">
              Hoje · 15:00 · Hidratação
            </span>
          </span>
          <ChevronRight size={14} />
        </motion.div>

        {ATALHOS.map((a) => {
          const Icone = a.icone;
          return (
            <div key={a.nome} className={`${cartao} flex items-center gap-2.5 px-3 py-2`}>
              <Icone size={14} className="text-[var(--figaro-on-surface-variant)]" />
              <span className="flex-1 text-[11px]">{a.nome}</span>
              <ChevronRight size={13} className="text-[var(--figaro-on-surface-variant)]" />
            </div>
          );
        })}
      </div>
      <Toque x={80} y={80} visivel={passo >= 2} apertando={passo === 3} />
    </TelaDaHistoria>
  );
}
