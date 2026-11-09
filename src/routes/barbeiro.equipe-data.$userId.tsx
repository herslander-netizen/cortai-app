import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Trash2 } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { TelaDeFormulario } from "@/components/ui/formulario/TelaDeFormulario";
import { SeletorDeHorario } from "@/components/ui/seletor-de-horario";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { getPerfilDoMembroParaEdicao } from "@/lib/painel-membro.functions";
import { getConfiguracaoInicial } from "@/lib/onboarding.functions";
import { hojeNoFuso } from "@/lib/horarios";
import { horarioEspecialValido } from "@/lib/horarios-especiais";
import {
  listarHorariosEspeciaisDoDia,
  salvarHorarioEspecial,
  removerHorarioEspecial,
} from "@/lib/horarios-especiais.functions";

export const Route = createFileRoute("/barbeiro/equipe-data/$userId")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "equipe_avancada"),
  head: () => ({
    meta: [
      { title: "Disponibilidade por data — Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HorarioPorDataPage,
});

function HorarioPorDataPage() {
  const { userId } = Route.useParams();
  const perfil = useQuery({
    queryKey: ["perfil-membro-edicao", userId],
    queryFn: () => getPerfilDoMembroParaEdicao({ data: { userId } }),
    retry: false,
  });
  const configuracao = useQuery({
    queryKey: ["configuracao-inicial"],
    queryFn: () => getConfiguracaoInicial(),
  });

  if (perfil.isLoading || configuracao.isLoading) {
    return (
      <Screen voltarPara="/barbeiro/equipe" title="Disponibilidade por data">
        <EsqueletoFormulario campos={3} />
      </Screen>
    );
  }
  if (!perfil.data || !configuracao.data || perfil.isError || configuracao.isError) {
    return (
      <Screen voltarPara="/barbeiro/equipe" title="Disponibilidade por data">
        <div className="space-y-3 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
          <Aviso tom="atencao">Não foi possível carregar o profissional ou o horário do negócio.</Aviso>
          <Button variant="outline" type="button" onClick={() => {
            void perfil.refetch();
            void configuracao.refetch();
          }}>
            Tentar novamente
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <EditorHorarioDaData
      key={perfil.data.id}
      userId={userId}
      profissionalId={perfil.data.id}
      nome={perfil.data.nome}
      fuso={configuracao.data.tenant.fuso}
    />
  );
}

function EditorHorarioDaData({
  userId,
  profissionalId,
  nome,
  fuso,
}: {
  userId: string;
  profissionalId: string;
  nome: string;
  fuso: string;
}) {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const hoje = hojeNoFuso(fuso);
  const [dia, setDia] = useState(hoje);
  const [abre, setAbre] = useState("");
  const [fecha, setFecha] = useState("");
  const [relogio, setRelogio] = useState<"abre" | "fecha" | null>(null);
  const [confirmar, dialogo] = useConfirmar();

  const lista = useQuery({
    queryKey: ["horarios-especiais", dia],
    queryFn: () => listarHorariosEspeciaisDoDia({ data: { dia } }),
    enabled: dia >= hoje && /^\d{4}-\d{2}-\d{2}$/.test(dia),
    retry: false,
  });
  const atual = lista.data?.find((horario) => horario.profissionalId === profissionalId);

  useEffect(() => {
    setAbre(atual?.abre ?? "");
    setFecha(atual?.fecha ?? "");
  }, [dia, atual?.id, atual?.abre, atual?.fecha]);

  const atualizar = () => {
    void qc.invalidateQueries({ queryKey: ["horarios-especiais", dia] });
    void qc.invalidateQueries({ queryKey: ["ficha-completa-membro", userId] });
    void qc.invalidateQueries({ queryKey: ["agenda-dia"] });
    void qc.invalidateQueries({ queryKey: ["agenda-periodo"] });
  };

  const salvar = useMutation({
    mutationFn: () => salvarHorarioEspecial({ data: { dia, profissionalId, abre, fecha } }),
    onSuccess: () => {
      atualizar();
      aviso.ok("Disponibilidade especial salva para esta data.");
    },
    onError: (erro) => aviso.erro(erro instanceof Error ? erro.message : "Não foi possível salvar."),
  });
  const remover = useMutation({
    mutationFn: (id: string) => removerHorarioEspecial({ data: { id } }),
    onSuccess: () => {
      atualizar();
      setAbre("");
      setFecha("");
      aviso.ok("Horário especial removido. O profissional volta à escala semanal.");
    },
    onError: (erro) => aviso.erro(erro instanceof Error ? erro.message : "Não foi possível remover."),
  });

  const sujo = abre !== (atual?.abre ?? "") || fecha !== (atual?.fecha ?? "");
  const valido = horarioEspecialValido(abre, fecha);
  const ocupado = salvar.isPending || remover.isPending;
  const podeSalvar = Boolean(lista.data) && dia >= hoje && sujo && valido && !ocupado;

  const pedirRemocao = async () => {
    if (!atual || ocupado) return;
    const ok = await confirmar({
      titulo: "Remover horário desta data?",
      descricao: "A escala semanal volta a valer. Agendamentos já existentes não serão apagados.",
      confirmar: "Remover horário",
      destrutivo: true,
    });
    if (ok) remover.mutate(atual.id);
  };

  return (
    <TelaDeFormulario
      titulo="Disponibilidade por data"
      subtitulo={"Ajuste somente uma data para " + nome + ". A escala semanal continua preservada."}
      icone="voltar"
      sujo={sujo && !ocupado}
      onFechar={() => void navegar({ to: "/barbeiro/equipe/$userId", params: { userId } })}
      acao={{
        rotulo: atual ? "Salvar alterações" : "Adicionar disponibilidade",
        onClick: () => salvar.mutate(),
        desabilitada: !podeSalvar,
        carregando: salvar.isPending,
        morfo: true,
        flutuante: { icone: "visto" },
      }}
    >
      <section className="space-y-5 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
        <label className="block">
          <span className="field-label flex items-center gap-2">
            <CalendarDays aria-hidden className="size-4" /> Data
          </span>
          <input
            type="date"
            className="field-control mt-2 min-h-12 w-full"
            aria-label="Data da disponibilidade especial"
            value={dia}
            min={hoje}
            onChange={(evento) => setDia(evento.target.value)}
          />
        </label>

        {lista.isLoading ? (
          <p className="text-sm text-mute" role="status">Consultando o horário desta data...</p>
        ) : null}
        {lista.isError ? (
          <Aviso tom="atencao">
            Não foi possível conferir esta data. Tente novamente antes de salvar.
          </Aviso>
        ) : null}
        {lista.isError ? (
          <Button type="button" variant="outline" onClick={() => void lista.refetch()}>
            Tentar novamente
          </Button>
        ) : null}

        {lista.data ? (
          <div className="grid grid-cols-2 gap-3">
            {([
              { chave: "abre", rotulo: "Abre às", valor: abre },
              { chave: "fecha", rotulo: "Fecha às", valor: fecha },
            ] as const).map(({ chave, rotulo, valor }) => (
              <div key={chave}>
                <span className="field-label">{rotulo}</span>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 min-h-12 w-full justify-center"
                  aria-label={rotulo + ": " + (valor || "escolher horário")}
                  onClick={() => setRelogio(chave)}
                >
                  <Clock3 aria-hidden className="size-4" />
                  {valor || "Escolher"}
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {lista.data && !valido && (abre || fecha) ? (
          <p className="field-error" role="alert">
            Escolha abertura e fechamento válidos; o fechamento deve ser posterior à abertura.
          </p>
        ) : null}
        {lista.data && atual ? (
          <div className="border-t border-line pt-4">
            <p className="text-sm text-mute">
              Esta data possui um horário individual configurado. Remover restaura a escala semanal.
            </p>
            <Button
              variant="destructive"
              type="button"
              className="mt-3 min-h-12 w-full"
              disabled={ocupado}
              loading={remover.isPending}
              onClick={() => void pedirRemocao()}
            >
              <Trash2 aria-hidden className="size-4" /> Remover horário especial
            </Button>
          </div>
        ) : null}
      </section>
      <p className="mt-4 px-1 text-sm leading-relaxed text-mute">
        Esta opção define uma janela de atendimento para a data escolhida.
        Não cancela agendamentos existentes nem altera os horários dos outros profissionais.
      </p>
      <SeletorDeHorario
        aberto={relogio !== null}
        titulo={relogio === "abre" ? "Horário de abertura" : "Horário de fechamento"}
        valor={relogio === "abre" ? (abre || "09:00") : (fecha || "18:00")}
        onAberto={(aberto) => { if (!aberto) setRelogio(null); }}
        onEscolher={(valor) => {
          if (relogio === "abre") setAbre(valor);
          if (relogio === "fecha") setFecha(valor);
          setRelogio(null);
        }}
      />
      {dialogo}
    </TelaDeFormulario>
  );
}
