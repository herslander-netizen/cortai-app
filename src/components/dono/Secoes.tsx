import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { brl } from "@/lib/format";
import { getSecaoClientes, getSecaoFinanceiro, getSecaoOperacao } from "@/lib/dono.functions";

function Linha({ rotulo, valor, sub }: { rotulo: string; valor: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <span className="min-w-0">
        <span className="block truncate text-sm text-paper">{rotulo}</span>
        {sub ? <span className="block text-xs text-mute">{sub}</span> : null}
      </span>
      <span className="shrink-0 text-sm font-semibold text-paper">{valor}</span>
    </div>
  );
}

function Erro() {
  return (
    <p className="text-sm text-mute">Não deu para carregar agora. Tente de novo em instantes.</p>
  );
}

const FORMAS: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  credito: "Plano",
  fiado: "Fiado",
  balcao: "Balcão",
};

export function SecaoOperacao() {
  const fn = useServerFn(getSecaoOperacao);
  const q = useQuery({ queryKey: ["dono-operacao"], queryFn: () => fn(), retry: false });
  if (q.isLoading) return <EsqueletoLista linhas={3} onTentarDeNovo={() => void q.refetch()} />;
  if (!q.data) return <Erro />;
  const d = q.data;
  return (
    <div className="divide-y divide-line">
      <Linha
        rotulo="Ainda hoje"
        valor={String(d.aindaHoje)}
        sub="Horários que ainda vão acontecer"
      />
      <Linha rotulo="Faltas" valor={String(d.faltas)} />
      <Linha rotulo="Cancelamentos" valor={String(d.cancelamentos)} />
      {d.profissionais.map((p) => (
        <Linha
          key={p.nome}
          rotulo={p.nome}
          valor={p.ocupacaoPct === null ? "—" : `${p.ocupacaoPct}%`}
          sub={`${p.atendimentos} de ${p.agendados} atendidos`}
        />
      ))}
    </div>
  );
}

export function SecaoFinanceiro() {
  const fn = useServerFn(getSecaoFinanceiro);
  const q = useQuery({ queryKey: ["dono-financeiro"], queryFn: () => fn(), retry: false });
  if (q.isLoading) return <EsqueletoLista linhas={3} onTentarDeNovo={() => void q.refetch()} />;
  if (!q.data) return <Erro />;
  const d = q.data;
  return (
    <div className="divide-y divide-line">
      <Linha
        rotulo="Vendas de hoje"
        valor={brl(d.vendasCentavos)}
        sub={d.caixaAberto ? "Caixa aberto" : "Caixa fechado"}
      />
      {d.porForma.map((f) => (
        <Linha key={f.forma} rotulo={FORMAS[f.forma] ?? f.forma} valor={brl(f.centavos)} />
      ))}
      <Linha
        rotulo="Comissões de hoje"
        valor={brl(d.comissoesHojeCentavos)}
        sub={`${brl(d.comissoesPendentesCentavos)} a pagar no total`}
      />
      <Linha
        rotulo="Fiado em aberto"
        valor={brl(d.fiadoAbertoCentavos)}
        sub={`${d.fiadoClientes} cliente${d.fiadoClientes === 1 ? "" : "s"}`}
      />
    </div>
  );
}

export function SecaoClientes() {
  const fn = useServerFn(getSecaoClientes);
  const q = useQuery({ queryKey: ["dono-clientes"], queryFn: () => fn(), retry: false });
  if (q.isLoading) return <EsqueletoLista linhas={3} onTentarDeNovo={() => void q.refetch()} />;
  if (!q.data) return <Erro />;
  const d = q.data;
  return (
    <div className="divide-y divide-line">
      <Linha rotulo="Novos hoje" valor={String(d.novosHoje)} />
      <Linha
        rotulo="Recorrentes hoje"
        valor={`${d.recorrentesHoje} de ${d.atendidosHoje}`}
        sub="Já tinham vindo antes"
      />
      <Linha
        rotulo="Voltam esta semana"
        valor={String(d.voltamEstaSemana)}
        sub="Com horário marcado nos próximos 7 dias"
      />
      <Linha rotulo="Sem voltar há 45 dias" valor={String(d.sumidos)} sub="E sem horário marcado" />
    </div>
  );
}
