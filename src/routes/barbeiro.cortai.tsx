import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CalendarPlus,
  FileWarning,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";

import { Screen, EmptyState } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { QrCodeReal } from "@/components/ia/QrCodeReal";
import { diagnosticoDoEnvio, type TomDoEnvio } from "@/lib/whatsapp/erros-meta";
import { TONS, type ConfiguracaoDoAtendimento } from "@/lib/whatsapp/contrato";
import { Button } from "@/components/ui/button";
import { mensagemDeAcessoNegado, RouteError } from "@/components/layout/RouteError";
import { getAvaliacoes } from "@/lib/crescimento.functions";
import { type TipoDeConexao } from "@/lib/whatsapp/finalidade-conexao";
import {
  atualizarQrCode,
  conectarWhatsapp,
  definirNotificacoesWhatsapp,
  desconectarWhatsapp,
  getDiagnosticoDoWhatsapp,
  getPainelDoCortai,
  getRemetenteOficial,
  listarEnviosDaSecretaria,
  type DiagnosticoDoWhatsapp,
  reconectarWhatsapp,
  salvarConfiguracaoDoCortai,
  sincronizarConexao,
  type PainelDoCortai,
} from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/barbeiro/cortai")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "secretaria_whatsapp"),
  ssr: false,
  validateSearch: (
    search: Record<string, unknown>,
  ): { aba?: Aba | undefined; conversa?: string | undefined; cliente?: string | undefined } => ({
    aba:
      search["aba"] === "conversas"
        ? "envios"
        : search["aba"] === "envios" ||
            search["aba"] === "ajustes" ||
            search["aba"] === "experiencia" ||
            search["aba"] === "whatsapp"
          ? search["aba"]
          : undefined,
    conversa: typeof search["conversa"] === "string" ? search["conversa"] : undefined,
    cliente: typeof search["cliente"] === "string" ? search["cliente"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "WhatsApp · Cortaí Gestão" },
      {
        name: "description",
        content: "Conecte o WhatsApp do negócio e acompanhe notificações transacionais.",
      },
      { property: "og:title", content: "WhatsApp · Cortaí Gestão" },
      {
        property: "og:description",
        content: "Avisos e acompanhamento dos atendimentos pelo WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: RouteError,
  component: CortaiPage,
});

type Aba = "whatsapp" | "ajustes" | "experiencia" | "envios";

function Ponto({ ligado }: { ligado: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 rounded-full ${ligado ? "bg-sage" : "bg-brick"}`}
    />
  );
}

function CortaiPage() {
  const busca = Route.useSearch();
  const [aba, setAba] = useState<Aba>(busca.aba ?? "whatsapp");
  const painel = useQuery({
    queryKey: ["cortai-painel"],
    queryFn: () => getPainelDoCortai() as Promise<PainelDoCortai>,
  });

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="WhatsApp"
      subtitle="O WhatsApp do seu negócio conversa com clientes e envia os avisos."
    >
      {painel.isLoading ? <Carregando /> : null}
      {painel.isError ? (
        <p className="border-y border-line py-8 text-center text-sm text-brick">
          {mensagemDeAcessoNegado(painel.error)
            ? "Você não tem acesso a esta área"
            : "Não conseguimos carregar o CortAI agora. Tente de novo em instantes."}
        </p>
      ) : null}

      {!painel.isError ? (
        <Button asChild variant="secondary" className="mb-5">
          <Link to="/barbeiro/agenda" search={{ acao: "agendamento" }}>
            <CalendarPlus aria-hidden /> Novo agendamento
          </Link>
        </Button>
      ) : null}

      {painel.data ? (
        <>
          <section className="grid grid-cols-3 gap-2" aria-label="Situação do atendimento">
            <div className="surface px-3 py-3">
              <p className="text-xs text-mute2">WhatsApp</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-paper">
                <Ponto ligado={painel.data.conexao?.status === "conectado"} />
                {painel.data.conexao?.status === "conectado" ? "Ligado" : "Desligado"}
              </p>
            </div>
            <div className="surface px-3 py-3">
              <p className="text-xs text-mute2">Notificações</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-paper">
                <Ponto ligado={painel.data.notificacoesAtivas} />
                {painel.data.notificacoesAtivas ? "Ativas" : "Desativadas"}
              </p>
            </div>
            <div className="surface px-3 py-3">
              <p className="text-xs text-mute2">Envio de avisos</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-paper">
                <Ponto
                  ligado={
                    painel.data.notificacoesAtivas && painel.data.envioDeNotificacoesDisponivel
                  }
                />
                {!painel.data.notificacoesAtivas
                  ? "Desligado"
                  : painel.data.envioDeNotificacoesDisponivel
                    ? "Disponível"
                    : "Restabelecendo"}
              </p>
            </div>
          </section>

          <nav className="mt-5 flex gap-2" aria-label="Seções do CortAI — Assistente Virtual">
            {(
              [
                ["whatsapp", "Conexão"],
                ["ajustes", "Notificações"],
                ["experiencia", "Experiência"],
                ["envios", "Histórico"],
              ] as [Aba, string][]
            ).map(([id, rotulo]) => (
              <Button
                variant="ghost"
                key={id}
                type="button"
                onClick={() => setAba(id)}
                className={`rounded-full border px-4 py-1.5 text-xs ${
                  aba === id ? "border-cyan-400 text-cyan-400" : "border-line2 text-mute"
                }`}
              >
                {rotulo}
              </Button>
            ))}
          </nav>

          <div className="mt-5">
            {aba === "whatsapp" ? (
              <>
                <AvisosDaMeta />
                <BlocoConexao painel={painel.data} />
              </>
            ) : null}
            {aba === "envios" ? <BlocoEnvios irParaConexao={() => setAba("whatsapp")} /> : null}
            {aba === "ajustes" ? <BlocoSecretaria painel={painel.data} /> : null}
            {aba === "experiencia" ? <BlocoExperiencia /> : null}
          </div>
        </>
      ) : null}
    </Screen>
  );
}

function BlocoExperiencia() {
  const avaliacoes = useQuery({
    queryKey: ["secretaria-experiencia"],
    queryFn: () => getAvaliacoes(),
  });
  if (avaliacoes.isLoading) return <Carregando />;
  if (avaliacoes.isError)
    return (
      <p className="py-8 text-center text-sm text-brick">
        Não foi possível carregar a experiência dos clientes.
      </p>
    );
  const dados = avaliacoes.data;
  return (
    <section className="space-y-4" aria-label="Experiência do cliente">
      <div className="grid grid-cols-2 gap-3">
        <div className="surface p-4">
          <p className="text-xs text-mute2">Média</p>
          <p className="mt-1 text-2xl font-semibold text-paper">{dados?.media ?? "—"}</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-mute2">Aguardando avaliação</p>
          <p className="mt-1 text-2xl font-semibold text-paper">{dados?.pendentes.length ?? 0}</p>
        </div>
      </div>
      <div className="surface p-5">
        <h2 className="text-sm font-semibold text-paper">Avaliações recentes</h2>
        {!dados?.registradas.length ? (
          <p className="mt-3 text-sm text-mute">Nenhuma avaliação registrada ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {dados.registradas.slice(0, 5).map((avaliacao) => (
              <li key={avaliacao.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-paper">{avaliacao.cliente}</p>
                  <span className="text-sm font-semibold text-cyan-400">{avaliacao.nota}/5</span>
                </div>
                {avaliacao.comentario ? (
                  <p className="mt-1 text-xs leading-relaxed text-mute">{avaliacao.comentario}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="secondary" className="mt-4 w-full">
          <Link to="/barbeiro/avaliacoes">Ver experiência completa</Link>
        </Button>
      </div>
    </section>
  );
}

const COR_DO_TOM: Record<TomDoEnvio, string> = {
  enviado: "border-sage/50 text-sage",
  entregue: "border-sage/60 text-sage",
  lida: "border-cyan-400/60 text-cyan-400",
  aguardando: "border-line2 text-mute",
  sem_modelo: "border-gold/60 text-gold",
  falhou: "border-brick/50 text-brick",
  conta: "border-brick/60 text-brick",
};

const SEMANA = 7 * 24 * 3600_000;

function useEnviosDaSecretaria() {
  return useQuery({
    queryKey: ["secretaria-envios"],
    queryFn: () => listarEnviosDaSecretaria(),
    refetchInterval: 30000,
  });
}

/** Aviso geral: problemas recentes que a Meta está apontando. Não promete correção. */
function AvisosDaMeta() {
  const envios = useEnviosDaSecretaria();
  const recentes = (envios.data ?? []).filter(
    (e) => Date.now() - new Date(e.criadoEm).getTime() < SEMANA,
  );
  const classes = new Set(recentes.map((e) => diagnosticoDoEnvio(e).tom));
  if (!classes.has("conta") && !classes.has("sem_modelo")) return null;
  return (
    <div className="mb-4 space-y-2" role="status">
      {classes.has("conta") ? (
        <p className="rounded-lg border border-brick/50 p-3 text-sm leading-relaxed text-paper">
          <AlertTriangle className="mr-1.5 inline size-4 text-brick" aria-hidden />A Meta está
          recusando os envios por um problema de elegibilidade/pagamento da conta oficial. A conexão
          técnica está ativa, mas a conta precisa ser regularizada na Meta.
        </p>
      ) : null}
      {classes.has("sem_modelo") ? (
        <p className="rounded-lg border border-gold/50 p-3 text-sm leading-relaxed text-paper">
          <FileWarning className="mr-1.5 inline size-4 text-gold" aria-hidden />
          Algumas mensagens estão fora da janela de 24h e precisam de template aprovado.
        </p>
      ) : null}
    </div>
  );
}

function BlocoEnvios({ irParaConexao }: { irParaConexao: () => void }) {
  const envios = useEnviosDaSecretaria();
  if (envios.isLoading) return <Carregando />;
  if (envios.isError)
    return (
      <p className="py-8 text-center text-sm text-brick">Não foi possível carregar os envios.</p>
    );
  if (!envios.data?.length) return <EmptyState text="Nenhuma notificação enviada ainda." />;
  return (
    <>
      <AvisosDaMeta />
      <section className="surface overflow-hidden" aria-label="Histórico de envios">
        <ul className="divide-y divide-line">
          {envios.data.map((envio) => {
            const d = diagnosticoDoEnvio(envio);
            return (
              <li
                key={envio.id}
                className="grid gap-2 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-paper">
                    {envio.tipo.replaceAll("_", " ")}
                  </p>
                  {d.titulo ? (
                    <div className="mt-1">
                      <p className="text-sm font-semibold text-paper">{d.titulo}</p>
                      <p className="text-xs leading-relaxed text-mute">{d.detalhe}</p>
                      {d.acao === "conexao" ? (
                        <Button
                          variant="secondary"
                          className="mt-2 min-h-11"
                          onClick={irParaConexao}
                        >
                          Verificar conta Meta
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-mute">
                      {envio.conteudo ?? "Envio aguardando processamento."}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-mute2">
                    Final {envio.telefone.slice(-4)} ·{" "}
                    {new Date(envio.criadoEm).toLocaleString("pt-BR")}
                  </p>
                  {d.tecnico ? (
                    <details className="mt-1 text-xs text-mute2">
                      <summary className="cursor-pointer py-1">Detalhe técnico</summary>
                      <p className="break-words">{d.tecnico}</p>
                    </details>
                  ) : null}
                </div>
                <span
                  className={`w-fit rounded-full border px-2.5 py-1 text-xs ${COR_DO_TOM[d.tom]}`}
                >
                  {envio.respondidoEm ? "Respondido" : d.rotulo}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function BlocoSecretaria({ painel }: { painel: PainelDoCortai }) {
  const cliente = useQueryClient();
  const salvar = useServerFn(salvarConfiguracaoDoCortai);
  const [config, setConfig] = useState(painel.configuracao);
  const [retorno, setRetorno] = useState(String(painel.configuracao.recuperacaoDias));
  const mutation = useMutation({
    mutationFn: () => salvar({ data: { ...config, recuperacaoDias: Number(retorno) || 30 } }),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: ["cortai-painel"] }),
  });
  const chave = (rotulo: string, detalhe: string, valor: boolean, mudar: (v: boolean) => void) => (
    <Chave rotulo={rotulo} detalhe={detalhe} valor={valor} aoMudar={mudar} />
  );
  return (
    <section className="space-y-5">
      <Bloco
        titulo="Notificações"
        descricao="Mensagens transacionais ligadas a eventos reais do atendimento."
      >
        <ul className="space-y-4">
          {chave(
            "Confirmação automática",
            "Envia os dados reais assim que o horário é confirmado.",
            config.confirmacaoAutomatica,
            (v) => setConfig({ ...config, confirmacaoAutomatica: v }),
          )}
          {chave(
            "Lembretes",
            "Envia lembretes antecipado e próximo, respeitando preferências e silêncio.",
            config.lembretes,
            (v) => setConfig({ ...config, lembretes: v }),
          )}
          {chave(
            "Retorno",
            "Lembra o cliente quando chega a hora real de voltar.",
            config.recuperacaoAtiva,
            (v) => setConfig({ ...config, recuperacaoAtiva: v }),
          )}
        </ul>
        {config.recuperacaoAtiva ? (
          <label className="mt-4 block text-xs text-mute">
            Intervalo mínimo de retorno
            <input
              type="number"
              min={7}
              max={180}
              value={retorno}
              onChange={(e) => setRetorno(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-line2 bg-ink px-3 text-paper"
            />
          </label>
        ) : null}
      </Bloco>
      <Bloco titulo="Tom" descricao="Aplicado aos avisos, sem interpretação de conversa livre.">
        <select
          value={config.tom}
          onChange={(e) =>
            setConfig({ ...config, tom: e.target.value as ConfiguracaoDoAtendimento["tom"] })
          }
          className="h-11 w-full rounded-md border border-line2 bg-ink px-3 text-sm text-paper"
        >
          {Object.entries(TONS).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </Bloco>
      <div className="surface p-5">
        <Button className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Salvando…" : "Salvar configurações"}
        </Button>
        {mutation.isSuccess ? (
          <p className="mt-2 text-center text-xs text-sage">Configurações salvas.</p>
        ) : null}
        {mutation.isError ? (
          <p className="mt-2 text-center text-xs text-brick">Não foi possível salvar.</p>
        ) : null}
      </div>
      <p className="text-xs leading-relaxed text-mute">
        Mensagens livres recebem somente uma orientação para o Cortaí. O CortAI não abre
        atendimento, FAQ ou transferência humana.
      </p>
    </section>
  );
}

/* ------------------------------- WhatsApp -------------------------------- */

const CORES_DO_ESTADO: Record<"desconectado" | "conectando" | "conectado" | "erro", string> = {
  desconectado: "border-line2 text-mute",
  conectando: "border-gold/60 text-gold",
  conectado: "border-sage/60 text-sage",
  erro: "border-brick/60 text-brick",
};

function Selo({ estado, texto }: { estado: keyof typeof CORES_DO_ESTADO; texto: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${CORES_DO_ESTADO[estado]}`}
    >
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${
          estado === "conectado"
            ? "bg-sage"
            : estado === "erro"
              ? "bg-brick"
              : estado === "conectando"
                ? "bg-gold"
                : "bg-mute2"
        }`}
      />
      {texto}
    </span>
  );
}

/** Remetente real dos avisos: o número oficial do Cortaí. */
function BlocoRemetenteOficial() {
  const consultar = useServerFn(getRemetenteOficial);
  const estado = useQuery({
    queryKey: ["remetente-oficial"],
    queryFn: () => consultar(),
    refetchInterval: 60_000,
  });
  const selo = estado.isLoading
    ? { estado: "conectando", texto: "Verificando" }
    : estado.data?.status === "conectado"
      ? { estado: "conectado", texto: "Ativo" }
      : { estado: "erro", texto: "Indisponível" };
  return (
    <section className="surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-gold">
          <MessageCircle size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-paper">WhatsApp oficial do Cortaí</h2>
            <Selo estado={selo.estado as "conectando" | "conectado" | "erro"} texto={selo.texto} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            Seus avisos saem pelo WhatsApp oficial do Cortaí (+55 79 9818-1983), com o nome do seu
            negócio na mensagem.
          </p>
          {!estado.isLoading && estado.data?.status !== "conectado" ? (
            <p className="mt-2 text-sm text-brick" role="status">
              Não conseguimos confirmar o número oficial agora. Os avisos com falha aparecem no
              sininho com a opção de enviar pelo seu WhatsApp.
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-5 border-t border-line pt-4 text-xs text-mute2">
        Usado como reserva apenas quando o negócio não tem número próprio conectado.
      </p>
    </section>
  );
}

/** Uma conexão por negócio + interruptor de notificações sobre ela. */
export function BlocoConexao({ painel }: { painel: PainelDoCortai }) {
  return (
    <div className="space-y-4">
      {painel.podeGerenciarWhatsapp ? <CartaoDeConexao painel={painel} tipo="atendimento" /> : null}
      <CartaoNotificacoes painel={painel} />
      {/* Número antigo de avisos (legado): não envia mais; só pode ser desconectado. */}
      {painel.podeGerenciarWhatsapp && painel.conexaoNotificacoes ? (
        <CartaoDeConexao painel={painel} tipo="notificacoes" />
      ) : null}
    </div>
  );
}

/** Notificações pelo WhatsApp: liga ou desliga os avisos enviados pelo número da empresa. */
function CartaoNotificacoes({ painel }: { painel: PainelDoCortai }) {
  const cliente = useQueryClient();
  const definir = useServerFn(definirNotificacoesWhatsapp);
  const alterar = useMutation({
    mutationFn: (ativas: boolean) => definir({ data: { ativas } }),
    onSettled: () => cliente.invalidateQueries({ queryKey: ["cortai-painel"] }),
  });
  const ativas = alterar.isPending ? !!alterar.variables : painel.notificacoesAtivas;
  const selo = !ativas
    ? { estado: "desconectado" as const, texto: "Desativadas" }
    : painel.envioDeNotificacoesDisponivel
      ? { estado: "conectado" as const, texto: "Envio disponível" }
      : { estado: "conectando" as const, texto: "WhatsApp desconectado" };
  return (
    <section className="surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-gold">
          <MessageCircle size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-paper">Notificações</h2>
            <Selo estado={selo.estado} texto={selo.texto} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            Confirmações, lembretes e avisos saem pelo WhatsApp do seu negócio, para clientes e para
            a equipe que ativou avisos.
          </p>
          {ativas && !painel.envioDeNotificacoesDisponivel ? (
            <p className="mt-2 text-sm text-mute" role="status">
              Conecte o WhatsApp acima. Enquanto isso, os avisos ficam no sininho.
            </p>
          ) : null}
          {alterar.isError ? (
            <p className="mt-2 text-sm text-brick" role="alert">
              Não foi possível salvar agora. Tente de novo.
            </p>
          ) : null}
        </div>
      </div>
      {painel.podeGerenciarWhatsapp ? (
        <div className="mt-5 border-t border-line pt-4">
          <Button
            type="button"
            variant={ativas ? "secondary" : "default"}
            disabled={alterar.isPending}
            onClick={() => alterar.mutate(!ativas)}
          >
            {ativas ? "Desativar notificações" : "Ativar notificações"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

const CABECALHO_DO_TIPO: Record<TipoDeConexao, { titulo: string; subtitulo: string }> = {
  atendimento: { titulo: "WhatsApp", subtitulo: "Número da empresa" },
  notificacoes: {
    titulo: "Número antigo de avisos",
    subtitulo: "Não é mais usado — os avisos saem pelo número da empresa",
  },
};

function CartaoDeConexao({ painel, tipo }: { painel: PainelDoCortai; tipo: TipoDeConexao }) {
  const cliente = useQueryClient();
  const daLinha = tipo === "atendimento" ? painel.conexao : painel.conexaoNotificacoes;
  const cabecalho = CABECALHO_DO_TIPO[tipo];
  const conectar = useServerFn(conectarWhatsapp);
  const novoQr = useServerFn(atualizarQrCode);
  const reconectar = useServerFn(reconectarWhatsapp);
  const desconectar = useServerFn(desconectarWhatsapp);
  const sincronizar = useServerFn(sincronizarConexao);
  const [aviso, setAviso] = useState<string | null>(null);
  const [restante, setRestante] = useState<number | null>(null);
  const [desde] = useState(() => Date.now());
  const [agora, setAgora] = useState(() => Date.now());
  const [qrAberto, setQrAberto] = useState(false);

  const acao = useMutation({
    mutationFn: async (qual: "conectar" | "qr" | "reconectar" | "desconectar") => {
      if (qual === "conectar") return conectar({ data: { tipo } });
      if (qual === "qr") return novoQr({ data: { tipo } });
      if (qual === "reconectar") return reconectar({ data: { tipo } });
      return desconectar({ data: { tipo } });
    },
    onSuccess: (r: unknown) => {
      setAviso((r as { aviso?: string | null })?.aviso ?? null);
      void cliente.invalidateQueries({ queryKey: ["cortai-painel"] });
      void cliente.invalidateQueries({ queryKey: ["cortai-conexao", tipo] });
    },
    onError: (e: unknown) =>
      setAviso(e instanceof Error ? e.message : "Não foi possível concluir agora."),
  });

  const statusBase = daLinha?.status ?? "desconectado";
  // Enquanto não estiver conectado, perguntamos o estado real ao serviço.
  const acompanhar =
    painel.podeGerenciarWhatsapp &&
    painel.gatewayConfigurado &&
    statusBase !== "conectado" &&
    agora - desde < 10 * 60 * 1000;

  const estado = useQuery({
    queryKey: ["cortai-conexao", tipo],
    queryFn: () => sincronizar({ data: { tipo } }),
    enabled: acompanhar,
    refetchInterval: acompanhar ? 5000 : false,
    refetchIntervalInBackground: false,
  });

  const conexao = estado.data?.conexao ?? daLinha;
  const status = conexao?.status ?? "desconectado";
  const expira = conexao?.qrExpiraEm ?? null;

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  // Assim que o serviço confirma a conexão, o painel inteiro se atualiza.
  useEffect(() => {
    if (status === "conectado") {
      setQrAberto(false);
      void cliente.invalidateQueries({ queryKey: ["cortai-painel"] });
    }
  }, [status, cliente]);

  useEffect(() => {
    if (!expira) {
      setRestante(null);
      return;
    }
    const calcular = () =>
      setRestante(Math.max(0, Math.round((new Date(expira).getTime() - Date.now()) / 1000)));
    calcular();
    const id = window.setInterval(calcular, 1000);
    return () => window.clearInterval(id);
  }, [expira]);

  // O QR aparece sozinho assim que o serviço entrega um código válido.
  useEffect(() => {
    if ((status === "qr_pronto" || status === "conectando") && conexao?.qrCode) setQrAberto(true);
  }, [status, conexao?.qrCode]);

  if (!painel.gatewayConfigurado) {
    return (
      <section className="surface p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-gold">
            <Smartphone size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-paper">
                Serviço de WhatsApp ainda não configurado
              </h2>
              <Selo estado="desconectado" texto="Indisponível" />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-mute">
              A conexão por QR Code depende de um serviço de WhatsApp publicado pela equipe do
              Cortaí. Enquanto ele não estiver no ar, nenhum QR Code é gerado — preferimos avisar a
              mostrar algo que não funciona.
            </p>
            <p className="mt-3 text-xs text-mute2">
              Para a equipe técnica: falta configurar{" "}
              {(painel.credenciaisFaltantes.length
                ? painel.credenciaisFaltantes
                : ["EVOLUTION_API_URL", "EVOLUTION_API_KEY"]
              ).join(", ")}
              . O serviço (Evolution API) deve enviar os eventos para /api/public/whatsapp/evolution
              com o cabeçalho x-webhook-secret.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          type="button"
          className="btn-primary mt-5 w-full opacity-50"
          disabled
          aria-disabled
        >
          Conectar WhatsApp
        </Button>
        <p className="mt-2 text-center text-xs text-mute2">
          O botão será liberado assim que o serviço estiver publicado.
        </p>
      </section>
    );
  }

  // "connecting" com QR válido = aguardando leitura (não esconder o QR).
  const qrPronto = status === "qr_pronto" || (status === "conectando" && !!conexao?.qrCode);
  const qrExpirado = qrPronto && restante !== null && restante <= 0;
  const conectando = acao.isPending || status === "pendente" || status === "conectando";

  const visual: keyof typeof CORES_DO_ESTADO =
    status === "conectado"
      ? "conectado"
      : status === "erro"
        ? "erro"
        : conectando || qrPronto
          ? "conectando"
          : "desconectado";

  const rotuloDoEstado =
    status === "conectado"
      ? "Conectado"
      : status === "erro"
        ? "Erro"
        : qrPronto
          ? qrExpirado
            ? "QR Code expirado"
            : "Aguardando leitura"
          : conectando
            ? "Conectando"
            : "Desconectado";

  const titulo =
    status === "conectado"
      ? "WhatsApp conectado"
      : qrExpirado
        ? "Este QR Code expirou"
        : qrPronto
          ? "Escaneie o QR Code usando o WhatsApp"
          : status === "conectando"
            ? "Conectando seu WhatsApp…"
            : status === "pendente" || acao.isPending
              ? "Preparando conexão…"
              : status === "erro"
                ? "Não foi possível conectar seu WhatsApp"
                : conexao?.conectadoEm
                  ? "Seu WhatsApp foi desconectado"
                  : "Seu WhatsApp ainda não está conectado";

  const descricao =
    tipo === "atendimento"
      ? status === "conectado"
        ? "O CortAI — Assistente Virtual conversa com seus clientes por este número."
        : "Conecte o WhatsApp público do negócio para o CortAI conversar com os clientes."
      : status === "conectado"
        ? "Confirmações, lembretes e avisos automáticos saem por este número."
        : painel.conexao && !daLinha
          ? "Opcional. Enquanto não houver, os avisos saem pelo WhatsApp de Atendimento."
          : "Conecte um número exclusivo para confirmações, lembretes e avisos.";

  const rotuloPrincipal = acao.isPending
    ? "Preparando conexão…"
    : conectando
      ? "Conectando…"
      : status === "erro"
        ? "Tentar novamente"
        : qrPronto
          ? "Ativar conexão"
          : conexao?.conectadoEm
            ? "Reconectar WhatsApp"
            : "Conectar WhatsApp";

  return (
    <section className="surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-gold">
          {tipo === "atendimento" ? <MessageCircle size={18} /> : <Smartphone size={18} />}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            {cabecalho.titulo} · {cabecalho.subtitulo}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-paper">{titulo}</h2>
            <Selo estado={visual} texto={rotuloDoEstado} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-mute">{descricao}</p>
        </div>
      </div>

      {status === "conectado" ? (
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Número</dt>
            <dd className="text-paper">{conexao?.numero ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Nome da conta</dt>
            <dd className="truncate text-paper">{conexao?.nomeExibicao ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Conectado em</dt>
            <dd className="text-paper">
              {conexao?.conectadoEm ? new Date(conexao.conectadoEm).toLocaleString("pt-BR") : "—"}
            </dd>
          </div>
        </dl>
      ) : null}

      {conectando && status !== "qr_pronto" ? (
        <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
          <Loader2 size={16} className="animate-spin text-gold" aria-hidden />
          <p className="text-xs text-mute">
            {status === "conectando" ? "Conectando seu WhatsApp…" : "Preparando conexão…"}
          </p>
        </div>
      ) : null}

      {qrPronto && conexao?.qrCode && !qrExpirado && !qrAberto ? (
        <Button
          variant="ghost"
          type="button"
          className="mt-5 w-full rounded-md border border-gold/50 py-2.5 text-sm text-gold"
          onClick={() => setQrAberto(true)}
        >
          Mostrar QR Code
        </Button>
      ) : null}

      <div className="mt-6 space-y-3">
        {status === "conectado" ? (
          <>
            <Button
              variant="ghost"
              type="button"
              className="w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
              disabled={acao.isPending || estado.isFetching}
              onClick={() => void estado.refetch()}
            >
              {estado.isFetching ? "Atualizando…" : "Atualizar conexão"}
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
              disabled={acao.isPending}
              onClick={() => acao.mutate("reconectar")}
            >
              {acao.isPending ? "Aguarde…" : "Reconectar"}
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="w-full rounded-md border border-line2 py-2.5 text-sm text-brick disabled:opacity-50"
              disabled={acao.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Desconectar o ${cabecalho.subtitulo}? Clientes, histórico e agendamentos continuam salvos.`,
                  )
                ) {
                  acao.mutate("desconectar");
                }
              }}
            >
              Desconectar
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              type="button"
              className="btn-primary w-full"
              disabled={acao.isPending}
              onClick={() => acao.mutate(status === "qr_pronto" && !qrExpirado ? "qr" : "conectar")}
            >
              {rotuloPrincipal}
            </Button>
            {status === "qr_pronto" || qrExpirado ? (
              <Button
                variant="ghost"
                type="button"
                className="w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
                disabled={acao.isPending}
                onClick={() => acao.mutate("qr")}
              >
                {acao.isPending ? "Gerando…" : "Gerar novo QR Code"}
              </Button>
            ) : null}
          </>
        )}
        {aviso ? <p className="text-center text-sm text-brick">{aviso}</p> : null}
        {conexao?.ultimoErro ? (
          <p className="text-center text-xs text-brick">{conexao.ultimoErro}</p>
        ) : null}
      </div>

      <p className="mt-6 flex items-start gap-2 border-t border-line pt-4 text-xs text-mute2">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />O CortAI usa somente eventos e dados
        reais do seu negócio e nunca acessa dados de outro.
      </p>

      {qrAberto && conexao?.qrCode && !qrExpirado ? (
        <ModalQr
          valor={conexao.qrCode}
          restante={restante}
          aoFechar={() => setQrAberto(false)}
          aoGerarNovo={() => acao.mutate("qr")}
          gerando={acao.isPending}
        />
      ) : null}
    </section>
  );
}

