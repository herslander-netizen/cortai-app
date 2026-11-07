/**
 * Capítulo "Agenda" no roteiro do vídeo de referência do dono (06/11/2026): a agenda sobe como gaveta, o cliente toca o
 * dia, o horário (as profissionais abrem embaixo), escolhe a profissional, segue em "Continuar", preenche os dados,
 * verifica pelo WhatsApp com o código de 4 dígitos e vê a confirmação em tela cheia. Telas em `PartesDaAgenda.tsx`.
 * Dados ilustrativos.
 */
import { AnimatePresence, motion } from "framer-motion";

import { MOLA } from "@/lib/movimento-figaro";
import { TelaDaHistoria, Toque, usePassos, ritmo } from "./base";
import { BarraDoHorario, HorariosDoDia, ReservaConfirmada, SeusDados } from "./PartesDaAgenda";

// Último passo longo: a confirmação só aparece inteira depois da saída da tela anterior e do giro (≈1,3 s) e precisa ficar na tela.
export const PASSOS_AGENDA = ritmo([1100, 1100, 1300, 1200, 1000, 1700, 350, 1700, 350, 3400]);

const TOQUES = [
  { x: 50, y: 60, visivel: false },
  { x: 31, y: 17, apertando: true },
  { x: 30, y: 41, apertando: true },
  { x: 85, y: 38, apertando: true },
  { x: 85, y: 93, apertando: true },
  { x: 50, y: 49, apertando: false },
  { x: 50, y: 49, apertando: true },
  { x: 50, y: 70, apertando: false },
  { x: 50, y: 70, apertando: true },
  { x: 50, y: 50, visivel: false },
];

export function HistoriaAgenda() {
  const passo = usePassos(PASSOS_AGENDA);
  const tela = passo <= 4 ? "horarios" : passo <= 8 ? "dados" : "ok";

  return (
    <TelaDaHistoria rotulo="agendamento pelo cliente com dia, horário, profissional e verificação pelo WhatsApp">
      <div className="absolute inset-0 bg-[var(--figaro-inverse-surface)]/40" />
      <AnimatePresence mode="wait" initial={false}>
        {tela === "horarios" ? (
          <motion.div
            key="horarios"
            className="absolute inset-0 overflow-hidden bg-[var(--figaro-surface)]"
            // A agenda sobe como gaveta por cima da página, como no vídeo.
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ opacity: 0 }}
            transition={MOLA.padraoEspacial}
          >
            <HorariosDoDia diaEscolhido={passo >= 1} aberto={passo >= 2} escolhida={passo >= 3} />
            {passo >= 3 ? <BarraDoHorario apertando={passo === 4} /> : null}
          </motion.div>
        ) : tela === "dados" ? (
          <motion.div
            key="dados"
            className="absolute inset-0 bg-[var(--figaro-surface)]"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={MOLA.padraoEspacial}
          >
            <SeusDados comCodigo={passo >= 7} verificando={passo === 8} />
          </motion.div>
        ) : (
          <motion.div key="ok" className="absolute inset-0">
            <ReservaConfirmada />
          </motion.div>
        )}
      </AnimatePresence>
      <Toque {...TOQUES[passo]!} />
    </TelaDaHistoria>
  );
}
