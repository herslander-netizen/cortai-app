import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Bot, Loader2, MessageCircle, Send, ShieldCheck, Smartphone, X } from "lucide-react";

import { Screen, EmptyState } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { QrCodeReal } from "@/components/ia/QrCodeReal";
import {
  AUTOMACOES,
  DIAS_DA_SEMANA,
  TONS,
  type ChaveDeAutomacao,
  type ConfiguracaoDoAtendimento,
} from "@/lib/whatsapp/contrato";
import { Button } from "@/components/ui/button";
import { mensagemDeAcessoNegado, RouteError } from "@/components/layout/RouteError";
import {
  atualizarQrCode,
  listarInformacoes,
  removerInformacao,
  salvarInformacao,
  conectarWhatsapp,
  definirAtendimentoDaConversa,
  desconectarWhatsapp,
  getDiagnosticoDoWhatsapp,
  getPainelDoCortai,
  type DiagnosticoDoWhatsapp,
  lerConversa,
  listarConversas,
  reconectarWhatsapp,
  responderComoHumano,
  salvarAutomacao,
  salvarConfiguracaoDoCortai,
  sincronizarConexao,
  type PainelDoCortai,
} from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/barbeiro/cortai")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CortAI no WhatsApp — Cortaí Gestão" },
      {
        name: "description",
        content: "Conecte o WhatsApp da barbearia, acompanhe as conversas e configure o atendimento do CortAI.",
      },
      { property: "og:title", content: "CortAI no WhatsApp — Cortaí Gestão" },
      { property: "og:description", content: "Atendimento pelo WhatsApp com os dados reais da sua barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: RouteError,
  component: CortaiPage,
});

type Aba = "whatsapp" | "conversas" | "ajustes";

