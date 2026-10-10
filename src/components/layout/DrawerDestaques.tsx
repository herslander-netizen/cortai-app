import { Link } from "@tanstack/react-router";
import { CalendarDays, Link2, Share2 } from "lucide-react";
import { CartaoAvisosDoMenu, FaixaDesempenho } from "@/components/layout/DrawerMenuExtras";

import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { IconeDoMenu } from "@/components/layout/IconeDoMenu";

type Props = {
  slug: string | null | undefined;
  paginaPublicada: boolean;
  resumoDaAgenda: string | null;
  agendaAtiva: boolean;
  operacaoAberta: boolean | null;
  tenantId: string | null;
  verDesempenho: boolean;
  menuAberto: boolean;
  fechar: () => void;
};

export function DrawerDestaques({
  slug,
  paginaPublicada,
  resumoDaAgenda,
  agendaAtiva,
  operacaoAberta,
  tenantId,
  verDesempenho,
  menuAberto,
  fechar,
}: Props) {
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
        <div className="space-y-2">
          <div
            className={`overflow-hidden border border-drawer-borda bg-drawer-card ${tenantId && verDesempenho ? "rounded-b-[10px] rounded-t-[28px]" : "rounded-[28px]"}`}
          >
            <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_48px] items-center pl-5 pr-2">
              <Link
                to="/b/$slug"
                params={{ slug }}
                onClick={fechar}
                className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-center gap-3 py-3"
              >
                <IconeDoMenu icone={Link2} destaque />
                <span className="min-w-0">
                  <span className="block truncate text-lg font-semibold text-paper">
                    Sua Página
                  </span>
                  {paginaPublicada ? (
                    <span className="mt-0.5 flex items-center gap-2 text-sm text-sage">
                      <span className="size-2.5 rounded-full bg-sage" aria-hidden /> Online
                    </span>
                  ) : null}
                </span>
              </Link>
              <Button
                variant="icon"
                size="icon"
                aria-label="Compartilhar sua página"
                onClick={() => void compartilhar()}
                className="size-12 rounded-full text-menu-icone"
              >
                <Share2 className="size-[22px]" aria-hidden />
              </Button>
            </div>
          </div>
          {tenantId && verDesempenho ? (
            <FaixaDesempenho tenantId={tenantId} ativo={menuAberto} />
          ) : null}
        </div>
      ) : null}

      <CartaoAvisosDoMenu tenantId={tenantId} />

      <Link
        to="/barbeiro"
        onClick={fechar}
        aria-current={agendaAtiva ? "page" : undefined}
        className={`grid min-h-20 grid-cols-[44px_minmax(0,1fr)_12px] items-center gap-3 rounded-[30px] border border-drawer-borda bg-drawer-card px-5 py-4 ${agendaAtiva ? "ring-2 ring-primary/30" : ""}`}
      >
        <IconeDoMenu icone={CalendarDays} destaque ativo={agendaAtiva} />
        <span className="min-w-0">
          <span className="block truncate text-[22px] font-semibold leading-tight text-paper">
            Agenda
          </span>
          <span className="mt-0.5 block truncate text-sm text-mute">
            {operacaoAberta === false ? "Hoje · fechado" : (resumoDaAgenda ?? "Hoje")}
          </span>
        </span>
        <span
          className={`size-2.5 rounded-full ${operacaoAberta ? "bg-sage" : "bg-mute2"}`}
          aria-label={operacaoAberta ? "Aberta" : "Fechada"}
        />
      </Link>
    </div>
  );
}
