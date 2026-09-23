import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Check, Circle, Copy, ExternalLink, Lock, Plus, Share2 } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { EditorDeHorarios } from "@/components/onboarding/EditorDeHorarios";
import { EditorDeServicos, type ServicoEditavel } from "@/components/onboarding/EditorDeServicos";
import { PreferenciasDeAvisos } from "@/components/notificacoes/PreferenciasDeAvisos";
import { horariosPadrao, type HorarioSugerido } from "@/lib/ia/assistente";
import { FUSOS_DA_BARBEARIA } from "@/lib/horarios";
import { aviso } from "@/lib/avisos";
import { avaliarCapacidades, ROTULO_DO_ESTADO, type CapacidadeAvaliada } from "@/lib/capacidades";
import {
  adicionarProfissional,
  concluirConfiguracao,
  getImplantacao,
  salvarDadosDaBarbearia,
  salvarEtapaDaImplantacao,
  salvarHorarios,
  salvarServicos,
  type EtapaDaImplantacao,
  type Implantacao,
} from "@/lib/onboarding.functions";

export const Route = createFileRoute("/barbeiro/configurar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Implantação da barbearia — Cortaí Gestão" },
      { name: "description", content: "Dados, equipe, serviços e agenda prontos para o primeiro agendamento." },
      { property: "og:title", content: "Implantação da barbearia — Cortaí" },
      { property: "og:description", content: "Deixe sua barbearia pronta para atender em poucos minutos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfigurarPage,
});

type Etapa = { chave: EtapaDaImplantacao; rotulo: string; essencial: boolean };

function etapasDisponiveis(dados: Implantacao | undefined, capacidades: CapacidadeAvaliada[]): Etapa[] {
  const podeEquipe = !dados || dados.permissoes.length === 0 || dados.permissoes.includes("gerenciar_profissionais");
  const canaisDisponiveis = capacidades.some((c) => c.chave === "cortai_whatsapp" && c.estado !== "nao_incluida");
  const lista: Etapa[] = [
    { chave: "boas_vindas", rotulo: "Boas-vindas", essencial: false },
    { chave: "dados", rotulo: "Dados", essencial: true },
  ];
  if (podeEquipe) lista.push({ chave: "equipe", rotulo: "Equipe", essencial: true });
  lista.push({ chave: "servicos", rotulo: "Serviços", essencial: true });
  lista.push({ chave: "agenda", rotulo: "Agenda", essencial: true });
  if (canaisDisponiveis) lista.push({ chave: "canais", rotulo: "Avisos", essencial: false });
  lista.push({ chave: "recursos", rotulo: "Seu plano", essencial: false });
  lista.push({ chave: "pronto", rotulo: "Pronto", essencial: false });
  return lista;
}

function ConfigurarPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const salvarDados = useServerFn(salvarDadosDaBarbearia);
  const gravarHorarios = useServerFn(salvarHorarios);
  const gravarServicos = useServerFn(salvarServicos);
  const gravarEtapa = useServerFn(salvarEtapaDaImplantacao);
  const criarProfissional = useServerFn(adicionarProfissional);
  const concluir = useServerFn(concluirConfiguracao);

  const { data, isLoading } = useQuery({
    queryKey: ["implantacao"],
    queryFn: () => getImplantacao(),
    staleTime: 60_000,
  });

  const capacidades = useMemo(
    () => (data ? avaliarCapacidades(data.capacidades, data.permissoes) : []),
    [data],
  );
  const etapas = useMemo(() => etapasDisponiveis(data, capacidades), [data, capacidades]);

  // Estado da navegação entre etapas: começa onde a pessoa parou.
  const [etapaEscolhida, setEtapaEscolhida] = useState<EtapaDaImplantacao | null>(null);
  const etapaAtual: EtapaDaImplantacao =
    etapaEscolhida ??
    (data
      ? data.concluidoEm
        ? "pronto"
        : ((etapas.find((e) => e.chave === data.etapa)?.chave ?? "boas_vindas") as EtapaDaImplantacao)
      : "boas_vindas");
  const indice = Math.max(0, etapas.findIndex((e) => e.chave === etapaAtual));

  // Rascunhos locais: os campos nascem preenchidos com o que já existe no banco.
  const [nome, setNome] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [fuso, setFuso] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<HorarioSugerido[] | null>(null);
  const [servicos, setServicos] = useState<ServicoEditavel[] | null>(null);
  const [novoProfissional, setNovoProfissional] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const valorNome = nome ?? data?.tenant.nome ?? "";
  const valorWhatsapp = whatsapp ?? data?.tenant.whatsapp ?? "";
  const valorEndereco = endereco ?? data?.tenant.endereco ?? "";
  const valorFuso = fuso ?? data?.tenant.fuso ?? FUSOS_DA_BARBEARIA[0].valor;
  const valorHorarios = horarios ?? data?.horarios ?? horariosPadrao();
  const valorServicos: ServicoEditavel[] =
    servicos ??
    (data?.servicos ?? [])
      .filter((s) => s.ativo)
      .map((s) => ({
        id: s.id,
        nome: s.nome,
        categoria: "Serviço",
        duracaoMin: s.duracaoMin,
        precoCentavos: s.precoCentavos,
      }));

  const link = data ? `${typeof window !== "undefined" ? window.location.origin : ""}/b/${data.tenant.slug}` : "";

  const essenciais = [
    { rotulo: "Dados da barbearia", ok: Boolean(data?.tenant.nome) },
    { rotulo: "Um profissional cadastrado", ok: (data?.profissionais.length ?? 0) > 0 },
    { rotulo: "Pelo menos um serviço", ok: (data?.servicos.filter((s) => s.ativo).length ?? 0) > 0 },
    { rotulo: "Horário de funcionamento", ok: (data?.horarios.length ?? 0) > 0 },
  ];
  const feitos = essenciais.filter((i) => i.ok).length;
  const prontoParaAtender = feitos === essenciais.length;

  function recarregar() {
    void queryClient.invalidateQueries({ queryKey: ["implantacao"] });
    void queryClient.invalidateQueries({ queryKey: ["configuracao-inicial"] });
  }

  /** Avança na hora e grava em segundo plano: o toque nunca espera a rede. */
  function irPara(destino: EtapaDaImplantacao, gravar?: () => Promise<unknown>) {
    setEtapaEscolhida(destino);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    const tarefas: Promise<unknown>[] = [];
    if (gravar) {
      setSalvando(true);
      tarefas.push(gravar());
    }
    tarefas.push(gravarEtapa({ data: { etapa: destino } }));
    void Promise.all(tarefas)
      .then(() => recarregar())
      .catch((e) => aviso.erro(e instanceof Error ? e.message : "Não consegui salvar agora."))
      .finally(() => setSalvando(false));
  }

  function proxima(gravar?: () => Promise<unknown>) {
    const destino = etapas[Math.min(etapas.length - 1, indice + 1)]?.chave ?? "pronto";
    irPara(destino, gravar);
  }

  function anterior() {
    const destino = etapas[Math.max(0, indice - 1)]?.chave ?? "boas_vindas";
    setEtapaEscolhida(destino);
  }

  const salvarServicosAgora = () => {
    const validos = valorServicos.filter((s) => s.nome.trim().length >= 2);
    if (!validos.length) return Promise.resolve();
    return gravarServicos({
      data: {
        servicos: validos.map((s) => ({
          ...(s.id ? { id: s.id } : {}),
          nome: s.nome.trim(),
          duracaoMin: s.duracaoMin,
          precoCentavos: s.precoCentavos,
        })),
      },
    });
  };

  const barra = (
    <div className="mb-6">
      <div className="flex gap-1.5" aria-hidden>
        {etapas.map((e, i) => (
          <span key={e.chave} className={`h-1.5 flex-1 rounded-full ${i <= indice ? "bg-gold" : "bg-ink3"}`} />
        ))}
      </div>
      <p className="mt-2 text-xs text-mute2">
        Passo {indice + 1} de {etapas.length} · {etapas[indice]?.rotulo} · você pode completar depois
      </p>
    </div>
  );

  const rodape = (aoContinuar: () => void, rotulo = "Continuar", desabilitado = false) => (
    <>
      <div className="mt-8 flex items-center gap-4">
        {indice > 0 ? (
          <button type="button" className="btn-tertiary text-sm" onClick={anterior}>
            Voltar
          </button>
        ) : null}
        <button type="button" className="btn-primary flex-1 py-3.5" disabled={desabilitado} onClick={aoContinuar}>
          {rotulo}
        </button>
      </div>
      <button
        type="button"
        className="mt-4 w-full text-center text-xs text-mute"
        onClick={() => void navigate({ to: "/barbeiro" })}
      >
        Fazer depois
      </button>
    </>
  );

  return (
    <Screen
      title={etapaAtual === "pronto" ? "Sua barbearia está pronta" : "Implantação da barbearia"}
      subtitle={
        etapaAtual === "pronto"
          ? "Já dá para receber cliente pelo link."
          : `${feitos} de ${essenciais.length} itens essenciais concluídos`
      }
    >
      {isLoading && !data ? <EsqueletoDaImplantacao /> : null}

      {data ? (
        <>
          {etapaAtual === "boas_vindas" ? null : barra}

          {etapaAtual === "boas_vindas" ? (
            <div>
              {data.tenant.logoUrl ? (
                <img
                  src={data.tenant.logoUrl}
                  alt=""
                  className="h-16 w-16 rounded-xl border border-line object-cover"
                />
              ) : null}
              <h2 className="mt-4 text-xl font-semibold text-paper">{data.tenant.nome}</h2>
              <p className="mt-2 text-sm leading-relaxed text-mute">
                Vamos deixar o essencial pronto para você começar a receber agendamentos. Leva poucos minutos e dá
                para parar no meio: o progresso fica salvo.
              </p>

              <div className="mt-6 rounded-xl border border-line bg-ink2 px-5 py-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-paper">Essencial para começar</span>
                  <span className="text-xs text-mute">
                    {feitos} de {essenciais.length}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink3">
                  <div
                    className="h-full rounded-full bg-gold transition-[width] duration-300"
                    style={{ width: `${Math.round((feitos / essenciais.length) * 100)}%` }}
                  />
                </div>
                <ul className="mt-4 space-y-2">
                  {essenciais.map((i) => (
                    <li key={i.rotulo} className="flex items-center gap-3">
                      {i.ok ? (
                        <Check size={15} className="shrink-0 text-sage" aria-hidden />
                      ) : (
                        <Circle size={15} className="shrink-0 text-mute2" aria-hidden />
                      )}
                      <span className={`text-sm ${i.ok ? "text-mute line-through" : "text-paper"}`}>{i.rotulo}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {rodape(() => proxima(), "Começar configuração")}
            </div>
          ) : null}

          {etapaAtual === "dados" ? (
            <div className="space-y-4">
              <label className="block text-xs font-medium text-mute">
                Nome da barbearia
                <input
                  value={valorNome}
                  onChange={(e) => setNome(e.target.value)}
                  className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-4 text-sm text-paper outline-none"
                />
              </label>
              <label className="block text-xs font-medium text-mute">
                WhatsApp <span className="text-mute2">(recomendado)</span>
                <input
                  value={valorWhatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  inputMode="tel"
                  placeholder="(11) 90000-0000"
                  className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-4 text-sm text-paper outline-none"
                />
              </label>
              <label className="block text-xs font-medium text-mute">
                Endereço <span className="text-mute2">(opcional)</span>
                <input
                  value={valorEndereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, número, bairro"
                  className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-4 text-sm text-paper outline-none"
                />
              </label>
              <label className="block text-xs font-medium text-mute">
                Fuso da barbearia
                <select
                  value={valorFuso}
                  onChange={(e) => setFuso(e.target.value)}
                  className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-3 text-sm text-paper outline-none"
                >
                  {FUSOS_DA_BARBEARIA.map((f) => (
                    <option key={f.valor} value={f.valor}>
                      {f.rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-mute2">
                Logo e fotos ficam em <Link to="/barbeiro/marca" className="text-gold">Página e marca</Link>.
              </p>

              {rodape(
                () =>
                  proxima(() =>
                    salvarDados({
                      data: {
                        nome: valorNome.trim(),
                        whatsapp: valorWhatsapp,
                        endereco: valorEndereco,
                        fuso: valorFuso,
                      },
                    }),
                  ),
                "Continuar",
                valorNome.trim().length < 2,
              )}
            </div>
          ) : null}

          {etapaAtual === "equipe" ? (
            <div>
              <p className="text-xs text-mute">
                Quem atende na sua barbearia. Você, como dono, já tem acesso total — os profissionais aparecem na
                agenda e na página pública.
              </p>

              <ul className="mt-4 divide-y divide-line border-y border-line">
                {data.profissionais.length === 0 ? (
                  <li className="py-3 text-sm text-mute">Nenhum profissional cadastrado ainda.</li>
                ) : null}
                {data.profissionais.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <Check size={15} className="text-sage" aria-hidden />
                    <span className="text-sm text-paper">{p.nome}</span>
                  </li>
                ))}
              </ul>

              <LimiteDoPlano
                usado={data.profissionais.length}
                limite={data.capacidades.limites.profissionais}
                plano={data.capacidades.plano.nome}
                rotulo="profissionais"
              />

              {data.capacidades.limites.profissionais == null ||
              data.profissionais.length < data.capacidades.limites.profissionais ? (
                <form
                  className="mt-4 flex gap-2"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    const valor = novoProfissional.trim();
                    if (valor.length < 2) return;
                    setNovoProfissional("");
                    void criarProfissional({ data: { nome: valor } })
                      .then(() => {
                        aviso.ok(`${valor} entrou na equipe.`);
                        recarregar();
                      })
                      .catch((e) => aviso.erro(e instanceof Error ? e.message : "Não consegui adicionar agora."));
                  }}
                >
                  <input
                    value={novoProfissional}
                    onChange={(e) => setNovoProfissional(e.target.value)}
                    placeholder="Nome do profissional"
                    className="h-12 flex-1 rounded-lg border border-line2 bg-ink2 px-4 text-sm text-paper outline-none"
                  />
                  <button type="submit" className="btn-secondary px-4 text-sm">
                    <Plus size={14} aria-hidden />
                  </button>
                </form>
              ) : null}

              <p className="mt-4 text-xs text-mute2">
                Convites e permissões detalhadas ficam em{" "}
                <Link to="/barbeiro/equipe" className="text-gold">
                  Equipe e permissões
                </Link>
                .
              </p>

              {rodape(() => proxima())}
            </div>
          ) : null}

          {etapaAtual === "servicos" ? (
            <div>
              <p className="mb-3 text-xs text-mute">
                Um serviço já é suficiente para receber o primeiro agendamento. Dá para adicionar mais depois.
              </p>
              <EditorDeServicos servicos={valorServicos} onChange={setServicos} />
              {rodape(() => proxima(salvarServicosAgora))}
            </div>
          ) : null}

          {etapaAtual === "agenda" ? (
            <div>
              <p className="mb-3 text-xs text-mute">
                Os horários abaixo definem quando o cliente consegue marcar. Fora deles, o CortAI responde que a
                barbearia está fechada.
              </p>
              <EditorDeHorarios horarios={valorHorarios} onChange={setHorarios} />
              {rodape(() =>
                proxima(() => gravarHorarios({ data: { horarios: valorHorarios, fuso: valorFuso } })),
              )}
            </div>
          ) : null}

          {etapaAtual === "canais" ? (
            <div>
              <p className="text-xs text-mute">
                O aviso pode chegar no app e no WhatsApp ao mesmo tempo. O WhatsApp depende da conexão em{" "}
                <Link to="/barbeiro/cortai" className="text-gold">
                  CortAI no WhatsApp
                </Link>
                {data.whatsappConectado ? " — já conectado." : " — ainda não conectado."}
              </p>
              <PreferenciasDeAvisos />
              {rodape(() => proxima())}
            </div>
          ) : null}

          {etapaAtual === "recursos" ? (
            <div>
              <p className="text-xs text-mute">
                Plano <span className="text-gold">{data.capacidades.plano.nome}</span>. Estes são os recursos que a
                sua barbearia pode usar hoje.
              </p>
              <ListaDeCapacidades itens={capacidades.filter((c) => c.estado !== "nao_incluida")} />
              {capacidades.some((c) => c.estado === "nao_incluida") ? (
                <details className="mt-6 rounded-xl border border-line bg-ink2 px-5 py-4">
                  <summary className="cursor-pointer text-xs text-mute">Disponíveis em outros planos</summary>
                  <ListaDeCapacidades itens={capacidades.filter((c) => c.estado === "nao_incluida")} />
                </details>
              ) : null}
              {rodape(() => proxima(() => concluir()), "Concluir")}
            </div>
          ) : null}

          {etapaAtual === "pronto" ? (
            <div>
              <ul className="divide-y divide-line border-y border-line">
                {essenciais.map((i) => (
                  <li key={i.rotulo} className="flex items-center gap-3 py-3">
                    <Check size={16} className={i.ok ? "text-sage" : "text-mute2"} aria-hidden />
                    <span className={`text-sm ${i.ok ? "text-paper" : "text-mute"}`}>{i.rotulo}</span>
                  </li>
                ))}
              </ul>

              {!prontoParaAtender ? (
                <p className="mt-4 text-xs text-mute">
                  Falta pouco. Você pode completar os itens que sobraram quando quiser.
                </p>
              ) : null}

              <p className="mt-6 text-xs text-mute">Link da sua barbearia</p>
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
                <ExternalLink size={13} aria-hidden /> Ver a página
              </a>

              <button
                type="button"
                className="btn-primary mt-8 w-full py-3.5"
                onClick={() => void navigate({ to: "/barbeiro" })}
              >
                Ir para o painel
              </button>
            </div>
          ) : null}

          {salvando ? <p className="mt-4 text-center text-xs text-mute2">Salvando em segundo plano…</p> : null}
        </>
      ) : null}
    </Screen>
  );
}

function LimiteDoPlano({
  usado,
  limite,
  plano,
  rotulo,
}: {
  usado: number;
  limite: number | null;
  plano: string;
  rotulo: string;
}) {
  if (limite == null) return null;
  return (
    <p className="mt-3 text-xs text-mute2">
      {usado} de {limite} {rotulo} no plano {plano}.
      {usado >= limite ? " Para ter mais, fale com o Cortaí." : ""}
    </p>
  );
}

function ListaDeCapacidades({ itens }: { itens: CapacidadeAvaliada[] }) {
  return (
    <ul className="mt-4 divide-y divide-line border-y border-line">
      {itens.map((c) => (
        <li key={c.chave} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
          <span className="min-w-0">
            <span className="block truncate text-sm text-paper">{c.rotulo}</span>
            <span className="block truncate text-xs text-mute2">{c.detalhe}</span>
          </span>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${
              c.estado === "ativa"
                ? "border-gold/45 bg-gold-soft text-gold"
                : c.estado === "disponivel"
                  ? "border-line text-mute"
                  : "border-line text-mute2"
            }`}
          >
            {c.estado === "nao_incluida" ? <Lock size={10} className="mr-1 inline" aria-hidden /> : null}
            {ROTULO_DO_ESTADO[c.estado]}
          </span>
        </li>
      ))}
    </ul>
  );
}

function EsqueletoDaImplantacao() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-1.5 rounded-full bg-ink3" />
      <div className="h-12 rounded-lg bg-ink2" />
      <div className="h-12 rounded-lg bg-ink2" />
      <div className="h-32 rounded-xl bg-ink2" />
    </div>
  );
}
