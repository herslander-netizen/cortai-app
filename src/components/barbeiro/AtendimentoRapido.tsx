import { useQuery } from "@tanstack/react-query";
import { Scissors, Search, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";

import { EsqueletoAgenda } from "@/components/layout/Esqueleto";
import { Button } from "@/components/ui/button";
import { buscarClientesDaBarbearia } from "@/lib/barbeiro.functions";
import { getDadosAtendimentoRapido, iniciarAtendimentoAgora } from "@/lib/atendimento.functions";

type Props = {
  onFechar: () => void;
  onIniciado: (r: { agendamentoId: string; cliente: string }) => void;
};

/** Uma tela: cliente, serviço, profissional e Iniciar. Padrões prontos para 1 toque. */
export function AtendimentoRapido({ onFechar, onIniciado }: Props) {
  const dados = useQuery({ queryKey: ["atendimento-rapido"], queryFn: () => getDadosAtendimentoRapido(), staleTime: 60_000 });
  const [cliente, setCliente] = useState<{ id: string; nome: string } | null>(null);
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [profissionalId, setProfissionalId] = useState<string | null>(null);
  const [termo, setTermo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!dados.data) return;
    setServicoId((s) => s ?? dados.data.servicoPadraoId);
    setProfissionalId((p) => p ?? dados.data.meuProfissionalId ?? dados.data.profissionais.find((x) => x.livre)?.id ?? dados.data.profissionais[0]?.id ?? null);
  }, [dados.data]);

  const busca = useQuery({
    queryKey: ["atendimento-rapido-busca", termo.trim()],
    queryFn: () => buscarClientesDaBarbearia({ data: { termo: termo.trim() } }),
    enabled: termo.trim().length >= 2,
    staleTime: 30_000,
  });
  const opcoes = termo.trim().length >= 2 ? (busca.data ?? []).filter((c) => c.telefone !== "avulso") : dados.data?.recentes ?? [];

  async function iniciar() {
    if (!profissionalId) return;
    setEnviando(true);
    setErro(null);
    try {
      const r = await iniciarAtendimentoAgora({ data: { clienteId: cliente?.id ?? null, servicoId, profissionalId } });
      onIniciado(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível iniciar.");
      setEnviando(false);
    }
  }

  const chip = (ativo: boolean) => `agenda-chip ${ativo ? "agenda-chip-ativo" : ""}`;

  return (
    <div className="agenda-folha" role="dialog" aria-modal="true" aria-label="Atendimento manual" onClick={onFechar}>
      <div className="agenda-folha-conteudo max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="text-lg font-extrabold text-paper">Atendimento manual</h2>
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onFechar}><X /></Button>
        </div>

        {dados.isLoading ? <EsqueletoAgenda linhas={3} /> : dados.error ? (
          <p className="text-sm text-paper">{dados.error instanceof Error ? dados.error.message : "Não foi possível carregar."}</p>
        ) : (
          <div className="space-y-5">
            <section aria-label="Cliente">
              <p className="mb-2 text-[11px] font-bold uppercase text-mute">Cliente</p>
              <label className="relative block">
                <Search aria-hidden size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar por nome ou telefone" className="h-12 w-full rounded-lg border border-line bg-ink pl-9 pr-3 text-sm text-paper outline-none focus:border-paper" />
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={chip(!cliente)} onClick={() => setCliente(null)}><UserRound aria-hidden size={14} />Cliente avulso</button>
                {opcoes.map((c) => (
                  <button key={c.id} type="button" className={chip(cliente?.id === c.id)} onClick={() => setCliente({ id: c.id, nome: c.nome })}>{c.nome}</button>
                ))}
              </div>
              {!cliente ? <p className="mt-2 text-xs text-mute">Nome e telefone entram depois, na comanda.</p> : null}
            </section>

            <section aria-label="Serviço">
              <p className="mb-2 text-[11px] font-bold uppercase text-mute">Serviço</p>
              <div className="flex flex-wrap gap-2">
                {dados.data?.servicos.map((s) => (
                  <button key={s.id} type="button" className={chip(servicoId === s.id)} onClick={() => setServicoId(s.id)}>{s.nome} · {s.duracao_min} min</button>
                ))}
              </div>
            </section>

            <section aria-label="Profissional">
              <p className="mb-2 text-[11px] font-bold uppercase text-mute">Profissional</p>
              <div className="flex flex-wrap gap-2">
                {dados.data?.profissionais.map((p) => (
                  <button key={p.id} type="button" className={chip(profissionalId === p.id)} onClick={() => setProfissionalId(p.id)}>{p.nome}{p.livre ? "" : " · ocupado"}</button>
                ))}
              </div>
            </section>

            {erro ? <p role="alert" className="border-l-2 border-brick pl-3 text-sm font-semibold text-paper">{erro}</p> : null}

            <div className="sticky bottom-0 -mx-5 border-t border-line bg-ink2 px-5 pt-3">
            <Button size="lg" className="h-14 w-full text-base" disabled={enviando || !profissionalId} onClick={iniciar}>
              <Scissors />Iniciar {cliente?.nome ?? "cliente avulso"}
            </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
