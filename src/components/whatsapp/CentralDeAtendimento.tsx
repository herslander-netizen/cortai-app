import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Bot, CheckCheck, Clock3, Hand, MessageCircle, Search, UserRound } from "lucide-react";
import { useState } from "react";

import { useConfirmar } from "@/components/ui/useConfirmar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  comandarConversaDaCentral,
  detalharConversaDaCentral,
  listarConversasDaCentral,
  type ResumoDaConversa,
  type MensagemDaCentral,
} from "@/lib/central-atendimento.functions";
import { ROTULOS_DA_CONVERSA, type EstadoDaConversa } from "@/lib/whatsapp/estado-da-conversa";

type Filtro = "todas" | EstadoDaConversa;
const FILTROS: Filtro[] = ["todas", "nova", "ia_atendendo", "aguardando_cliente", "atendimento_humano", "resolvida"];
const TOM: Record<EstadoDaConversa, string> = {
  nova: "border-gold/40 text-gold",
  ia_atendendo: "border-sage/40 text-sage",
  aguardando_cliente: "border-line2 text-mute",
  atendimento_humano: "border-gold/40 text-gold",
  resolvida: "border-line2 text-mute2",
};
const ORIGEM: Record<NonNullable<ResumoDaConversa["ultimaOrigem"]>, string> = {
  cliente: "Cliente",
  equipe: "Equipe",
  flow_ia: "Flow IA",
  automacao: "Automação do Flow",
  nao_confirmada: "Autoria não confirmada",
};
const ORIGEM_MENSAGEM: Record<MensagemDaCentral["origem"], string> = ORIGEM;

