import { Link } from "@tanstack/react-router";
import { CalendarDays, Link2, Share2, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";

type Props = {
  slug: string | null | undefined;
  resumoDaAgenda: string | null;
  agendaAtiva: boolean;
  operacaoAberta: boolean | null;
  horarioFinal: string | undefined;
  fechar: () => void;
};

export function DrawerDestaques({ slug, resumoDaAgenda, agendaAtiva, operacaoAberta, horarioFinal, fechar }: Props) {
  async function compartilhar() {
    if (!slug) return;
    const url = `${window.location.origin}/b/${slug}`;
    try {
      if (navigator.share) await navigator.share({ title: "Sua Página", url });
      else {
        await navigator.clipboard.writeText(url);
        aviso.ok("Link copiado.");
      }
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === "AbortError") return;
      aviso.erro("Não foi possível compartilhar agora.");
    }
  }

  return (
    <div className="space-y-4">
      {slug ? (
        <div className="overflow-hidden rounded-[28px] bg-drawer-card">
          <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_48px] items-center pl-5 pr-2">
            <Link
              to="/b/$slug"
              params={{ slug }}
              onClick={fechar}
              className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-3 py-3"
            >
              <Link2 className="size-7 text-sage" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold text-paper">Sua Página</span>
                <span className="mt-0.5 flex items-center gap-2 text-sm text-sage">
                  <span className="size-2.5 rounded-full bg-sage" aria-hidden /> Online
                </span>
              </span>
            </Link>
            <Button variant="icon" size="icon" aria-label="Compartilhar sua página" onClick={() => void compartilhar()} className="rounded-full text-primary">
              <Share2 className="size-6" aria-hidden />
            </Button>
          </div>
          <div className="flex min-h-10 items-center gap-2 bg-drawer-band px-5 py-2 text-sm text-mute">
            <TrendingUp className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{resumoDaAgenda ?? "O desempenho aparecerá aqui"}</span>
          </div>
        </div>
      ) : null}

      <Link
        to="/barbeiro"
        onClick={fechar}
        aria-current={agendaAtiva ? "page" : undefined}
        className={`grid min-h-20 grid-cols-[40px_minmax(0,1fr)_12px] items-center gap-3 rounded-[30px] bg-drawer-card px-5 py-4 ${agendaAtiva ? "ring-2 ring-primary/30" : ""}`}
      >
        <CalendarDays className="size-8 text-primary" aria-hidden />
        <span className="min-w-0">
          <span className="block truncate text-[22px] font-semibold leading-tight text-paper">Agenda</span>
          <span className="mt-0.5 block truncate text-sm text-mute">
            {operacaoAberta === null
              ? "Hoje"
              : operacaoAberta
                ? `Hoje · aberta até ${horarioFinal ?? "—"}`
                : "Hoje · fechado"}
          </span>
        </span>
        <span className={`size-2.5 rounded-full ${operacaoAberta ? "bg-sage" : "bg-mute2"}`} aria-label={operacaoAberta ? "Aberta" : "Fechada"} />
      </Link>
    </div>
  );
}