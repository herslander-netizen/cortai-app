import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { TelaDeFormulario } from "@/components/ui/formulario/TelaDeFormulario";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { getPerfilDoMembroParaEdicao } from "@/lib/painel-membro.functions";
import { salvarPerfilProfissional } from "@/lib/crescimento.functions";

export const Route = createFileRoute("/barbeiro/equipe-dados/$userId")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "equipe_avancada"),
  head: () => ({
    meta: [
      { title: "Editar dados do profissional — Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditarDadosMembroPage,
});

type PerfilEditavel = {
  id: string;
  nome: string;
  descricao: string;
  portfolio: string[];
};

function EditarDadosMembroPage() {
  const { userId } = Route.useParams();
  const perfil = useQuery({
    queryKey: ["perfil-membro-edicao", userId],
    queryFn: () => getPerfilDoMembroParaEdicao({ data: { userId } }),
    retry: false,
  });
  if (perfil.isLoading) {
    return (
      <Screen voltarPara="/barbeiro/equipe" title="Editar dados do profissional">
        <EsqueletoFormulario campos={3} />
      </Screen>
    );
  }
  if (!perfil.data || perfil.isError) {
    return (
      <Screen voltarPara="/barbeiro/equipe" title="Editar dados do profissional">
        <div className="space-y-3 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
          <Aviso tom="atencao">
            {perfil.error instanceof Error ? perfil.error.message : "Não foi possível carregar os dados."}
          </Aviso>
          <Button variant="outline" type="button" onClick={() => void perfil.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </Screen>
    );
  }
  return <FormularioDeDados key={perfil.data.id} userId={userId} perfil={perfil.data} />;
}

function FormularioDeDados({ userId, perfil }: { userId: string; perfil: PerfilEditavel }) {
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(perfil.nome);
  const [descricao, setDescricao] = useState(perfil.descricao);
  const sujo = nome !== perfil.nome || descricao !== perfil.descricao;
  const nomeValido = nome.trim().length >= 2 && nome.trim().length <= 120;

  const salvar = useMutation({
    mutationFn: () =>
      salvarPerfilProfissional({
        data: {
          id: perfil.id,
          userId,
          nome: nome.trim(),
          descricao: descricao.trim(),
          // Preserve as fotos existentes; esta tela não edita a biblioteca.
          portfolio: perfil.portfolio,
        },
      }),
    onSuccess: () => {
      aviso.ok("Dados do profissional atualizados.");
      void queryClient.invalidateQueries({ queryKey: ["ficha-completa-membro", userId] });
      void queryClient.invalidateQueries({ queryKey: ["perfil-membro-edicao", userId] });
      void queryClient.invalidateQueries({ queryKey: ["profissionais-perfil"] });
      void navegar({ to: "/barbeiro/equipe/$userId", params: { userId } });
    },
    onError: (erro) => {
      aviso.erro(erro instanceof Error ? erro.message : "Não foi possível salvar os dados.");
    },
  });

  return (
    <TelaDeFormulario
      titulo="Dados do profissional"
      subtitulo="Altere a apresentação deste profissional sem modificar a conta de login."
      sujo={sujo}
      icone="voltar"
      onFechar={() => void navegar({ to: "/barbeiro/equipe/$userId", params: { userId } })}
      acao={{
        rotulo: "Salvar alterações",
        onClick: () => void salvar.mutate(),
        desabilitada: !sujo || !nomeValido || salvar.isPending,
        carregando: salvar.isPending,
        morfo: true,
        flutuante: { icone: "visto" },
      }}
    >
      <section className="space-y-4 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
        <label className="block">
          <span className="field-label">Nome de atendimento</span>
          <input
            className="field-control mt-2 w-full"
            autoComplete="off"
            maxLength={120}
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            required
            aria-invalid={!nomeValido}
          />
          {!nomeValido ? (
            <span className="field-error mt-1 block">Informe pelo menos 2 caracteres.</span>
          ) : null}
        </label>
        <label className="block">
          <span className="field-label">Descrição pública</span>
          <textarea
            className="field-control mt-2 min-h-32 w-full resize-y"
            rows={5}
            maxLength={2000}
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            placeholder="Apresentação do profissional aos clientes"
          />
          <span className="field-hint mt-1 block">{descricao.length}/2000 caracteres</span>
        </label>
      </section>
      <p className="mt-4 px-1 text-sm leading-relaxed text-mute">
        A foto, o portfólio, os serviços, os horários e as permissões permanecem como estão.
        O nome da conta de acesso é independente do nome exibido aos clientes.
      </p>
    </TelaDeFormulario>
  );
}
