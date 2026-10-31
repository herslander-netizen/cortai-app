import { Link } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import {
  CartaoDeEmailNoMenu,
  CartaoDeWhatsappNoMenu,
} from "@/components/layout/CartoesDeConfiguracaoDoMenu";
import { CartaoAvisosDoMenu, FaixaDesempenho } from "@/components/layout/DrawerMenuExtras";

import { Button } from "@/components/ui/button";
import { IconeAgendaFigaro } from "@/components/ui/icones-figaro";
import { aviso } from "@/lib/avisos";

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

/**
 * Dois elos entrelaçados do cartão Sua Página, como no Figaro (captura do dono, 26/10): sobem para a direita (−45°),
 * o da frente em verde vivo e o de trás em verde escuro; o de trás volta por cima no cruzamento de baixo.
 */
function ElosDaPagina() {
  // Estádio de 10,8 × 6,6 (traço 2,4) girado −40°; cruzamento de baixo calculado em (23,61; 27,19).
  const elo = (cx: number, cy: number) => (
    <rect
      x={cx - 5.4}
      y={cy - 3.3}
      width="10.8"
      height="6.6"
      rx="3.3"
      transform={`rotate(-40 ${cx} ${cy})`}
    />
  );
  return (
    <span aria-hidden className="grid size-12 shrink-0 place-items-center">
      <svg viewBox="10 12 28 24" className="h-6 w-7" fill="none" strokeWidth="2.4">
        <defs>
          <clipPath id="elos-cruzamento">
            <circle cx="23.61" cy="27.19" r="2.4" />
          </clipPath>
        </defs>
        <g stroke="#406843">{elo(26.9, 23)}</g>
        <g stroke="#43a047">{elo(21.2, 24.9)}</g>
        <g stroke="#406843" clipPath="url(#elos-cruzamento)">
          {elo(26.9, 23)}
        </g>
      </svg>
    </span>
  );
}

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
    <div className="space-y-6">
      {slug ? (
        <div className="space-y-[3px]">
          <div
            className={`overflow-hidden bg-drawer-card ${tenantId && verDesempenho ? "rounded-b-[4px] rounded-t-[28px]" : "rounded-[28px]"}`}
          >
            <div className="grid min-h-[56px] grid-cols-[minmax(0,1fr)_40px] items-center pl-1 pr-3">
              {/* Como no Figaro (`onOpenSuaPagina`): o cartão fecha o menu e abre o Personalizar Página; a página
                  pública abre por "Ver como ficou", dentro dele. */}
              <Link
                to="/barbeiro/marca"
                onClick={fechar}
                className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center gap-[3px] py-1"
              >
                <ElosDaPagina />
                <span className="min-w-0">
                  <span className="block truncate text-[16px] font-semibold leading-6 text-paper">
                    Sua Página
                  </span>
                  {paginaPublicada ? (
                    <span className="flex items-center gap-2 text-[13px] font-medium leading-[18px] text-mute">
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

      {/* Ordem do Figaro: e-mail, notificações do aparelho e alerta de WhatsApp (some quando os dois primeiros aparecem juntos). */}
      <CartaoDeEmailNoMenu />
      <CartaoAvisosDoMenu tenantId={tenantId} />
      <CartaoDeWhatsappNoMenu tenantId={tenantId} />

      <Link
        to="/barbeiro"
        onClick={fechar}
        aria-current={agendaAtiva ? "page" : undefined}
        // Figaro (foto do dono, 31/10): 68 px, cantos de 28 e sem contorno, mesmo com a Agenda aberta.
        className="grid min-h-[68px] grid-cols-[24px_minmax(0,1fr)_8px] items-center gap-4 rounded-[28px] bg-drawer-card px-5 py-3"
      >
        {/* Como no Figaro: calendário cheio, sem ladrilho atrás. */}
        <IconeAgendaFigaro className="size-6" />
        <span className="min-w-0">
          <span className="block truncate text-lg font-semibold leading-6 text-paper">Agenda</span>
          <span className="block truncate text-base font-medium leading-5 text-mute">
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
