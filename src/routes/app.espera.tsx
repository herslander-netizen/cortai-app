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
        content: "Entre na lista de espera e seja avisado quando abrir um horário.",
      },
      { property: "og:title", content: "Lista de espera — Flow" },
      { property: "og:description", content: "Horário cheio? Avisamos assim que vagar." },
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
  const acao = useAcao();

  const escolhida = JANELAS[janela] ?? JANELAS[0];

  return (
    <Screen
      title="Lista de espera"
      subtitle={
        dia
          ? `Para ${dia.split("-").reverse().slice(0, 2).join("/")}${horario ? ` às ${horario}` : ""} — avisamos assim que vagar.`
          : "Avisamos assim que um horário vagar."
      }
    >
      {pronto ? (
        <div className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] px-5 py-6">
          <p className="text-sm text-paper">Você está na lista.</p>
          <p className="mt-1 text-xs text-mute">{status}</p>
        </div>
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
                      setStatus(
                        `Você é o número ${r.posicao} da fila. Quem responder primeiro fica com a vaga.`,
                      );
                      setPronto(true);
                    },
                  },
                )
                .catch(() => setStatus("Confira o nome e o WhatsApp e tente de novo."));
            }}
          >
            {acao.estaEm("fila") ? "Entrando na lista…" : "Entrar na lista de espera"}
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
