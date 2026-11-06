/**
 * Lista de espera dentro da lista da Agenda (dono, 06/11/2026): "2 na espera ›" discreto na onda do dia e a gaveta
 * padrão com quem está esperando e a oferta em andamento. Só leitura; agendar, mover e remover ficam na tela da lista.
 */
import { useNavigate } from "@tanstack/react-router";

import { AcaoDaFolha, CartaoDaFolha, FolhaPadrao } from "@/components/ui/folha-padrao";
import { Button } from "@/components/ui/button";
import { useAgora } from "@/hooks/useAgora";
import { LINKS_DE_TELA } from "@/lib/links-de-tela";
import {
  minutosParaExpirar,
  periodoDaPessoa,
  type PessoaNaEspera,
} from "@/lib/lista-espera-agenda";

import { OndaDaLista } from "./HorarioDaLista";
import { hora } from "./tempo";

export function EsperaNaOnda({ total, onAbrir }: { total: number; onAbrir: () => void }) {
  return (
    <OndaDaLista>
      <Button
        variant="text"
        size="sm"
        className="agenda-lista-onda-acao"
        aria-label={`${total} ${total === 1 ? "pessoa" : "pessoas"} na lista de espera deste dia`}
        onClick={onAbrir}
      >
        {total} na espera ›
      </Button>
    </OndaDaLista>
  );
}

export function FolhaDaEspera({
  aberta,
  onAberta,
  tituloDoDia,
  pessoas,
  fuso,
}: {
  aberta: boolean;
  onAberta: (aberta: boolean) => void;
  tituloDoDia: string;
  pessoas: readonly PessoaNaEspera[];
  fuso: string;
}) {
  const agora = useAgora();
  const navegar = useNavigate();
  return (
    <FolhaPadrao
      aberto={aberta}
      onAberto={onAberta}
      titulo="Lista de espera"
      descricao={`${tituloDoDia} · ${pessoas.length} ${pessoas.length === 1 ? "pessoa" : "pessoas"}`}
      rodape={
        <AcaoDaFolha className="w-full" onClick={() => void navegar({ to: LINKS_DE_TELA.espera })}>
          Abrir lista de espera
        </AcaoDaFolha>
      }
    >
      <CartaoDaFolha className="mt-1">
        {pessoas.map((p) => {
          const detalhe = [p.servico ?? "Serviço a combinar", periodoDaPessoa(p)].join(" · ");
          const oferta = p.oferta
            ? `Oferecida ${hora(p.oferta.inicio, fuso)} · expira em ${minutosParaExpirar(p.oferta.expiraEm, agora)} min`
            : "Aguardando vaga";
          return (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
              <span
                aria-label={`Posição ${p.posicao}`}
                className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--figaro-surface-container-high,var(--ink3))] text-[13px] font-bold text-paper"
              >
                {p.posicao}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[15px] text-paper">{p.cliente}</b>
                <span className="block truncate text-[13px] text-mute">{detalhe}</span>
                <span
                  className={`block text-[12.5px] ${p.oferta ? "text-[var(--figaro-primary,var(--primary))]" : "text-mute"}`}
                >
                  {oferta}
                </span>
              </span>
            </div>
          );
        })}
      </CartaoDaFolha>
    </FolhaPadrao>
  );
}
