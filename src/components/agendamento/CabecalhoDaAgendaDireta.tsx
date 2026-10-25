import { StatusFuncionamento } from "@/components/agendamento/StatusFuncionamento";
import { LogoBarbearia } from "@/components/marca/LogoBarbearia";
import type { HorarioDeFuncionamento } from "@/lib/horarios";

/**
 * Abertura da tela de agendar na maneira direta com tema. A composição (foto, arco, vidro, faixa) vem do
 * CSS por `data-estrutura` em `.agendamento-marca`, igual na tela real do cliente e na prévia do editor.
 */
export function CabecalhoDaAgendaDireta({
  nome,
  logoUrl,
  capaUrl,
  horarios,
  fuso,
  linkSobre,
  rotuloSobre,
}: {
  nome: string;
  logoUrl: string | null;
  capaUrl: string | null;
  horarios: HorarioDeFuncionamento[];
  fuso: string;
  linkSobre?: string | undefined;
  rotuloSobre?: string | undefined;
}) {
  return (
    <header className="ag-topo">
      {capaUrl ? <img src={capaUrl} alt="" className="ag-capa" decoding="async" /> : null}
      <div className="ag-topo-conteudo">
        <div className="ag-marca">
          <LogoBarbearia nome={nome} url={logoUrl} size={44} className="ag-logo" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="ag-kicker text-xs font-semibold uppercase tracking-wide text-gold">
            Agendar horário
          </p>
          {linkSobre ? (
            <a href={linkSobre} className="ag-sobre text-xs underline-offset-4 hover:underline">
              {rotuloSobre ?? "Conhecer o negócio"}
            </a>
          ) : null}
        </div>
        <h1 className="mt-1 text-2xl font-bold text-paper">{nome}</h1>
        <StatusFuncionamento horarios={horarios} fuso={fuso} />
        <p className="ag-sub mt-1 text-sm text-mute">
          Sem cadastro e sem senha: escolha o horário e pronto.
        </p>
      </div>
    </header>
  );
}
