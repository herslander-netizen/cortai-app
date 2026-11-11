import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { CAPITULOS } from "@/components/entrada/historias/capitulos";
import { Celular } from "@/components/entrada/historias/Celular";
import { IconesDosCapitulos } from "@/components/entrada/IconesDosCapitulos";
import { OndasDaEntrada } from "@/components/entrada/OndasDaEntrada";
import { MOLA } from "@/lib/movimento-figaro";

// Depois de um toque ou arrasto o capítulo espera um pouco antes de voltar ao automático (a barrinha mostra o tempo).
const RESUME_AFTER_INTERACTION_MS = 3000;

export type FlowWelcomeProps = {
  onCreateAccount?: () => void;
  onSignIn?: () => void;
  onCustomerBooking?: () => void;
};

export function FlowWelcome({ onCreateAccount, onSignIn, onCustomerBooking }: FlowWelcomeProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pausedUntil, setPausedUntil] = useState(0);
  /** 1 = avançou, -1 = voltou: a tela entra pelo lado certo. */
  const [direcao, setDirecao] = useState<1 | -1>(1);
  const reduceMotion = useReducedMotion();

  const interact = useCallback((nextIndex: number) => {
    setActiveIndex((atual) => {
      setDirecao(nextIndex < atual ? -1 : 1);
      return (nextIndex + CAPITULOS.length) % CAPITULOS.length;
    });
    setPausedUntil(Date.now() + RESUME_AFTER_INTERACTION_MS);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const pauseRemaining = Math.max(0, pausedUntil - Date.now());
    // Cada capítulo dura o tempo da sua mini-história (passos + respiro).
    const timer = window.setTimeout(() => {
      setDirecao(1);
      setActiveIndex((index) => (index + 1) % CAPITULOS.length);
    }, pauseRemaining + CAPITULOS[activeIndex]!.duracao);

    return () => window.clearTimeout(timer);
  }, [activeIndex, pausedUntil, reduceMotion]);

  const capitulo = CAPITULOS[activeIndex]!;
  /** Chegada em cascata na primeira abertura: logo, frase, celular, ícones e botões (só transform/opacity). */
  const chegada = (ordem: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { ...MOLA.lentaEspacial, delay: 0.06 + ordem * 0.09 },
        };
  const deslocamento = reduceMotion ? 0 : 28 * direcao;

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-ink px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(40px+env(safe-area-inset-top))] text-paper [@media(max-height:720px)]:pb-[calc(12px+env(safe-area-inset-bottom))] [@media(max-height:720px)]:pt-[calc(18px+env(safe-area-inset-top))]">
      <OndasDaEntrada />

      <motion.header className="relative z-10 flex shrink-0 flex-col items-center" {...chegada(0)}>
        <MarcaFlow
          variante="escura"
          className="h-auto w-[min(42vw,160px)] [@media(max-height:720px)]:w-[min(30vw,112px)]"
          prioridade
        />
        <p className="mt-1.5 text-center text-[14px] font-medium tracking-[0.01em] text-mute [@media(max-height:720px)]:mt-0.5 [@media(max-height:720px)]:text-[12px]">
          Seu negócio no ritmo certo.
        </p>
      </motion.header>

      <section
        aria-label="Conheça os recursos do Flow"
        className="relative z-10 flex min-h-[320px] flex-1 flex-col pt-5 [@media(max-height:720px)]:pt-3"
      >
        {/* Cartão como no vídeo: só a tela e a legenda mudam. Arrastar para os lados troca de capítulo. */}
        <motion.div
          className="relative min-h-[240px] flex-1"
          {...chegada(1)}
          drag={reduceMotion ? false : "x"}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragStart={() => {
            setPausedUntil(Date.now() + RESUME_AFTER_INTERACTION_MS);
          }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -45 || info.velocity.x < -350) {
              interact(activeIndex + 1);
            } else if (info.offset.x > 45 || info.velocity.x > 350) {
              interact(activeIndex - 1);
            }
          }}
          style={{ touchAction: "pan-y" }}
        >
          <Celular
            legenda={
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeIndex + "-caption"}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                  transition={{ duration: 0.12 }}
                >
                  {/* Rótulo e frase entram em dois tempos, como no vídeo de referência. */}
                  <motion.p
                    className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--entrada-rosa)]"
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={MOLA.padraoEspacial}
                  >
                    {capitulo.rotulo}
                  </motion.p>
                  <motion.h1
                    className="whitespace-pre-line text-[15px] font-medium leading-snug tracking-[-0.01em] text-[var(--figaro-inverse-on-surface)] [@media(max-width:370px)]:text-[14px]"
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...MOLA.padraoEspacial, delay: reduceMotion ? 0 : 0.07 }}
                  >
                    {capitulo.frase}
                  </motion.h1>
                </motion.div>
              </AnimatePresence>
            }
          >
            <AnimatePresence mode="wait" initial={false} custom={deslocamento}>
              <motion.div
                key={activeIndex}
                className="h-full w-full"
                custom={deslocamento}
                variants={{
                  entra: (d: number) => ({ opacity: 0, x: d, scale: d ? 0.985 : 1 }),
                  fica: { opacity: 1, x: 0, scale: 1 },
                  sai: (d: number) => ({ opacity: 0, x: -d * 0.6 }),
                }}
                initial="entra"
                animate="fica"
                exit="sai"
                transition={MOLA.padraoEspacial}
              >
                {capitulo.historia()}
              </motion.div>
            </AnimatePresence>
          </Celular>
        </motion.div>

        <motion.div {...chegada(2)}>
          <IconesDosCapitulos
            capitulos={CAPITULOS}
            ativo={activeIndex}
            duracaoMs={Math.max(0, pausedUntil - Date.now()) + capitulo.duracao}
            reinicio={`${activeIndex}-${pausedUntil}`}
            onEscolher={interact}
          />
        </motion.div>
      </section>

      <motion.footer
        className="relative z-10 flex shrink-0 flex-col items-center gap-2.5 [@media(max-height:720px)]:gap-0"
        {...chegada(3)}
      >
        <Button
          type="button"
          variant="primary"
          size="lg"
          aria-label="Começar agora: criar conta no Flow"
          onClick={onCreateAccount}
          disabled={!onCreateAccount}
          className="h-14 w-full rounded-full font-bold"
        >
          Começar agora
        </Button>

        <p className="text-center text-[13px] text-mute">
          Já possui conta?{" "}
          <Button
            type="button"
            variant="link"
            aria-label="Entrar na sua conta"
            onClick={onSignIn}
            disabled={!onSignIn}
            className="h-auto min-h-12 px-1 font-bold text-[var(--figaro-primary)]"
          >
            Faça login
          </Button>
        </p>

        <Button
          type="button"
          variant="link"
          aria-label="Sou cliente e quero só agendar"
          onClick={onCustomerBooking}
          disabled={!onCustomerBooking}
          className="mt-1 h-auto min-h-12 text-center text-[13px] font-medium text-mute [@media(max-height:720px)]:mt-0"
        >
          Sou cliente e quero só agendar
        </Button>
      </motion.footer>
    </div>
  );
}

export default FlowWelcome;
