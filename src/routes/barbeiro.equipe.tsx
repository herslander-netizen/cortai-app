import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Mail, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { Aviso } from "@/components/ui/aviso";
import {
  convidarMembro,
  definirBarbeiroRecebe,
  getBarbeiroRecebe,
  enviarRecuperacaoParaMembro,
  listarEquipe,
  removerMembro,
  salvarAcessoDoMembro,
  type MembroDaEquipe,
} from "@/lib/equipe.functions";
import {
  ACOES,
  DESCRICAO_DO_PAPEL,
  MODULOS,
  PAPEIS,
  PERMISSOES_PADRAO,
  SEM_PERMISSAO,
  TETO_DO_PAPEL,
  type PapelDeEquipe,
} from "@/lib/permissoes";

export const Route = createFileRoute("/barbeiro/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe e permissões — Cortaí Gestão" },
      { name: "description", content: "Cada pessoa com o próprio login e só o acesso que precisa." },
      { property: "og:title", content: "Equipe e permissões — Cortaí Gestão" },
      { property: "og:description", content: "Gerencie quem tem acesso à sua barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EquipePage,
});

function EquipePage() {
  const queryClient = useQueryClient();
  const equipe = useQuery({ queryKey: ["equipe"], queryFn: () => listarEquipe() });
  const [email, setEmail] = useState("");
  const [papelConvite, setPapelConvite] = useState<PapelDeEquipe>("barbeiro");
  const [mensagem, setMensagem] = useState<{ tom: "sucesso" | "acao"; texto: string } | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  const recarregar = () => queryClient.invalidateQueries({ queryKey: ["equipe"] });
  const falhar = (e: unknown) =>
    setMensagem({ tom: "acao", texto: e instanceof Error ? e.message : "Não foi possível concluir." });

  const convite = useMutation({
    mutationFn: () =>
      convidarMembro({
        data: {
          email: email.trim(),
          papel: papelConvite as "gerente",
          redirectTo: `${window.location.origin}/redefinir-senha?convite=1`,
        },
      }),
    onSuccess: async (resultado) => {
      setEmail("");
      setMensagem({
        tom: "sucesso",
        texto: resultado.enviouEmail
          ? "Convite enviado por e-mail. Assim que a pessoa criar a senha, ela confirma o acesso e já entra."
          : "Acesso liberado. A pessoa já pode entrar com o login dela.",
      });
      await recarregar();
    },
    onError: falhar,
  });

  const salvar = useMutation({
    mutationFn: (dados: { userId: string; papel: PapelDeEquipe; permissoes: string[]; ativo: boolean }) =>
      salvarAcessoDoMembro({ data: dados }),
    onSuccess: async () => {
      setMensagem({ tom: "sucesso", texto: "Acesso atualizado." });
      setEditando(null);
      await recarregar();
    },
    onError: falhar,
  });

  const remover = useMutation({
    mutationFn: (userId: string) => removerMembro({ data: { userId } }),
    onSuccess: async () => {
      setMensagem({ tom: "sucesso", texto: "Acesso removido da barbearia." });
      await recarregar();
    },
    onError: falhar,
  });

  const recuperar = useMutation({
    mutationFn: (userId: string) =>
      enviarRecuperacaoParaMembro({
        data: { userId, redirectTo: `${window.location.origin}/redefinir-senha` },
      }),
    onSuccess: () =>
      setMensagem({
        tom: "sucesso",
        texto: "Enviamos as instruções para recuperar o acesso no e-mail da pessoa.",
      }),
    onError: falhar,
  });

  const semPermissao = equipe.isError && String(equipe.error).includes("permissão");

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Equipe e permissões"
      subtitle="Cada pessoa com o próprio login e só o acesso que precisa."
    >
      {semPermissao ? (
        <Aviso tom="atencao" titulo={SEM_PERMISSAO}>
          Peça ao proprietário para liberar o gerenciamento de equipe.
        </Aviso>
      ) : (
        <div className="space-y-8">
          {mensagem ? <Aviso tom={mensagem.tom}>{mensagem.texto}</Aviso> : null}

          <section className="rounded-lg border border-line bg-ink2 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-paper">
              <UserPlus size={16} className="text-gold" /> Dar acesso a alguém
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-mute">
              Digite o e-mail da pessoa. Se ela ainda não tiver conta, enviamos o convite por e-mail para
              ela criar a senha e confirmar o acesso. Você nunca vê nem cria a senha de ninguém.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                setMensagem(null);
                convite.mutate();
              }}
            >
              <label className="block text-xs font-medium text-mute">
                E-mail da conta
                <span className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line2 bg-ink px-3">
                  <Mail size={16} aria-hidden className="text-mute" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    className="h-11 min-w-0 bg-transparent text-sm text-paper outline-none"
                  />
                </span>
              </label>
              <label className="block text-xs font-medium text-mute">
                Papel
                <select
                  value={papelConvite}
                  onChange={(e) => setPapelConvite(e.target.value as PapelDeEquipe)}
                  className="mt-2 h-11 w-full rounded-lg border border-line2 bg-ink px-3 text-sm text-paper outline-none"
                >
                  <option value="gerente">{PAPEIS.gerente}</option>
                  <option value="barbeiro">{PAPEIS.barbeiro}</option>
                  <option value="recepcao">{PAPEIS.recepcao}</option>
                </select>
                <span className="mt-1 block text-xs text-mute2">{DESCRICAO_DO_PAPEL[papelConvite]}</span>
              </label>
              <button className="btn-primary w-full py-3" disabled={convite.isPending}>
                {convite.isPending ? "Enviando…" : "Convidar para a equipe"}
              </button>
            </form>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase text-mute2">Quem tem acesso</h2>
            {equipe.isLoading ? (
              <EmptyState text="Carregando a equipe…" />
            ) : (equipe.data?.length ?? 0) === 0 ? (
              <EmptyState text="Só você tem acesso a esta barbearia." />
            ) : (
              <ul className="space-y-3">
                {(equipe.data ?? []).map((membro) => (
                  <li key={membro.userId} className="rounded-lg border border-line bg-ink2 p-4">
                    <CartaoMembro
                      membro={membro}
                      aberto={editando === membro.userId}
                      onAbrir={() => setEditando(editando === membro.userId ? null : membro.userId)}
                      onSalvar={(dados) => {
                        setMensagem(null);
                        salvar.mutate({ userId: membro.userId, ...dados });
                      }}
                      onRemover={() => {
                        setMensagem(null);
                        remover.mutate(membro.userId);
                      }}
                      onRecuperar={() => {
                        setMensagem(null);
                        recuperar.mutate(membro.userId);
                      }}
                      ocupado={salvar.isPending || remover.isPending || recuperar.isPending}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <RegraDeRecebimento />

          <Aviso tom="info" titulo="Segurança">
            As permissões valem também fora da tela: quem não tem acesso a um módulo não consegue usá-lo
            nem por atalho. Toda alteração fica registrada na auditoria da barbearia.
          </Aviso>
        </div>
      )}
    </Screen>
  );
}

function CartaoMembro({
  membro,
  aberto,
  onAbrir,
  onSalvar,
  onRemover,
  onRecuperar,
  ocupado,
}: {
  membro: MembroDaEquipe;
  aberto: boolean;
  onAbrir: () => void;
  onSalvar: (dados: { papel: PapelDeEquipe; permissoes: string[]; ativo: boolean }) => void;
  onRemover: () => void;
  onRecuperar: () => void;
  ocupado: boolean;
}) {
  const [papel, setPapel] = useState<PapelDeEquipe>(membro.papel as PapelDeEquipe);
  const [permissoes, setPermissoes] = useState<string[]>(membro.permissoes);
  const [ativo, setAtivo] = useState(membro.ativo);
  const [ajusteFino, setAjusteFino] = useState(false);
  const dono = membro.papel === "dono";

  function trocarPapel(novo: PapelDeEquipe) {
    setPapel(novo);
    setPermissoes(PERMISSOES_PADRAO[novo]);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-paper">{membro.nome ?? membro.email ?? "Conta"}</p>
          <p className="mt-0.5 truncate text-xs text-mute">{membro.email ?? "sem e-mail"}</p>
          <p className="mt-1.5 flex items-center gap-2 text-xs">
            <span className="rounded-full bg-gold-soft px-2 py-0.5 font-semibold text-gold">
              {PAPEIS[membro.papel as PapelDeEquipe] ?? membro.papel}
            </span>
            <span className={membro.ativo ? "text-sage" : "text-brick"}>
              {membro.ativo ? "acesso ativo" : "acesso desativado"}
            </span>
            {membro.aceitoEm ? null : <span className="text-mute2">convite pendente</span>}
          </p>
        </div>
        {dono ? (
          <ShieldCheck size={18} className="mt-1 shrink-0 text-gold" aria-label="Proprietário" />
        ) : (
          <button
            type="button"
            onClick={onAbrir}
            className="shrink-0 rounded-lg border border-line2 px-3 py-1.5 text-xs font-semibold text-paper"
          >
            {aberto ? "Fechar" : "Ajustar"}
          </button>
        )}
      </div>

      {aberto && !dono ? (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <div>
            <p className="text-xs font-medium text-mute">Função</p>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Função">
              {(["barbeiro", "recepcao", "gerente"] as PapelDeEquipe[]).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  role="radio"
                  aria-checked={papel === opcao}
                  onClick={() => trocarPapel(opcao)}
                  className={`min-h-12 rounded-lg border px-2 text-xs font-semibold ${
                    papel === opcao ? "border-paper bg-paper text-ink" : "border-line2 bg-ink text-paper"
                  }`}
                >
                  {PAPEIS[opcao].split("/")[0]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-mute2">{DESCRICAO_DO_PAPEL[papel]} Um toque aplica o pacote da função.</p>
          </div>

          <button
            type="button"
            onClick={() => setAjusteFino((v) => !v)}
            className="text-xs font-semibold text-paper underline underline-offset-4"
          >
            {ajusteFino ? "Esconder ajuste fino" : "Ajuste fino (opcional)"}
          </button>

          {ajusteFino ?           <div className="space-y-3">
            {MODULOS.map((modulo) => (
              <fieldset key={modulo.id} className="rounded-lg border border-line bg-ink p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gold">
                  {modulo.titulo}
                </legend>
                <p className="text-[11px] leading-relaxed text-mute2">{modulo.descricao}</p>
                <div className="mt-2 space-y-1.5">
                  {modulo.itens.filter((item) => TETO_DO_PAPEL[papel].includes(item.chave)).map((item) => (
                    <label key={item.chave} className="flex items-start gap-3 text-sm text-paper">
                      <input
                        type="checkbox"
                        checked={permissoes.includes(item.chave)}
                        onChange={(e) =>
                          setPermissoes((atual) =>
                            e.target.checked
                              ? [...atual, item.chave]
                              : atual.filter((c) => c !== item.chave),
                          )
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line2 bg-ink accent-[var(--gold)]"
                      />
                      <span className="min-w-0">
                        <span className="block leading-snug">{item.rotulo}</span>
                        <span className="text-[11px] uppercase tracking-wide text-mute2">
                          {ACOES[item.acao]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          ) : null}

          <label className="flex items-center gap-3 text-sm text-paper">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4 rounded border-line2 bg-ink accent-[var(--gold)]"
            />
            Acesso liberado para entrar na barbearia
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary flex-1 py-2.5"
              disabled={ocupado}
              onClick={() => onSalvar({ papel, permissoes, ativo })}
            >
              Salvar acesso
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-line2 bg-ink px-3 py-2.5 text-xs text-paper"
              disabled={ocupado}
              onClick={onRecuperar}
            >
              <KeyRound size={14} /> Enviar recuperação
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-line2 bg-ink px-3 py-2.5 text-xs text-brick"
              disabled={ocupado}
              onClick={onRemover}
            >
              <Trash2 size={14} /> Remover acesso
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RegraDeRecebimento() {
  const queryClient = useQueryClient();
  const regra = useQuery({ queryKey: ["barbeiro-recebe"], queryFn: () => getBarbeiroRecebe() });
  const mudar = useMutation({
    mutationFn: (ativo: boolean) => definirBarbeiroRecebe({ data: { ativo } }),
    onMutate: async (ativo) => {
      queryClient.setQueryData(["barbeiro-recebe"], { ativo });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ["barbeiro-recebe"] }),
  });
  const ativo = regra.data?.ativo ?? false;
  return (
    <section className="rounded-lg border border-line bg-ink2 p-4">
      <label className="flex min-h-12 items-center justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-paper">Barbeiro recebe pagamento</span>
          <span className="mt-1 block text-xs text-mute">
            Recepção, gerente e dono sempre recebem. Ligue para o barbeiro também fechar a comanda e receber.
          </span>
        </span>
        <input
          type="checkbox"
          checked={ativo}
          disabled={regra.isLoading || mudar.isPending}
          onChange={(e) => mudar.mutate(e.target.checked)}
          className="h-6 w-6 shrink-0 accent-[var(--gold)]"
        />
      </label>
      {mudar.isError ? <p className="mt-2 text-xs text-paper">Não foi possível salvar. Tente de novo.</p> : null}
    </section>
  );
}
