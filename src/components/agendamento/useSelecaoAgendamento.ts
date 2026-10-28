import { useEffect, useMemo, useRef, useState } from "react";

import {
  estadosDoDia,
  horariosDisponiveis,
  profissionaisDoServico,
  proximosDiasNoFuso,
  type Ocupado,
  type Opcao,
} from "@/lib/disponibilidade";
import {
  horarioDoDia,
  type HorarioDeFuncionamento,
  type IntervalosPorData,
} from "@/lib/horarios";

type Servico = {
  id: string;
  nome: string;
  preco_centavos: number;
  duracao_min: number;
  profissional_ids?: string[] | null;
  foto_url?: string | null;
};
type Profissional = { id: string; nome: string; avatar_url?: string | null };
const SEM_INTERVALOS: IntervalosPorData = {};

export function useSelecaoAgendamento({
  servicos,
  profissionais,
  horarios,
  ocupados,
  fuso,
  regras,
  quantidadeDias = 30,
  passoMin = 30,
  intervalosPorData,
}: {
  servicos: Servico[];
  profissionais: Profissional[];
  horarios: HorarioDeFuncionamento[];
  ocupados: Ocupado[];
  fuso: string;
  regras: { antecedenciaMin: number; intervaloEntreMin: number };
  quantidadeDias?: number;
  passoMin?: number;
  intervalosPorData?: IntervalosPorData;
}) {
  const intervalosAtivos = intervalosPorData ?? SEM_INTERVALOS;
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [profissionalId, setProfissionalId] = useState("qualquer");
  const [dia, setDia] = useState<string | null>(null);
  const [inicio, setInicio] = useState<string | null>(null);
  const servico = servicos.find((item) => item.id === servicoId) ?? null;
  const aptos = useMemo(
    () => profissionaisDoServico(servico, profissionais),
    [servico, profissionais],
  );
  // "Agora" avança a cada minuto: página aberta por horas não oferece horário que já passou.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const hojeChave = new Date(agora).toISOString().slice(0, 13);
  const dias = useMemo(
    () => proximosDiasNoFuso(quantidadeDias, fuso, agora),
    // Recalcula só quando a hora muda, não a cada minuto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quantidadeDias, fuso, hojeChave],
  );

  useEffect(() => {
    if (profissionalId !== "qualquer" && !aptos.some((item) => item.id === profissionalId)) {
      setProfissionalId("qualquer");
      setInicio(null);
    }
  }, [aptos, profissionalId]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, { fechado: boolean; opcoes: Opcao[] }>();
    for (const data of dias) {
      mapa.set(
        data,
        servico
          ? horariosDisponiveis({
              dia: data,
              servico,
              profissionais,
              escolhido: profissionalId,
              horarios,
              fuso,
              ocupados,
              regras,
              agora,
              passoMin,
              intervalosPorData: intervalosAtivos,
            })
          : { fechado: horarioDoDia(data, horarios, intervalosAtivos).fechado, opcoes: [] },
      );
    }
    return mapa;
  }, [
    dias,
    servico,
    profissionais,
    profissionalId,
    horarios,
    fuso,
    ocupados,
    regras,
    agora,
    passoMin,
    intervalosAtivos,
  ]);

  // Escolhe um dia sozinho só na primeira vez em que um serviço é selecionado;
  // depois disso, o toque do cliente é respeitado mesmo em dia lotado.
  const autoEscolhidoPara = useRef<string | null>(null);
  useEffect(() => {
    if (!servico) {
      autoEscolhidoPara.current = null;
      return;
    }
    if (autoEscolhidoPara.current !== null) return;
    autoEscolhidoPara.current = servico.id;
    if (dia && (porDia.get(dia)?.opcoes.length ?? 0) > 0) return;
    setDia(dias.find((data) => (porDia.get(data)?.opcoes.length ?? 0) > 0) ?? null);
    setInicio(null);
  }, [dia, dias, porDia, servico]);

  // Horário escolhido que passou enquanto a página estava aberta sai da seleção.
  useEffect(() => {
    if (inicio && dia && !(porDia.get(dia)?.opcoes ?? []).some((o) => o.iso === inicio))
      setInicio(null);
  }, [inicio, dia, porDia]);

  const agenda = dia ? porDia.get(dia) : undefined;
  // Mesmo motor: horários do dia com estado, para mostrar "Ocupado" sem permitir escolher.
  const ocupadosDoDia = useMemo(
    () =>
      dia && servico
        ? estadosDoDia({
            dia,
            servico,
            profissionais,
            escolhido: profissionalId,
            horarios,
            fuso,
            ocupados,
            regras,
            agora,
            passoMin,
            intervalosPorData: intervalosAtivos,
          }).horarios.filter((h) => h.estado === "ocupado")
        : [],
    [
      dia,
      servico,
      profissionais,
      profissionalId,
      horarios,
      fuso,
      ocupados,
      regras,
      agora,
      passoMin,
      intervalosAtivos,
    ],
  );
  const escolhido = agenda?.opcoes.find((opcao) => opcao.iso === inicio) ?? null;

  return {
    servicoId,
    servico,
    setServicoId: (id: string | null) => {
      setServicoId(id);
      setInicio(null);
    },
    profissionalId,
    aptos,
    setProfissionalId: (id: string) => {
      setProfissionalId(id);
      setInicio(null);
    },
    dias,
    dia,
    porDia,
    agenda,
    ocupadosDoDia,
    inicio,
    escolhido,
    setDia: (data: string | null) => {
      setDia(data);
      setInicio(null);
    },
    setInicio,
  };
}
