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

/** Texto que acompanha o link na folha de compartilhar (`page_hub_share_page_url_message` do Figaro, em termos neutros). */
export const MENSAGEM_DE_COMPARTILHAR = "Dê uma olhada na nossa página!";

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
      if (navigator.share)
        await navigator.share({ title: "Sua Página", text: MENSAGEM_DE_COMPARTILHAR, url });
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
            className={`overflow-hidden bg-drawer-card ${tenantId && verDesempenho ? "rounded-b-[10px] rounded-t-[28px]" : "rounded-[28px]"}`}
          >
            <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_40px] items-center pl-4 pr-3">
              {/* Como no Figaro (`onOpenSuaPagina`): o cartão fecha o menu e abre o Personalizar Página; a página
                  pública abre por "Ver como ficou", dentro dele. */}
              <Link
                to="/barbeiro/marca"
                onClick={fechar}
                className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center gap-3 py-3"
              >
                <IconeDoMenu icone={Link2} destaque />
                <span className="min-w-0">
                  <span className="block truncate text-lg font-semibold text-paper">
                    Sua Página
                  </span>
                  {paginaPublicada ? (
                    <span className="mt-0.5 flex items-center gap-2 text-[13px] font-medium leading-[18px] text-sage">
                      <span className="size-[7px] rounded-full bg-sage" aria-hidden /> Online
                    </span>
                  ) : null}
                </span>
              </Link>
              <Button
                variant="icon"
                size="icon"
                aria-label="Compartilhar sua página"
                onClick={() => void compartilhar()}
                className="size-10 rounded-full text-primary"
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
        className={`grid min-h-[60px] grid-cols-[56px_minmax(0,1fr)_8px] items-center gap-3 rounded-[28px] bg-drawer-card px-5 py-3 ${agendaAtiva ? "ring-2 ring-primary/30" : ""}`}
      >
        <IconeDoMenu icone={CalendarDays} destaque grande ativo={agendaAtiva} />
        <span className="min-w-0">
          <span className="block truncate text-[22px] font-semibold leading-tight text-paper">
            Agenda
          </span>
          <span className="mt-0.5 block truncate text-[13px] font-medium leading-[18px] text-mute">
            {operacaoAberta === false ? "Hoje · fechado" : (resumoDaAgenda ?? "Hoje")}
          </span>
        </span>
        <span
          className={`size-2 rounded-full ${operacaoAberta ? "bg-sage" : "bg-mute2"}`}
          aria-label={operacaoAberta ? "Aberta" : "Fechada"}
        />
      </Link>
    </div>
  );
}
