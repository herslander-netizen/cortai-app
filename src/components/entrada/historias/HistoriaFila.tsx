/**
 * Capítulo "Lista de espera" (dono, 06/11/2026: "explique como funciona para o profissional e para o cliente"), nas
 * duas visões: o CLIENTE entra na lista quando o horário está cheio (tela `/app/espera`: período preferido, "Sua
 * posição" e a regra de uma pessoa por vez); a EQUIPE vê a lista por dia, a vaga que abre quando alguém cancela e a
 * oferta para **uma pessoa por vez** com prazo (`ofertarVaga`, `PRAZO_DA_OFERTA_MIN`); o aviso de WhatsApp ("Boa
 * notícia, … Abriu uma vaga …", texto real de `notificacoes.server.ts`) e o aceite que preenche o horário. Sem resposta
 * no prazo ou com recusa, a vaga passa para o próximo da fila. Dados ilustrativos; só transform/opacity.
 */
import { motion } from "framer-motion";
import { Check, ChevronLeft, Hourglass, Sparkles } from "lucide-react";

import { MOLA } from "@/lib/movimento-figaro";
import { PRAZO_DA_OFERTA_MIN } from "@/lib/fila-compatibilidade";
import { TelaDaHistoria, Toque, usePassos, ritmo } from "./base";

// Mais conteúdo que os outros capítulos (duas visões): alvo maior para dar tempo de ler cada tela.
export const PASSOS_FILA = ritmo([1400, 1900, 1400, 1300, 1500, 1600, 1100, 1800], 10500);

const FILA = [
  { nome: "Carla S.", pedido: "Corte e finalização · tarde" },
  { nome: "Marina R.", pedido: "Hidratação profunda · manhã" },
  { nome: "Bruno L.", pedido: "Corte e finalização · qualquer horário" },
];

/** Etiqueta da visão: deixa claro quem está olhando a tela (cliente, equipe ou WhatsApp do cliente). */
function Visao({ texto }: { texto: string }) {
  return (
    <span className="rounded-full bg-[var(--figaro-surface-container-high)] px-2 py-0.5 text-[7.5px] font-bold uppercase tracking-wider text-[var(--figaro-on-surface-variant)]">
      {texto}
    </span>
  );
}

/**
 * Passos: 0 cliente pede a vaga · 1 cliente na posição · 2 equipe vê a lista · 3 vaga abre · 4 oferta à primeira ·
 * 5 aviso no WhatsApp · 6 aceite · 7 vaga preenchida.
 */
