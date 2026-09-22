import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2 } from "lucide-react";

import { brl } from "@/lib/format";
import { getGradeDoDia } from "@/lib/agenda-chat.functions";
import { criarAgendamentoManual } from "@/lib/barbeiro.functions";

const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** Próximos 7 dias, em hora local de quem está usando o painel. */
function proximosDias() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje.getTime() + i * 86_400_000);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      iso,
      rotulo: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : `${DIAS_CURTOS[d.getDay()]} ${d.getDate()}`,
    };
  });
}

/**
 * Agenda do dia dentro do chat: serviço, dia, horários livres e ocupados e
 * confirmação em um toque. Usa as mesmas regras do agendamento do balcão, e a
 * confirmação sai pelo WhatsApp da barbearia automaticamente.
 */
export function AgendarNoChat({ onConcluido }: { onConcluido?: () => void }) {
  const dias = useMemo(proximosDias, []);
  const criar = useServerFn(criarAgendamentoManual);

  const [dia, setDia] = useState(dias[0]!.iso);
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [profissionalId, setProfissionalId] = useState<string | null>(null);
  const [escolhido, setEscolhido] = useState<{ iso: string; label: string } | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);

  const grade = useQuery({
    queryKey: ["grade-chat", dia, servicoId, profissionalId],
    queryFn: () => getGradeDoDia({ data: { dia, servicoId, profissionalId } }),
    staleTime: 30_000,
    // Horários livres se atualizam sozinhos enquanto a agenda está aberta.
    refetchInterval: 45_000,
  });

  const servicos = grade.data?.servicos ?? [];
  const servicoAtivo = servicoId ?? servicos[0]?.id ?? null;
  const profissionais = grade.data?.profissionais ?? [];
  const profissionalAtivo = profissionalId ?? profissionais[0]?.id ?? null;

  const pronto =
    Boolean(escolhido && servicoAtivo && profissionalAtivo) &&
    nome.trim().length >= 2 &&
    telefone.replace(/\D/g, "").length >= 10;

  async function confirmar() {
    if (!pronto || salvando || !escolhido) return;
    setSalvando(true);
    setErro(null);
    try {
      const r = await criar({
        data: {
          novoNome: nome.trim(),
          novoTelefone: telefone,
          servicoId: servicoAtivo!,
          profissionalId: profissionalAtivo!,
          inicio: escolhido.iso,
          formaPagamento: "balcao",
        },
      });
      if (!r.ok) {
        setErro(r.conflito?.mensagem ?? "Esse horário acabou de ser ocupado. Escolha outro.");
        setEscolhido(null);
        await grade.refetch();
        return;
      }
      setFeito(escolhido.label);
      onConcluido?.();
      void grade.refetch();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui agendar agora.");
    } finally {
      setSalvando(false);
    }
  }

  if (feito) {
    return (
      <div className="mt-3 rounded-2xl border border-sage/40 bg-ink px-4 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-sage">
          <Check size={15} aria-hidden /> Horário marcado às {feito}
        </p>
        <p className="mt-1.5 text-xs text-mute">
          A confirmação foi enviada para o WhatsApp do cliente automaticamente.
        </p>
        <button
          type="button"
          className="mt-3 rounded-full border border-line2 px-4 py-2 text-xs text-paper"
          onClick={() => {
            setFeito(null);
            setEscolhido(null);
            setNome("");
            setTelefone("");
          }}
        >
          Marcar outro
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-line2 bg-ink px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-mute2">Marcar um horário</p>

      {/* Serviço */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {servicos.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setServicoId(s.id);
              setEscolhido(null);
            }}
            className={`shrink-0 rounded-xl border px-3 py-2 text-left text-[11px] ${
              servicoAtivo === s.id ? "border-gold bg-gold-soft text-paper" : "border-line2 text-mute"
            }`}
          >
            <span className="block font-semibold text-paper">{s.nome}</span>
            <span className="block">
              {s.duracao_min} min · {brl(s.preco_centavos)}
            </span>
          </button>
        ))}
        {!grade.isLoading && servicos.length === 0 ? (
          <span className="text-xs text-mute">Cadastre um serviço para poder agendar.</span>
        ) : null}
      </div>

      {/* Profissional */}
      {profissionais.length > 1 ? (
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {profissionais.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setProfissionalId(p.id);
                setEscolhido(null);
              }}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] ${
                profissionalAtivo === p.id ? "border-gold text-gold" : "border-line2 text-mute"
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>
      ) : null}

      {/* Dia */}
      <div className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {dias.map((d) => (
          <button
            key={d.iso}
            type="button"
            onClick={() => {
              setDia(d.iso);
              setEscolhido(null);
            }}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] ${
              dia === d.iso ? "border-gold bg-gold text-ink font-semibold" : "border-line2 text-mute"
            }`}
          >
            {d.rotulo}
          </button>
        ))}
      </div>

      {/* Horários */}
      <div className="mt-3">
        {grade.isLoading ? (
          <p className="flex items-center gap-2 text-xs text-mute">
            <Loader2 size={13} className="animate-spin" aria-hidden /> Carregando a agenda…
          </p>
        ) : grade.data?.fechado ? (
          <p className="text-xs text-mute">Barbearia fechada neste dia.</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-1.5">
              {(grade.data?.slots ?? []).map((s) => {
                const indisponivel = !s.livre || s.passou;
                const ativo = escolhido?.iso === s.iso;
                return (
                  <button
                    key={s.iso}
                    type="button"
                    disabled={indisponivel}
                    title={s.ocupadoPor ? `Ocupado · ${s.ocupadoPor}` : undefined}
                    onClick={() => setEscolhido({ iso: s.iso, label: s.label })}
                    className={`rounded-lg border py-2 text-[11px] transition-colors ${
                      ativo
                        ? "border-gold bg-gold font-semibold text-ink"
                        : indisponivel
                          ? "border-line bg-ink2 text-mute2 line-through opacity-60"
                          : "border-gold/35 text-paper hover:border-gold"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 flex items-center gap-3 text-[10px] text-mute2">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gold" /> livre
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-line2" /> ocupado
              </span>
            </p>
          </>
        )}
      </div>

      {/* Cliente e confirmação */}
      {escolhido ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <p className="text-xs text-mute">
            Horário escolhido: <span className="font-semibold text-paper">{escolhido.label}</span>
          </p>
          <input
            className="input-premium"
            placeholder="Nome do cliente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className="input-premium"
            placeholder="WhatsApp com DDD"
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
          <button
            type="button"
            disabled={!pronto || salvando}
            onClick={() => void confirmar()}
            className="w-full rounded-full bg-gold py-2.5 text-xs font-semibold text-ink disabled:opacity-40"
          >
            {salvando ? "Marcando…" : "Confirmar e avisar no WhatsApp"}
          </button>
        </div>
      ) : null}

      {erro ? <p className="mt-2 text-xs text-brick">{erro}</p> : null}
    </div>
  );
}
