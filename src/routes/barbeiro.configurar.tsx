import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { EditorDeHorarios } from "@/components/onboarding/EditorDeHorarios";
import { EditorDeServicos, type ServicoEditavel } from "@/components/onboarding/EditorDeServicos";
import { horariosPadrao, type HorarioSugerido } from "@/lib/ia/assistente";
import {
  concluirConfiguracao,
  getConfiguracaoInicial,
  salvarDadosDaBarbearia,
  salvarHorarios,
  salvarServicos,
} from "@/lib/onboarding.functions";

export const Route = createFileRoute("/barbeiro/configurar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configuração inicial — Cortaí Gestão" },
      { name: "description", content: "Dados, horários e serviços da sua barbearia em poucos minutos." },
      { property: "og:title", content: "Configuração inicial — Cortaí" },
      { property: "og:description", content: "Deixe sua barbearia pronta para atender." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfigurarPage,
});

const PASSOS = ["Dados", "Horários", "Serviços", "Pronto"] as const;

function ConfigurarPage() {
  const navigate = useNavigate();
  const salvarDados = useServerFn(salvarDadosDaBarbearia);
  const gravarHorarios = useServerFn(salvarHorarios);
  const gravarServicos = useServerFn(salvarServicos);
  const concluir = useServerFn(concluirConfiguracao);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["configuracao-inicial"],
    queryFn: () => getConfiguracaoInicial(),
  });

  const [passo, setPasso] = useState(0);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [horarios, setHorarios] = useState<HorarioSugerido[]>(horariosPadrao());
  const [servicos, setServicos] = useState<ServicoEditavel[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [iniciado, setIniciado] = useState(false);

  useEffect(() => {
    if (!data || iniciado) return;
    setNome(data.tenant.nome);
    setWhatsapp(data.tenant.whatsapp ?? "");
    setHorarios(data.horarios);
    setServicos(
      data.servicos
        .filter((s) => s.ativo)
        .map((s) => ({
          id: s.id,
          nome: s.nome,
          categoria: "Serviço",
          duracaoMin: s.duracaoMin,
          precoCentavos: s.precoCentavos,
        })),
    );
    if (data.concluidoEm) setPasso(3);
    else if (data.etapa === "servicos") setPasso(2);
    else if (data.etapa === "horarios") setPasso(1);
    setIniciado(true);
  }, [data, iniciado]);

  const link = data ? `${typeof window !== "undefined" ? window.location.origin : ""}/f/${data.tenant.slug}` : "";

  async function avancar() {
    setEnviando(true);
    setErro(null);
    try {
      if (passo === 0) await salvarDados({ data: { nome: nome.trim(), whatsapp } });
      if (passo === 1) await gravarHorarios({ data: { horarios } });
      if (passo === 2) {
        const validos = servicos.filter((s) => s.nome.trim().length >= 2);
        if (validos.length)
          await gravarServicos({
            data: {
              servicos: validos.map((s) => ({
                ...(s.id ? { id: s.id } : {}),
                nome: s.nome.trim(),
                duracaoMin: s.duracaoMin,
                precoCentavos: s.precoCentavos,
              })),
            },
          });
        await concluir();
      }
      await refetch();
      setPasso((p) => Math.min(3, p + 1));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui salvar agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Screen
      title={passo === 3 ? "Sua barbearia está pronta!" : "Configuração inicial"}
      subtitle={passo === 3 ? "Já dá para receber cliente pelo link." : `Passo ${passo + 1} de 4 · ${PASSOS[passo]}`}
    >
      {isLoading ? <Carregando /> : null}

      {data ? (
        <>
          <div className="mb-6 flex gap-1.5">
            {PASSOS.map((p, i) => (
              <span
                key={p}
                className={`h-1.5 flex-1 rounded-full ${i <= passo ? "bg-gold" : "bg-ink3"}`}
                aria-hidden
              />
            ))}
          </div>

          {passo === 0 ? (
            <div className="space-y-4">
              <label className="block text-xs font-medium text-mute">
                Nome da barbearia
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-4 text-sm text-paper outline-none"
                />
              </label>
              <label className="block text-xs font-medium text-mute">
                WhatsApp <span className="text-mute2">(recomendado, dá para deixar para depois)</span>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  inputMode="tel"
                  placeholder="(11) 90000-0000"
                  className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-4 text-sm text-paper outline-none"
                />
              </label>
              <p className="text-xs text-mute2">
                Logo e fotos são opcionais e ficam em <Link to="/barbeiro/marca" className="text-gold">Sua marca</Link>.
              </p>
            </div>
          ) : null}

          {passo === 1 ? <EditorDeHorarios horarios={horarios} onChange={setHorarios} /> : null}
          {passo === 2 ? <EditorDeServicos servicos={servicos} onChange={setServicos} /> : null}

          {passo === 3 ? (
            <div>
              <ul className="divide-y divide-line border-y border-line">
                {[
                  { rotulo: "Dados da barbearia", ok: Boolean(data.tenant.nome) },
                  { rotulo: "Horários de funcionamento", ok: data.horarios.length > 0 },
                  { rotulo: "Serviços cadastrados", ok: data.servicos.length > 0 },
                  { rotulo: "WhatsApp (opcional)", ok: Boolean(data.tenant.whatsapp) },
                ].map((i) => (
                  <li key={i.rotulo} className="flex items-center gap-3 py-3">
                    <Check size={16} className={i.ok ? "text-sage" : "text-mute2"} aria-hidden />
                    <span className={`text-sm ${i.ok ? "text-paper" : "text-mute"}`}>{i.rotulo}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-xs text-mute">Link da sua fila</p>
              <p className="mt-1 break-all rounded-lg border border-line bg-ink2 px-4 py-3 text-xs text-paper">
                {link}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-secondary flex-1 py-2.5 text-sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(link);
                    setCopiado(true);
                  }}
                >
                  <Copy size={14} className="mr-1.5 inline" aria-hidden />
                  {copiado ? "Copiado" : "Copiar link"}
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1 py-2.5 text-sm"
                  onClick={() => {
                    if (navigator.share) void navigator.share({ title: data.tenant.nome, url: link });
                    else void navigator.clipboard.writeText(link).then(() => setCopiado(true));
                  }}
                >
                  <Share2 size={14} className="mr-1.5 inline" aria-hidden /> Compartilhar
                </button>
              </div>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-gold"
              >
                <ExternalLink size={13} aria-hidden /> Ver fila
              </a>

              <button
                type="button"
                className="btn-primary mt-8 w-full py-3.5"
                onClick={() => void navigate({ to: "/barbeiro" })}
              >
                ✂️ Entrar no Cortaí
              </button>
            </div>
          ) : null}

          {erro ? (
            <p className="mt-4 text-sm text-brick" role="alert">
              {erro}
            </p>
          ) : null}

          {passo < 3 ? (
            <div className="mt-8 flex items-center gap-4">
              {passo > 0 ? (
                <button type="button" className="btn-tertiary text-sm" onClick={() => setPasso((p) => p - 1)}>
                  Voltar
                </button>
              ) : null}
              <button
                type="button"
                className="btn-primary flex-1 py-3.5"
                disabled={enviando || (passo === 0 && nome.trim().length < 2)}
                onClick={() => void avancar()}
              >
                {enviando ? "Salvando…" : passo === 2 ? "Concluir" : "Continuar"}
              </button>
            </div>
          ) : null}

          {passo < 3 ? (
            <button
              type="button"
              className="mt-4 w-full text-center text-xs text-mute"
              onClick={() => void navigate({ to: "/barbeiro" })}
            >
              Configurar depois
            </button>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
