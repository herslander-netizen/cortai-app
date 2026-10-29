import { useEffect, useRef, useState } from "react";
import { Check, Info, MessageCircle, RotateCcw, Store } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ChatHeader, ChatShell, TypingIndicator } from "@/components/chat/ChatShell";
import { FontesDaMarca } from "@/components/marca/FontesDaMarca";
import { Button } from "@/components/ui/button";
import { useHistoricoAgendamento } from "@/hooks/useHistoricoAgendamento";
import type { AgendaPublica } from "@/lib/agendamento-publico.functions";
import { diaPorExtenso, saudacao } from "@/lib/conversa/respostas";
import { mascaraTelefone } from "@/lib/previa";
import { agendamentoStyle } from "@/lib/pagina-config";
import { pausaDaResposta } from "@/lib/pausa-chat";
import { statusDeFuncionamento } from "@/lib/status-funcionamento";
import { AberturaDoChat } from "./chat/AberturaDoChat";
import { BarraDeMensagem } from "./chat/BarraDeMensagem";
import { BolhaEditavel, Fala, MensagensExtras } from "./chat/BolhasDaConversa";
import { EtapaDia, EtapaProfissional, EtapaServico } from "./chat/EtapasDoChat";
import { EtapaDados, EtapaHorario } from "./chat/EtapaHorarioEDados";
import { linkDaEquipe } from "./chat/respostasRapidas";
import type { Chip, HorarioFuturo, Selecao } from "./chat/tipos";
import { useConversaAgendamento } from "./chat/useConversaAgendamento";

/** Nome vazio ou o antigo padrão "Recepção" viram Lisa; nomes próprios salvos continuam. */
function nomeDaRecepcao(nome: string | undefined) {
  const limpo = nome?.trim() ?? "";
  return !limpo || /^recep(?:ç|c)[aã]o$/i.test(limpo) ? "Lisa" : limpo;
}

/** Um único status: respondendo, fora do horário (texto curto) ou online. */
export function statusDoCabecalho(
  respondendo: boolean,
  funcionamento: { aberto: boolean; texto: string } | null,
) {
  if (respondendo) return "Respondendo…";
  if (!funcionamento) return "Agenda online";
  return funcionamento.aberto ? "Online agora" : funcionamento.texto;
}

