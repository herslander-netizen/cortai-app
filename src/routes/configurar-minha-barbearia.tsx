import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, ExternalLink } from "lucide-react";

import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { EditorDeHorarios } from "@/components/onboarding/EditorDeHorarios";
import { EditorDeServicos, type ServicoEditavel } from "@/components/onboarding/EditorDeServicos";
import { aviso } from "@/lib/avisos";
import type { HorarioSugerido } from "@/lib/ia/assistente";
import {
  criarRascunhoDeBarbearia,
  getRascunhoDeBarbearia,
  publicarRascunhoDeBarbearia,
  reivindicarBarbeariaDoRascunho,
  salvarRascunhoDeBarbearia,
  type DadosDoRascunho,
} from "@/lib/rascunho.functions";
import { supabase } from "@/integrations/supabase/client";
import { LISTA_DE_SEGMENTOS, SEGMENTOS_CONFIG, termos } from "@/lib/segmentos";
import { Button } from "@/components/ui/button";
import { aplicarIdentidade, aplicarModo } from "@/lib/aparencia";

const CHAVE_LOCAL = "cortai:rascunho";

export const Route = createFileRoute("/configurar-minha-barbearia")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configurar meu negócio — Flow" },
      {
        name: "description",
        content:
          "Monte a página do seu negócio em poucos minutos: nome, horários e serviços. Sem login para começar.",
      },
      { property: "og:title", content: "Configurar meu negócio — Flow" },
      {
        property: "og:description",
        content: "Nome, horários e serviços: seu negócio publicado em minutos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfigurarMinhaBarbearia,
});

const PASSOS = ["Dados", "Horários", "Serviços", "Publicar"] as const;

