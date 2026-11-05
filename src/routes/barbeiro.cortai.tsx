import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { MessageCircle, ShieldCheck, Smartphone } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { EsqueletoPainel } from "@/components/layout/Esqueleto";
import { CentralDeAutomacao } from "@/components/automacao/CentralDeAutomacao";
import { AvisosDaMeta } from "@/components/whatsapp/HistoricoDeEnvios";
import { FolhaQrWhatsapp } from "@/components/ia/FolhaQrWhatsapp";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { mensagemDeAcessoNegado, RouteError } from "@/components/layout/RouteError";
import { type TipoDeConexao } from "@/lib/whatsapp/finalidade-conexao";
import {
  atualizarQrCode,
  conectarWhatsapp,
  desconectarWhatsapp,
  getDiagnosticoDoWhatsapp,
  getPainelDoCortai,
  getRemetenteOficial,
  type DiagnosticoDoWhatsapp,
  reconectarWhatsapp,
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
      { title: "WhatsApp · Flow" },
      {
        name: "description",
        content: "Conecte o WhatsApp do negócio e acompanhe notificações transacionais.",
      },
      { property: "og:title", content: "WhatsApp · Flow" },
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

/** Endereços antigos com `?aba=` (avisos, links e favoritos) levam à aba nova de mesmo assunto. */
const DESTINO_DA_ABA_ANTIGA = {
  ajustes: "/barbeiro/whatsapp-avisos",
  envios: "/barbeiro/cortai-atividade",
  experiencia: "/barbeiro/avaliacoes",
} as const;

/**
 * WhatsApp → Conexão (reorganização do dono, 05/11/2026). As abas da área (Conexão · Avisos · Atividade) aparecem
 * sozinhas abaixo do título (`navegacao-barbeiro.ts`). Aqui: o atendimento automático (liga/desliga e o estado de
 * cada parte) e a conexão do número. Avisos aos clientes ficam em "Avisos"; envios e ocorrências em "Atividade".
 */
function CortaiPage() {
  const busca = Route.useSearch();
  const navegar = useNavigate();
  const painel = useQuery({
    queryKey: ["cortai-painel"],
    queryFn: () => getPainelDoCortai() as Promise<PainelDoCortai>,
  });
  const antiga = busca.aba && busca.aba !== "whatsapp" ? DESTINO_DA_ABA_ANTIGA[busca.aba] : null;
  useEffect(() => {
    if (antiga) void navegar({ to: antiga, replace: true });
  }, [antiga, navegar]);

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="WhatsApp"
      subtitle="Conexão do número e atendimento automático."
    >
      {painel.isLoading ? <EsqueletoPainel /> : null}
      {painel.isError ? (
        <Aviso tom="acao" className="mb-5">
          {mensagemDeAcessoNegado(painel.error)
            ? "Você não tem acesso a esta área"
            : "Não conseguimos carregar o WhatsApp agora. Tente de novo em instantes."}
        </Aviso>
      ) : null}
      {painel.data ? (
        <div className="space-y-4">
          <AvisosDaMeta />
          <CentralDeAutomacao semOcorrencias />
          <BlocoConexao painel={painel.data} />
        </div>
      ) : null}
    </Screen>
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

/** Remetente real dos avisos: o número oficial do Flow. */
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
    <section className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]">
          <MessageCircle size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-paper">WhatsApp oficial do Flow</h2>
            <Selo estado={selo.estado as "conectando" | "conectado" | "erro"} texto={selo.texto} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            Seus avisos saem pelo WhatsApp oficial do Flow (+55 79 9818-1983), com o nome do seu
            negócio na mensagem.
          </p>
          {!estado.isLoading && estado.data?.status !== "conectado" ? (
            <Aviso tom="atencao" className="mt-2">
              Não conseguimos confirmar o número oficial agora. Os avisos com falha aparecem no
              sininho com a opção de enviar pelo seu WhatsApp.
            </Aviso>
          ) : null}
        </div>
      </div>
      <p className="mt-5 rounded-[12px] bg-[var(--figaro-surface-container-high,var(--ink3))] px-4 py-3 text-xs text-mute2">
        Usado como reserva apenas quando o negócio não tem número próprio conectado.
      </p>
    </section>
  );
}

