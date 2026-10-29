import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { mascaraTelefone } from "@/lib/previa";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EtapasAnimadas } from "@/components/ui/EtapasAnimadas";
import { ConclusaoDoOnboarding } from "@/components/onboarding/ConclusaoDoOnboarding";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Camera,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Plus,
  Scissors,
  UserRound,
} from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { EditorDeHorarios } from "@/components/onboarding/EditorDeHorarios";
import { EditorDeServicos, type ServicoEditavel } from "@/components/onboarding/EditorDeServicos";
import { supabase } from "@/integrations/supabase/client";
import { horariosPadrao, type HorarioSugerido } from "@/lib/ia/assistente";
import { aviso } from "@/lib/avisos";
import { toast } from "sonner";
import { avancarSeSalvar } from "@/lib/erro-amigavel";
import { convidarMembro } from "@/lib/equipe.functions";
import { getSessao } from "@/lib/sessao.functions";
import { Button } from "@/components/ui/button";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import {
  adicionarProfissional,
  concluirConfiguracao,
  ETAPAS_DO_ONBOARDING,
  getImplantacao,
  marcarItemDoChecklist,
  REGRAS_RECOMENDADAS,
  salvarDadosDaBarbearia,
  salvarEtapaDaImplantacao,
  salvarHorarios,
  salvarRegrasDeAgendamento,
  salvarServicos,
  salvarModoAgendamento,
  type RegrasDeAgendamento,
} from "@/lib/onboarding.functions";
import { SEGMENTOS_CONFIG, termos } from "@/lib/segmentos";
import { ChatPreview } from "@/components/agendamento/ChatPreview";
import { BoasVindasDoOnboarding } from "@/components/onboarding/BoasVindasDoOnboarding";

export const Route = createFileRoute("/barbeiro/configurar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configurar seu negócio — Flow" },
      {
        name: "description",
        content: "Em poucos minutos, o link de agendamento do seu negócio fica pronto.",
      },
      { property: "og:title", content: "Configurar seu negócio — Flow" },
      {
        property: "og:description",
        content: "Negócio, equipe, serviços, horários, regras e link — em poucos minutos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfigurarPage,
});

type Etapa = (typeof ETAPAS_DO_ONBOARDING)[number];

const ROTULOS: Record<Etapa, string> = {
  dados: "Negócio",
  equipe: "Equipe",
  servicos: "Serviços",
  horarios: "Horários",
  regras: "Regras",
  canais: "Agendamento",
  link: "Link",
  pronto: "Pronto",
};

/** Etapas antigas salvas antes da revisão caem no passo equivalente. */
function etapaSalva(valor: string): Etapa {
  if ((ETAPAS_DO_ONBOARDING as readonly string[]).includes(valor)) return valor as Etapa;
  if (valor === "agenda") return "horarios";
  if (valor === "recursos") return "regras";
  return "dados";
}

const ANTECEDENCIAS = [
  { valor: 0, rotulo: "Sem mínimo" },
  { valor: 30, rotulo: "30 min" },
  { valor: 60, rotulo: "1 h" },
  { valor: 120, rotulo: "2 h" },
  { valor: 1440, rotulo: "1 dia" },
];
const CANCELAMENTOS = [
  { valor: 0, rotulo: "A qualquer hora" },
  { valor: 1, rotulo: "1 h antes" },
  { valor: 2, rotulo: "2 h antes" },
  { valor: 24, rotulo: "1 dia antes" },
];
const JANELAS = [
  { valor: 7, rotulo: "7 dias" },
  { valor: 15, rotulo: "15 dias" },
  { valor: 30, rotulo: "30 dias" },
  { valor: 60, rotulo: "60 dias" },
  { valor: 90, rotulo: "90 dias" },
];
const PASSOS = [
  { valor: 15, rotulo: "15 min" },
  { valor: 20, rotulo: "20 min" },
  { valor: 30, rotulo: "30 min" },
  { valor: 40, rotulo: "40 min" },
];
const INTERVALOS = [
  { valor: 0, rotulo: "Nenhum" },
  { valor: 5, rotulo: "5 min" },
  { valor: 10, rotulo: "10 min" },
  { valor: 15, rotulo: "15 min" },
];

