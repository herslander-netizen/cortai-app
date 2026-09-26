import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, X } from "lucide-react";

import { Aviso } from "@/components/ui/aviso";
import { ConfirmacaoRapida } from "@/components/ui/VistoAnimado";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  buscarClientesDaBarbearia,
  criarAgendamentoManual,
  getDadosAgendamentoManual,
  getProximoHorarioLivre,
} from "@/lib/barbeiro.functions";

type Forma = "balcao" | "pix" | "fiado" | "credito";

function isoLocal(dia: string, horaMin: string) {
  return new Date(`${dia}T${horaMin}:00`).toISOString();
}

function horasDoDia() {
  const out: string[] = [];
  for (let h = 9; h < 19; h++) for (const m of ["00", "30"]) out.push(`${String(h).padStart(2, "0")}:${m}`);
  return out;
}

/**
 * Agendamento de balcão em poucos toques: cliente (existente ou novo),
 * serviço, profissional, horário. Mesmas regras de disponibilidade do app.
 */
export function AgendamentoManual({
  dia,
  horaInicial,
  onCriado,
  gatilho = "primario",
  rotulo,
  autoAbrir = false,
  iniciarNovoCliente = false,
}: {
  dia: string;
  horaInicial?: string;
  onCriado?: () => void;
  gatilho?: "primario" | "discreto";
  rotulo?: string;
  autoAbrir?: boolean;
  iniciarNovoCliente?: boolean;
}) {
  const [aberto, setAberto] = useState(autoAbrir);

  return (
    <>
      <Button variant="ghost"
        type="button"
        onClick={() => setAberto(true)}
        className={
          gatilho === "primario"
            ? "btn-primary w-full text-sm"
            : "btn-tertiary text-xs"
        }
      >
        {rotulo ?? (gatilho === "primario" ? "+ Agendamento manual" : "Marcar cliente aqui")}
      </Button>
      {aberto ? (
        <Formulario
          dia={dia}
          {...(horaInicial ? { horaInicial } : {})}
          iniciarNovoCliente={iniciarNovoCliente}
          onFechar={() => setAberto(false)}
          onCriado={() => {
            setAberto(false);
            onCriado?.();
          }}
        />
      ) : null}
    </>
  );
}