function Ponto({ ligado }: { ligado: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 rounded-full ${ligado ? "bg-sage" : "bg-brick"}`}
    />
  );
}

function CortaiPage() {
  const [aba, setAba] = useState<Aba>("whatsapp");
  const painel = useQuery({ queryKey: ["cortai-painel"], queryFn: () => getPainelDoCortai() as Promise<PainelDoCortai> });

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="CortAI no WhatsApp"
      subtitle="O atendimento da sua barbearia pelo WhatsApp, com os seus dados reais."
    >
      {painel.isLoading ? <Carregando /> : null}
      {painel.isError ? (
        <p className="border-y border-line py-8 text-center text-sm text-brick">
          {mensagemDeAcessoNegado(painel.error)
            ? "Você não tem acesso a esta área"
            : "Não conseguimos carregar o CortAI agora. Tente de novo em instantes."}
        </p>
      ) : null}

      {painel.data ? (
        <>
          <section className="grid grid-cols-3 gap-2" aria-label="Situação do atendimento">
            <div className="rounded-lg border border-line bg-ink2 px-3 py-3">
              <p className="text-[10px] text-mute2">WhatsApp</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-paper">
                <Ponto ligado={painel.data.conexao?.status === "conectado"} />
                {painel.data.conexao?.status === "conectado" ? "Ligado" : "Desligado"}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-ink2 px-3 py-3">
              <p className="text-[10px] text-mute2">CortAI</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-paper">
                <Ponto ligado={painel.data.iaDisponivel} />
                {painel.data.iaDisponivel ? "Pronto" : "Indisponível"}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-ink2 px-3 py-3">
              <p className="text-[10px] text-mute2">Automático</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-paper">
                <Ponto ligado={painel.data.configuracao.atendimentoAutomatico} />
                {painel.data.configuracao.atendimentoAutomatico ? "Ligado" : "Desligado"}
              </p>
            </div>
          </section>

          <nav className="mt-5 flex gap-2" aria-label="Seções do CortAI">
            {(
              [
                ["whatsapp", "WhatsApp"],
                ["conversas", "Conversas"],
                ["ajustes", "IA do Cortaí"],
              ] as [Aba, string][]
            ).map(([id, rotulo]) => (
              <Button variant="ghost"
                key={id}
                type="button"
                onClick={() => setAba(id)}
                className={`rounded-full border px-4 py-1.5 text-xs ${
                  aba === id ? "border-gold text-gold" : "border-line2 text-mute"
                }`}
              >
                {rotulo}
              </Button>
            ))}
          </nav>

          <div className="mt-5">
            {aba === "whatsapp" ? (
              <>
                <BlocoConexao painel={painel.data} />
                {painel.data.podeGerenciarWhatsapp ? <BlocoDiagnostico /> : null}
              </>
            ) : null}
            {aba === "conversas" ? <BlocoConversas /> : null}
            {aba === "ajustes" ? <BlocoAjustes painel={painel.data} /> : null}
          </div>
        </>
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
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${CORES_DO_ESTADO[estado]}`}>
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${
          estado === "conectado" ? "bg-sage" : estado === "erro" ? "bg-brick" : estado === "conectando" ? "bg-gold" : "bg-mute2"
        }`}
      />
      {texto}
    </span>
  );
}

function BlocoConexao({ painel }: { painel: PainelDoCortai }) {
  const cliente = useQueryClient();
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
      if (qual === "conectar") return conectar({ data: undefined });
      if (qual === "qr") return novoQr({ data: undefined });
      if (qual === "reconectar") return reconectar({ data: undefined });
      return desconectar({ data: undefined });
    },
    onSuccess: (r: unknown) => {
      setAviso((r as { aviso?: string | null })?.aviso ?? null);
      void cliente.invalidateQueries({ queryKey: ["cortai-painel"] });
      void cliente.invalidateQueries({ queryKey: ["cortai-conexao"] });
    },
    onError: (e: unknown) => setAviso(e instanceof Error ? e.message : "Não foi possível concluir agora."),
  });

  const statusBase = painel.conexao?.status ?? "desconectado";
  // Enquanto não estiver conectado, perguntamos o estado real ao serviço.
  const acompanhar =
    painel.podeGerenciarWhatsapp && painel.gatewayConfigurado && statusBase !== "conectado" && agora - desde < 10 * 60 * 1000;

  const estado = useQuery({
    queryKey: ["cortai-conexao"],
    queryFn: () => sincronizar({ data: undefined }),
    enabled: acompanhar,
    refetchInterval: acompanhar ? 5000 : false,
    refetchIntervalInBackground: false,
  });

  const conexao = estado.data?.conexao ?? painel.conexao;
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
    const calcular = () => setRestante(Math.max(0, Math.round((new Date(expira).getTime() - Date.now()) / 1000)));
    calcular();
    const id = window.setInterval(calcular, 1000);
    return () => window.clearInterval(id);
  }, [expira]);

  // O QR aparece sozinho assim que o serviço entrega um código válido.
  useEffect(() => {
    if (status === "qr_pronto" && conexao?.qrCode) setQrAberto(true);
  }, [status, conexao?.qrCode]);

  if (!painel.gatewayConfigurado) {
    return (
      <section className="rounded-xl border border-line bg-ink2 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-gold">
            <Smartphone size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-paper">Serviço de WhatsApp ainda não configurado</h2>
              <Selo estado="desconectado" texto="Indisponível" />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-mute">
              A conexão por QR Code depende de um serviço de WhatsApp publicado pela equipe do Cortaí. Enquanto ele
              não estiver no ar, nenhum QR Code é gerado — preferimos avisar a mostrar algo que não funciona.
            </p>
            <p className="mt-3 text-[11px] text-mute2">
              Para a equipe técnica: falta configurar{" "}
              {(painel.credenciaisFaltantes.length ? painel.credenciaisFaltantes : ["EVOLUTION_API_URL", "EVOLUTION_API_KEY"]).join(", ")}
              . O serviço (Evolution API) deve enviar os eventos para /api/public/whatsapp/evolution com o cabeçalho
              x-webhook-secret.
            </p>
          </div>
        </div>
        <Button variant="ghost" type="button" className="btn-primary mt-5 w-full opacity-50" disabled aria-disabled>
          Conectar WhatsApp
        </Button>
        <p className="mt-2 text-center text-[11px] text-mute2">
          O botão será liberado assim que o serviço estiver publicado.
        </p>
      </section>
    );
  }

  const qrExpirado = status === "qr_pronto" && restante !== null && restante <= 0;
  const conectando = acao.isPending || status === "pendente" || status === "conectando";

  const visual: keyof typeof CORES_DO_ESTADO =
    status === "conectado" ? "conectado" : status === "erro" ? "erro" : conectando || status === "qr_pronto" ? "conectando" : "desconectado";

  const rotuloDoEstado =
    status === "conectado"
      ? "Conectado"
      : status === "erro"
        ? "Erro"
        : status === "qr_pronto"
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
        : status === "qr_pronto"
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
    status === "conectado"
      ? "Seu WhatsApp está conectado e pronto para o CortAI atender seus clientes."
      : "Conecte o WhatsApp da sua barbearia para que o CortAI possa atender seus clientes automaticamente.";

  const rotuloPrincipal = acao.isPending
    ? "Preparando conexão…"
    : conectando
      ? "Conectando…"
      : status === "erro"
        ? "Tentar novamente"
        : status === "qr_pronto"
          ? "Ativar conexão"
          : conexao?.conectadoEm
            ? "Reconectar WhatsApp"
            : "Conectar WhatsApp";

  return (
    <section className="rounded-xl border border-line bg-ink2 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-gold">
          <MessageCircle size={18} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
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

      {status === "qr_pronto" && conexao?.qrCode && !qrExpirado && !qrAberto ? (
        <Button variant="ghost"
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
            <Button variant="ghost"
              type="button"
              className="w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
              disabled={acao.isPending || estado.isFetching}
              onClick={() => void estado.refetch()}
            >
              {estado.isFetching ? "Atualizando…" : "Atualizar conexão"}
            </Button>
            <Button variant="ghost"
              type="button"
              className="w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
              disabled={acao.isPending}
              onClick={() => acao.mutate("reconectar")}
            >
              {acao.isPending ? "Aguarde…" : "Reconectar"}
            </Button>
            <Button variant="ghost"
              type="button"
              className="w-full rounded-md border border-line2 py-2.5 text-sm text-brick disabled:opacity-50"
              disabled={acao.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Desconectar o WhatsApp da barbearia? Clientes, histórico e agendamentos continuam salvos.",
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
            <Button variant="ghost"
              type="button"
              className="btn-primary w-full"
              disabled={acao.isPending}
              onClick={() => acao.mutate(status === "qr_pronto" && !qrExpirado ? "qr" : "conectar")}
            >
              {rotuloPrincipal}
            </Button>
            {status === "qr_pronto" || qrExpirado ? (
              <Button variant="ghost"
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
        {conexao?.ultimoErro ? <p className="text-center text-xs text-brick">{conexao.ultimoErro}</p> : null}
      </div>

      <p className="mt-6 flex items-start gap-2 border-t border-line pt-4 text-xs text-mute2">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        O CortAI responde apenas com informações cadastradas na sua barbearia e nunca acessa dados de outra.
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
      <dd className={`min-w-0 truncate text-right ${alerta ? "text-brick" : "text-paper"}`}>{valor}</dd>
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
    <section className="mt-4 rounded-xl border border-line bg-ink2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-paper">Status detalhado da conexão</h2>
        <Button variant="ghost"
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
            <Linha rotulo="Tipo de conexão" valor={d.oficial ? "Conta oficial (Meta)" : d.provedor} />
            <Linha
              rotulo="Serviço configurado"
              valor={d.gatewayConfigurado ? "Sim" : "Não"}
              alerta={!d.gatewayConfigurado}
            />
            {d.credenciaisFaltantes.length ? (
              <Linha rotulo="Faltando" valor={d.credenciaisFaltantes.join(", ")} alerta />
            ) : null}
            <Linha rotulo="Número" valor={d.conexao?.numero ?? "—"} />
            <Linha rotulo="Situação" valor={d.conexao?.status ?? "sem conexão"} alerta={d.conexao?.status === "erro"} />
            <Linha rotulo="Conectado em" valor={quando(d.conexao?.conectadoEm)} />
            <Linha rotulo="Última verificação" valor={quando(d.vistoEm)} />
          </dl>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-xs">
            <Linha rotulo="Avisos recebidos (24h)" valor={d.eventos24h} />
            <Linha rotulo="Avisos aguardando processamento" valor={d.eventosPendentes} alerta={d.eventosPendentes > 0} />
            <Linha rotulo="Último aviso do WhatsApp" valor={quando(d.ultimoEventoEm)} />
            <Linha rotulo="Endereço de recebimento" valor={<span className="break-all">{d.enderecoDeEventos}</span>} />
          </dl>

          <div className="mt-4 border-t border-line pt-4">
            <p className="text-xs font-medium text-paper">Última mensagem recebida</p>
            {d.ultimaMensagemRecebida ? (
              <>
                <p className="mt-1 text-xs text-mute">
                  {d.ultimaMensagemRecebida.telefone ?? "Número não informado"} ·{" "}
                  {quando(d.ultimaMensagemRecebida.criadoEm)}
                </p>
                <p className="mt-1 line-clamp-3 text-xs text-paper">{d.ultimaMensagemRecebida.conteudo || "—"}</p>
              </>
            ) : (
              <p className="mt-1 text-xs text-mute">Nenhuma mensagem de cliente recebida até agora.</p>
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
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-ink2 p-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-paper">Conectar WhatsApp</h3>
          <Button variant="ghost" type="button" aria-label="Fechar" className="text-mute" onClick={aoFechar}>
            <X size={18} />
          </Button>
        </div>

        <div className="mt-4">
          <QrCodeReal valor={valor} alt="QR Code para conectar o WhatsApp da barbearia" />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-paper">
          Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo → escaneie o QR Code.
        </p>
        {restante !== null ? (
          <p className="mt-2 text-[11px] text-mute2">Este código expira em {restante} segundos.</p>
        ) : null}

        <Button variant="ghost"
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

/* ------------------------------- Conversas ------------------------------- */

const FILTROS = [
  ["todas", "Todas"],
  ["cortai", "CortAI"],
  ["humano", "Humano"],
  ["nao_lidas", "Não lidas"],
  ["recebidas", "Recebidas"],
  ["aguardando_resposta", "Aguardando resposta"],
  ["falhas", "Falhas de entrega"],
] as const;

function BlocoConversas() {
  const cliente = useQueryClient();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number][0]>("todas");
  const [aberta, setAberta] = useState<string | null>(null);

  const lista = useQuery({
    queryKey: ["cortai-conversas", filtro],
    queryFn: () => listarConversas({ data: { filtro } }),
    refetchInterval: 20000,
  });

  const fechar = () => {
    setAberta(null);
    void cliente.invalidateQueries({ queryKey: ["cortai-conversas"] });
  };

  const painelLista = (
    <section className="min-w-0">
      <div className="flex flex-wrap gap-2">
        {FILTROS.map(([id, rotulo]) => (
          <Button variant="ghost"
            key={id}
            type="button"
            onClick={() => setFiltro(id)}
            className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
              filtro === id ? "border-gold text-gold" : "border-line2 text-mute hover:text-paper"
            }`}
          >
            {rotulo}
          </Button>
        ))}
      </div>

      {lista.isLoading ? <Carregando /> : null}
      {lista.data && lista.data.length === 0 ? <EmptyState text="Nenhuma conversa por aqui ainda." /> : null}

      <ul className="mt-3 lg:max-h-[560px] lg:overflow-y-auto lg:pr-1">
        {(lista.data ?? []).map((c) => (
          <li key={c.id} className="border-b border-line">
            <Button variant="ghost"
              type="button"
              onClick={() => setAberta(c.id)}
              className={`block w-full px-1 py-4 text-left ${aberta === c.id ? "bg-ink2" : ""}`}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper">{c.nomeContato ?? c.telefone}</p>
                  <p className="mt-0.5 truncate text-xs text-mute">
                    {c.status === "humano"
                      ? "Atendimento humano"
                      : c.status === "encerrada"
                        ? "Encerrada"
                        : "Atendimento pelo CortAI"}
                    {c.ultimaMensagemEm ? ` · ${new Date(c.ultimaMensagemEm).toLocaleString("pt-BR")}` : ""}
                  </p>
                </div>
                {c.naoLidas > 0 ? (
                  <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-ink">
                    {c.naoLidas}
                  </span>
                ) : null}
              </div>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      {/* Celular: uma coisa de cada vez. */}
      <div className="lg:hidden">
        {aberta ? <Conversa id={aberta} aoVoltar={fechar} /> : painelLista}
      </div>

      {/* Computador: lista à esquerda, conversa aberta à direita. */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
        {painelLista}
        <div className="min-w-0">
          {aberta ? (
            <Conversa id={aberta} aoVoltar={fechar} />
          ) : (
            <div className="flex h-[560px] items-center justify-center rounded-xl border border-dashed border-line text-sm text-mute2">
              Escolha uma conversa para acompanhar.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

type PendenteFalha = { id: string; texto: string };

function Conversa({ id, aoVoltar }: { id: string; aoVoltar: () => void }) {
  const cliente = useQueryClient();
  const definir = useServerFn(definirAtendimentoDaConversa);
  const responder = useServerFn(responderComoHumano);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [falhas, setFalhas] = useState<PendenteFalha[]>([]);
  const [novaMensagem, setNovaMensagem] = useState(false);
  const lista = useRef<HTMLDivElement | null>(null);
  const noFim = useRef(true);
  const ultimaContagem = useRef(0);

  const dados = useQuery({
    queryKey: ["cortai-conversa", id],
    queryFn: () => lerConversa({ data: { conversaId: id } }),
    refetchInterval: 10000,
  });

  const mensagens = dados.data?.mensagens ?? [];

  const irAoFim = (suave = true) => {
    const el = lista.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: suave ? "smooth" : "auto" });
    setNovaMensagem(false);
    noFim.current = true;
  };

  // Rolagem inteligente: só acompanha quem já estava no fim da conversa.
  useEffect(() => {
    if (mensagens.length === ultimaContagem.current) return;
    const primeiraCarga = ultimaContagem.current === 0;
    ultimaContagem.current = mensagens.length;
    if (primeiraCarga || noFim.current) irAoFim(!primeiraCarga);
    else setNovaMensagem(true);
  }, [mensagens.length]);

  const mudar = useMutation({
    mutationFn: (modo: "humano" | "cortai" | "encerrar") => definir({ data: { conversaId: id, modo } }),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ["cortai-conversa", id] });
      void cliente.invalidateQueries({ queryKey: ["cortai-conversas"] });
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível mudar o atendimento."),
  });

  const enviar = useMutation({
    mutationFn: (conteudo: string) => responder({ data: { conversaId: id, texto: conteudo } }),
    onSuccess: (_r, conteudo) => {
      setFalhas((f) => f.filter((x) => x.texto !== conteudo));
      setErro(null);
      noFim.current = true;
      void cliente.invalidateQueries({ queryKey: ["cortai-conversa", id] });
    },
    onError: (e: unknown, conteudo) => {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar.");
      setFalhas((f) =>
        f.some((x) => x.texto === conteudo) ? f : [...f, { id: `falha-${Date.now()}`, texto: conteudo }],
      );
    },
  });

  function enviarNovo() {
    const limpo = texto.trim();
    if (!limpo || enviar.isPending) return;
    setTexto("");
    enviar.mutate(limpo);
  }

  const conversa = dados.data?.conversa;
  const humano = conversa?.status === "humano";

  return (
    <section className="cortai-conversa h-[calc(100dvh-230px)] min-h-[380px] rounded-xl border border-line bg-ink2 lg:h-[560px]">
      <header className="shrink-0 border-b border-line px-4 py-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost"
            type="button"
            onClick={aoVoltar}
            aria-label="Voltar às conversas"
            className="mt-0.5 shrink-0 text-mute hover:text-paper"
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-paper">
              {conversa?.nomeContato ?? dados.data?.cliente?.nome ?? conversa?.telefone ?? "Conversa"}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-mute">
              <Ponto ligado={!humano} />
              {conversa?.status === "encerrada"
                ? "Conversa encerrada"
                : humano
                  ? "Atendimento humano"
                  : "Atendimento pelo CortAI"}
              {conversa?.telefone ? ` · ${conversa.telefone}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Button variant="ghost"
            type="button"
            className="flex-1 rounded-md border border-line2 py-2 text-xs text-paper disabled:opacity-50"
            disabled={mudar.isPending}
            onClick={() => mudar.mutate("humano")}
          >
            Assumir conversa
          </Button>
          <Button variant="ghost"
            type="button"
            className="flex-1 rounded-md border border-line2 py-2 text-xs text-paper disabled:opacity-50"
            disabled={mudar.isPending}
            onClick={() => mudar.mutate("cortai")}
          >
            CortAI atende
          </Button>
          <Button variant="ghost"
            type="button"
            className="rounded-md border border-line2 px-3 py-2 text-xs text-mute disabled:opacity-50"
            disabled={mudar.isPending}
            onClick={() => mudar.mutate("encerrar")}
          >
            Encerrar
          </Button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={lista}
          className="cortai-conversa-lista h-full px-4 py-4"
          onScroll={(e) => {
            const el = e.currentTarget;
            const perto = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            noFim.current = perto;
            if (perto) setNovaMensagem(false);
          }}
        >
          {dados.isLoading ? <Carregando /> : null}

          <ul className="space-y-3">
            {mensagens.map((m) => {
              const sistema = m.tipo === "sistema";
              if (sistema) {
                return (
                  <li key={m.id} className="flex justify-center">
                    <span className="rounded-full border border-line2 px-3 py-1 text-[11px] text-mute2">
                      {m.conteudo}
                    </span>
                  </li>
                );
              }
              const entrada = m.direcao === "entrada";
              return (
                <li key={m.id} className={entrada ? "flex" : "flex justify-end"}>
                  <div
                    className={`max-w-[85%] min-w-0 rounded-2xl px-3.5 py-2.5 text-sm ${
                      entrada ? "rounded-bl-sm bg-ink text-paper" : "rounded-br-sm bg-gold/15 text-paper"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{m.conteudo}</p>
                    <p className="mt-1 text-[10px] text-mute2">
                      {entrada ? "Cliente" : m.geradaPorIa ? "CortAI" : "Equipe"} ·{" "}
                      {new Date(m.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {m.status === "falhou" ? " · não enviada" : ""}
                    </p>
                  </div>
                </li>
              );
            })}

            {falhas.map((f) => (
              <li key={f.id} className="flex justify-end">
                <div className="max-w-[85%] min-w-0 rounded-2xl rounded-br-sm border border-brick/50 px-3.5 py-2.5 text-sm">
                  <p className="whitespace-pre-wrap break-words text-paper">{f.texto}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-brick">Não foi possível enviar.</span>
                    <Button variant="ghost"
                      type="button"
                      className="text-[10px] text-gold underline"
                      onClick={() => enviar.mutate(f.texto)}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              </li>
            ))}

            {enviar.isPending ? (
              <li className="flex justify-end">
                <span className="text-[11px] text-mute2">Enviando…</span>
              </li>
            ) : null}
          </ul>
        </div>

        {novaMensagem ? (
          <Button variant="ghost"
            type="button"
            onClick={() => irAoFim()}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-line2 bg-ink px-3 py-1.5 text-[11px] text-paper shadow-lg"
          >
            Nova mensagem ↓
          </Button>
        ) : null}
      </div>

      <div className="cortai-conversa-barra shrink-0 border-t border-line px-3 pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviarNovo();
              }
            }}
            rows={1}
            placeholder="Escreva aqui…"
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-line2 bg-ink px-3.5 py-2.5 text-sm text-paper outline-none"
          />
          <Button variant="ghost"
            type="button"
            aria-label="Enviar mensagem"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-ink disabled:opacity-50"
            disabled={enviar.isPending || texto.trim().length === 0}
            onClick={enviarNovo}
          >
            <Send size={17} aria-hidden />
          </Button>
        </div>
        {erro ? <p className="mt-2 text-center text-xs text-brick">{erro}</p> : null}
      </div>
    </section>
  );
}