function Linha({ rotulo, valor, alerta }: { rotulo: string; valor: ReactNode; alerta?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-mute">{rotulo}</dt>
      <dd className={`min-w-0 truncate text-right ${alerta ? "text-brick" : "text-paper"}`}>
        {valor}
      </dd>
    </div>
  );
}

function quando(valor: string | null | undefined) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "—";
}

/** Estado detalhado da conexão oficial: eventos, falhas e última mensagem. */
function BlocoDiagnostico() {
  const carregar = useServerFn(getDiagnosticoDoWhatsapp);
  const consulta = useQuery({
    queryKey: ["cortai-diagnostico"],
    queryFn: () => carregar({ data: undefined }) as Promise<DiagnosticoDoWhatsapp>,
    refetchInterval: 60000,
  });
  const d = consulta.data;

  return (
    <section className="mt-4 surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-paper">Status detalhado da conexão</h2>
        <Button
          variant="ghost"
          type="button"
          className="text-xs text-gold disabled:opacity-50"
          disabled={consulta.isFetching}
          onClick={() => void consulta.refetch()}
        >
          {consulta.isFetching ? "Atualizando…" : "Atualizar"}
        </Button>
      </div>

      {!d ? (
        <p className="mt-3 text-xs text-mute">Carregando informações da conexão…</p>
      ) : (
        <>
          <dl className="mt-4 space-y-2 text-xs">
            <Linha
              rotulo="Tipo de conexão"
              valor={d.oficial ? "Conta oficial (Meta)" : d.provedor}
            />
            <Linha
              rotulo="Serviço configurado"
              valor={d.gatewayConfigurado ? "Sim" : "Não"}
              alerta={!d.gatewayConfigurado}
            />
            {d.credenciaisFaltantes.length ? (
              <Linha rotulo="Faltando" valor={d.credenciaisFaltantes.join(", ")} alerta />
            ) : null}
            <Linha rotulo="Número" valor={d.conexao?.numero ?? "—"} />
            <Linha
              rotulo="Situação"
              valor={d.conexao?.status ?? "sem conexão"}
              alerta={d.conexao?.status === "erro"}
            />
            <Linha rotulo="Conectado em" valor={quando(d.conexao?.conectadoEm)} />
            <Linha rotulo="Última verificação" valor={quando(d.vistoEm)} />
          </dl>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-xs">
            <Linha rotulo="Avisos recebidos (24h)" valor={d.eventos24h} />
            <Linha
              rotulo="Avisos aguardando processamento"
              valor={d.eventosPendentes}
              alerta={d.eventosPendentes > 0}
            />
            <Linha rotulo="Último aviso do WhatsApp" valor={quando(d.ultimoEventoEm)} />
            <Linha
              rotulo="Endereço de recebimento"
              valor={<span className="break-all">{d.enderecoDeEventos}</span>}
            />
          </dl>

          <div className="mt-4 border-t border-line pt-4">
            <p className="text-xs font-medium text-paper">Última mensagem recebida</p>
            {d.ultimaMensagemRecebida ? (
              <>
                <p className="mt-1 text-xs text-mute">
                  {d.ultimaMensagemRecebida.telefone ?? "Número não informado"} ·{" "}
                  {quando(d.ultimaMensagemRecebida.criadoEm)}
                </p>
                <p className="mt-1 line-clamp-3 text-xs text-paper">
                  {d.ultimaMensagemRecebida.conteudo || "—"}
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-mute">
                Nenhuma mensagem de cliente recebida até agora.
              </p>
            )}
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <p className="text-xs font-medium text-paper">Falhas recentes</p>
            {d.conexao?.ultimoErro ? (
              <p className="mt-1 text-xs text-brick">Conexão: {d.conexao.ultimoErro}</p>
            ) : null}
            {d.ultimoEnvioComErro ? (
              <p className="mt-1 text-xs text-brick">
                Envio ({d.ultimoEnvioComErro.tipo}) para {d.ultimoEnvioComErro.telefone} em{" "}
                {quando(d.ultimoEnvioComErro.criadoEm)}: {d.ultimoEnvioComErro.erro}
              </p>
            ) : null}
            {d.falhas.length ? (
              <ul className="mt-2 space-y-2">
                {d.falhas.map((f) => (
                  <li key={f.id} className="text-xs text-brick">
                    {f.evento} · {quando(f.recebidoEm)} — {f.erro}
                  </li>
                ))}
              </ul>
            ) : null}
            {!d.conexao?.ultimoErro && !d.ultimoEnvioComErro && !d.falhas.length ? (
              <p className="mt-1 text-xs text-mute">Nenhuma falha registrada.</p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function ModalQr({
  valor,
  restante,
  aoFechar,
  aoGerarNovo,
  gerando,
}: {
  valor: string;
  restante: number | null;
  aoFechar: () => void;
  aoGerarNovo: () => void;
  gerando: boolean;
}) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = "";
    };
  }, [aoFechar]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Conectar o WhatsApp por QR Code"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "rgba(11,11,11,.72)", backdropFilter: "blur(8px)" }}
      onClick={aoFechar}
    >
      <div className="w-full max-w-sm surface p-5 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-paper">Conectar WhatsApp</h3>
          <Button
            variant="ghost"
            type="button"
            aria-label="Fechar"
            className="text-mute"
            onClick={aoFechar}
          >
            <X size={18} />
          </Button>
        </div>

        <div className="mt-4">
          <QrCodeReal valor={valor} alt="QR Code para conectar o WhatsApp do negócio" />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-paper">
          Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo → escaneie o
          QR Code.
        </p>
        {restante !== null ? (
          <p className="mt-2 text-xs text-mute2">Este código expira em {restante} segundos.</p>
        ) : null}

        <Button
          variant="ghost"
          type="button"
          className="mt-5 w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
          disabled={gerando}
          onClick={aoGerarNovo}
        >
          {gerando ? "Gerando…" : "Gerar novo QR Code"}
        </Button>
      </div>
    </div>,
    document.body,
  );
}

function Bloco({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <div className="surface p-5">
      <h2 className="text-sm font-semibold text-paper">{titulo}</h2>
      {descricao ? <p className="mt-1 text-xs leading-relaxed text-mute">{descricao}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Chave({
  rotulo,
  detalhe,
  valor,
  aoMudar,
  desabilitado,
}: {
  rotulo: string;
  detalhe?: string;
  valor: boolean;
  aoMudar: (v: boolean) => void;
  desabilitado?: boolean;
}) {
  return (
    <li className={`flex items-start justify-between gap-4 ${desabilitado ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <p className="text-xs text-paper">{rotulo}</p>
        {detalhe ? <p className="mt-0.5 text-xs leading-relaxed text-mute2">{detalhe}</p> : null}
      </div>
      <input
        type="checkbox"
        checked={valor}
        disabled={desabilitado}
        onChange={(e) => aoMudar(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--gold)]"
        aria-label={rotulo}
      />
    </li>
  );
}
