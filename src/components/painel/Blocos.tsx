import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { EsqueletoPainel } from "@/components/layout/Esqueleto";

/** Peças visuais do Painel de Controle — mesma identidade do Cortaí. */

export function Bloco({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-paper">{titulo}</h2>
          {descricao ? <p className="mt-0.5 text-xs text-mute2">{descricao}</p> : null}
        </div>
        {acao ?? null}
      </div>
      {children}
    </section>
  );
}

export function Metrica({
  rotulo,
  valor,
  detalhe,
  cor,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string | undefined;
  cor?: string | undefined;
}) {
  return (
    <div className="border-b border-line bg-ink2 px-3 py-4">
      <p className="text-xs text-mute">{rotulo}</p>
      <p className={`mt-1 text-xl font-bold leading-tight ${cor ?? "text-paper"}`}>{valor}</p>
      {detalhe ? <p className="mt-1 text-xs text-mute2">{detalhe}</p> : null}
    </div>
  );
}

export function LinhaDeAcao({
  destino,
  titulo,
  detalhe,
  marca,
  tom,
}: {
  destino: string;
  titulo: string;
  detalhe: string;
  marca?: ReactNode;
  tom?: "urgente" | "atencao" | "neutro";
}) {
  const cor = tom === "urgente" ? "bg-brick" : tom === "atencao" ? "bg-gold" : "bg-mute2";
  return (
    <li className="border-b border-line">
      <Link
        to={destino as never}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-4"
      >
        {marca ?? <span className={`h-2 w-2 shrink-0 rounded-full ${cor}`} />}
        <span className="min-w-0">
          <span className="block text-sm text-paper">{titulo}</span>
          <span className="mt-0.5 block truncate text-xs text-mute2">{detalhe}</span>
        </span>
        <ChevronRight size={16} className="text-mute2" />
      </Link>
    </li>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return (
    <div className="border-y border-dashed border-line px-2 py-6">
      <p className="text-sm text-mute">{texto}</p>
    </div>
  );
}

export function Esqueleto() {
  return <EsqueletoPainel />;
}

export function Erro({ onTentar }: { onTentar: () => void }) {
  return (
    <div className="surface px-5 py-6">
      <p className="text-sm font-semibold text-paper">Não consegui carregar o painel agora.</p>
      <p className="mt-1 text-xs text-mute">Pode ter sido a conexão. Tente de novo.</p>
      <button type="button" className="btn-primary mt-4" onClick={onTentar}>
        Tentar de novo
      </button>
    </div>
  );
}

export function SemPermissao({ texto }: { texto: string }) {
  return (
    <div className="surface px-4 py-4">
      <p className="text-xs text-mute">{texto}</p>
    </div>
  );
}