export function AgendamentoChat({
  data,
  selecao,
  nome,
  telefone,
  setNome,
  setTelefone,
  confirmar,
  conflito,
  alterarConflito,
  enviando,
  erro,
  futuro = null,
  linkSobre = null,
}: {
  data: AgendaPublica;
  selecao: Selecao;
  nome: string;
  telefone: string;
  setNome: (value: string) => void;
  setTelefone: (value: string) => void;
  confirmar: () => void;
  conflito: { agendamentoId: string; hora: string } | null;
  alterarConflito: () => void;
  enviando: boolean;
  erro: string | null;
  futuro?: HorarioFuturo | null;
  linkSobre?: string | null;
}) {
  const dadosValidos = nome.trim().length >= 2 && telefone.replace(/\D/g, "").length >= 10;
  const conversa = useConversaAgendamento({
    data,
    selecao,
    temFuturo: Boolean(futuro),
    podeConfirmar: dadosValidos && !enviando,
    confirmar,
  });
  const { etapa, abertura, memoria, rascunho } = conversa;
  const [etapaPronta, setEtapaPronta] = useState<string | null>(null);
  const [primeiraVisita, setPrimeiraVisita] = useState(true);
  const nomeRef = useRef<HTMLInputElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const usouTeclado = useRef(false);
  const digitando = etapaPronta !== etapa;
  const funcionamento = statusDeFuncionamento(data.horarios, data.tenant.fuso, undefined, data.excecoesIntervalo);
  const equipe = linkDaEquipe(data);
  const paginaDoNegocio = `/b/${data.tenant.slug}`;
  const nomeServico = (id?: string) => data.servicos.find((s) => s.id === id)?.nome;
  const nomeProf = (id?: string) => data.profissionais.find((p) => p.id === id)?.nome;

  useHistoricoAgendamento(etapa, (destino) => {
    if (destino === "servico" || destino === "profissional" || destino === "dia") {
      conversa.corrigir(destino);
    } else if (destino === "horario") conversa.corrigir("horario");
  });

  useEffect(() => {
    const id = window.setTimeout(
      () => setEtapaPronta(etapa),
      pausaDaResposta(etapa, primeiraVisita),
    );
    return () => window.clearTimeout(id);
  }, [etapa, primeiraVisita]);

  useEffect(() => {
    if (memoria?.nome && !nome) setNome(memoria.nome);
    if (memoria?.telefone && !telefone) setTelefone(mascaraTelefone(memoria.telefone));
    try {
      const chave = `cortai-chat-visitado:${data.tenant.slug}`;
      setPrimeiraVisita(localStorage.getItem(chave) !== "1");
      localStorage.setItem(chave, "1");
    } catch {
      setPrimeiraVisita(true);
    }
    // Só quando a memória local é lida; depois o estado é controlado pelas props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoria]);

  useEffect(() => {
    if (digitando) return;
    if (etapa === "dados" && !nome) nomeRef.current?.focus();
    else if (usouTeclado.current) campoRef.current?.focus();
  }, [digitando, etapa, nome]);

  const chipsPorEtapa: Record<typeof etapa, Chip[]> = {
    servico: [
      ...data.servicos.slice(0, 3).map((s) => ({
        rotulo: s.nome,
        acao: () => selecao.setServicoId(s.id),
      })),
      { rotulo: "Ver serviços e preços", acao: () => conversa.enviarTexto("serviços e preços") },
    ],
    profissional: [
      { rotulo: "Sem preferência", acao: () => conversa.escolherProfissional("qualquer") },
      ...selecao.aptos.map((p) => ({
        rotulo: p.nome,
        acao: () => conversa.escolherProfissional(p.id),
      })),
    ],
    dia: [
      { rotulo: "Mais cedo possível", acao: conversa.pedirPrimeiro },
      { rotulo: "Hoje", acao: () => conversa.enviarTexto("hoje") },
      { rotulo: "Amanhã", acao: () => conversa.enviarTexto("amanhã") },
    ],
    horario: [
      { rotulo: "Mais cedo possível", acao: conversa.pedirPrimeiro },
      { rotulo: "Manhã", acao: () => conversa.setPeriodo("manha") },
      { rotulo: "Fim da tarde", acao: () => conversa.setPeriodo("fim_tarde") },
      { rotulo: "Outro dia", acao: () => conversa.corrigir("dia") },
    ],
    dados: [],
  };

  const s = selecao;
  const profTexto =
    s.profissionalId === "qualquer" ? "Não tenho preferência" : (nomeProf(s.profissionalId) ?? "");

  return (
    <>
      <FontesDaMarca config={data.pagina} />
      <ChatShell
        capaUrl={data.tenant.capaUrl}
        style={agendamentoStyle(data.pagina)}
        header={
          <ChatHeader
            nome={nomeDaRecepcao(data.pagina.chat.nomeRecepcao)}
            avatarUrl={data.pagina.chat.avatarUrl ?? data.tenant.logoUrl}
            status={statusDoCabecalho(digitando || enviando, funcionamento)}
            processando={digitando || enviando}
            voltar={{ href: paginaDoNegocio, rotulo: `Voltar para ${data.tenant.nome}` }}
            acoes={[
              { rotulo: "Recomeçar conversa", icone: <RotateCcw />, onSelect: conversa.recomecar },
              { rotulo: "Página do negócio", icone: <Store />, href: paginaDoNegocio },
              ...(equipe ? [{ rotulo: "Falar com a equipe", icone: <MessageCircle />, href: equipe, externo: true }] : []),
              ...(linkSobre ? [{ rotulo: "Sobre nós", icone: <Info />, href: linkSobre }] : []),
            ]}
          />
        }
      >
        <Conversation className="min-h-0">
          <ConversationContent
            className="mx-auto w-full max-w-[620px] gap-5 px-4 py-6 sm:px-6"
            role="log"
            aria-live="polite"
          >
            <Fala>
              {saudacao(memoria?.primeiroNome)} {data.pagina.chat.mensagemInicial}
            </Fala>
            {abertura ? (
              <AberturaDoChat
                tipo={abertura}
                futuro={futuro}
                primeiroNome={memoria?.primeiroNome}
                servicoNome={nomeServico(
                  abertura === "retomar" ? rascunho?.servicoId : memoria?.ultimoServicoId,
                )}
                profissionalNome={nomeProf(memoria?.ultimoProfissionalId)}
                diaRascunho={rascunho?.dia}
                onDeSempre={conversa.oDeSempre}
                onOutroServico={() => conversa.setAbertura(null)}
                onOutroProfissional={() => {
                  if (memoria?.ultimoServicoId) s.setServicoId(memoria.ultimoServicoId);
                  conversa.setAbertura(null);
                }}
                onContinuar={conversa.continuarRascunho}
                onRecomecar={conversa.recomecar}
                onNovo={() => conversa.setAbertura(null)}
              />
            ) : null}
            {s.servico ? (
              <BolhaEditavel
                texto={s.servico.nome}
                rotulo="serviço"
                onEditar={() => conversa.corrigir("servico")}
              />
            ) : null}
            {s.servico && conversa.profEscolhido ? (
              <BolhaEditavel
                texto={profTexto}
                rotulo="profissional"
                onEditar={() => conversa.corrigir("profissional")}
              />
            ) : null}
            {s.dia && etapa !== "dia" && conversa.profEscolhido ? (
              <BolhaEditavel
                texto={diaPorExtenso(s.dia)}
                rotulo="dia"
                onEditar={() => conversa.corrigir("dia")}
              />
            ) : null}
            {s.escolhido ? (
              <BolhaEditavel
                texto={s.escolhido.label}
                rotulo="horário"
                onEditar={() => conversa.corrigir("horario")}
              />
            ) : null}
            <MensagensExtras itens={conversa.extras} />
            {digitando ? (
              <Fala>
                <TypingIndicator />
              </Fala>
            ) : abertura ? null : etapa === "servico" ? (
              <EtapaServico data={data} selecao={s} />
            ) : etapa === "profissional" ? (
              <EtapaProfissional selecao={s} conversa={conversa} />
            ) : etapa === "dia" ? (
              <EtapaDia selecao={s} conversa={conversa} />
            ) : etapa === "horario" ? (
              <EtapaHorario data={data} selecao={s} conversa={conversa} />
            ) : (
              <EtapaDados
                data={data}
                selecao={s}
                nome={nome}
                telefone={telefone}
                setNome={setNome}
                setTelefone={setTelefone}
                nomeRef={nomeRef}
              />
            )}
            {erro ? (
              <Fala>
                <p className="text-brick" role="alert">
                  Não consegui concluir: {erro}
                </p>
                <Button variant="outline" className="mt-3 h-12" onClick={confirmar}>
                  Tentar novamente
                </Button>
              </Fala>
            ) : null}
            {conflito ? (
              <Fala>
                <p role="alert">Você já tem um horário às {conflito.hora} nesse dia.</p>
                <Button
                  variant="outline"
                  className="mt-3 h-12 w-full"
                  disabled={enviando}
                  onClick={alterarConflito}
                >
                  Alterar esse horário
                </Button>
              </Fala>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton aria-label="Ir para a mensagem mais recente" />
        </Conversation>
        <BarraDeMensagem
          chips={abertura || digitando ? [] : chipsPorEtapa[etapa]}
          onEnviar={(texto) => {
            usouTeclado.current = true;
            conversa.enviarTexto(texto);
          }}
          campoRef={campoRef}
          acima={
            etapa === "dados" && !digitando ? (
              <Button
                className="h-12 w-full"
                disabled={!dadosValidos || enviando}
                onClick={confirmar}
              >
                <Check />
                {enviando ? "Confirmando…" : "Sim, pode confirmar"}
              </Button>
            ) : null
          }
        />
      </ChatShell>
    </>
  );
}
