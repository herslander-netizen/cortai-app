import { Check, ChevronDown, Lock, Minus, Plus, Sparkles, Wrench } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { brl } from "@/lib/format";
import {
  maximoDeProfissionais,
  planoParaProfissionais,
  type SituacaoDoPaywall,
} from "@/lib/escolha-de-plano";
import type { PlanoDisponivel } from "@/lib/planos.functions";

/**
 * Tela "Selecione um Plano" do Figaro (`PaywallScreen`): selo de situação, título, seletor com − e +
 * (no Figaro são cadeiras; aqui, profissionais), preço do plano que comporta a equipe, "Todos os recursos
 * incluídos" e o botão grande de baixo. Preço e limites vêm dos planos reais; nada é inventado.
 */
export function EscolhaDePlano({
  planos,
  profissionais,
  aoMudarProfissionais,
  situacao,
  rotuloDoBotao,
  desabilitado,
  ocupado,
  aoContinuar,
}: {
  planos: PlanoDisponivel[];
  profissionais: number;
  aoMudarProfissionais: (n: number) => void;
  situacao: SituacaoDoPaywall | null;
  rotuloDoBotao: (plano: PlanoDisponivel) => string;
  desabilitado: boolean;
  ocupado: boolean;
  aoContinuar: (plano: PlanoDisponivel) => void;
}) {
  const [recursos, setRecursos] = useState(false);
  const maximo = maximoDeProfissionais(planos);
  const plano = planoParaProfissionais(planos, profissionais);
  const gratis = plano?.precoMensalCentavos === 0;

  return (
    <>
      <section aria-labelledby="titulo-da-escolha" className="-mx-4 sm:mx-0">
        <div className="rounded-b-[40px] bg-ink3 px-6 pb-10 pt-8 text-center sm:rounded-[40px]">
          {situacao ? (
            <p
              className={`mx-auto mb-5 inline-flex min-h-8 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wide ${situacao.tom === "aviso" ? "bg-ink2 text-gold" : "bg-ink2 text-paper"}`}
            >
              <Lock size={16} aria-hidden />
              {situacao.texto}
            </p>
          ) : null}
          <h2
            id="titulo-da-escolha"
            className="text-[34px] font-bold leading-tight tracking-tight text-paper"
          >
            Selecione um Plano
          </h2>
          <p className="mx-auto mt-4 max-w-xs text-base leading-6 text-mute">
            Escolha quantos profissionais atendem no seu negócio e continue com o Flow.
          </p>
        </div>

        <div className="mx-4 -mt-5 rounded-[28px] bg-[var(--agenda-cartao,var(--ink2))] px-6 py-8 text-center sm:mx-0">
          <p className="text-base font-semibold text-paper">Quantos profissionais você precisa?</p>
          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              type="button"
              aria-label="Menos um profissional"
              disabled={profissionais <= 1}
              onClick={() => aoMudarProfissionais(profissionais - 1)}
              className="flex size-[70px] items-center justify-center rounded-full bg-ink3 text-mute transition-colors duration-200 enabled:text-paper enabled:active:bg-ink2 disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Minus size={28} aria-hidden />
            </button>
            <span aria-live="polite" className="text-[72px] font-bold leading-none text-paper">
              {profissionais}
            </span>
            <button
              type="button"
              aria-label="Mais um profissional"
              disabled={profissionais >= maximo}
              onClick={() => aoMudarProfissionais(profissionais + 1)}
              className="flex size-[70px] items-center justify-center rounded-full bg-gold text-background transition-opacity duration-200 disabled:opacity-40 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus size={28} aria-hidden />
            </button>
          </div>
          <p className="mt-8 text-[44px] font-bold leading-none text-gold">
            {plano ? (gratis ? "Grátis" : brl(plano.precoMensalCentavos)) : "—"}
            {plano && !gratis ? (
              <span className="ml-1 text-lg font-normal text-mute">/mês</span>
            ) : null}
          </p>
        </div>

        <p className="mx-6 mt-6 text-center text-sm leading-5 text-mute">
          {plano
            ? `Plano ${plano.nome}${plano.limites.profissionais ? ` · até ${plano.limites.profissionais} ${plano.limites.profissionais === 1 ? "profissional" : "profissionais"}` : ""}.`
            : "Nenhum plano comporta essa equipe."}
        </p>

        <button
          type="button"
          onClick={() => setRecursos(true)}
          className="mx-4 mt-6 flex min-h-[68px] w-[calc(100%-2rem)] items-center gap-4 rounded-[20px] bg-[var(--agenda-cartao,var(--ink2))] px-5 text-left text-base font-semibold text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mx-0 sm:w-full"
        >
          <Sparkles size={24} className="shrink-0 text-gold" aria-hidden />
          <span className="min-w-0 flex-1">Todos os recursos incluídos</span>
          <ChevronDown size={22} className="shrink-0 text-mute" aria-hidden />
        </button>

        <p className="mx-6 mt-6 text-center text-xs leading-5 text-mute">
          Renove automaticamente. Cancele quando quiser. Veja os{" "}
          <a href="/privacidade" className="text-gold underline">
            Termos de Uso e a Política de Privacidade
          </a>
          .
        </p>

        <div className="sticky bottom-0 z-10 mt-6 bg-gradient-to-t from-background via-background to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-0">
          <Button
            size="lg"
            className="min-h-14 w-full rounded-full text-base font-semibold"
            disabled={!plano || desabilitado || ocupado}
            onClick={() => {
              if (plano) aoContinuar(plano);
            }}
          >
            {ocupado ? "Aplicando…" : plano ? rotuloDoBotao(plano) : "Sem plano para essa equipe"}
          </Button>
        </div>
      </section>

      <Sheet open={recursos} onOpenChange={setRecursos}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px]"
        >
          <SheetHeader className="items-center text-center">
            <span className="mx-auto flex size-[100px] items-center justify-center rounded-[28px] bg-ink3 text-gold">
              <Wrench size={48} aria-hidden />
            </span>
            <SheetTitle className="mt-4 text-[32px] font-bold">Recursos</SheetTitle>
            <SheetDescription className="text-base">
              {plano
                ? `O que está incluído no plano ${plano.nome}.`
                : "Escolha um plano para ver os recursos."}
            </SheetDescription>
          </SheetHeader>
          {plano ? (
            <ul className="mt-6 flex flex-col rounded-[28px] bg-[var(--agenda-cartao,var(--ink2))] px-6 py-2">
              {plano.recursos
                .filter((r) => r.liberado)
                .map((r) => (
                  <li
                    key={r.chave}
                    className="flex min-h-14 items-center gap-4 text-base text-paper"
                  >
                    <Check size={22} className="shrink-0 text-gold" aria-hidden />
                    {r.rotulo}
                  </li>
                ))}
              <li className="flex min-h-14 items-center gap-4 text-base text-mute">
                <Sparkles size={22} className="shrink-0" aria-hidden />
                Muito mais em breve…
              </li>
            </ul>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
