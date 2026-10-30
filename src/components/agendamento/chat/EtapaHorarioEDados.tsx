import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AgendaPublica } from "@/lib/agendamento-publico.functions";
import { diaPorExtenso, TEXTOS_CONVERSA, textoOferta } from "@/lib/conversa/respostas";
import { brl } from "@/lib/format";
import { mascaraTelefone } from "@/lib/previa";
import { Fala } from "./BolhasDaConversa";
import type { Selecao } from "./tipos";
import type { useConversaAgendamento } from "./useConversaAgendamento";

type Conversa = ReturnType<typeof useConversaAgendamento>;

function nomeDoProfissional(data: AgendaPublica, id: string | undefined) {
  return data.profissionais.find((p) => p.id === id)?.nome ?? null;
}

export function EtapaHorario({
  data,
  selecao,
  conversa,
}: {
  data: AgendaPublica;
  selecao: Selecao;
  conversa: Conversa;
}) {
  const { lista, foraDoPeriodo } = conversa.ofertas;
  const dia = selecao.dia!;
  if (!lista.length) {
    const outros = selecao.dias
      .filter((d) => d !== dia && (selecao.porDia.get(d)?.opcoes.length ?? 0) > 0)
      .slice(0, 3);
    return (
      <Fala>
        <p>{TEXTOS_CONVERSA.semHorario}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {outros.map((d) => (
            <Button
              key={d}
              variant="outline"
              className="h-12 rounded-full px-4"
              onClick={() => conversa.escolherDia(d)}
            >
              {diaPorExtenso(d)}
            </Button>
          ))}
        </div>
        {data.tenant.usaListaDeEspera && data.pagina.chat.listaEspera ? (
          <Button asChild variant="ghost" className="mt-2 h-12 w-full">
            <a
              href={`/app/espera?b=${encodeURIComponent(data.tenant.slug)}${selecao.servicoId ? `&servico=${selecao.servicoId}` : ""}&dia=${dia}`}
            >
              Agenda cheia? Entrar na lista de espera
            </a>
          </Button>
        ) : null}
      </Fala>
    );
  }
  const visiveis = lista.slice(0, conversa.mostrar);
  const prof =
    selecao.profissionalId === "qualquer" ? null : nomeDoProfissional(data, selecao.profissionalId);
  return (
    <Fala>
      <p>
        {foraDoPeriodo && conversa.periodo ? "Nesse período não tem. " : ""}
        {TEXTOS_CONVERSA.horario}
      </p>
      <p className="mb-3 font-semibold">{textoOferta(prof, dia)}</p>
      <div className="grid grid-cols-3 gap-2">
        {visiveis.map((o) => (
          <Button
            key={o.iso}
            variant="outline"
            className="h-12 font-bold"
            aria-label={`${o.label}${prof ? "" : ` com ${nomeDoProfissional(data, o.profId) ?? "profissional"}`}`}
            onClick={() => selecao.setInicio(o.iso)}
          >
            {o.label}
          </Button>
        ))}
      </div>
      {lista.length > visiveis.length ? (
        <Button variant="ghost" className="mt-2 h-12 w-full" onClick={conversa.verMais}>
          Ver mais
        </Button>
      ) : null}
    </Fala>
  );
}

export function EtapaDados({
  data,
  selecao,
  nome,
  telefone,
  setNome,
  setTelefone,
  nomeRef,
}: {
  data: AgendaPublica;
  selecao: Selecao;
  nome: string;
  telefone: string;
  setNome: (v: string) => void;
  setTelefone: (v: string) => void;
  nomeRef: RefObject<HTMLInputElement | null>;
}) {
  const { servico, escolhido, dia } = selecao;
  if (!servico || !escolhido || !dia) return null;
  const prof = nomeDoProfissional(data, escolhido.profId) ?? "Profissional disponível";
  return (
    <Fala>
      <p className="font-semibold">
        {servico.nome} com {prof}
        <br />
        {diaPorExtenso(dia)} às {escolhido.label} · {brl(servico.preco_centavos)}
      </p>
      {/* Uma frase só: "Posso confirmar?" seguido de "…para confirmar" repetia a pergunta; o botão já confirma. */}
      <p className="mb-3 mt-3 text-sm">{TEXTOS_CONVERSA.dados}</p>
      <div className="grid gap-3">
        <Input
          ref={nomeRef}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
          enterKeyHint="next"
          placeholder="Seu nome"
          aria-label="Seu nome"
          className="h-12 text-base"
        />
        <Input
          value={telefone}
          onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
          autoComplete="tel"
          enterKeyHint="done"
          inputMode="tel"
          placeholder="WhatsApp com DDD"
          aria-label="WhatsApp com DDD"
          className="h-12 text-base"
        />
      </div>
    </Fala>
  );
}
