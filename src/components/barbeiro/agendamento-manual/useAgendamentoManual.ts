import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { invalidarComandas } from "@/lib/comanda-ticket";
import { isoNoFusoDaBarbearia } from "@/lib/horarios";
import {
  buscarClientesDaBarbearia,
  criarAgendamentoManual,
  getDadosAgendamentoManual,
  getProximoHorarioLivre,
} from "@/lib/barbeiro.functions";

export type Forma = "balcao" | "pix" | "fiado" | "credito";
export type Conflito = {
  mensagem: string;
  sugestoes: { iso: string; label: string }[];
  podeEncaixar?: boolean;
};

/** Estado e regras do novo agendamento (mesmas regras de disponibilidade do app). */
export function useAgendamentoManual({
  dia,
  horaInicial,
  profissionalInicial,
  iniciarNovoCliente,
  onCriado,
}: {
  dia: string;
  horaInicial: string;
  profissionalInicial: string | null;
  iniciarNovoCliente: boolean;
  onCriado: (agendamentoId: string) => void;
}) {
  const criar = useServerFn(criarAgendamentoManual);
  const buscar = useServerFn(buscarClientesDaBarbearia);

  const { data: base } = useQuery({
    queryKey: ["dados-manual"],
    queryFn: () => getDadosAgendamentoManual(),
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
  const [conflito, setConflito] = useState<Conflito | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [criado, setCriado] = useState<{ agendamentoId: string; comandaId: string | null } | null>(
    null,
  );
  const queryClient = useQueryClient();

  const proximo = useQuery({
    queryKey: ["proximo-livre", profissionalId, servicoId],
    queryFn: () =>
      getProximoHorarioLivre({
        data: {
          ...(profissionalId ? { profissionalId } : {}),
          ...(servicoId ? { servicoId } : {}),
        },
      }),
    enabled: Boolean(profissionalId && servicoId),
    staleTime: 30_000,
  });

  useEffect(() => {
    const t = setTimeout(() => setTermoDebounce(termo), 250);
    return () => clearTimeout(t);
  }, [termo]);

  const busca = useQuery({
    queryKey: ["clientes-manual", termoDebounce],
    queryFn: () => buscar({ data: { termo: termoDebounce } }),
    enabled: !novo && !clienteId,
  });

  useEffect(() => {
    if (base && !servicoId && base.servicos[0]) setServicoId(base.servicos[0].id);
    if (base && !profissionalId && base.profissionais[0]) {
      const escolhido = profissionalInicial
        ? base.profissionais.find((p) => p.nome === profissionalInicial)
        : undefined;
      setProfissionalId((escolhido ?? base.profissionais[0]).id);
    }
  }, [base, servicoId, profissionalId, profissionalInicial]);

  const nomeValido = novoNome.trim().length >= 2;
  const telefoneValido = novoTelefone.replace(/\D/g, "").length >= 10;
  const clienteOk = clienteId ? true : novo && nomeValido && telefoneValido;
  const pronto = Boolean(clienteOk && servicoId && profissionalId && data && horaMin);
  const sujo = Boolean(clienteId || novoNome || novoTelefone || termo);

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
          inicio:
            isoForcado ?? isoNoFusoDaBarbearia(data, horaMin, base?.fuso ?? "America/Sao_Paulo"),
          formaPagamento: forma,
          ...(encaixe ? { encaixe: true } : {}),
        },
      });
      if (!r.ok && r.conflito) {
        setConflito(r.conflito);
        setSalvando(false);
        return;
      }
      const agendamentoId = r.agendamentoId;
      if (!agendamentoId) throw new Error("O agendamento foi salvo sem identificação.");
      invalidarComandas(queryClient);
      setCriado({ agendamentoId, comandaId: r.comandaId ?? null });
      setConfirmado(true);
      // Sem comanda para mostrar, segue direto como antes; com comanda, espera "Concluir".
      if (!r.comandaId) setTimeout(() => onCriado(agendamentoId), 700);
    } catch (e) {
      setErro(
        e instanceof Error && e.message
          ? e.message
          : "Não foi possível agendar agora. Tente de novo em instantes.",
      );
      setSalvando(false);
    }
  }

  return {
    base,
    proximo,
    busca,
    termo,
    setTermo,
    clienteId,
    clienteNome,
    escolherCliente: (id: string | null, nome = "") => {
      setClienteId(id);
      setClienteNome(nome);
    },
    novo,
    setNovo,
    novoNome,
    setNovoNome,
    novoTelefone,
    setNovoTelefone,
    nomeValido,
    telefoneValido,
    servicoId,
    setServicoId,
    profissionalId,
    setProfissionalId,
    data,
    setData,
    horaMin,
    setHoraMin,
    forma,
    setForma,
    erro,
    conflito,
    salvando,
    confirmado,
    criado,
    concluir: () => criado && onCriado(criado.agendamentoId),
    pronto,
    sujo,
    salvar,
  };
}

export type EstadoAgendamentoManual = ReturnType<typeof useAgendamentoManual>;
