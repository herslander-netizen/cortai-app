import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, KeyRound, Mail, ShieldCheck, Trash2, UserPlus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
import { AvatarDeIniciais } from "@/components/ui/avatar-iniciais";
import { useSucessoDoBotao } from "@/hooks/useSucessoDoBotao";
import { EquipeWhatsapp } from "@/components/barbeiro/EquipeWhatsapp";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { MOLA, TEMPO } from "@/lib/movimento-figaro";
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
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "equipe_avancada"),
  head: () => ({
    meta: [
      { title: "Equipe e permissões — Cortaí Gestão" },
      {
        name: "description",
        content: "Cada pessoa com o próprio login e só o acesso que precisa.",
      },
      { property: "og:title", content: "Equipe e permissões — Cortaí Gestão" },
      { property: "og:description", content: "Gerencie quem tem acesso ao seu negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EquipePage,
});

function EquipePage() {
  const reduzirMovimento = useReducedMotion();
  const queryClient = useQueryClient();
  const equipe = useQuery({ queryKey: ["equipe"], queryFn: () => listarEquipe() });
  const [email, setEmail] = useState("");
  const [papelConvite, setPapelConvite] = useState<PapelDeEquipe>("barbeiro");
  const [mensagem, setMensagem] = useState<{ tom: "sucesso" | "acao"; texto: string } | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  // Como no Figaro, a lista vem primeiro e "Adicionar" fica embaixo, abrindo o formulário.
  const [convidando, setConvidando] = useState(false);
  const convidou = useSucessoDoBotao();

  const recarregar = () => queryClient.invalidateQueries({ queryKey: ["equipe"] });
  const falhar = (e: unknown) =>
    setMensagem({
      tom: "acao",
      texto: e instanceof Error ? e.message : "Não foi possível concluir.",
    });

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
      convidou.confirmar();
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
    mutationFn: (dados: {
      userId: string;
      papel: PapelDeEquipe;
      permissoes: string[];
      ativo: boolean;
    }) => salvarAcessoDoMembro({ data: dados }),
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
      setMensagem({ tom: "sucesso", texto: "Acesso removido do negócio." });
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

          <section>
            <h2 className="mb-2 px-4 text-sm font-semibold text-mute2">Quem tem acesso</h2>
            <AnimatePresence mode="wait" initial={false}>
              {equipe.isLoading ? (
                <motion.div
                  key="carregando"
                  initial={reduzirMovimento ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ opacity: { duration: reduzirMovimento ? 0 : TEMPO.conteudoSai } }}
                >
                  <EsqueletoLista linhas={3} />
                </motion.div>
              ) : (equipe.data?.length ?? 0) === 0 ? (
                <motion.div
                  key="vazio"
                  initial={reduzirMovimento ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{
                    opacity: 0,
                    height: 0,
                    transition: {
                      height: reduzirMovimento ? { duration: 0 } : MOLA.tamanho,
                      opacity: { duration: reduzirMovimento ? 0 : TEMPO.conteudoSai },
                    },
                  }}
                  transition={{
                    height: reduzirMovimento ? { duration: 0 } : MOLA.tamanho,
                    opacity: { duration: reduzirMovimento ? 0 : TEMPO.conteudoEntra },
                  }}
                  className="overflow-hidden"
                >
                  <EmptyState text="Só você tem acesso a este negócio." />
                </motion.div>
              ) : (
                <motion.ul
                  key="lista"
                  initial={reduzirMovimento ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{
                    opacity: 0,
                    height: 0,
                    transition: {
                      height: reduzirMovimento ? { duration: 0 } : MOLA.tamanho,
                      opacity: { duration: reduzirMovimento ? 0 : TEMPO.conteudoSai },
                    },
                  }}
                  transition={{
                    height: reduzirMovimento ? { duration: 0 } : MOLA.tamanho,
                    opacity: { duration: reduzirMovimento ? 0 : TEMPO.conteudoEntra },
                  }}
                  // Grupo de linhas do Figaro: 28 dp nas pontas, 4 dp por dentro e 2 dp entre as linhas.
                  className="flex flex-col gap-0.5 overflow-hidden [&>li]:rounded-[4px] [&>li]:bg-[var(--figaro-surface-container-high,var(--ink2))] [&>li:first-child]:rounded-t-[28px] [&>li:last-child]:rounded-b-[28px]"
                >
                  {(equipe.data ?? []).map((membro) => (
                    <li key={membro.userId} className="px-4 py-3">
                      <CartaoMembro
                        membro={membro}
                        aberto={editando === membro.userId}
                        onAbrir={() =>
                          setEditando(editando === membro.userId ? null : membro.userId)
                        }
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
                </motion.ul>
              )}
            </AnimatePresence>
          </section>
          <section>
            <Button
              type="button"
              variant="secondary"
              aria-expanded={convidando}
              onClick={() => setConvidando((v) => !v)}
              className="h-12 rounded-full border-0 bg-[var(--figaro-primary-container,var(--ink3))] px-5 text-[var(--figaro-on-primary-container,var(--paper))]"
            >
              <UserPlus aria-hidden /> Dar acesso a alguém
              <ChevronDown
                aria-hidden
                className={`transition-transform duration-200 ${convidando ? "rotate-180" : ""}`}
              />
            </Button>
            {convidando ? (
              <div className="mt-3 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
                <p className="mt-1 text-xs leading-relaxed text-mute">
                  Digite o e-mail da pessoa. Se ela ainda não tiver conta, enviamos o convite por
                  e-mail para ela criar a senha e confirmar o acesso. Você nunca vê nem cria a senha
                  de ninguém.
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
                    <span className="mt-2 grid min-h-12 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-t-[8px] border-0 bg-[var(--figaro-surface-container-highest,var(--ink3))] px-3">
                      <Mail size={16} aria-hidden className="text-mute" />
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        required
                        className="min-h-12 min-w-0 bg-transparent text-sm text-paper outline-none"
                      />
                    </span>
                  </label>
                  <label className="block text-xs font-medium text-mute">
                    Papel
                    <select
                      value={papelConvite}
                      onChange={(e) => setPapelConvite(e.target.value as PapelDeEquipe)}
                      className="field-control mt-2 w-full"
                    >
                      <option value="gerente">{PAPEIS.gerente}</option>
                      <option value="barbeiro">{PAPEIS.barbeiro}</option>
                      <option value="recepcao">{PAPEIS.recepcao}</option>
                    </select>
                    <span className="mt-1 block text-xs text-mute2">
                      {DESCRICAO_DO_PAPEL[papelConvite]}
                    </span>
                  </label>
                  <Button
                    variant="primary"
                    className="min-h-12 w-full"
                    disabled={convite.isPending}
                    loading={convite.isPending}
                    success={convidou.sucesso}
                  >
                    Convidar para a equipe
                  </Button>
                </form>
              </div>
            ) : null}
          </section>

          <EquipeWhatsapp />

          <RegraDeRecebimento />

          <Aviso tom="info" titulo="Segurança">
            As permissões valem também fora da tela: quem não tem acesso a um módulo não consegue
            usá-lo nem por atalho. Toda alteração fica registrada na auditoria do negócio.
          </Aviso>
        </div>
      )}
    </Screen>
  );
}

const SELO =
  "inline-flex min-h-5 items-center rounded-full px-2 text-[11px] font-semibold leading-4";

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
      {/* Linha do Figaro (`FigarooListRow`): avatar de 40 dp, nome 15/20, e-mail de apoio e os selos de função e
          situação; tocar abre o ajuste (o proprietário só mostra o escudo). */}
      <Button
        variant="ghost"
        type="button"
        size="bloco"
        aria-expanded={dono ? undefined : aberto}
        {...(dono ? { tabIndex: -1, "aria-disabled": true } : { onClick: onAbrir })}
        className="grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none bg-transparent p-0 text-left hover:bg-transparent active:bg-transparent active:scale-100 aria-disabled:cursor-default"
      >
        <AvatarDeIniciais nome={membro.nome ?? membro.email ?? "?"} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold leading-5 text-paper">
            {membro.nome ?? membro.email ?? "Conta"}
          </span>
          <span className="mt-0.5 block truncate text-sm leading-5 text-mute">
            {membro.email ?? "sem e-mail"}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`${SELO} bg-[var(--figaro-primary-container)] text-[var(--figaro-on-primary-container)]`}
            >
              {PAPEIS[membro.papel as PapelDeEquipe] ?? membro.papel}
            </span>
            {membro.ativo ? null : (
              <span
                className={`${SELO} bg-[var(--figaro-error-container)] text-[var(--figaro-on-error-container)]`}
              >
                Acesso desativado
              </span>
            )}
            {membro.aceitoEm ? null : (
              <span
                className={`${SELO} bg-[var(--figaro-warning-container)] text-[var(--figaro-on-warning-container)]`}
              >
                Convite pendente
              </span>
            )}
          </span>
        </span>
        {dono ? (
          <ShieldCheck
            aria-label="Proprietário"
            className="!size-6 text-[var(--figaro-primary,var(--primary))]"
          />
        ) : (
          <ChevronDown
            aria-hidden
            className={`!size-5 text-mute2 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
          />
        )}
      </Button>

      {aberto && !dono ? (
        <div className="mt-3 space-y-4 pt-1">
          <div>
            <p className="text-xs font-medium text-mute">Função</p>
            <OpcoesConectadas
              rotulo="Função"
              valor={papel}
              opcoes={(["barbeiro", "recepcao", "gerente"] as PapelDeEquipe[]).map((opcao) => ({
                valor: opcao,
                texto: PAPEIS[opcao].split("/")[0] ?? opcao,
              }))}
              onChange={trocarPapel}
              // Três funções em 360 px: menos respiro lateral para "Profissional" caber inteiro.
              className="mt-2 [&>button]:px-2"
            />
            <p className="mt-2 text-xs text-mute2">
              {DESCRICAO_DO_PAPEL[papel]} Um toque aplica o pacote da função.
            </p>
          </div>

          <Button variant="text" type="button" onClick={() => setAjusteFino((v) => !v)}>
            {ajusteFino ? "Esconder ajuste fino" : "Ajuste fino (opcional)"}
          </Button>

          {ajusteFino ? (
            <div className="space-y-3">
              {MODULOS.map((modulo) => (
                <fieldset
                  key={modulo.id}
                  className="rounded-[12px] border-0 bg-[var(--figaro-surface-container,var(--ink2))] p-3"
                >
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mute2">
                    {modulo.titulo}
                  </legend>
                  <p className="text-xs leading-relaxed text-mute2">{modulo.descricao}</p>
                  <div className="mt-2 space-y-1.5">
                    {modulo.itens
                      .filter((item) => TETO_DO_PAPEL[papel].includes(item.chave))
                      .map((item) => (
                        <label
                          key={item.chave}
                          className="flex min-h-12 items-center gap-3 text-sm text-paper"
                        >
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
                            className="h-5 w-5 shrink-0 rounded border-line2 bg-ink accent-[var(--gold)]"
                          />
                          <span className="min-w-0">
                            <span className="block leading-snug">{item.rotulo}</span>
                            <span className="text-xs uppercase tracking-wide text-mute2">
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

          <label className="flex min-h-12 items-center gap-3 text-sm text-paper">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-5 w-5 rounded border-line2 bg-ink accent-[var(--gold)]"
            />
            Acesso liberado para entrar no negócio
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              type="button"
              className="min-h-12 flex-1"
              disabled={ocupado}
              onClick={() => onSalvar({ papel, permissoes, ativo })}
            >
              Salvar acesso
            </Button>
            <Button
              variant="outline"
              type="button"
              className="min-h-12 px-3 text-xs"
              disabled={ocupado}
              onClick={onRecuperar}
            >
              <KeyRound size={14} /> Enviar recuperação
            </Button>
            <Button
              variant="destructive"
              type="button"
              className="min-h-12 px-3 text-xs"
              disabled={ocupado}
              onClick={onRemover}
            >
              <Trash2 size={14} /> Remover acesso
            </Button>
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
    <section className="surface p-4">
      <label className="flex min-h-12 items-center justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-paper">
            Profissional recebe pagamento
          </span>
          <span className="mt-1 block text-xs text-mute">
            Recepção, gerente e dono sempre recebem. Ligue para o barbeiro também fechar a comanda e
            receber.
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
      {mudar.isError ? (
        <p className="mt-2 text-xs text-paper" role="alert">
          Não foi possível salvar. Tente de novo.
        </p>
      ) : null}
    </section>
  );
}
