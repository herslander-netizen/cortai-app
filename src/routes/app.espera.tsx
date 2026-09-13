import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { entrarNaFila } from "@/lib/fila-cliente.functions";

export const Route = createFileRoute("/app/espera")({
  head: () => ({
    meta: [
      { title: "Lista de espera — CortAI" },
      { name: "description", content: "Entre na lista de espera e seja avisado quando abrir um horário." },
      { property: "og:title", content: "Lista de espera — CortAI" },
      { property: "og:description", content: "Horário cheio? Avisamos assim que vagar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [janela, setJanela] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  const escolhida = JANELAS[janela] ?? JANELAS[0];

  return (
    <Screen title="Lista de espera" subtitle="Avisamos assim que um horário vagar.">
      {pronto ? (
        <div className="rounded-xl border border-line bg-ink2 px-5 py-6">
          <p className="text-sm text-paper">Você está na lista.</p>
          <p className="mt-1 text-xs text-mute">{status}</p>
        </div>
      ) : (
        <>
          <label className="block">
            <span className="text-xs text-mute2">Seu nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="input-premium mt-1 w-full" />
          </label>
          <label className="mt-4 block">
            <span className="text-xs text-mute2">WhatsApp</span>
            <input
              value={telefone}
              inputMode="tel"
              onChange={(e) => setTelefone(e.target.value)}
              className="input-premium mt-1 w-full"
              placeholder="(00) 00000-0000"
            />
          </label>

          <p className="mt-6 text-xs text-mute2">Melhor período</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {JANELAS.map((j, i) => (
              <button
                key={j.rotulo}
                type="button"
                onClick={() => setJanela(i)}
                className={`rounded-lg border px-3 py-3 text-xs ${i === janela ? "border-gold text-paper" : "border-line2 text-mute"}`}
              >
                {j.rotulo}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-primary mt-7 w-full"
            onClick={async () => {
              try {
                const r = await entrar({
                  data: {
                    nome: nome.trim(),
                    telefone: telefone.trim(),
                    janelaInicio: escolhida.inicio,
                    janelaFim: escolhida.fim,
                  },
                });
                setStatus(`Você é o número ${r.posicao} da fila. Quem responder primeiro fica com a vaga.`);
                setPronto(true);
              } catch {
                setStatus("Confira o nome e o WhatsApp e tente de novo.");
              }
            }}
          >
            Entrar na lista de espera
          </button>
          {status && !pronto ? <p className="mt-3 text-sm text-brick">{status}</p> : null}
        </>
      )}
    </Screen>
  );
}