function horario(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function Etiqueta({ estado }: { estado: EstadoDaConversa }) {
  return (
    <span className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${TOM[estado]}`}>
      {ROTULOS_DA_CONVERSA[estado]}
    </span>
  );
}

/** A primeira etapa não envia mensagens: exibe a atividade real e controla a posse humana. */
export function CentralDeAtendimento() {
  const carregar = useServerFn(listarConversasDaCentral);
  const detalhar = useServerFn(detalharConversaDaCentral);
  const comandar = useServerFn(comandarConversaDaCentral);
  const queryClient = useQueryClient();
  const [confirmar, dialogo] = useConfirmar();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [selecao, setSelecao] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const lista = useQuery({
    queryKey: ["central-atendimento", "conversas"],
    queryFn: () => carregar(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const detalhe = useQuery({
    queryKey: ["central-atendimento", "detalhe", selecao],
    queryFn: () => detalhar({ data: { conversaId: selecao! } }),
    enabled: Boolean(selecao),
    refetchInterval: 30_000,
  });
  const alterar = useMutation({
    mutationFn: (v: { acao: "assumir" | "retomar" | "resolver"; conversa: ResumoDaConversa }) =>
      comandar({ data: {
        acao: v.acao,
        conversaId: v.conversa.id,
        atualizadoEm: v.conversa.atualizadoEm,
      } }),
    onSuccess: (r) => {
      setAviso(r.ok ? null : "A conversa mudou em outro dispositivo. Atualizamos os dados; confira antes de tentar de novo.");
    },
    onError: () => setAviso("Não foi possível confirmar a alteração. Confira o estado atualizado antes de tentar novamente."),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["central-atendimento"] });
    },
  });

  const conversas = lista.data?.conversas ?? [];
  const escolhida = conversas.find(c => c.id === selecao) ?? null;
  const filtradas = conversas.filter(c =>
    (filtro === "todas" || c.estado === filtro) &&
    (c.nome.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")) ||
      c.telefoneFinal.includes(busca.replace(/\D/g, ""))),
  );

  async function executar(acao: "assumir" | "retomar" | "resolver") {
    if (!escolhida || alterar.isPending) return;
    const titulo = acao === "assumir" ? "Assumir esta conversa?" :
      acao === "resolver" ? "Marcar conversa como resolvida?" : "Liberar conversa para a automação?";
    const descricao = acao === "assumir"
      ? "O Flow Bot e a IA vão parar de responder aqui até você liberar o atendimento."
      : acao === "resolver"
        ? "A conversa será encerrada e o atendimento automático continuará suspenso. Você poderá reabri-la depois."
        : "O controle humano será encerrado. A automação poderá responder se estiver habilitada no negócio.";
    if (!await confirmar({ titulo, descricao, confirmar: "Confirmar" })) return;
    setAviso(null);
    alterar.mutate({ acao, conversa: escolhida });
  }

  return (
    <section aria-label="Central de Atendimento" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div>
          <h2 className="text-lg font-semibold text-paper">Central de Atendimento</h2>
          <p className="mt-1 text-sm leading-relaxed text-mute">
            Conversas reais do WhatsApp. A equipe assume cada atendimento sem desligar a IA do negócio.
          </p>
        </div>
        <span className="rounded-full bg-ink3 px-3 py-1.5 text-xs text-mute">
          {conversas.length} {conversas.length === 1 ? "conversa" : "conversas"}
        </span>
      </div>
      {lista.isError ? (
        <p role="alert" className="rounded-[12px] bg-ink2 px-4 py-3 text-sm text-brick">
          Não conseguimos carregar as conversas. Verifique sua conexão e tente novamente.
        </p>
      ) : null}
      {aviso ? <p role="alert" className="rounded-[12px] bg-ink2 px-4 py-3 text-sm text-gold">{aviso}</p> : null}
      <div className="grid min-h-[360px] gap-3 md:grid-cols-[minmax(270px,0.9fr)_minmax(0,1.1fr)]">
        <div className={`min-w-0 space-y-3 ${selecao ? "hidden md:block" : ""}`}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-mute" aria-hidden />
            <Input
              aria-label="Buscar conversa por nome ou final do telefone"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar conversa"
              className="min-h-12 w-full rounded-[12px] border border-line2 bg-ink2 pl-10 pr-3 text-sm text-paper placeholder:text-mute2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar conversas por situação">
            {FILTROS.map(valor => (
              <Button variant="ghost"
                key={valor}
                type="button"
                aria-pressed={filtro === valor}
                onClick={() => setFiltro(valor)}
                className={`min-h-12 shrink-0 rounded-full border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${filtro === valor ? "border-gold bg-ink3 text-paper" : "border-line2 text-mute"}`}
              >
                {valor === "todas" ? "Todas" : ROTULOS_DA_CONVERSA[valor]}
              </Button>
            ))}
          </div>
          <ul className="max-h-[600px] space-y-2 overflow-y-auto" aria-label="Conversas encontradas">
            {filtradas.map(conversa => (
              <li key={conversa.id}>
                <Button variant="ghost"
                  type="button"
                  aria-pressed={selecao === conversa.id}
                  onClick={() => { setSelecao(conversa.id); setAviso(null); }}
                  className={`w-full rounded-[16px] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${selecao === conversa.id ? "border-gold bg-ink3" : "border-transparent bg-ink2"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-paper">{conversa.nome}</span>
                    <span className="shrink-0 text-[11px] text-mute2">{horario(conversa.ultimaMensagemEm)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Etiqueta estado={conversa.estado} />
                    {conversa.naoLidas > 0 ? (
                      <span className="rounded-full bg-ink3 px-2 py-0.5 text-[11px] font-semibold text-paper">
                        {conversa.naoLidas} nova{conversa.naoLidas > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-mute">
                    {conversa.ultimaOrigem ? `${ORIGEM[conversa.ultimaOrigem]} · ` : ""}{conversa.previa}
                  </p>
                </Button>
              </li>
            ))}
            {lista.isLoading && !lista.data ? <li className="p-4 text-sm text-mute">Carregando conversas…</li> : null}
            {!lista.isLoading && !filtradas.length ? (
              <li className="rounded-[16px] bg-ink2 p-5 text-center text-sm text-mute">
                Nenhuma conversa neste filtro.
              </li>
            ) : null}
          </ul>
          <p className="px-1 text-[11px] text-mute2">Exibindo até 40 conversas recentes deste estabelecimento.</p>
        </div>

        <div className={`min-w-0 rounded-[20px] bg-ink2 ${selecao ? "" : "hidden md:block"}`}>
          {escolhida ? (
            <div className="flex h-full min-h-[360px] flex-col">
              <header className="border-b border-line2 p-4">
                <Button variant="ghost" type="button" onClick={() => setSelecao(null)} className="mb-3 flex min-h-12 items-center gap-2 text-sm text-mute md:hidden">
                  <ArrowLeft className="size-4" aria-hidden /> Voltar às conversas
                </Button>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-paper">{escolhida.nome}</p>
                    <p className="mt-1 text-xs text-mute">WhatsApp · final {escolhida.telefoneFinal}</p>
                  </div>
                  <Etiqueta estado={escolhida.estado} />
                </div>
                {lista.data?.podeGerenciar ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {escolhida.estado !== "atendimento_humano" ? (
                      <Button size="sm" variant="secondary" disabled={alterar.isPending} onClick={() => void executar("assumir")}>
                        <Hand className="mr-1.5 size-4" aria-hidden /> Assumir
                      </Button>
                    ) : null}
                    {escolhida.estado === "atendimento_humano" || escolhida.estado === "resolvida" ? (
                      <Button size="sm" variant="secondary" disabled={alterar.isPending} onClick={() => void executar("retomar")}>
                        <Bot className="mr-1.5 size-4" aria-hidden /> Liberar IA
                      </Button>
                    ) : null}
                    {escolhida.estado !== "resolvida" ? (
                      <Button size="sm" variant="ghost" disabled={alterar.isPending} onClick={() => void executar("resolver")}>
                        <CheckCheck className="mr-1.5 size-4" aria-hidden /> Resolver
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-mute2">Seu acesso é somente para consulta. A gestão da conversa exige permissão.</p>
                )}
              </header>
              <div className="max-h-[370px] flex-1 space-y-2 overflow-y-auto px-3 py-4" role="log" aria-label="Mensagens da conversa">
                {detalhe.isLoading ? <p className="text-sm text-mute">Carregando mensagens…</p> : null}
                {detalhe.isError ? <p role="alert" className="text-sm text-brick">Não foi possível consultar o histórico.</p> : null}
                {(detalhe.data?.mensagens ?? []).map(m => (
                  <div key={m.id} className={`flex ${m.direcao === "saida" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] rounded-[16px] px-3 py-2 ${m.direcao === "saida" ? "bg-ink3" : "bg-ink3"}`}>
                      <div className="flex items-center gap-1.5 text-[11px] text-mute">
                        {m.origem === "cliente" || m.origem === "equipe" ? <UserRound className="size-3" aria-hidden /> : <Bot className="size-3" aria-hidden />}
                        {ORIGEM_MENSAGEM[m.origem]}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-paper">
                        {m.conteudo || (m.tipo === "audio" ? "Mensagem de áudio" : `[${m.tipo}]`)}
                      </p>
                      <p className="mt-1 text-right text-[10px] text-mute2">{horario(m.criadoEm)} · {m.status}</p>
                    </div>
                  </div>
                ))}
                {!detalhe.isLoading && !detalhe.isError && detalhe.data?.mensagens.length === 0 ? (
                  <p className="py-6 text-center text-sm text-mute">Nenhuma mensagem registrada.</p>
                ) : null}
              </div>
              <section className="border-t border-line2 p-4" aria-label="Contexto do cliente">
                <div className="flex items-center gap-2 text-sm font-medium text-paper">
                  <Clock3 className="size-4 text-mute" aria-hidden /> Horários e serviços
                </div>
                {detalhe.data?.agendamentos.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {detalhe.data.agendamentos.slice(0, 4).map(a => (
                      <li key={a.id} className="flex justify-between gap-3 text-xs text-mute">
                        <span className="min-w-0 truncate">{a.servico} · {a.status.replaceAll("_", " ")}</span>
                        <span className="shrink-0">{horario(a.inicio)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-mute2">Nenhum agendamento vinculado à ficha deste contato.</p>
                )}
                <p className="mt-3 text-[11px] leading-relaxed text-mute2">
                  Ações de agenda permanecem no fluxo oficial do Flow. Esta central não cria reservas nem envia mensagens.
                </p>
              </section>
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-5 text-center">
              {selecao ? (
                <Button variant="ghost"
                  type="button"
                  onClick={() => setSelecao(null)}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                >
                  <ArrowLeft className="size-4" aria-hidden /> Voltar às conversas
                </Button>
              ) : null}
              <MessageCircle className="size-8 text-mute2" aria-hidden />
              <p className="text-sm text-paper">Escolha uma conversa</p>
              <p className="max-w-[270px] text-xs leading-relaxed text-mute">
                Veja o histórico real, a origem das respostas e o contexto do cliente, sem mudar a agenda.
              </p>
            </div>
          )}
        </div>
      </div>
      {dialogo}
    </section>
  );
}
