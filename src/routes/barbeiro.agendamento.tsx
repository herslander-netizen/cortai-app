import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, CalendarRange, Clock, Hourglass, Timer, UserRoundPlus } from "lucide-react";
import { useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { LinhaDeOpcoes } from "@/components/ui/formulario/LinhaDeOpcoes";
import {
  GrupoDeLinhas,
  LinhaComInterruptor,
  SecaoDeConfiguracao,
} from "@/components/ui/formulario/LinhasDeConfiguracao";
import { aviso } from "@/lib/avisos";
import {
  getImplantacao,
  salvarRegrasDeAgendamento,
  type RegrasDeAgendamento,
} from "@/lib/onboarding.functions";
import { passoValido } from "@/lib/onboarding-regras";

export const Route = createFileRoute("/barbeiro/agendamento")({
  head: () => ({
    meta: [
      { title: "Opções de agendamento — Cortaí Gestão" },
      {
        name: "description",
        content: "Como os clientes agendam: horários, antecedência e cancelamento.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OpcoesDeAgendamentoPage,
});

const PASSOS = [15, 20, 30, 40].map((v) => ({ valor: v, rotulo: `${v} min` }));
const JANELAS = [
  { valor: 7, rotulo: "7 dias" },
  { valor: 15, rotulo: "15 dias" },
  { valor: 30, rotulo: "30 dias" },
  { valor: 60, rotulo: "2 meses" },
  { valor: 90, rotulo: "3 meses" },
];
const ANTECEDENCIAS = [
  { valor: 0, rotulo: "Sem mínimo" },
  { valor: 30, rotulo: "30 min" },
  { valor: 60, rotulo: "1 hora" },
  { valor: 120, rotulo: "2 horas" },
  { valor: 1440, rotulo: "1 dia" },
];
const CANCELAMENTOS = [
  { valor: 0, rotulo: "A qualquer hora" },
  { valor: 1, rotulo: "1 hora antes" },
  { valor: 2, rotulo: "2 horas antes" },
  { valor: 24, rotulo: "1 dia antes" },
];
const INTERVALOS = [
  { valor: 0, rotulo: "Nenhum" },
  { valor: 5, rotulo: "5 min" },
  { valor: 10, rotulo: "10 min" },
  { valor: 15, rotulo: "15 min" },
];

/**
 * Opções de agendamento, como no Figaro (`AppointmentSettingsScreen`): seção "Agendamento" com linhas que abrem
 * uma folha de opções (intervalo dos horários, antecedência máxima) e interruptores que valem na hora. As regras
 * que o Cortaí tem a mais (antecedência mínima, cancelamento, intervalo entre atendimentos e encaixe) ficam em
 * "Regras do atendimento"; antes só dava para mudá-las na configuração inicial.
 */
function OpcoesDeAgendamentoPage() {
  const qc = useQueryClient();
  const gravar = useServerFn(salvarRegrasDeAgendamento);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["implantacao"],
    queryFn: () => getImplantacao(),
  });
  const [salvando, setSalvando] = useState(false);
  const podeEditar = Boolean(data?.permissoes.includes("alterar_dados_barbearia"));
  const regras = data?.regras;

  async function mudar(parte: Partial<RegrasDeAgendamento>) {
    if (!regras) return;
    const novas = { ...regras, ...parte, passoMin: passoValido(parte.passoMin ?? regras.passoMin) };
    setSalvando(true);
    // Na hora: a tela já mostra a escolha e volta ao valor anterior se o servidor recusar.
    qc.setQueryData(["implantacao"], (atual: typeof data) =>
      atual ? { ...atual, regras: novas } : atual,
    );
    try {
      await gravar({ data: novas });
      aviso.ok("Alteração salva.");
    } catch (e) {
      qc.setQueryData(["implantacao"], (atual: typeof data) =>
        atual ? { ...atual, regras } : atual,
      );
      aviso.erro(e instanceof Error ? e.message : "Não foi possível salvar a alteração.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Opções de agendamento"
      subtitle="Como os clientes agendam: horários oferecidos, antecedência e cancelamento."
    >
      <div className="pb-8">
        {isLoading ? <p className="mt-8 text-sm text-mute">Carregando…</p> : null}
        {isError && !data ? (
          <div role="alert" className="mt-8 rounded-[28px] bg-[var(--agenda-cartao,var(--ink2))] p-5">
            <p className="text-sm text-paper">
              Não foi possível carregar as opções de agendamento. Verifique sua conexão e tente de
              novo.
            </p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-primary"
              onClick={() => void refetch()}
            >
              Tentar de novo
            </button>
          </div>
        ) : null}
        {regras ? (
          <>
            <SecaoDeConfiguracao titulo="Agendamento">
              <GrupoDeLinhas>
                <LinhaDeOpcoes
                  icone={Clock}
                  titulo="Intervalo padrão dos horários"
                  suporte="De quanto em quanto tempo o cliente vê horários livres."
                  opcoes={PASSOS}
                  valor={regras.passoMin}
                  desabilitada={!podeEditar || salvando}
                  aoEscolher={(v) => void mudar({ passoMin: v })}
                />
                <LinhaDeOpcoes
                  icone={CalendarRange}
                  titulo="Antecedência máxima"
                  suporte="Até quando à frente o cliente pode agendar."
                  opcoes={JANELAS}
                  valor={regras.janelaDias}
                  desabilitada={!podeEditar || salvando}
                  aoEscolher={(v) => void mudar({ janelaDias: v })}
                />
              </GrupoDeLinhas>
            </SecaoDeConfiguracao>

            <SecaoDeConfiguracao
              titulo="Regras do atendimento"
              rodape="Valem para o link do negócio e para a agenda."
            >
              <GrupoDeLinhas>
                <LinhaDeOpcoes
                  icone={Hourglass}
                  titulo="Antecedência mínima"
                  suporte="O quanto antes do horário o cliente ainda consegue agendar."
                  opcoes={ANTECEDENCIAS}
                  valor={regras.antecedenciaMinMinutos}
                  desabilitada={!podeEditar || salvando}
                  aoEscolher={(v) => void mudar({ antecedenciaMinMinutos: v })}
                />
                <LinhaDeOpcoes
                  icone={CalendarClock}
                  titulo="Cliente pode cancelar até"
                  opcoes={CANCELAMENTOS}
                  valor={regras.cancelamentoMinHoras}
                  desabilitada={!podeEditar || salvando}
                  aoEscolher={(v) => void mudar({ cancelamentoMinHoras: v })}
                />
                <LinhaDeOpcoes
                  icone={Timer}
                  titulo="Intervalo entre atendimentos"
                  opcoes={INTERVALOS}
                  valor={regras.intervaloEntreMin}
                  desabilitada={!podeEditar || salvando}
                  aoEscolher={(v) => void mudar({ intervaloEntreMin: v })}
                />
                <LinhaComInterruptor
                  icone={UserRoundPlus}
                  titulo="Aceitar encaixes"
                  suporte="Cliente sem horário pode entrar na fila."
                  marcado={regras.aceitaEncaixe}
                  desabilitado={!podeEditar || salvando}
                  aoMudar={(v) => void mudar({ aceitaEncaixe: v })}
                />
              </GrupoDeLinhas>
            </SecaoDeConfiguracao>

            {!podeEditar ? (
              <p className="mt-4 px-4 text-xs text-mute">
                Só quem cuida do negócio pode alterar estas opções.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </Screen>
  );
}
