import { createFileRoute } from "@tanstack/react-router";
import { mascaraTelefone } from "@/lib/previa";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useAcao } from "@/hooks/useAcao";
import { entrarNaFila } from "@/lib/fila-cliente.functions";
import { useContextoCliente } from "@/lib/contexto-cliente";
import { PRAZO_DA_OFERTA_MIN } from "@/lib/fila-compatibilidade";

export const Route = createFileRoute("/app/espera")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { b?: string; servico?: string; dia?: string; horario?: string } => ({
    ...(typeof search["b"] === "string" && search["b"] ? { b: search["b"] } : {}),
    ...(typeof search["servico"] === "string" && search["servico"]
      ? { servico: search["servico"] }
      : {}),
    ...(typeof search["dia"] === "string" && search["dia"] ? { dia: search["dia"] } : {}),
    ...(typeof search["horario"] === "string" && /^\d{2}:\d{2}$/.test(search["horario"])
      ? { horario: search["horario"] }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "Lista de espera — Flow" },
      {
        name: "description",
        content: "Entre na lista de espera para receber oportunidades de horários disponíveis.",
      },
      { property: "og:title", content: "Lista de espera — Flow" },
      { property: "og:description", content: "Horário cheio? Entre na lista de espera." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EsperaPage,
});

const JANELAS = [
  { rotulo: "Qualquer horário", inicio: null, fim: null },
  { rotulo: "Manhã (9h–12h)", inicio: 9, fim: 12 },
  { rotulo: "Tarde (13h–18h)", inicio: 13, fim: 18 },
  { rotulo: "Fim de tarde (18h–20h)", inicio: 18, fim: 20 },
] as const;

function EsperaPage() {
  const entrar = useServerFn(entrarNaFila);
  const { b, servico, dia, horario } = Route.useSearch();
  const slug = useContextoCliente(b);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [janela, setJanela] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [posicao, setPosicao] = useState<number | null>(null);
  const [prazoMin, setPrazoMin] = useState<number>(PRAZO_DA_OFERTA_MIN);
  const acao = useAcao();

  const escolhida = JANELAS[janela] ?? JANELAS[0];

  return (
    <Screen
      title="Lista de espera"
      subtitle={
        dia
          ? `Para ${dia.split("-").reverse().slice(0, 2).join("/")}${horario ? ` às ${horario}` : ""} — entre na lista para uma vaga compatível.`
          : "Peça para participar quando uma vaga ficar disponível."
      }
    >
      {pronto ? (
        // O cliente sabe a posição e a regra de verdade (dono, 06/11/2026): a vaga é oferecida a uma pessoa por vez,
        // em ordem, com prazo para confirmar — antes a tela dizia "quem responder primeiro fica com a vaga".
        <section className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
          <p className="text-lg font-bold text-paper">Você está na lista</p>
          <div className="mt-4 flex items-center justify-between border-b border-line pb-3">
            <span className="text-sm text-mute">Sua posição</span>
            <b className="text-lg text-paper">{posicao}º</b>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-mute">
            Se surgir uma vaga compatível, a oferta poderá chegar pelo WhatsApp se o número estiver confirmado, as mensagens autorizadas e a conexão disponível. Você terá{" "}
            <b className="text-paper">
              {prazoMin >= 60 ? `${prazoMin / 60} hora` : `${prazoMin} minutos`}
            </b>{" "}
            para confirmar uma oferta recebida; depois a vaga segue na lista. Nada fica reservado antes. Se não confirmou seu número, procure o estabelecimento para habilitar os avisos.
          </p>
        </section>
      ) : (
        <>
          <label className="block">
            <span className="text-xs text-mute2">Seu nome</span>
            <input
              value={nome}
              autoComplete="name"
              enterKeyHint="next"
              onChange={(e) => setNome(e.target.value)}
              className="field-control mt-1 w-full"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-xs text-mute2">WhatsApp</span>
            <input
              value={telefone}
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="done"
              onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
              className="field-control mt-1 w-full"
              placeholder="(00) 00000-0000"
            />
          </label>

          <p className="mt-2 text-xs leading-5 text-mute">
            Avisos pelo WhatsApp exigem número confirmado e autorização de mensagens. Você pode
            entrar na lista antes dessa confirmação; fale com o estabelecimento para habilitar os avisos.
          </p>

          {horario ? null : (
            <fieldset className="mt-6">
              <legend className="text-xs text-mute2">Melhor período</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {JANELAS.map((j, i) => (
                  <Chip key={j.rotulo} selecionado={i === janela} onClick={() => setJanela(i)}>
                    {j.rotulo}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="mt-7 w-full"
            loading={acao.estaEm("fila")}
            disabled={acao.ocupado || nome.trim().length < 2 || telefone.trim().length < 8}
            onClick={() => {
              setStatus(null);
              void acao
                .executar(
                  "fila",
                  () =>
                    entrar({
                      data: {
                        nome: nome.trim(),
                        telefone: telefone.trim(),
                        janelaInicio: escolhida.inicio,
                        janelaFim: escolhida.fim,
                        ...(slug ? { slug } : {}),
                        ...(servico ? { servicoId: servico } : {}),
                        ...(dia ? { dia } : {}),
                        ...(dia && horario ? { horario } : {}),
                      },
                    }),
                  {
                    erro: "Confira o nome e o WhatsApp e tente de novo.",
                    aoConcluir: (r) => {
                      setPosicao(r.posicao);
                      setPrazoMin(r.prazoMin ?? PRAZO_DA_OFERTA_MIN);
                      setPronto(true);
                    },
                  },
                )
                .catch(() => setStatus("Confira o nome e o WhatsApp e tente de novo."));
            }}
          >
            Entrar na lista de espera
          </Button>
          {status && !pronto ? (
            <p className="mt-3 text-sm text-brick" role="alert">
              {status}
            </p>
          ) : null}
        </>
      )}
    </Screen>
  );
}
