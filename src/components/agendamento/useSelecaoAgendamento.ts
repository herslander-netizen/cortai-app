import { useEffect, useMemo, useState } from "react";

import {
  horariosDisponiveis,
  profissionaisDoServico,
  proximosDiasNoFuso,
  type Ocupado,
  type Opcao,
} from "@/lib/disponibilidade";
import { horarioDoDia, type HorarioDeFuncionamento } from "@/lib/horarios";

type Servico = {
  id: string;
  nome: string;
  preco_centavos: number;
  duracao_min: number;
  profissional_ids?: string[] | null;
};
type Profissional = { id: string; nome: string };

export function useSelecaoAgendamento({
  servicos,
  profissionais,
  horarios,
  ocupados,
  fuso,
  regras,
  quantidadeDias = 14,
}: {
  servicos: Servico[];
  profissionais: Profissional[];
  horarios: HorarioDeFuncionamento[];
  ocupados: Ocupado[];
  fuso: string;
  regras: { antecedenciaMin: number; intervaloEntreMin: number };
  quantidadeDias?: number;
}) {
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [profissionalId, setProfissionalId] = useState("qualquer");
  const [dia, setDia] = useState<string | null>(null);
  const [inicio, setInicio] = useState<string | null>(null);
  const servico = servicos.find((item) => item.id === servicoId) ?? null;
  const aptos = useMemo(
    () => profissionaisDoServico(servico, profissionais),
    [servico, profissionais],
  );
  const dias = useMemo(() => proximosDiasNoFuso(quantidadeDias, fuso), [quantidadeDias, fuso]);

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
            })
          : { fechado: horarioDoDia(data, horarios).fechado, opcoes: [] },
      );
    }
    return mapa;
  }, [dias, servico, profissionais, profissionalId, horarios, fuso, ocupados, regras]);

  useEffect(() => {
    if (!servico) return;
    if (dia && (porDia.get(dia)?.opcoes.length ?? 0) > 0) return;
    setDia(dias.find((data) => (porDia.get(data)?.opcoes.length ?? 0) > 0) ?? null);
    setInicio(null);
  }, [dia, dias, porDia, servico]);

  const agenda = dia ? porDia.get(dia) : undefined;
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
    inicio,
    escolhido,
    setDia: (data: string | null) => {
      setDia(data);
      setInicio(null);
    },
    setInicio,
  };
}