function Formulario({
  dia,
  horaInicial = "09:00",
  onFechar,
  onCriado,
  iniciarNovoCliente = false,
}: {
  dia: string;
  horaInicial?: string;
  onFechar: () => void;
  onCriado: () => void;
  iniciarNovoCliente?: boolean;
}) {
  const criar = useServerFn(criarAgendamentoManual);
  const buscar = useServerFn(buscarClientesDaBarbearia);

  const { data: base } = useQuery({
    queryKey: ["dados-manual"],
    queryFn: () => getDadosAgendamentoManual(),
  });

  const proximo = useQuery({
    queryKey: ["proximo-livre"],
    queryFn: () => getProximoHorarioLivre({ data: {} }),
    staleTime: 30_000,
  });

  const [termo, setTermo] = useState("");
  const [termoDebounce, setTermoDebounce] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [novo, setNovo] = useState(iniciarNovoCliente);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [data, setData] = useState(dia);
  const [horaMin, setHoraMin] = useState(horaInicial);
  const [forma, setForma] = useState<Forma>("balcao");
  const [erro, setErro] = useState<string | null>(null);
  const [conflito, setConflito] = useState<{ mensagem: string; sugestoes: { iso: string; label: string }[]; podeEncaixar?: boolean } | null>(
    null,
  );
  const [salvando, setSalvando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTermoDebounce(termo), 250);
    return () => clearTimeout(t);
  }, [termo]);

  const { data: clientes, isLoading: buscando } = useQuery({
    queryKey: ["clientes-manual", termoDebounce],
    queryFn: () => buscar({ data: { termo: termoDebounce } }),
    enabled: !novo && !clienteId,
  });

  useEffect(() => {
    if (base && !servicoId && base.servicos[0]) setServicoId(base.servicos[0].id);
    if (base && !profissionalId && base.profissionais[0]) setProfissionalId(base.profissionais[0].id);
  }, [base, servicoId, profissionalId]);

  const clienteOk = clienteId ? true : novo && novoNome.trim().length >= 2 && novoTelefone.replace(/\D/g, "").length >= 10;
  const pronto = Boolean(clienteOk && servicoId && profissionalId && data && horaMin);

  async function salvar(isoForcado?: string, encaixe = false) {
    if (!pronto || salvando) return;
    setSalvando(true);
    setErro(null);
    setConflito(null);
    try {
      const r = await criar({
        data: {
          ...(clienteId ? { clienteId } : { novoNome: novoNome.trim(), novoTelefone }),
          servicoId,
          profissionalId,
          inicio: isoForcado ?? isoLocal(data, horaMin),
          formaPagamento: forma,
          ...(encaixe ? { encaixe: true } : {}),
        },
      });
      if (!r.ok && r.conflito) {
        setConflito(r.conflito);
        setSalvando(false);
        return;
      }
      // Visto animado por um instante antes de fechar.
      setConfirmado(true);
      setTimeout(() => onCriado(), 700);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível agendar agora.");
      setSalvando(false);
    }
  }

  if (confirmado) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-ink/75 p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Agendamento criado"
      >
        <div className="w-full max-w-md rounded-t-2xl border border-line bg-ink3 p-5 sm:rounded-2xl">
          <ConfirmacaoRapida texto="Pronto. Agendamento criado." />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/75 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Agendamento manual"
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-ink3 p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold text-paper">Agendamento manual</p>
            <p className="mt-1 text-xs text-mute">Cliente que chegou agora, em poucos toques.</p>
          </div>
          <Button variant="ghost" type="button" aria-label="Fechar" onClick={onFechar} className="p-1 text-mute">
            <X size={18} />
          </Button>
        </div>

        {/* 1. Cliente */}
        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-mute2">1. Cliente</p>
        {clienteId ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-line2 px-3 py-3">
            <span className="truncate text-sm text-paper">{clienteNome}</span>
            <Button variant="ghost"
              type="button"
              className="btn-tertiary text-xs"
              onClick={() => {
                setClienteId(null);
                setClienteNome("");
              }}
            >
              Trocar
            </Button>
          </div>
        ) : novo ? (
          <div className="mt-2 space-y-2">
            <input
              className="input-premium"
              placeholder="Nome do cliente"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
            />
            <input
              className="input-premium"
              placeholder="Telefone com DDD"
              inputMode="tel"
              value={novoTelefone}
              onChange={(e) => setNovoTelefone(e.target.value)}
            />
            <Button variant="ghost" type="button" className="btn-tertiary text-xs" onClick={() => setNovo(false)}>
              Buscar cliente já cadastrado
            </Button>
          </div>
        ) : (
          <div className="mt-2">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute2" />
              <input
                className="input-premium pl-9"
                placeholder="Buscar por nome ou telefone"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
              />
            </div>
            <ul className="mt-1">
              {buscando ? <li className="py-3 text-xs text-mute">Buscando…</li> : null}
              {(clientes ?? []).map((c) => (
                <li key={c.id} className="border-b border-line">
                  <Button variant="ghost"
                    type="button"
                    className="flex w-full items-center justify-between gap-3 py-3 text-left"
                    onClick={() => {
                      setClienteId(c.id);
                      setClienteNome(c.nome);
                    }}
                  >
                    <span className="truncate text-sm text-paper">{c.nome}</span>
                    <span className="shrink-0 text-xs text-mute2">{c.telefone}</span>
                  </Button>
                </li>
              ))}
              {!buscando && (clientes ?? []).length === 0 ? (
                <li className="py-3 text-xs text-mute">Nenhum cliente encontrado nesta barbearia.</li>
              ) : null}
            </ul>
            <Button variant="ghost"
              type="button"
              className="btn-secondary mt-2 w-full text-sm"
              onClick={() => {
                setNovo(true);
                setNovoNome(termo.replace(/\d/g, "").trim());
              }}
            >
              Cadastrar cliente novo
            </Button>
          </div>
        )}

        {/* 2. Serviço e profissional */}
        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-mute2">2. Serviço</p>
        <select
          className="input-premium mt-2"
          value={servicoId}
          onChange={(e) => setServicoId(e.target.value)}
          aria-label="Serviço"
        >
          {(base?.servicos ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} · {s.duracao_min} min · {brl(s.preco_centavos)}
            </option>
          ))}
        </select>
        {(base?.profissionais ?? []).length > 1 ? (
          <select
            className="input-premium mt-2"
            value={profissionalId}
            onChange={(e) => setProfissionalId(e.target.value)}
            aria-label="Profissional"
          >
            {(base?.profissionais ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        ) : null}

        {/* 3. Horário */}
        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-mute2">3. Horário</p>
        {proximo.data ? (
          <Button variant="ghost"
            type="button"
            onClick={() => {
              setData(new Date().toISOString().slice(0, 10));
              setHoraMin(proximo.data!.label);
            }}
            className={`mt-2 flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm ${
              horaMin === proximo.data.label ? "border-gold bg-gold-soft text-gold" : "border-gold/60 text-gold"
            }`}
          >
            <span className="font-semibold">Atender agora</span>
            <span>próximo livre {proximo.data.label}</span>
          </Button>
        ) : null}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="date"
            className="input-premium"
            value={data}
            onChange={(e) => setData(e.target.value)}
            aria-label="Data"
          />
          <select
            className="input-premium"
            value={horaMin}
            onChange={(e) => setHoraMin(e.target.value)}
            aria-label="Hora"
          >
            {horasDoDia().map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ["balcao", "No balcão"],
              ["pix", "Pix"],
              ["fiado", "Fiado"],
              ["credito", "Crédito"],
            ] as const
          ).map(([v, rotulo]) => (
            <Button variant="ghost"
              key={v}
              type="button"
              onClick={() => setForma(v)}
              className={`rounded-lg border px-3 py-2 text-xs ${
                forma === v ? "border-gold text-gold" : "border-line2 text-mute"
              }`}
            >
              {rotulo}
            </Button>
          ))}
        </div>

        {conflito ? (
          <Aviso tom="acao" titulo="Horário ocupado" className="mt-4">
            <p>{conflito.mensagem}</p>
            {conflito.podeEncaixar ? (
              <Button
                type="button"
                variant="secondary"
                className="mt-2 w-full"
                disabled={salvando}
                onClick={() => void salvar(undefined, true)}
              >
                Encaixar mesmo assim
              </Button>
            ) : null}
            {conflito.sugestoes.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {conflito.sugestoes.map((s) => (
                  <Button variant="ghost"
                    key={s.iso}
                    type="button"
                    className="rounded-lg border border-line2 px-3 py-2 text-xs text-paper"
                    onClick={() => {
                      setHoraMin(s.label);
                      void salvar(s.iso);
                    }}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-mute">Ou escolha outro horário.</p>
            )}
          </Aviso>
        ) : null}

        {erro ? (
          <Aviso tom="acao" className="mt-4">
            {erro}
          </Aviso>
        ) : null}

        <Button variant="ghost"
          type="button"
          disabled={!pronto || salvando}
          onClick={() => void salvar()}
          className="btn-primary mt-5 w-full text-sm disabled:opacity-40"
        >
          {salvando ? "Agendando…" : "Confirmar agendamento"}
        </Button>
      </div>
    </div>
  );
}