/** Uma conexão por negócio + interruptor de notificações sobre ela. */
export function BlocoConexao({ painel }: { painel: PainelDoCortai }) {
  return (
    <div id="conexao-do-numero" className="scroll-mt-24 space-y-4">
      {painel.podeGerenciarWhatsapp ? <CartaoDeConexao painel={painel} tipo="atendimento" /> : null}
      {/* Número antigo de avisos (legado): não envia mais; só pode ser desconectado. */}
      {painel.podeGerenciarWhatsapp && painel.conexaoNotificacoes ? (
        <CartaoDeConexao painel={painel} tipo="notificacoes" />
      ) : null}
    </div>
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
  const [confirmar, dialogo] = useConfirmar();
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
  // Início da janela de acompanhamento; toda ação (conectar, novo QR, abrir a gaveta) recomeça a contagem.
  const [desde, setDesde] = useState(() => Date.now());
  const [agora, setAgora] = useState(() => Date.now());
  const [qrAberto, setQrAberto] = useState(false);

  const acao = useMutation({
    mutationFn: async (qual: "conectar" | "qr" | "reconectar" | "desconectar") => {
      if (qual === "conectar") return conectar({ data: { tipo } });
      if (qual === "qr") return novoQr({ data: { tipo } });
      if (qual === "reconectar") return reconectar({ data: { tipo } });
      return desconectar({ data: { tipo } });
    },
    onSuccess: (r: unknown, qual) => {
      setDesde(Date.now());
      const avisoDaAcao = (r as { aviso?: string | null })?.aviso ?? null;
      setAviso(avisoDaAcao);
      if (qual === "conectar" && !avisoDaAcao) setQrAberto(true);
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
    // Gaveta do QR aberta: acompanha sempre (a Evolution troca o código a cada ~40 s; QR velho o WhatsApp recusa).
    (qrAberto || agora - desde < 10 * 60 * 1000);

  const estado = useQuery({
    queryKey: ["cortai-conexao", tipo],
    queryFn: () => sincronizar({ data: { tipo } }),
    enabled: acompanhar,
    refetchInterval: acompanhar ? 5000 : false,
    refetchIntervalInBackground: false,
  });

  // Sem acompanhamento o resultado guardado da consulta fica velho: vale o que o painel leu por último.
  const conexao = (acompanhar ? estado.data?.conexao : null) ?? daLinha;
  const status = conexao?.status ?? "desconectado";
  const expira = conexao?.qrExpiraEm ?? null;

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  // Gaveta do QR aberta: busca o código atual na hora, sem esperar a próxima consulta.
  useEffect(() => {
    if (!qrAberto) return;
    setDesde(Date.now());
    void cliente.invalidateQueries({ queryKey: ["cortai-conexao", tipo] });
  }, [qrAberto, cliente, tipo]);

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
      <section className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]">
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
              A conexão por QR Code depende de um serviço de WhatsApp publicado pela equipe do Flow.
              Enquanto ele não estiver no ar, nenhum QR Code é gerado — preferimos avisar a mostrar
              algo que não funciona.
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
        <Button variant="primary" type="button" className="mt-5 w-full" disabled aria-disabled>
          Conectar WhatsApp
        </Button>
        <p className="mt-2 text-center text-xs text-mute2">
          O botão será liberado assim que o serviço estiver publicado.
        </p>
      </section>
    );
  }

  // "connecting" com QR válido = aguardando leitura (não esconder o QR).
  // Expirou: o QR some da tela e o painel volta a "Conectando seu WhatsApp…",
  // sem botões — evita gerar QRs inválidos.
  const qrPronto = status === "qr_pronto" || (status === "conectando" && !!conexao?.qrCode);
  const qrExpirado = qrPronto && restante !== null && restante <= 0;
  const qrVisivel = qrPronto && !qrExpirado;
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
        : qrVisivel
          ? "Aguardando leitura"
          : conectando
            ? "Conectando"
            : "Desconectado";

  const titulo =
    status === "conectado"
      ? "WhatsApp conectado"
      : qrExpirado
        ? "Conectando seu WhatsApp…"
        : qrVisivel
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
        ? "A Flow IA conversa com seus clientes por este número."
        : "Conecte o WhatsApp público do negócio para a Flow IA conversar com os clientes."
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
    <section className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
      {dialogo}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]">
          {tipo === "atendimento" ? <MessageCircle size={18} /> : <Smartphone size={18} />}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--figaro-primary,var(--primary))]">
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
        <dl className="mt-5 grid gap-2 text-xs">
          <div className="flex justify-between gap-4 rounded-[12px] bg-[var(--figaro-surface-container-high,var(--ink3))] px-3 py-2.5">
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

      {(conectando || qrPronto) && !qrAberto && status !== "conectado" ? (
        <Button
          variant="outline"
          size="lg"
          type="button"
          className="mt-5 w-full"
          onClick={() => setQrAberto(true)}
        >
          Abrir conexão
        </Button>
      ) : null}

      <div className="mt-6 space-y-3">
        {status === "conectado" ? (
          <>
            <Button
              loading={estado.isFetching}
              variant="outline"
              type="button"
              className="w-full text-paper disabled:opacity-50"
              disabled={acao.isPending || estado.isFetching}
              onClick={() =>
                void estado
                  .refetch()
                  .then(() => cliente.invalidateQueries({ queryKey: ["cortai-painel"] }))
              }
            >
              Atualizar conexão
            </Button>
            <Button
              loading={acao.isPending}
              variant="outline"
              type="button"
              className="w-full text-paper disabled:opacity-50"
              disabled={acao.isPending}
              onClick={() => acao.mutate("reconectar")}
            >
              Reconectar
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full text-brick disabled:opacity-50"
              disabled={acao.isPending}
              onClick={async () => {
                if (
                  await confirmar({
                    titulo: `Desconectar o ${cabecalho.subtitulo}?`,
                    descricao: "Clientes, histórico e agendamentos continuam salvos.",
                    confirmar: "Desconectar",
                    destrutivo: true,
                  })
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
            {!qrExpirado ? (
              <Button
                variant="primary"
                type="button"
                className="w-full"
                disabled={acao.isPending}
                onClick={() => acao.mutate(status === "qr_pronto" ? "qr" : "conectar")}
              >
                {rotuloPrincipal}
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
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />A Flow IA usa somente eventos e dados
        reais do seu negócio e nunca acessa dados de outro.
      </p>

      {/* Aberta também depois de vencer: mostra "Código vencido" em vez de sumir da tela. */}
      {qrAberto && status !== "conectado" ? (
        <FolhaQrWhatsapp
          valor={conexao?.qrCode ?? null}
          restante={restante}
          aoFechar={() => setQrAberto(false)}
          aoGerarNovo={() => acao.mutate("qr")}
          gerando={acao.isPending}
          tipo={tipo}
          aoGerarCodigoPorNumero={() => {
            void cliente.invalidateQueries({ queryKey: ["cortai-painel"] });
            void estado.refetch();
          }}
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
    <section className="mt-4 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-paper">Status detalhado da conexão</h2>
        <Button
          variant="ghost"
          type="button"
          className="text-sm font-medium text-[var(--figaro-primary,var(--primary))] disabled:opacity-50"
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