type Funcao = "barbeiro" | "recepcao" | "gerente";
const FUNCOES: { valor: Funcao; rotulo: string; detalhe: string }[] = [
  { valor: "barbeiro", rotulo: "Profissional", detalhe: "Atende e vê só os próprios números." },
  { valor: "recepcao", rotulo: "Recepção", detalhe: "Agenda, fila e caixa do dia." },
  { valor: "gerente", rotulo: "Gerente", detalhe: "Gestão completa, menos plano e fiado." },
];

function ConfigurarPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const salvarDados = useServerFn(salvarDadosDaBarbearia);
  const gravarHorarios = useServerFn(salvarHorarios);
  const gravarServicos = useServerFn(salvarServicos);
  const gravarRegras = useServerFn(salvarRegrasDeAgendamento);
  const gravarEtapa = useServerFn(salvarEtapaDaImplantacao);
  const criarProfissional = useServerFn(adicionarProfissional);
  const convidar = useServerFn(convidarMembro);
  const marcar = useServerFn(marcarItemDoChecklist);
  const concluir = useServerFn(concluirConfiguracao);
  const gravarModo = useServerFn(salvarModoAgendamento);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["implantacao"],
    queryFn: () => getImplantacao(),
    staleTime: 60_000,
  });
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300_000,
  });

  const [etapaEscolhida, setEtapaEscolhida] = useState<Etapa | null>(null);
  const [mostrandoBoasVindas, setMostrandoBoasVindas] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const etapa: Etapa =
    etapaEscolhida ?? (data ? (data.concluidoEm ? "pronto" : etapaSalva(data.etapa)) : "dados");
  const indice = ETAPAS_DO_ONBOARDING.indexOf(etapa);
  const indicePersistido = data
    ? ETAPAS_DO_ONBOARDING.indexOf(etapaSalva(data.etapa))
    : 0;
  const mostrarBoasVindas = Boolean(data && mostrandoBoasVindas && !data.concluidoEm);

  // Rascunhos: nascem com o que já está salvo.
  const [nome, setNome] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [logo, setLogo] = useState<{ caminho: string; previa: string } | null>(null);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [horarios, setHorarios] = useState<HorarioSugerido[] | null>(null);
  const [servicos, setServicos] = useState<ServicoEditavel[] | null>(null);
  const [regras, setRegras] = useState<RegrasDeAgendamento | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaFuncao, setNovaFuncao] = useState<Funcao>("barbeiro");
  const [adicionando, setAdicionando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [modo, setModo] = useState<"tradicional" | "conversa" | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const valorNome = nome ?? data?.tenant.nome ?? "";
  const segmento = data?.tenant.segmento ?? "outro";
  const definicao = SEGMENTOS_CONFIG[segmento];
  const vocabulario = termos(segmento);
  const valorWhatsapp = whatsapp ?? data?.tenant.whatsapp ?? "";
  const valorEndereco = endereco ?? data?.tenant.endereco ?? "";
  const valorHorarios = horarios ?? data?.horarios ?? horariosPadrao();
  const valorRegras = regras ?? data?.regras ?? REGRAS_RECOMENDADAS;
  const valorModo = modo ?? data?.modoAgendamento ?? "tradicional";
  const ativos = useMemo(() => (data?.servicos ?? []).filter((s) => s.ativo), [data]);
  const valorServicos: ServicoEditavel[] =
    servicos ??
    (ativos.length
      ? ativos.map((s) => ({
          id: s.id,
          nome: s.nome,
          categoria: s.categoria,
          duracaoMin: s.duracaoMin,
          precoCentavos: s.precoCentavos,
          profissionalIds: s.profissionalIds,
          retornoDias: s.retornoDias,
          fotoUrl: s.fotoUrl,
        }))
      : definicao.servicosSugeridos.map((s) => ({ ...s })));
  const profissionais = (data?.profissionais ?? []).filter((p) => p.ativo);

  const origem = typeof window !== "undefined" ? window.location.origin : "https://cortai.dev";
  const link = data ? `${origem}/${data.tenant.slug}` : "";
  const linkCurto = link.replace(/^https?:\/\//, "");

  function recarregar() {
    void queryClient.invalidateQueries({ queryKey: ["implantacao"] });
    void queryClient.invalidateQueries({ queryKey: ["configuracao-inicial"] });
    void queryClient.invalidateQueries({ queryKey: ["sessao"] });
  }

  /** Grava primeiro e só então avança; se falhar, a pessoa continua na mesma etapa. */
  function irPara(destino: Etapa, gravar?: () => Promise<unknown>) {
    if (salvando) return;
    setSalvando(true);
    void avancarSeSalvar({
      ...(gravar ? { gravar } : {}),
      gravarEtapa: () => gravarEtapa({ data: { etapa: destino } }),
      avancar: () => {
        setEtapaEscolhida(destino);
        if (typeof window !== "undefined") window.scrollTo({ top: 0 });
        recarregar();
      },
      // No topo, para nunca cobrir o botão Continuar.
      aoErro: (m) => toast.error(m, { position: "top-center" }),
    }).finally(() => setSalvando(false));
  }
  const proxima = (gravar?: () => Promise<unknown>) =>
    irPara(
      ETAPAS_DO_ONBOARDING[Math.min(ETAPAS_DO_ONBOARDING.length - 1, indice + 1)] ?? "pronto",
      gravar,
    );
  const anterior = () =>
    setEtapaEscolhida(ETAPAS_DO_ONBOARDING[Math.max(0, indice - 1)] ?? "dados");

  function abrirPassoInicial(destino: "dados" | "equipe" | "servicos") {
    setEtapaEscolhida(destino);
    setMostrandoBoasVindas(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  /** Entre tocar em Concluir (etapa do link) e a tela final, o Figaro mostra a espera em tela cheia. */
  const configurando = salvando && etapa === "link";

  /** Garante que quem configura aparece na agenda quando ninguém foi cadastrado. */
  async function garantirDonoNaAgenda() {
    if (profissionais.length > 0) return;
    const nomeDono = (sessao?.nome ?? sessao?.email?.split("@")[0] ?? "Eu").trim();
    await criarProfissional({ data: { nome: nomeDono.length >= 2 ? nomeDono : "Profissional" } });
  }

  async function enviarLogo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo || !data) return;
    if (!arquivo.type.startsWith("image/") || arquivo.size > 2 * 1024 * 1024) {
      aviso.erro("Use uma imagem de até 2 MB.");
      return;
    }
    setEnviandoLogo(true);
    const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const caminho = `${data.tenant.id}/logo-${Date.now()}.${extensao}`;
    const { error } = await supabase.storage
      .from("tenant-logos")
      .upload(caminho, arquivo, { contentType: arquivo.type });
    setEnviandoLogo(false);
    if (error) {
      aviso.erro("Não consegui enviar a imagem. Tente outra.");
      return;
    }
    setLogo({ caminho, previa: URL.createObjectURL(arquivo) });
  }

  async function adicionarPessoa() {
    const valor = novoNome.trim();
    const email = novoEmail.trim();
    if (novaFuncao === "recepcao" && !email) {
      aviso.erro("Para a recepção, informe o e-mail da pessoa.");
      return;
    }
    if (novaFuncao !== "recepcao" && valor.length < 2) return;
    setAdicionando(true);
    try {
      if (novaFuncao !== "recepcao") await criarProfissional({ data: { nome: valor } });
      if (email) {
        await convidar({ data: { email, papel: novaFuncao, redirectTo: `${origem}/convite` } });
      }
      aviso.ok(email ? `${valor || email} foi convidado.` : `${valor} entrou na equipe.`);
      setNovoNome("");
      setNovoEmail("");
      recarregar();
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não consegui adicionar agora.");
    } finally {
      setAdicionando(false);
    }
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
          categoria: s.categoria?.trim() || "Serviço",
          ...(s.profissionalIds !== undefined ? { profissionalIds: s.profissionalIds } : {}),
          ...(s.retornoDias !== undefined ? { retornoDias: s.retornoDias } : {}),
          ...(s.fotoUrl !== undefined ? { fotoUrl: s.fotoUrl } : {}),
        })),
      },
    }).then(() => setServicos(null));
  };

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      marcarLinkCompartilhado();
    } catch {
      aviso.erro("Não consegui copiar o link. Tente novamente.");
    }
  }

  /** Folha de compartilhar do aparelho; sem ela, abre o WhatsApp com a mensagem pronta. */
  async function compartilharLink() {
    const texto = `Agende seu horário na ${data?.tenant.nome ?? "nossa página"}: ${link}`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: data?.tenant.nome ?? "Flow", text: texto, url: link });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
      }
      marcarLinkCompartilhado();
    } catch {
      // Cancelar a folha de compartilhar não é erro.
    }
  }

  function marcarLinkCompartilhado() {
    void marcar({ data: { chave: "compartilhar_link", feito: true } })
      .then(recarregar)
      .catch(() => undefined);
  }

  const rodape = (
    aoContinuar: () => void,
    rotulo = "Continuar",
    desabilitado = false,
    pular?: () => void,
  ) => (
    <div className="sticky bottom-0 z-10 -mx-5 mt-8 border-t border-line bg-ink px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
      <div className="flex items-center gap-3">
        {indice > 0 ? (
          <Button
            variant="outline"
            type="button"
            className="min-h-12 px-3 text-sm"
            onClick={anterior}
          >
            Voltar
          </Button>
        ) : null}
        <Button
          variant="primary"
          type="button"
          className="min-h-14 flex-1 text-sm"
          disabled={desabilitado || salvando}
          onClick={aoContinuar}
        >
          {salvando ? "Salvando…" : rotulo}
        </Button>
      </div>
      {pular ? (
        <Button
          variant="ghost"
          type="button"
          className="mt-2 min-h-12 w-full text-center text-xs text-mute"
          onClick={pular}
        >
          Pular por agora
        </Button>
      ) : null}
    </div>
  );

  return (
    <Screen
      title={
        mostrarBoasVindas
          ? "Bem-vindo ao Flow"
          : etapa === "pronto"
            ? "Tudo pronto"
            : `${vocabulario.possessivo.charAt(0).toUpperCase()}${vocabulario.possessivo.slice(1)} em 5 minutos`
      }
      subtitle={
        mostrarBoasVindas
          ? "Seu negócio agora tem uma nova casa."
          : etapa === "pronto"
            ? "Seu link já recebe agendamentos."
            : "O progresso fica salvo. Dá para parar e voltar depois."
      }
      hideHeader={Boolean(mostrandoBoasVindas && (!data || !data.concluidoEm))}
    >
      {isLoading && !data ? (
        <EsqueletoFormulario campos={4} onTentarDeNovo={() => void refetch()} />
      ) : null}

      {data ? (
        <>
          {mostrarBoasVindas ? (
            <BoasVindasDoOnboarding
              indicePersistido={indicePersistido}
              continuarLabel={indicePersistido > 0 ? "Continuar configuração" : "Começar configuração"}
              onAbrirPasso={abrirPassoInicial}
              onContinuar={() => setMostrandoBoasVindas(false)}
              onDepois={() => void navigate({ to: "/barbeiro" })}
            />
          ) : null}

          {!mostrarBoasVindas && etapa !== "pronto" ? (
            <div className="mb-5 flex justify-center" aria-label="Flow">
              <MarcaFlow variante="automatica" className="h-7 w-auto" />
            </div>
          ) : null}
          {!mostrarBoasVindas && etapa !== "pronto" ? (
            <div className="mb-6">
              <div className="flex gap-1.5" aria-hidden>
                {ETAPAS_DO_ONBOARDING.slice(0, -1).map((e, i) => (
                  <span
                    key={e}
                    className={`h-1.5 flex-1 rounded-full ${i <= indice ? "bg-gold" : "bg-ink3"}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-mute">
                Passo {indice + 1} de {ETAPAS_DO_ONBOARDING.length - 1} · {ROTULOS[etapa]}
              </p>
            </div>
          ) : null}

          {!mostrarBoasVindas ? (
            <EtapasAnimadas etapa={indice}>
            {etapa === "dados" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => arquivoRef.current?.click()}
                    className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))]"
                    aria-label="Enviar logo ou foto"
                  >
                    {logo?.previa || data.tenant.logoAssinada ? (
                      <img
                        src={logo?.previa ?? data.tenant.logoAssinada ?? ""}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera size={22} className="text-mute" aria-hidden />
                    )}
                  </Button>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-paper">Logo ou foto</p>
                    <p className="mt-1 text-xs text-mute">
                      {enviandoLogo ? "Enviando…" : "Aparece no seu link. Opcional."}
                    </p>
                  </div>
                  <input
                    ref={arquivoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={enviarLogo}
                  />
                </div>
                <label className="block text-xs font-medium text-mute">
                  Nome {vocabulario.de}
                  <input
                    value={valorNome}
                    onChange={(e) => setNome(e.target.value)}
                    className="field-control mt-2 w-full"
                  />
                </label>
                <label className="block text-xs font-medium text-mute">
                  WhatsApp {vocabulario.de}
                  <input
                    value={valorWhatsapp}
                    onChange={(e) => setWhatsapp(mascaraTelefone(e.target.value))}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 90000-0000"
                    className="field-control mt-2 w-full"
                  />
                </label>
                <label className="block text-xs font-medium text-mute">
                  Endereço
                  <input
                    value={valorEndereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, bairro, cidade"
                    className="field-control mt-2 w-full"
                  />
                </label>
                {rodape(
                  () =>
                    proxima(() =>
                      salvarDados({
                        data: {
                          nome: valorNome.trim(),
                          whatsapp: valorWhatsapp,
                          endereco: valorEndereco,
                          ...(logo ? { logoUrl: logo.caminho } : {}),
                        },
                      }),
                    ),
                  "Continuar",
                  valorNome.trim().length < 2 || enviandoLogo,
                )}
              </div>
            ) : null}

            {etapa === "equipe" ? (
              <div>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() =>
                    proxima(async () => {
                      await garantirDonoNaAgenda();
                      await marcar({ data: { chave: "sozinho", feito: true } });
                    })
                  }
                  disabled={salvando}
                  className="flex h-auto min-h-14 w-full items-center gap-3 whitespace-normal rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] px-4 py-3 text-left"
                >
                  <UserRound size={18} className="shrink-0 text-paper" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold text-paper">
                      Trabalho sozinho
                    </span>
                    <span className="block break-words text-xs text-mute">
                      Você aparece como o profissional. Pula este passo.
                    </span>
                  </span>
                </Button>

                <p className="mt-6 text-xs font-medium text-mute">Quem trabalha com você</p>
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {profissionais.length === 0 ? (
                    <li className="py-3 text-sm text-mute">Ninguém cadastrado ainda.</li>
                  ) : null}
                  {profissionais.map((p) => (
                    <li key={p.id} className="flex min-h-12 items-center gap-3">
                      <Scissors size={15} className="text-paper" aria-hidden />
                      <span className="text-sm text-paper">{p.nome}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 space-y-3 surface p-4">
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Função">
                    {FUNCOES.map((f) => (
                      <Button
                        variant="ghost"
                        key={f.valor}
                        type="button"
                        role="radio"
                        aria-checked={novaFuncao === f.valor}
                        onClick={() => setNovaFuncao(f.valor)}
                        className={`min-h-12 rounded-lg border text-xs font-semibold ${
                          novaFuncao === f.valor
                            ? "border-paper bg-paper text-ink"
                            : "border-line2 bg-ink text-paper"
                        }`}
                      >
                        {f.rotulo}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-mute">
                    {FUNCOES.find((f) => f.valor === novaFuncao)?.detalhe} As permissões da função
                    entram sozinhas.
                  </p>
                  {novaFuncao !== "recepcao" ? (
                    <input
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      placeholder="Nome"
                      className="field-control w-full"
                    />
                  ) : null}
                  <input
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    type="email"
                    inputMode="email"
                    placeholder={
                      novaFuncao === "recepcao"
                        ? "E-mail (para enviar o convite)"
                        : "E-mail para dar acesso (opcional)"
                    }
                    className="field-control w-full"
                  />
                  <Button
                    type="button"
                    disabled={adicionando}
                    onClick={() => void adicionarPessoa()}
                    variant="outline"
                    className="min-h-12 w-full text-sm"
                  >
                    <Plus size={14} className="mr-1.5 inline" aria-hidden />
                    {adicionando ? "Adicionando…" : "Adicionar"}
                  </Button>
                </div>

                {rodape(() => proxima(garantirDonoNaAgenda))}
              </div>
            ) : null}

            {etapa === "servicos" ? (
              <div>
                <p className="mb-3 text-xs text-mute">
                  Já deixamos sugestões. Ajuste preço e duração ou apague o que não faz.
                </p>
                <EditorDeServicos
                  servicos={valorServicos}
                  onChange={setServicos}
                  profissionais={profissionais.map((p) => ({ id: p.id, nome: p.nome }))}
                  semIA
                  segmento={segmento}
                  tenantId={data.tenant.id}
                />
                {rodape(
                  () => proxima(salvarServicosAgora),
                  "Continuar",
                  !valorServicos.some((s) => s.nome.trim().length >= 2),
                )}
              </div>
            ) : null}

            {etapa === "horarios" ? (
              <div>
                <p className="mb-3 text-xs text-mute">
                  Já vem preenchido. Mude só o que for diferente.
                </p>
                <EditorDeHorarios
                  horarios={valorHorarios}
                  onChange={setHorarios}
                  semIA
                  segmento={segmento}
                />
                {rodape(() => proxima(() => gravarHorarios({ data: { horarios: valorHorarios } })))}
              </div>
            ) : null}

            {etapa === "regras" ? (
              <div>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setRegras(REGRAS_RECOMENDADAS);
                    proxima(() => gravarRegras({ data: REGRAS_RECOMENDADAS }));
                  }}
                  disabled={salvando}
                  className="flex h-auto min-h-14 w-full items-center gap-3 whitespace-normal rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] px-4 py-3 text-left"
                >
                  <Check size={18} className="shrink-0 text-paper" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold text-paper">
                      Usar padrão recomendado
                    </span>
                    <span className="block break-words text-xs text-mute">
                      1 h de antecedência, cancelar até 2 h antes, aceita encaixe.
                    </span>
                  </span>
                </Button>

                <Escolha
                  titulo="Antecedência mínima para agendar"
                  opcoes={ANTECEDENCIAS}
                  valor={valorRegras.antecedenciaMinMinutos}
                  onChange={(v) => setRegras({ ...valorRegras, antecedenciaMinMinutos: v })}
                />
                <Escolha
                  titulo="Cliente pode cancelar até"
                  opcoes={CANCELAMENTOS}
                  valor={valorRegras.cancelamentoMinHoras}
                  onChange={(v) => setRegras({ ...valorRegras, cancelamentoMinHoras: v })}
                />
                <Escolha
                  titulo="Intervalo entre atendimentos"
                  opcoes={INTERVALOS}
                  valor={valorRegras.intervaloEntreMin}
                  onChange={(v) => setRegras({ ...valorRegras, intervaloEntreMin: v })}
                />
                <Escolha
                  titulo="Período máximo para agendar"
                  opcoes={JANELAS}
                  valor={valorRegras.janelaDias}
                  onChange={(v) => setRegras({ ...valorRegras, janelaDias: v })}
                />
                <Escolha
                  titulo="Horários oferecidos a cada"
                  opcoes={
                    PASSOS.some((opcao) => opcao.valor === valorRegras.passoMin)
                      ? PASSOS
                      : [
                          ...PASSOS,
                          {
                            valor: valorRegras.passoMin,
                            rotulo: `${valorRegras.passoMin} min (personalizado)`,
                          },
                        ]
                  }
                  valor={valorRegras.passoMin}
                  onChange={(v) => setRegras({ ...valorRegras, passoMin: v })}
                />
                <label className="mt-6 flex min-h-12 items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-semibold text-paper">Aceitar encaixes</span>
                    <span className="block text-xs text-mute">
                      Cliente sem horário pode entrar na fila.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={valorRegras.aceitaEncaixe}
                    onChange={(e) => setRegras({ ...valorRegras, aceitaEncaixe: e.target.checked })}
                    className="h-6 w-6 shrink-0 accent-[var(--gold)]"
                  />
                </label>
                {rodape(() =>
                  proxima(() => gravarRegras({ data: valorRegras }).then(() => concluir())),
                )}
              </div>
            ) : null}

            {etapa === "link" ? (
              <div>
                <p className="text-sm text-paper">
                  Este é o link {vocabulario.de}. Mande para seus clientes agendarem.
                </p>
                <p className="mt-4 break-all rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] px-4 py-4 text-base font-semibold text-paper">
                  {linkCurto}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 text-sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(link);
                        setCopiado(true);
                        marcarLinkCompartilhado();
                      } catch {
                        aviso.erro("Não consegui copiar o link. Tente novamente.");
                      }
                    }}
                  >
                    <Copy size={14} className="mr-1.5 inline" aria-hidden />
                    {copiado ? "Copiado" : "Copiar"}
                  </Button>
                  <Button variant="outline" className="min-h-12 text-sm" asChild>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Agende seu horário na ${data.tenant.nome}: ${link}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={marcarLinkCompartilhado}
                    >
                      <MessageCircle size={14} className="mr-1.5" aria-hidden /> WhatsApp
                    </a>
                  </Button>
                </div>
                <Button variant="ghost" className="mt-4 min-h-12 px-2 text-xs" asChild>
                  <a href={link} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} aria-hidden /> Ver como o cliente vê
                  </a>
                </Button>
                {rodape(() => proxima(), "Concluir")}
              </div>
            ) : null}

            {etapa === "canais" ? (
              <div>
                <h2 className="text-lg font-semibold text-paper">Como seu cliente agenda?</h2>
                <p className="mt-1 text-sm text-mute">
                  Escolha agora ou mantenha o formato atual. Você pode mudar depois.
                </p>
                <div
                  className="mt-5 grid grid-cols-2 gap-3"
                  role="group"
                  aria-label="Modo de agendamento"
                >
                  <Button
                    type="button"
                    variant={valorModo === "conversa" ? "primary" : "outline"}
                    className="h-14"
                    aria-pressed={valorModo === "conversa"}
                    onClick={() => setModo("conversa")}
                  >
                    Conversa
                  </Button>
                  <Button
                    type="button"
                    variant={valorModo === "tradicional" ? "primary" : "outline"}
                    className="h-14"
                    aria-pressed={valorModo === "tradicional"}
                    onClick={() => setModo("tradicional")}
                  >
                    Tradicional
                  </Button>
                </div>
                <div className="mt-5 pb-4">
                  <ChatPreview ativo={valorModo === "conversa"} />
                </div>
                {rodape(
                  () => proxima(() => gravarModo({ data: { modo: valorModo } })),
                  "Continuar",
                  false,
                  () => proxima(),
                )}
              </div>
            ) : null}
            </EtapasAnimadas>
          ) : null}
          {etapa === "pronto" || configurando ? (
            // Tela cheia como no Figaro: a espera ("Configurando sua página…") e o resultado são o mesmo
            // componente, então o anel ondulado vira o visto sem trocar de tela.
            <div className="fixed inset-0 z-50 overflow-y-auto bg-ink px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(48px,env(safe-area-inset-top))]">
              <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col justify-center">
                <ConclusaoDoOnboarding
                  carregando={etapa !== "pronto"}
                  titulo={`${vocabulario.possessivo.charAt(0).toUpperCase()}${vocabulario.possessivo.slice(1)} já pode receber agendamentos.`}
                  link={link}
                  linkCurto={linkCurto}
                  copiado={copiado}
                  onCopiar={copiarLink}
                  onCompartilhar={compartilharLink}
                  onIrParaAgenda={() => void navigate({ to: "/barbeiro" })}
                  onRevisar={() => setEtapaEscolhida("dados")}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function Escolha({
  titulo,
  opcoes,
  valor,
  onChange,
}: {
  titulo: string;
  opcoes: { valor: number; rotulo: string }[];
  valor: number;
  onChange: (v: number) => void;
}) {
  return (
    <fieldset className="mt-6">
      <legend className="text-sm font-semibold text-paper">{titulo}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <Button
            variant="ghost"
            key={o.valor}
            type="button"
            aria-pressed={valor === o.valor}
            onClick={() => onChange(o.valor)}
            className={`min-h-12 rounded-lg border px-4 text-xs font-semibold ${
              valor === o.valor
                ? "border-paper bg-paper text-ink"
                : "border-line2 bg-ink2 text-paper"
            }`}
          >
            {o.rotulo}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
