/**
 * Moldura de cada passo do Onboarding (dono, 06/11/2026: "uma geral visual no Onboarding, algumas coisas estão
 * feias"). Barra de progresso fina em segmentos e o rodapé fixo no padrão Figaro: voltar redondo e uma pílula
 * principal, sem linha de separação; "Pular por agora" discreto embaixo.
 */
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ProgressoDoOnboarding({ indice, total }: { indice: number; total: number }) {
  return (
    <div
      className="mb-6 flex gap-1"
      role="progressbar"
      aria-label="Progresso da configuração"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={indice + 1}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1 flex-1 rounded-full ${
            i <= indice ? "bg-[var(--figaro-primary,var(--gold))]" : "bg-ink3"
          }`}
        />
      ))}
    </div>
  );
}

export function RodapeDoPasso({
  onContinuar,
  rotulo = "Continuar",
  desabilitado = false,
  carregando = false,
  onVoltar,
  onPular,
}: {
  onContinuar: () => void;
  rotulo?: string;
  desabilitado?: boolean;
  carregando?: boolean;
  onVoltar?: (() => void) | undefined;
  onPular?: (() => void) | undefined;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-8 bg-[linear-gradient(to_bottom,transparent,var(--ink)_28%)] px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-6">
      <div className="flex items-center gap-3">
        {onVoltar ? (
          <Button
            variant="outline"
            size="icon"
            type="button"
            aria-label="Voltar ao passo anterior"
            className="size-14 shrink-0 rounded-full"
            onClick={onVoltar}
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Button>
        ) : null}
        <Button
          loading={carregando}
          variant="primary"
          type="button"
          className="h-14 flex-1 rounded-full text-[15px] font-semibold"
          disabled={desabilitado || carregando}
          onClick={onContinuar}
        >
          {rotulo}
        </Button>
      </div>
      {onPular ? (
        <Button
          variant="ghost"
          type="button"
          className="mt-1 min-h-12 w-full text-[13px] text-mute"
          onClick={onPular}
        >
          Pular por agora
        </Button>
      ) : null}
    </div>
  );
}

/** Linha clicável em cartão (atalhos como "Trabalho sozinho" e "Usar padrão recomendado"). */
export function AtalhoDoPasso({
  icone,
  titulo,
  detalhe,
  onClick,
  desabilitado,
}: {
  icone: React.ReactNode;
  titulo: string;
  detalhe: string;
  onClick: () => void;
  desabilitado?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      className="flex h-auto min-h-16 w-full items-center justify-start gap-4 whitespace-normal rounded-[28px] bg-[var(--agenda-cartao,var(--figaro-card-tile))] px-5 py-3 text-left font-normal"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--figaro-primary-container,var(--gold-soft))] text-[var(--figaro-on-primary-container,var(--gold))] [&_svg]:size-5">
        {icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-paper">{titulo}</span>
        <span className="block text-[13px] leading-5 text-mute">{detalhe}</span>
      </span>
    </Button>
  );
}