/* ----------------------------- IA do Cortaí ------------------------------ */

function Bloco({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-ink2 p-5">
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
        {detalhe ? <p className="mt-0.5 text-[11px] leading-relaxed text-mute2">{detalhe}</p> : null}
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

function BlocoAjustes({ painel }: { painel: PainelDoCortai }) {
  const cliente = useQueryClient();
  const salvar = useServerFn(salvarConfiguracaoDoCortai);
  const salvarAuto = useServerFn(salvarAutomacao);
  const [config, setConfig] = useState<ConfiguracaoDoAtendimento>(painel.configuracao);
  const [dias, setDias] = useState(String(painel.configuracao.recuperacaoDias));
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setConfig(painel.configuracao);
    setDias(String(painel.configuracao.recuperacaoDias));
  }, [painel.configuracao]);

  const mudar = (parcial: Partial<ConfiguracaoDoAtendimento>) => {
    setOk(false);
    setConfig((atual) => ({ ...atual, ...parcial }));
  };

  const gravar = useMutation({
    mutationFn: () => {
      if (config.recuperacaoAtiva && (dias.trim() === "" || !Number.isFinite(Number(dias)))) {
        throw new Error("Informe em quantos dias sem voltar o cliente deve ser lembrado.");
      }
      if (config.horarioProprio && config.horarioDias.length === 0) {
        throw new Error("Escolha pelo menos um dia de atendimento da IA.");
      }
      if (config.horarioProprio && config.horarioInicio >= config.horarioFim) {
        throw new Error("O horário de início precisa ser antes do horário de término.");
      }
      return salvar({ data: { ...config, recuperacaoDias: dias.trim() === "" ? config.recuperacaoDias : Number(dias) } });
    },
    onSuccess: () => {
      setOk(true);
      setErro(null);
      void cliente.invalidateQueries({ queryKey: ["cortai-painel"] });
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  const alternarAutomacao = useMutation({
    mutationFn: (a: { chave: ChaveDeAutomacao; ativa: boolean; mensagem: string }) => salvarAuto({ data: a }),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: ["cortai-painel"] }),
  });

  const whatsappConectado = painel.conexao?.status === "conectado";
  const iaAtiva = painel.iaDisponivel && config.atendimentoAutomatico;

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-line bg-ink2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-paper">
            <Bot size={16} className="text-gold" /> IA do Cortaí
          </h2>
          <Selo estado={iaAtiva ? "conectado" : "desconectado"} texto={iaAtiva ? "Ativa" : "Inativa"} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-mute">
          {painel.iaDisponivel
            ? "A IA responde apenas com os dados cadastrados na sua barbearia."
            : "A IA está indisponível neste momento. Assim que voltar, as configurações abaixo passam a valer."}
        </p>
      </div>

      <Bloco titulo="Atendimento" descricao="O que a IA pode fazer no dia a dia da barbearia.">
        <ul className="space-y-4">
          <Chave
            rotulo="Atendimento automático"
            detalhe="A IA responde sozinha às mensagens que chegam."
            valor={config.atendimentoAutomatico}
            aoMudar={(v) => mudar({ atendimentoAutomatico: v })}
          />
          <Chave
            rotulo="Responder pelo WhatsApp"
            detalhe={
              whatsappConectado
                ? "A IA atende as conversas do WhatsApp conectado."
                : "Depende da conexão do WhatsApp: conecte na aba WhatsApp para a IA poder responder."
            }
            valor={config.responderWhatsapp}
            aoMudar={(v) => mudar({ responderWhatsapp: v })}
          />
          <Chave
            rotulo="Saudação ao iniciar conversa"
            valor={config.saudacaoAtiva}
            aoMudar={(v) => mudar({ saudacaoAtiva: v })}
          />
        </ul>
      </Bloco>

      <Bloco
        titulo="Confirmação automática"
        descricao="Mensagem pronta enviada pelo WhatsApp assim que um agendamento é confirmado. Não usa IA."
      >
        <ul className="space-y-4">
          <Chave
            rotulo="WhatsApp automático"
            detalhe={
              whatsappConectado
                ? "Envia a confirmação com serviço, profissional, data, horário e valor."
                : "Depende da conexão do WhatsApp: conecte na aba WhatsApp para os envios acontecerem."
            }
            valor={config.confirmacaoAutomatica}
            aoMudar={(v) => mudar({ confirmacaoAutomatica: v })}
          />
          <Chave
            rotulo="Pagamento antecipado"
            detalhe="Inclui um link externo de pagamento na mensagem de confirmação."
            valor={config.pagamentoAntecipado}
            aoMudar={(v) => mudar({ pagamentoAntecipado: v })}
          />
        </ul>

        {config.pagamentoAntecipado ? (
          <label className="mt-4 block">
            <span className="text-xs text-mute">Link de pagamento</span>
            <input
              type="url"
              inputMode="url"
              value={config.linkPagamento}
              onChange={(e) => mudar({ linkPagamento: e.target.value })}
              placeholder="https://..."
              className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
            />
            <span className="mt-1 block text-[11px] text-mute2">
              {config.linkPagamento.trim() === ""
                ? "Enquanto o link estiver vazio, a mensagem é enviada sem a parte de pagamento."
                : "Esse link é enviado como “Pagar agora” na confirmação."}
            </span>
          </label>
        ) : null}
      </Bloco>

      <Bloco titulo="Forma de atendimento" descricao="Como a IA fala com os seus clientes.">
        <label className="block">
          <span className="text-xs text-mute">Tom do atendimento</span>
          <select
            value={config.tom}
            onChange={(e) => mudar({ tom: e.target.value as ConfiguracaoDoAtendimento["tom"] })}
            className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
          >
            {Object.entries(TONS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="text-xs text-mute">Mensagem inicial</span>
          <textarea
            value={config.mensagemBoasVindas}
            onChange={(e) => mudar({ mensagemBoasVindas: e.target.value })}
            rows={2}
            placeholder="Olá! Aqui é a barbearia. Como posso ajudar?"
            className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs text-mute">Mensagem fora do horário</span>
          <textarea
            value={config.mensagemForaDoHorario}
            onChange={(e) => mudar({ mensagemForaDoHorario: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs text-mute">Regras de atendimento</span>
          <textarea
            value={config.instrucoesExtras}
            onChange={(e) => mudar({ instrucoesExtras: e.target.value })}
            rows={4}
            placeholder="Ex.: sempre confirmar o profissional antes de marcar; não prometer desconto."
            className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
          />
          <span className="mt-1 block text-[11px] text-mute2">
            Instruções do estabelecimento que a IA deve seguir em toda conversa.
          </span>
        </label>
      </Bloco>

      <Bloco titulo="Horário de atendimento da IA" descricao="Fora deste horário a IA não responde sozinha.">
        <ul className="space-y-4">
          <Chave
            rotulo="Usar um horário próprio para a IA"
            detalhe="Desligado, a IA atende a qualquer hora."
            valor={config.horarioProprio}
            aoMudar={(v) => mudar({ horarioProprio: v })}
          />
        </ul>
        {config.horarioProprio ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {DIAS_DA_SEMANA.map((nome, indice) => {
                const marcado = config.horarioDias.includes(indice);
                return (
                  <Button variant="ghost"
                    key={nome}
                    type="button"
                    aria-pressed={marcado}
                    onClick={() =>
                      mudar({
                        horarioDias: marcado
                          ? config.horarioDias.filter((d) => d !== indice)
                          : [...config.horarioDias, indice].sort((a, b) => a - b),
                      })
                    }
                    className={`rounded-full border px-3 py-1 text-[11px] ${
                      marcado ? "border-gold text-gold" : "border-line2 text-mute"
                    }`}
                  >
                    {nome.slice(0, 3)}
                  </Button>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-mute">Começa às</span>
                <input
                  type="time"
                  value={config.horarioInicio}
                  onChange={(e) => mudar({ horarioInicio: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
                />
              </label>
              <label className="block">
                <span className="text-xs text-mute">Termina às</span>
                <input
                  type="time"
                  value={config.horarioFim}
                  onChange={(e) => mudar({ horarioFim: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
                />
              </label>
            </div>
          </>
        ) : null}
      </Bloco>

      <Bloco titulo="Objetivos da IA" descricao="Ligue só o que a sua barbearia quer entregar pela IA.">
        <ul className="space-y-4">
          <Chave
            rotulo="Confirmar agendamento"
            valor={config.permiteConfirmar}
            aoMudar={(v) => mudar({ permiteConfirmar: v })}
          />
          <Chave rotulo="Cancelar agendamento" valor={config.permiteCancelar} aoMudar={(v) => mudar({ permiteCancelar: v })} />
          <Chave rotulo="Remarcar agendamento" valor={config.permiteRemarcar} aoMudar={(v) => mudar({ permiteRemarcar: v })} />
          <Chave rotulo="Lembretes de horário" valor={config.lembretes} aoMudar={(v) => mudar({ lembretes: v })} />
          <Chave
            rotulo="Recuperação de clientes"
            detalhe="Só identifica quem passou do intervalo habitual. Nada é enviado automaticamente."
            valor={config.recuperacaoAtiva}
            aoMudar={(v) => mudar({ recuperacaoAtiva: v })}
          />
        </ul>
        {config.recuperacaoAtiva ? (
          <label className="mt-4 block">
            <span className="text-xs text-mute">Dias sem voltar</span>
            <input
              type="number"
              min={7}
              max={180}
              inputMode="numeric"
              value={dias}
              onChange={(e) => {
                setOk(false);
                setDias(e.target.value);
              }}
              className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
            />
          </label>
        ) : null}
      </Bloco>

      <Bloco titulo="Escalonamento" descricao="Quando a IA deve passar a conversa para a equipe.">
        <ul className="space-y-4">
          <Chave
            rotulo="Encaminhar para atendimento humano"
            detalhe="A IA chama a equipe quando o cliente pedir ou quando não souber responder."
            valor={config.encaminhamentoHumano}
            aoMudar={(v) => mudar({ encaminhamentoHumano: v })}
          />
        </ul>
      </Bloco>

      <div className="rounded-lg border border-line bg-ink2 p-5">
        <Button variant="ghost" type="button" className="btn-primary w-full" disabled={gravar.isPending} onClick={() => gravar.mutate()}>
          {gravar.isPending ? "Salvando…" : "Salvar configurações"}
        </Button>
        {ok ? <p className="mt-2 text-center text-sm text-sage">Configurações salvas.</p> : null}
        {erro ? <p className="mt-2 text-center text-sm text-brick">{erro}</p> : null}
      </div>

      <Bloco titulo="Atividade" descricao="Resumo do que está acontecendo agora.">
        <dl className="space-y-3 text-xs">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-mute">Conversas em andamento</dt>
            <dd className="text-paper">{painel.conversasAtivas}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-mute">Conversas com a equipe</dt>
            <dd className="text-paper">{painel.conversasComHumano}</dd>
          </div>
        </dl>
        <Link to="/barbeiro/cortai-atividade" className="mt-4 block text-xs text-gold">
          Ver assuntos, consultas e falhas →
        </Link>
      </Bloco>

      <Bloco titulo="Integrações" descricao="O que a IA depende para funcionar.">
        <dl className="space-y-3 text-xs">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-mute">WhatsApp</dt>
            <dd>
              <Selo
                estado={whatsappConectado ? "conectado" : "desconectado"}
                texto={whatsappConectado ? "Conectado" : painel.gatewayConfigurado ? "Desconectado" : "Não configurado"}
              />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-mute">Inteligência do CortAI</dt>
            <dd>
              <Selo
                estado={painel.iaDisponivel ? "conectado" : "erro"}
                texto={painel.iaDisponivel ? "Disponível" : "Indisponível"}
              />
            </dd>
          </div>
        </dl>
      </Bloco>

      <BlocoInformacoes />

      {(() => {
        const OPERACIONAIS = [
          "confirmacao_agendamento",
          "lembrete_24h",
          "lembrete_2h",
          "cancelamento",
          "remarcacao",
        ] as const;
        const item = (a: (typeof painel.automacoes)[number]) => (
          <li key={a.chave} className="flex items-center justify-between gap-4">
            <span className="text-xs text-paper">{AUTOMACOES[a.chave]}</span>
            <input
              type="checkbox"
              checked={a.ativa}
              onChange={(e) => alternarAutomacao.mutate({ chave: a.chave, ativa: e.target.checked, mensagem: a.mensagem })}
              className="h-4 w-4 accent-[var(--gold)]"
              aria-label={AUTOMACOES[a.chave]}
            />
          </li>
        );
        const operacionais = painel.automacoes.filter((a) => (OPERACIONAIS as readonly string[]).includes(a.chave));
        const outras = painel.automacoes.filter((a) => !(OPERACIONAIS as readonly string[]).includes(a.chave));
        return (
          <>
            <Bloco
              titulo="WhatsApp — Automações"
              descricao="Mensagens enviadas pela barbearia, sem IA. Desligada, a mensagem não é enviada."
            >
              <ul className="space-y-3">{operacionais.map(item)}</ul>
              <p className="mt-3 text-[11px] text-mute">
                O pagamento antecipado é ligado acima, em Atendimento, junto do link de pagamento.
              </p>
            </Bloco>
            <Bloco titulo="Outras mensagens" descricao="Mensagens da conversa com a IA.">
              <ul className="space-y-3">{outras.map(item)}</ul>
            </Bloco>
          </>
        );
      })()}
    </section>
  );
}

/* ---------------------- Informações oficiais da barbearia ----------------- */

function BlocoInformacoes() {
  const cliente = useQueryClient();
  const salvar = useServerFn(salvarInformacao);
  const remover = useServerFn(removerInformacao);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const lista = useQuery({ queryKey: ["cortai-informacoes"], queryFn: () => listarInformacoes() });
  const recarregar = () => void cliente.invalidateQueries({ queryKey: ["cortai-informacoes"] });

  const gravar = useMutation({
    mutationFn: () => salvar({ data: { pergunta: pergunta.trim(), resposta: resposta.trim(), ativo: true } }),
    onSuccess: () => {
      setPergunta("");
      setResposta("");
      setErro(null);
      recarregar();
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  const apagar = useMutation({
    mutationFn: (id: string) => remover({ data: { id } }),
    onSuccess: recarregar,
  });

  return (
    <div className="rounded-lg border border-line bg-ink2 p-5">
      <h2 className="text-sm font-semibold text-paper">Informações da barbearia</h2>
      <p className="mt-1 text-xs text-mute">
        Endereço, estacionamento, formas de pagamento, políticas. O CortAI só responde essas dúvidas com o que estiver
        escrito aqui.
      </p>

      {lista.data && lista.data.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {lista.data.map((i) => (
            <li key={i.id} className="rounded-md border border-line2 p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-paper">{i.pergunta}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-mute">{i.resposta}</p>
                </div>
                <Button variant="ghost" type="button" className="text-[11px] text-brick" onClick={() => apagar.mutate(i.id)}>
                  Apagar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-mute2">Nenhuma informação cadastrada ainda.</p>
      )}

      <div className="mt-4 space-y-2 border-t border-line pt-4">
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Pergunta (ex.: Tem estacionamento?)"
          className="w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
        />
        <textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          rows={2}
          placeholder="Resposta oficial da barbearia"
          className="w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
        />
        <Button variant="ghost"
          type="button"
          className="w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
          disabled={gravar.isPending || pergunta.trim().length < 3 || resposta.trim().length < 2}
          onClick={() => gravar.mutate()}
        >
          {gravar.isPending ? "Salvando…" : "Adicionar informação"}
        </Button>
        {erro ? <p className="text-center text-sm text-brick">{erro}</p> : null}
      </div>
    </div>
  );
}