export function HistoriaFila() {
  const passo = usePassos(PASSOS_FILA);
  const noCliente = passo <= 1;
  const noZap = passo === 5 || passo === 6;
  const naLista = !noCliente && !noZap;
  const vaga = passo >= 3;
  const preenchida = passo >= 7;
  const toque = [
    { x: 50, y: 91, apertando: true },
    { x: 50, y: 50, visivel: false },
    { x: 50, y: 50, visivel: false },
    { x: 50, y: 50, visivel: false },
    { x: 50, y: 50, visivel: false },
    { x: 50, y: 50, visivel: false },
    { x: 17, y: 93, apertando: true },
    { x: 50, y: 50, visivel: false },
  ][passo]!;

  return (
    <TelaDaHistoria rotulo="lista de espera: vaga que abre, oferta para um cliente por vez e aceite pelo WhatsApp">
      <div className="relative h-full overflow-hidden">
        {/* Visão do cliente: horário cheio, entra na lista escolhendo o período e vê a posição e a regra. */}
        <motion.div
          className="absolute inset-0 flex flex-col bg-[var(--figaro-surface)] px-2.5 pt-2"
          initial={false}
          animate={{ opacity: noCliente ? 1 : 0, scale: noCliente ? 1 : 0.97 }}
          transition={{ duration: 0.25 }}
          style={{ pointerEvents: "none" }}
        >
          <div className="flex items-center gap-1.5 py-1">
            <span className="min-w-0 flex-1 leading-tight">
              <b className="block font-serif text-[15px]">Lista de espera</b>
              <span className="text-[8px] text-[var(--figaro-on-surface-variant)]">
                Horário cheio? Avisamos assim que vagar.
              </span>
            </span>
            <Visao texto="Cliente" />
          </div>
          <div className="mt-1.5 flex items-center justify-between rounded-[14px] bg-[var(--figaro-surface-container)] px-2.5 py-2">
            <span className="leading-tight">
              <b className="block text-[10px]">Sexta-feira, 14/11</b>
              <span className="text-[8px] text-[var(--figaro-on-surface-variant)]">
                Corte e finalização · Lucas
              </span>
            </span>
            <span className="rounded-full bg-[var(--figaro-surface-container-high)] px-2 py-0.5 text-[8px] font-bold text-[var(--figaro-on-surface-variant)]">
              Sem horários
            </span>
          </div>
          {passo === 0 ? (
            <>
              <p className="mb-1 mt-3 text-[8px] font-bold uppercase tracking-wider text-[var(--figaro-on-surface-variant)]">
                Quando você prefere?
              </p>
              <div className="flex flex-wrap gap-1">
                {["Qualquer horário", "Manhã (9h–12h)", "Tarde (13h–18h)"].map((j) => (
                  <span
                    key={j}
                    className={`rounded-full px-2.5 py-1 text-[8.5px] font-semibold ${
                      j.startsWith("Tarde")
                        ? "bg-[var(--figaro-primary)] text-[var(--figaro-on-primary)]"
                        : "bg-[var(--figaro-surface-container-high)] text-[var(--figaro-on-surface-variant)]"
                    }`}
                  >
                    {j}
                  </span>
                ))}
              </div>
              <span className="absolute inset-x-2.5 bottom-3 grid h-9 place-items-center rounded-full bg-[var(--figaro-primary)] text-[10px] font-bold text-[var(--figaro-on-primary)]">
                Entrar na lista de espera
              </span>
            </>
          ) : (
            <motion.div
              className="mt-3 rounded-[14px] bg-[color-mix(in_oklab,var(--sage)_16%,var(--figaro-surface))] px-3 py-2.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={MOLA.padraoEspacial}
            >
              <p className="text-[8px] text-[var(--figaro-on-surface-variant)]">Sua posição</p>
              <p className="font-serif text-[26px] font-bold leading-none">1º</p>
              <p className="mt-2 text-[8.5px] leading-snug">
                Avisamos pelo WhatsApp quando abrir uma vaga. A vaga é oferecida a uma pessoa por
                vez, e você tem {PRAZO_DA_OFERTA_MIN} minutos para aceitar.
              </p>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          className="absolute inset-0 flex flex-col px-2.5 pt-2"
          initial={false}
          animate={{ opacity: naLista ? 1 : 0, scale: naLista ? 1 : 0.97 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-center gap-1.5 py-1">
            <span className="grid size-7 place-items-center rounded-full bg-[var(--figaro-primary-container)] text-[var(--figaro-on-primary-container)]">
              <Hourglass size={14} />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <b className="block font-serif text-[15px]">Lista de espera</b>
              <span className="text-[8px] text-[var(--figaro-on-surface-variant)]">
                3 pessoas · uma oferta por vez
              </span>
            </span>
            <Visao texto="Equipe" />
          </div>

          <motion.div
            className="mt-1.5 flex items-center gap-2 rounded-[14px] px-2.5 py-2"
            initial={false}
            animate={{
              opacity: vaga ? 1 : 0,
              y: vaga ? 0 : -8,
              backgroundColor: preenchida
                ? "color-mix(in oklab, var(--sage) 22%, var(--figaro-surface))"
                : "var(--figaro-primary-container)",
            }}
            transition={MOLA.padraoEspacial}
          >
            <span className="grid size-6 place-items-center rounded-full bg-[var(--figaro-surface)] text-[var(--figaro-primary)]">
              {preenchida ? (
                <Check size={13} className="text-[var(--sage)]" />
              ) : (
                <Sparkles size={12} />
              )}
            </span>
            <span className="leading-tight text-[var(--figaro-on-primary-container)]">
              <b className="block text-[10px]">
                {preenchida ? "Vaga preenchida" : "Vaga aberta · sex., 14/11, 15:00"}
              </b>
              <span className="text-[8px] opacity-80">
                {preenchida ? "Carla S. confirmou pelo WhatsApp" : "Alguém cancelou este horário"}
              </span>
            </span>
          </motion.div>

          <p className="mb-1 mt-3 text-[8px] font-bold uppercase tracking-wider text-[var(--figaro-on-surface-variant)]">
            Sexta-feira, 14/11
          </p>
          <div className="space-y-[3px]">
            {FILA.map((p, i) => {
              const oferta = i === 0 && passo === 4;
              const marcada = i === 0 && preenchida;
              return (
                <motion.div
                  key={p.nome}
                  className="relative overflow-hidden rounded-[10px] bg-[var(--figaro-surface-container)] px-2.5 py-1.5"
                  initial={false}
                  animate={{ opacity: i > 0 && preenchida ? 0.7 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 leading-tight">
                      <b className="block text-[10px]">{p.nome}</b>
                      <span className="block truncate text-[8px] text-[var(--figaro-on-surface-variant)]">
                        {p.pedido}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold ${
                        marcada
                          ? "bg-[var(--sage)] text-[var(--figaro-on-primary)]"
                          : oferta || (i === 0 && passo >= 4)
                            ? "bg-[var(--figaro-primary)] text-[var(--figaro-on-primary)]"
                            : "bg-[var(--figaro-surface-container-high)] text-[var(--figaro-on-surface-variant)]"
                      }`}
                    >
                      {marcada
                        ? "Agendada"
                        : i === 0 && passo >= 4
                          ? `Oferta · ${PRAZO_DA_OFERTA_MIN} min`
                          : i === 0
                            ? "1º da fila"
                            : `${i + 1}º da fila`}
                    </span>
                  </div>
                  {oferta ? (
                    <motion.span
                      className="absolute inset-x-0 bottom-0 block h-[3px] origin-left bg-[var(--figaro-primary)]"
                      initial={{ scaleX: 1 }}
                      animate={{ scaleX: 0.6 }}
                      transition={{ duration: 1.4, ease: "linear" }}
                    />
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Aviso no WhatsApp da primeira da fila: texto real do Flow e aceite com um toque. */}
        <motion.div
          className="absolute inset-0 flex flex-col bg-[var(--figaro-surface)]"
          initial={false}
          animate={{ opacity: noZap ? 1 : 0, y: noZap ? 0 : 14 }}
          transition={MOLA.padraoEspacial}
          style={{ pointerEvents: "none" }}
        >
          <div className="flex items-center gap-2 border-b border-[var(--figaro-outline-variant)]/60 px-2 py-2">
            <ChevronLeft size={14} className="text-[var(--figaro-on-surface-variant)]" />
            <span className="grid size-7 place-items-center rounded-full bg-[var(--figaro-primary)] text-[var(--figaro-on-primary)]">
              <Sparkles size={13} />
            </span>
            <span className="leading-tight">
              <b className="block text-[11px]">Studio Aurora</b>
              <span className="text-[8px] text-[var(--figaro-on-surface-variant)]">online</span>
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-end gap-1 px-2 pb-2">
            <div className="max-w-[88%] self-start whitespace-pre-line rounded-[12px] rounded-tl-[4px] bg-[var(--figaro-surface-container-high)] px-2 py-1.5 text-[9px] leading-[1.35]">
              <p>
                Boa notícia, Carla. Abriu uma vaga em <b>Corte e finalização</b>.
              </p>
              <p className="mt-1">Sexta-feira, 14/11, às 15:00.</p>
              <p className="mt-1 text-[8px] text-[var(--figaro-on-surface-variant)]">
                A vaga fica reservada para você por {PRAZO_DA_OFERTA_MIN} minutos.
              </p>
            </div>
            <div className="flex gap-1.5 self-start">
              <motion.span
                className="rounded-full bg-[var(--sage)] px-3.5 py-1.5 text-[9px] font-bold text-[var(--figaro-on-primary)]"
                animate={{ scale: passo === 6 ? 0.92 : 1 }}
                transition={MOLA.rapidaEspacial}
              >
                Aceitar a vaga
              </motion.span>
              <span className="rounded-full border border-[var(--figaro-outline-variant)] px-3 py-1.5 text-[9px] font-semibold text-[var(--figaro-on-surface-variant)]">
                Não quero
              </span>
            </div>
          </div>
        </motion.div>
      </div>
      <Toque {...toque} />
    </TelaDaHistoria>
  );
}
