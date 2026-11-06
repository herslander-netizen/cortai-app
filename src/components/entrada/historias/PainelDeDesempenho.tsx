/**
 * Painel "Desempenho" do capítulo Gestão (roteiro do vídeo de referência do dono, 06/11/2026): o menu escurece e os
 * números sobem em cartões — Sua Página nos últimos 7 dias, o serviço mais pedido nos últimos 30 dias e a Fidelidade —
 * com o botão para abrir. Recursos que existem no Flow; números ilustrativos. Só transform/opacity.
 */
import { motion } from "framer-motion";
import {
  CalendarDays,
  CircleDollarSign,
  Eye,
  Gift,
  Percent,
  Repeat2,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";

import { MOLA } from "@/lib/movimento-figaro";
import { Contador } from "./base";

type Bloco = { icone: typeof Eye; valor: ReactNode; rotulo: string };

function Grupo({
  titulo,
  nota,
  blocos,
  ordem,
}: {
  titulo: string;
  nota: string;
  blocos: Bloco[];
  ordem: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...MOLA.padraoEspacial, delay: 0.12 + ordem * 0.14 }}
    >
      <p className="mb-1 flex items-baseline gap-1.5 px-0.5 text-[10px] font-bold text-[var(--figaro-inverse-on-surface)]">
        {titulo}
        <span className="text-[7px] font-semibold uppercase tracking-wider opacity-70">{nota}</span>
      </p>
      <div className={`grid gap-1.5 ${blocos.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {blocos.map((b) => {
          const Icone = b.icone;
          return (
            <div key={b.rotulo} className="rounded-[12px] bg-[var(--figaro-surface)] px-2 py-1.5">
              <Icone size={10} className="text-[var(--figaro-primary)]" />
              <p className="text-[16px] font-bold leading-tight tabular-nums">{b.valor}</p>
              <p className="text-[8px] text-[var(--figaro-on-surface-variant)]">{b.rotulo}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function PainelDeDesempenho({ apertando }: { apertando: boolean }) {
  return (
    <motion.div
      className="absolute inset-0 z-10 flex flex-col gap-2.5 bg-[color-mix(in_oklab,var(--figaro-inverse-surface)_88%,transparent)] px-3 pt-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28 }}
    >
      <Grupo
        ordem={0}
        titulo="Sua Página"
        nota="7 dias"
        blocos={[
          { icone: Eye, valor: <Contador ate={1240} />, rotulo: "Visitas" },
          { icone: CalendarDays, valor: <Contador ate={186} />, rotulo: "Agend." },
          {
            icone: Percent,
            valor: <Contador ate={15} formatar={(n) => `${Math.round(n)}%`} />,
            rotulo: "Conversão",
          },
        ]}
      />
      <Grupo
        ordem={1}
        titulo="Corte e finalização"
        nota="30 dias"
        blocos={[
          { icone: CalendarDays, valor: <Contador ate={198} />, rotulo: "Agend." },
          {
            icone: CircleDollarSign,
            valor: <Contador ate={10.8} formatar={(n) => `${n.toFixed(1).replace(".", ",")}k`} />,
            rotulo: "Receita",
          },
          {
            icone: TrendingUp,
            valor: <Contador ate={12} formatar={(n) => `+${Math.round(n)}%`} />,
            rotulo: "No mês",
          },
        ]}
      />
      <Grupo
        ordem={2}
        titulo="Fidelidade"
        nota="30 dias"
        blocos={[
          { icone: Gift, valor: <Contador ate={76} />, rotulo: "Resgates" },
          {
            icone: Repeat2,
            valor: <Contador ate={3.7} formatar={(n) => `${n.toFixed(1).replace(".", ",")}k`} />,
            rotulo: "Receita",
          },
        ]}
      />
      <motion.span
        className="mx-auto mt-1 rounded-full bg-[var(--figaro-primary)] px-6 py-2 text-[10px] font-bold text-[var(--figaro-on-primary)]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, scale: apertando ? 0.92 : 1 }}
        transition={{ ...MOLA.padraoEspacial, delay: apertando ? 0 : 0.6 }}
      >
        Ver fidelidade
      </motion.span>
    </motion.div>
  );
}
