import { useReducedMotion, motion } from "framer-motion";
import { Check, ChevronRight, Circle, MapPin, Scissors, UsersRound, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { ETAPAS_DO_ONBOARDING } from "@/lib/onboarding.functions";
import { MOLA } from "@/lib/movimento-figaro";

type PassoInicial = {
  etapa: "dados" | "equipe" | "servicos";
  titulo: string;
  descricao: string;
  icone: LucideIcon;
};

const PASSOS_INICIAIS: PassoInicial[] = [
  {
    etapa: "dados",
    titulo: "Definir seu espaço",
    descricao: "Comece com os dados, contato e endereço do seu negócio.",
    icone: MapPin,
  },
  {
    etapa: "equipe",
    titulo: "Adicionar equipe",
    descricao: "Quem faz acontecer.",
    icone: UsersRound,
  },
  {
    etapa: "servicos",
    titulo: "Configurar serviços",
    descricao: "O que você oferece de melhor.",
    icone: Scissors,
  },
];

export type BoasVindasDoOnboardingProps = {
  /** Índice da etapa persistida no onboarding real do Flow. */
  indicePersistido: number;
  continuarLabel: string;
  onAbrirPasso: (etapa: PassoInicial["etapa"]) => void;
  onContinuar: () => void;
  onDepois: () => void;
};

/** Entrada do onboarding no padrão Figaro, mantendo as etapas reais do Flow. */
export function BoasVindasDoOnboarding({
  indicePersistido,
  continuarLabel,
  onAbrirPasso,
  onContinuar,
  onDepois,
}: BoasVindasDoOnboardingProps) {
  const reduzirMovimento = useReducedMotion();

  return (
    <motion.div
      initial={reduzirMovimento ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduzirMovimento ? { duration: 0 } : MOLA.rapidaEfeito}
      className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-[520px] flex-col gap-4 py-4"
    >
      <Card
        variant="surface"
        density="none"
        className="rounded-[28px] px-5 py-6 text-center"
      >
        <h1 className="mb-3 text-sm font-semibold text-paper">Bem-vindo ao</h1>
        <MarcaFlow variante="automatica" className="mx-auto h-9 w-auto" />
        <p className="mt-4 text-sm leading-relaxed text-mute">
          Seu negócio agora tem uma nova casa.
        </p>
      </Card>

      <Card variant="surface" density="none" className="overflow-hidden rounded-[28px]">
        <div className="px-5 pb-4 pt-5 text-center">
          <Badge
            variant="default"
            className="border-transparent bg-[var(--gold)] px-4 py-1.5 text-[11px] text-[var(--ink)]"
          >
            3 PASSOS
          </Badge>
          <p className="mt-4 text-base font-semibold leading-relaxed text-paper">
            Seu negócio pronto para receber agendamentos online.
          </p>
        </div>
        <div className="divide-y divide-line">
          {PASSOS_INICIAIS.map((passo) => {
            const indicePasso = ETAPAS_DO_ONBOARDING.indexOf(passo.etapa);
            const concluido = indicePersistido > indicePasso;
            const atual = !concluido && indicePersistido === indicePasso;
            const bloqueado = !concluido && indicePersistido < indicePasso;
            const IconePasso = passo.icone;

            return (
              <Button
                key={passo.etapa}
                type="button"
                variant="ghost"
                size="bloco"
                disabled={bloqueado}
                aria-current={atual ? "step" : undefined}
                onClick={() => onAbrirPasso(passo.etapa)}
                className="min-h-[76px] w-full flex-row items-center gap-3 rounded-none px-4 py-3 text-left"
              >
                <span
                  className={`grid size-14 shrink-0 place-items-center rounded-[18px] ${
                    concluido || atual
                      ? "bg-[var(--gold)] text-[var(--ink)]"
                      : "bg-[var(--figaro-surface-container-highest,var(--ink3))] text-mute"
                  }`}
                  aria-hidden
                >
                  {concluido ? <Check size={22} /> : <IconePasso size={22} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-semibold ${
                      bloqueado ? "text-mute" : "text-paper"
                    }`}
                  >
                    {passo.titulo}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-mute">
                    {passo.descricao}
                  </span>
                  <span className="mt-1 block text-[11px] text-mute2">
                    {concluido ? "Concluído" : atual ? "Etapa atual" : "Não iniciado"}
                  </span>
                </span>
                {bloqueado ? (
                  <Circle size={18} className="shrink-0 text-mute2" aria-hidden />
                ) : (
                  <ChevronRight size={20} className="shrink-0 text-[var(--gold)]" aria-hidden />
                )}
              </Button>
            );
          })}
        </div>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-5 mt-auto border-t border-line bg-ink px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        <Button
          variant="primary"
          size="lg"
          type="button"
          className="w-full"
          onClick={onContinuar}
        >
          {continuarLabel}
          <ChevronRight size={18} aria-hidden />
        </Button>
        <Button
          variant="ghost"
          type="button"
          className="mt-2 min-h-12 w-full text-xs text-mute"
          onClick={onDepois}
        >
          Fazer isso depois
        </Button>
      </div>
    </motion.div>
  );
}