function ConfigurarMinhaBarbearia() {
  const navigate = useNavigate();
  const criar = useServerFn(criarRascunhoDeBarbearia);
  const ler = useServerFn(getRascunhoDeBarbearia);
  const salvar = useServerFn(salvarRascunhoDeBarbearia);
  const publicar = useServerFn(publicarRascunhoDeBarbearia);
  const reivindicar = useServerFn(reivindicarBarbeariaDoRascunho);

  const [token, setToken] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosDoRascunho | null>(null);
  const [passo, setPasso] = useState(0);
  const [slug, setSlug] = useState<string | null>(null);
  const [reivindicado, setReivindicado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Retoma o rascunho guardado neste aparelho; cria um novo na primeira visita.
  useEffect(() => {
    let vivo = true;
    const guardado = window.localStorage.getItem(CHAVE_LOCAL);
    (async () => {
      try {
        if (guardado) {
          const r = await ler({ data: { token: guardado } });
          if (!vivo) return;
          setToken(guardado);
          setDados(r.dados);
          setSlug(r.slug);
          setReivindicado(r.reivindicado);
          if (r.publicado) setPasso(PASSOS.length - 1);
          return;
        }
      } catch {
        window.localStorage.removeItem(CHAVE_LOCAL);
      }
      const novo = await criar({ data: undefined }).catch((e) => {
        aviso.erro(e instanceof Error ? e.message : "Não consegui começar agora.");
        return null;
      });
      if (!vivo || !novo) return;
      window.localStorage.setItem(CHAVE_LOCAL, novo.token);
      setToken(novo.token);
      setDados(novo.dados);
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dados) return;
    const aparencia = SEGMENTOS_CONFIG[dados.segmento];
    aplicarIdentidade(aparencia.identidade);
    aplicarModo(aparencia.modoPadrao);
  }, [dados?.segmento]);

  function atualizar(campos: Partial<DadosDoRascunho>) {
    setDados((atual) => (atual ? { ...atual, ...campos } : atual));
  }

  /** Cada passo salva sozinho, em segundo plano: o toque nunca espera a rede. */
  function avancar(destino: number) {
    setPasso(destino);
    window.scrollTo({ top: 0 });
    if (!token || !dados) return;
    void salvar({ data: { token, dados } }).catch((e) =>
      aviso.erro(e instanceof Error ? e.message : "Não consegui salvar agora."),
    );
  }

  async function publicarAgora() {
    if (!token || !dados) return;
    setOcupado(true);
    try {
      await salvar({ data: { token, dados } });
      const r = await publicar({ data: { token } });
      setSlug(r.slug);
      setPasso(PASSOS.length - 1);
      aviso.ok(
        `${termos(dados.segmento).possessivo.charAt(0).toUpperCase()}${termos(dados.segmento).possessivo.slice(1)} já está no ar.`,
      );
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não consegui publicar agora.");
    } finally {
      setOcupado(false);
    }
  }

  async function assumirAcesso() {
    if (!token) return;
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) {
      window.location.assign(`/login?destino=${encodeURIComponent("/configurar-minha-barbearia")}`);
      return;
    }
    setOcupado(true);
    try {
      await reivindicar({ data: { token } });
      setReivindicado(true);
      aviso.ok("Acesso liberado. Bem-vindo ao painel.");
      void navigate({ to: "/barbeiro" });
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não consegui liberar o acesso.");
    } finally {
      setOcupado(false);
    }
  }

  const link = slug ? `${window.location.origin}/b/${slug}` : "";
  const servicosEditaveis: ServicoEditavel[] = (dados?.servicos ?? []).map((s) => ({
    nome: s.nome,
    categoria: s.categoria,
    duracaoMin: s.duracaoMin,
    precoCentavos: s.precoCentavos,
    retornoDias: s.retornoDias ?? null,
  }));

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="border-b border-paper/10">
        <div className="mx-auto flex h-16 max-w-[720px] items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2 text-sm text-mute">
            <ArrowLeft size={16} /> <MarcaFlow variante="automatica" className="h-6 w-auto" />
          </Link>
          <Link to="/login" className="text-sm text-mute hover:text-paper">
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-5 pb-20 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
          Configurar meu negócio
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">Seu negócio no ar, em minutos.</h1>
        <p className="mt-2 text-sm text-mute">
          Comece sem login. No fim você publica a página e pode assumir o acesso ao painel com sua
          conta.
        </p>

        <div className="mt-6 flex gap-1.5" aria-hidden>
          {PASSOS.map((p, i) => (
            <span
              key={p}
              className={`h-1.5 flex-1 rounded-full ${i <= passo ? "bg-gold" : "bg-ink3"}`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-mute2">
          Passo {passo + 1} de {PASSOS.length} · {PASSOS[passo]}
        </p>

        {!dados ? (
          <p className="mt-10 text-sm text-mute">Preparando sua configuração…</p>
        ) : passo === 0 ? (
          <section className="mt-8 space-y-4">
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wide text-mute">
                Tipo de negócio
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {LISTA_DE_SEGMENTOS.map((item) => {
                  const Icon = item.icone;
                  return (
                    <Button
                      key={item.id}
                      variant={dados.segmento === item.id ? "default" : "outline"}
                      type="button"
                      className="h-auto min-h-14 justify-start gap-2 px-3 text-left text-xs"
                      onClick={() =>
                        atualizar({
                          segmento: item.id,
                          horarios: SEGMENTOS_CONFIG[item.id].horariosPadrao.map((horario) => ({
                            ...horario,
                          })),
                          servicos: [],
                        })
                      }
                    >
                      <Icon size={16} />
                      {item.rotulo}
                    </Button>
                  );
                })}
              </div>
            </fieldset>
            <Campo
              rotulo={`Nome ${termos(dados.segmento).de}`}
              valor={dados.nome}
              onChange={(v) => atualizar({ nome: v })}
            />
            <Campo
              rotulo="WhatsApp"
              valor={dados.whatsapp}
              onChange={(v) => atualizar({ whatsapp: v })}
              placeholder="(79) 99999-9999"
            />
            <Campo
              rotulo="Endereço"
              valor={dados.endereco}
              onChange={(v) => atualizar({ endereco: v })}
            />
            <Campo
              rotulo="Primeiro profissional"
              valor={dados.profissional}
              onChange={(v) => atualizar({ profissional: v })}
              placeholder="Quem vai atender"
            />
            <Rodape
              podeAvancar={dados.nome.trim().length >= 2}
              onAvancar={() => avancar(1)}
              dica="Só o nome é obrigatório — o resto dá para completar depois."
            />
          </section>
        ) : passo === 1 ? (
          <section className="mt-8">
            <EditorDeHorarios
              horarios={
                dados.horarios.length
                  ? dados.horarios
                  : SEGMENTOS_CONFIG[dados.segmento].horariosPadrao
              }
              onChange={(h: HorarioSugerido[]) => atualizar({ horarios: h })}
              segmento={dados.segmento}
            />
            <Rodape podeAvancar onAvancar={() => avancar(2)} onVoltar={() => setPasso(0)} />
          </section>
        ) : passo === 2 ? (
          <section className="mt-8">
            <EditorDeServicos
              servicos={servicosEditaveis}
              onChange={(s) =>
                atualizar({
                  servicos: s.map((item) => ({
                    nome: item.nome,
                    categoria: item.categoria,
                    duracaoMin: item.duracaoMin,
                    precoCentavos: item.precoCentavos,
                    retornoDias: item.retornoDias ?? null,
                  })),
                })
              }
              segmento={dados.segmento}
            />
            <Rodape
              podeAvancar={dados.servicos.some((s) => s.nome.trim().length >= 2)}
              onAvancar={() => avancar(3)}
              onVoltar={() => setPasso(1)}
              dica="Cadastre pelo menos um serviço para receber agendamentos."
            />
          </section>
        ) : (
          <section className="mt-8 space-y-4">
            {slug ? (
              <div className="card p-5">
                <p className="text-sm font-semibold text-paper">Seu negócio está publicado.</p>
                <p className="mt-1 break-all text-xs text-mute">{link}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(link);
                      setCopiado(true);
                      window.setTimeout(() => setCopiado(false), 2000);
                    }}
                  >
                    {copiado ? <Check /> : <Copy />} Copiar link
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={link} target="_blank" rel="noreferrer">
                      <ExternalLink /> Abrir página
                    </a>
                  </Button>
                </div>
                {reivindicado ? (
                  <p className="mt-4 text-xs text-mute">
                    O acesso ao painel já foi liberado para uma conta.
                  </p>
                ) : (
                  <>
                    <p className="mt-5 text-xs text-mute">
                      Para gerenciar agenda, clientes e financeiro, assuma o acesso com sua conta.
                      Ninguém mais consegue administrar este negócio sem este aparelho.
                    </p>
                    <Button
                      type="button"
                      className="mt-3 w-full"
                      disabled={ocupado}
                      onClick={() => void assumirAcesso()}
                    >
                      Assumir acesso ao painel
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="card p-5">
                <p className="text-sm text-paper">
                  Tudo pronto para publicar a página do seu negócio.
                </p>
                <ul className="mt-3 space-y-1 text-xs text-mute">
                  <li>Nome: {dados.nome || "—"}</li>
                  <li>Serviços: {dados.servicos.length}</li>
                  <li>
                    Horários: {dados.horarios.filter((h) => !h.fechado).length} dia(s) aberto(s)
                  </li>
                </ul>
                <Button
                  type="button"
                  className="mt-5 w-full"
                  disabled={ocupado}
                  onClick={() => void publicarAgora()}
                >
                  {ocupado ? "Publicando…" : "Publicar meu negócio"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-3 w-full"
                  onClick={() => setPasso(2)}
                >
                  Voltar
                </Button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Campo({
  rotulo,
  valor,
  onChange,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-mute">{rotulo}</span>
      <input
        className="input mt-1.5 w-full"
        value={valor}
        placeholder={placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Rodape({
  podeAvancar,
  onAvancar,
  onVoltar,
  dica,
}: {
  podeAvancar: boolean;
  onAvancar: () => void;
  onVoltar?: () => void;
  dica?: string;
}) {
  return (
    <>
      <div className="mt-8 flex items-center gap-4">
        {onVoltar ? (
          <Button type="button" variant="ghost" onClick={onVoltar}>
            Voltar
          </Button>
        ) : null}
        <Button type="button" className="flex-1" disabled={!podeAvancar} onClick={onAvancar}>
          Continuar
        </Button>
      </div>
      {dica ? <p className="mt-3 text-xs text-mute2">{dica}</p> : null}
    </>
  );
}
