/**
 * Uma pessoa na lista de espera (dono, 06/11/2026: "mais leve, uma ação por pessoa"). Nome, serviço e período, a
 * oferta em andamento com o prazo e um único "⋯" com agendar, editar, subir, descer e remover — antes eram quatro
 * botões e duas setas em cada linha.
 */
import { CalendarCheck, ArrowDown, ArrowUp, MoreHorizontal, Pencil, UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgora } from "@/hooks/useAgora";
import type { FilaItem } from "@/lib/barbeiro.functions";
import { minutosParaExpirar, periodoDaPessoa } from "@/lib/lista-espera-agenda";

function horaDoInstante(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function PessoaDaEspera({
  pessoa,
  primeira,
  ultima,
  ocupado,
  onAgendar,
  onEditar,
  onMover,
  onRemover,
}: {
  pessoa: FilaItem;
  primeira: boolean;
  ultima: boolean;
  ocupado: boolean;
  onAgendar: () => void;
  onEditar: () => void;
  onMover: (direcao: "subir" | "descer") => void;
  onRemover: () => void;
}) {
  const agora = useAgora();
  const detalhe = [
    pessoa.servico ?? "Serviço a combinar",
    pessoa.profissional,
    periodoDaPessoa(pessoa),
  ]
    .filter(Boolean)
    .join(" · ");
  const oferta = pessoa.ofertaAtiva;
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        aria-label={`Posição ${pessoa.posicao}`}
        className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--figaro-surface-container-high,var(--ink3))] text-[13px] font-bold text-paper"
      >
        {pessoa.posicao}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[15px] text-paper">{pessoa.cliente}</b>
        <span className="block truncate text-[13px] text-mute">{detalhe}</span>
        <span
          className={`block text-[12.5px] ${oferta ? "text-[var(--figaro-primary,var(--primary))]" : "text-mute"}`}
        >
          {oferta
            ? `Oferecida ${horaDoInstante(oferta.inicio)} · expira em ${minutosParaExpirar(oferta.expiraEm, agora)} min`
            : "Aguardando vaga"}
        </span>
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="icon"
            size="icon"
            className="toque-afunda -mr-2 shrink-0 text-mute"
            aria-label={`Ações para ${pessoa.cliente}`}
            disabled={ocupado}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem className="min-h-12 gap-3" onSelect={onAgendar}>
            <CalendarCheck aria-hidden /> Agendar
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-12 gap-3" onSelect={onEditar}>
            <Pencil aria-hidden /> Editar preferência
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-12 gap-3"
            disabled={primeira}
            onSelect={() => onMover("subir")}
          >
            <ArrowUp aria-hidden /> Subir na lista
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-12 gap-3"
            disabled={ultima}
            onSelect={() => onMover("descer")}
          >
            <ArrowDown aria-hidden /> Descer na lista
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-12 gap-3 text-brick" onSelect={onRemover}>
            <UserMinus aria-hidden /> Tirar da lista
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
