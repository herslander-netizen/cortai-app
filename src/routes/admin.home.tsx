import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  History,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { SecaoDaHome, SecaoHero } from "@/components/home/SecoesHome";
import { AdminScreen } from "@/components/layout/AdminScreen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  ESPACAMENTO_PX,
  HOME_PADRAO,
  PRESETS,
  ROTULO_PRESET,
  SECOES_FIXAS,
  TIPOS_DE_SECAO,
  esquemaHome,
  resumirMudancas,
  type ConfigHome,
  type SecaoHome,
  type TipoSecao,
} from "@/lib/home-publica";
import {
  assinarImagensHome,
  descartarRascunhoHome,
  getHomeAdmin,
  listarImagensHome,
  publicarHome,
  restaurarVersaoHome,
  salvarRascunhoHome,
} from "@/lib/home.functions";

export const Route = createFileRoute("/admin/home")({
  head: () => ({
    meta: [
      { title: "Home pública — Administração Cortaí" },
      { name: "description", content: "Edite o conteúdo, as seções e a aparência da página inicial pública do Cortaí." },
      { property: "og:title", content: "Home pública — Administração Cortaí" },
      { property: "og:description", content: "Editor da página inicial pública do Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditorDaHome,
});

const ABAS = [
  { id: "visao", rotulo: "Visão geral" },
  { id: "hero", rotulo: "Topo" },
  { id: "secoes", rotulo: "Seções" },
  { id: "midia", rotulo: "Imagens" },
  { id: "aparencia", rotulo: "Aparência" },
  { id: "seo", rotulo: "SEO" },
  { id: "publicar", rotulo: "Publicação" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

const BUCKET = "home-publica";
const DATA = (valor?: string | null) =>
  valor ? new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function EditorDaHome() {
  const cliente = useQueryClient();
  const carregar = useServerFn(getHomeAdmin);
  const salvarFn = useServerFn(salvarRascunhoHome);
  const publicarFn = useServerFn(publicarHome);
  const descartarFn = useServerFn(descartarRascunhoHome);
  const restaurarFn = useServerFn(restaurarVersaoHome);
  const assinarFn = useServerFn(assinarImagensHome);
  const listarFn = useServerFn(listarImagensHome);

  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "home"], queryFn: () => carregar({}) });

  const [aba, setAba] = useState<Aba>("visao");
  const [rascunho, setRascunho] = useState<ConfigHome | null>(null);
  const [secaoAberta, setSecaoAberta] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data?.rascunho && !rascunho) setRascunho(data.rascunho);
  }, [data, rascunho]);

  const config = rascunho ?? data?.rascunho ?? HOME_PADRAO;

  // Endereços temporários para exibir na prévia as imagens enviadas pelo admin.
  const caminhos = useMemo(
    () =>
      [config.hero.imagem, ...config.secoes.map((s) => s.imagem ?? "")].filter(
        (c): c is string => Boolean(c) && !c.startsWith("http") && !c.startsWith("/"),
      ),
    [config],
  );
  useEffect(() => {
    const faltando = caminhos.filter((c) => !urls[c]);
    if (!faltando.length) return;
    assinarFn({ data: { caminhos: faltando } }).then((novo) => setUrls((atual) => ({ ...atual, ...novo })));
  }, [caminhos, urls, assinarFn]);

  const configVisual: ConfigHome = useMemo(
    () => ({
      ...config,
      hero: { ...config.hero, imagem: urls[config.hero.imagem] ?? config.hero.imagem },
      secoes: config.secoes.map((s) => ({ ...s, imagem: (s.imagem && urls[s.imagem]) || s.imagem })),
    }),
    [config, urls],
  );

  const atualizar = (parcial: Partial<ConfigHome>) => setRascunho({ ...config, ...parcial });
  const atualizarSecao = (id: string, parcial: Partial<SecaoHome>) =>
    atualizar({ secoes: config.secoes.map((s) => (s.id === id ? { ...s, ...parcial } : s)) });

  const invalidar = () => cliente.invalidateQueries({ queryKey: ["admin", "home"] });

  const salvar = useMutation({
    mutationFn: async () => salvarFn({ data: esquemaHome.parse(config) }),
    onSuccess: () => { toast.success("Rascunho salvo."); invalidar(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const publicar = useMutation({
    mutationFn: async () => publicarFn({ data: esquemaHome.parse(config) }),
    onSuccess: () => { toast.success("Home publicada."); invalidar(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const descartar = useMutation({
    mutationFn: () => descartarFn({}),
    onSuccess: async () => { toast.success("Rascunho descartado."); setRascunho(null); await invalidar(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const restaurar = useMutation({
    mutationFn: (id: string) => restaurarFn({ data: { id } }),
    onSuccess: async () => { toast.success("Versão restaurada no rascunho."); setRascunho(null); await invalidar(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <AdminScreen title="Home pública">
        <div className="flex items-center gap-2 text-sm text-mute"><Loader2 className="animate-spin" size={16} /> Carregando o editor…</div>
      </AdminScreen>
    );
  }
  if (error) {
    return (
      <AdminScreen title="Home pública">
        <p className="text-sm text-mute">Não foi possível abrir o editor: {(error as Error).message}</p>
      </AdminScreen>
    );
  }

  const mudancas = data ? resumirMudancas(data.publicado, config) : [];

  return (
    <AdminScreen title="Home pública" subtitle="Edite a página inicial que qualquer pessoa vê antes de entrar.">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAba(item.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${aba === item.id ? "bg-gold text-ink" : "text-mute hover:text-paper"}`}
          >
            {item.rotulo}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
            {salvar.isPending ? <Loader2 className="animate-spin" size={14} /> : null} Salvar rascunho
          </Button>
          <Button size="sm" onClick={() => publicar.mutate()} disabled={publicar.isPending}>
            {publicar.isPending ? <Loader2 className="animate-spin" size={14} /> : null} Publicar
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        <div className="min-w-0 space-y-6">
          {aba === "visao" ? (
            <section className="space-y-4">
              <SectionHeading title="Situação da página" description="Acompanhe o que está no ar e o que ainda é rascunho." />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="surface p-4">
                  <p className="text-xs text-mute">Estado</p>
                  <p className="mt-1 text-sm font-semibold text-paper">{data?.temRascunho ? "Rascunho não publicado" : "Publicada"}</p>
                </div>
                <div className="surface p-4">
                  <p className="text-xs text-mute">Última publicação</p>
                  <p className="mt-1 text-sm font-semibold text-paper">{DATA(data?.publicadoEm)}</p>
                </div>
                <div className="surface p-4">
                  <p className="text-xs text-mute">Última edição</p>
                  <p className="mt-1 text-sm font-semibold text-paper">{DATA(data?.atualizadoEm)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild><a href="/" target="_blank" rel="noreferrer"><Eye size={14} /> Ver a página no ar</a></Button>
                <Button size="sm" variant="outline" onClick={() => setAba("hero")}>Editar topo</Button>
                <Button size="sm" variant="outline" onClick={() => setAba("secoes")}>Editar seções</Button>
                <Button size="sm" variant="ghost" onClick={() => descartar.mutate()} disabled={!data?.temRascunho || descartar.isPending}>
                  <RotateCcw size={14} /> Descartar rascunho
                </Button>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-mute2">Versões anteriores</p>
                {data?.versoes.length ? (
                  <ul className="divide-y divide-line border-y border-line">
                    {data.versoes.map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-sm text-paper">{DATA(v.criado_em)}</span>
                        <Button size="sm" variant="ghost" onClick={() => restaurar.mutate(v.id)} disabled={restaurar.isPending}>
                          <History size={14} /> Restaurar
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-mute">Nenhuma versão anterior ainda.</p>
                )}
              </div>
            </section>
          ) : null}

          {aba === "hero" ? (
            <section className="space-y-4">
              <SectionHeading title="Topo da página" description="A primeira coisa que a pessoa vê ao abrir o Cortaí." />
              <label className="flex items-center justify-between surface p-4">
                <span className="text-sm text-paper">Mostrar o topo</span>
                <Switch checked={config.hero.ativo} onCheckedChange={(v) => atualizar({ hero: { ...config.hero, ativo: v } })} />
              </label>
              <Field label="Selo (texto pequeno acima do título)">
                <Input value={config.hero.etiqueta} onChange={(e) => atualizar({ hero: { ...config.hero, etiqueta: e.target.value } })} />
              </Field>
              <label className="flex items-center justify-between surface p-4">
                <span className="text-sm text-paper">Exibir o selo dourado</span>
                <Switch checked={config.hero.mostrarSelo} onCheckedChange={(v) => atualizar({ hero: { ...config.hero, mostrarSelo: v } })} />
              </label>
              <Field label="Título">
                <Textarea rows={2} value={config.hero.titulo} onChange={(e) => atualizar({ hero: { ...config.hero, titulo: e.target.value } })} />
              </Field>
              <Field label="Descrição">
                <Textarea rows={3} value={config.hero.texto} onChange={(e) => atualizar({ hero: { ...config.hero, texto: e.target.value } })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Botão principal"><Input value={config.hero.ctaTexto} onChange={(e) => atualizar({ hero: { ...config.hero, ctaTexto: e.target.value } })} /></Field>
                <Field label="Destino" hint="Use /pagina ou #secao"><Input value={config.hero.ctaDestino} onChange={(e) => atualizar({ hero: { ...config.hero, ctaDestino: e.target.value } })} /></Field>
                <Field label="Botão secundário"><Input value={config.hero.cta2Texto} onChange={(e) => atualizar({ hero: { ...config.hero, cta2Texto: e.target.value } })} /></Field>
                <Field label="Destino"><Input value={config.hero.cta2Destino} onChange={(e) => atualizar({ hero: { ...config.hero, cta2Destino: e.target.value } })} /></Field>
              </div>
              <EscolherImagem
                valor={config.hero.imagem}
                url={urls[config.hero.imagem]}
                onChange={(caminho) => atualizar({ hero: { ...config.hero, imagem: caminho } })}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Posição da imagem">
                  <Select value={config.hero.imagemPosicao} onChange={(e) => atualizar({ hero: { ...config.hero, imagemPosicao: e.target.value as ConfigHome["hero"]["imagemPosicao"] } })}>
                    <option value="rosto">Focar na pessoa</option>
                    <option value="centro">Centro</option>
                    <option value="esquerda">Esquerda</option>
                    <option value="direita">Direita</option>
                  </Select>
                </Field>
                <Field label={`Escurecer o fundo (${config.hero.overlay}%)`}>
                  <input type="range" min={0} max={95} value={config.hero.overlay} className="w-full accent-gold"
                    onChange={(e) => atualizar({ hero: { ...config.hero, overlay: Number(e.target.value) } })} />
                </Field>
                <Field label="Alinhamento">
                  <Select value={config.hero.alinhamento} onChange={(e) => atualizar({ hero: { ...config.hero, alinhamento: e.target.value as "esquerda" | "centro" } })}>
                    <option value="esquerda">À esquerda</option>
                    <option value="centro">Centralizado</option>
                  </Select>
                </Field>
              </div>
            </section>
          ) : null}

          {aba === "secoes" ? (
            <section className="space-y-4">
              <SectionHeading title="Seções da página" description="Ligue, desligue, reordene e edite cada bloco." />
              <ul className="space-y-2">
                {config.secoes.map((secao, index) => (
                  <li key={secao.id} className="surface">
                    <div className="flex flex-wrap items-center gap-3 p-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-paper">{secao.nome}</span>
                        <span className="text-xs text-mute">{TIPOS_DE_SECAO.find((t) => t.valor === secao.tipo)?.rotulo}</span>
                      </span>
                      {!secao.ativo ? <Badge variant="outline">Desligada</Badge> : null}
                      <Switch checked={secao.ativo} onCheckedChange={(v) => atualizarSecao(secao.id, { ativo: v })} />
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" aria-label="Subir" disabled={index === 0}
                          onClick={() => { const s = [...config.secoes]; [s[index - 1]!, s[index]!] = [s[index]!, s[index - 1]!]; atualizar({ secoes: s }); }}>
                          <ArrowUp size={15} />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Descer" disabled={index === config.secoes.length - 1}
                          onClick={() => { const s = [...config.secoes]; [s[index + 1]!, s[index]!] = [s[index]!, s[index + 1]!]; atualizar({ secoes: s }); }}>
                          <ArrowDown size={15} />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Duplicar"
                          onClick={() => {
                            const copia = { ...secao, id: `${secao.tipo}-${Date.now()}`, nome: `${secao.nome} (cópia)` };
                            const s = [...config.secoes]; s.splice(index + 1, 0, copia); atualizar({ secoes: s });
                          }}>
                          <Copy size={15} />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Excluir" disabled={SECOES_FIXAS.includes(secao.tipo)}
                          onClick={() => {
                            if (!window.confirm(`Excluir a seção "${secao.nome}"? Isso não pode ser desfeito depois de publicar.`)) return;
                            atualizar({ secoes: config.secoes.filter((s) => s.id !== secao.id) });
                          }}>
                          <Trash2 size={15} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSecaoAberta(secaoAberta === secao.id ? null : secao.id)}>
                          {secaoAberta === secao.id ? "Fechar" : "Editar"}
                        </Button>
                      </div>
                    </div>
                    {secaoAberta === secao.id ? (
                      <EditorSecao
                        secao={secao}
                        url={secao.imagem ? urls[secao.imagem] : undefined}
                        onChange={(parcial) => atualizarSecao(secao.id, parcial)}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  className="max-w-60"
                  value=""
                  onChange={(e) => {
                    const tipo = e.target.value as TipoSecao;
                    if (!tipo) return;
                    const modelo = HOME_PADRAO.secoes.find((s) => s.tipo === tipo);
                    const nova: SecaoHome = {
                      ...(modelo ?? { id: "", tipo, nome: "", ativo: true }),
                      id: `${tipo}-${Date.now()}`,
                      nome: TIPOS_DE_SECAO.find((t) => t.valor === tipo)?.rotulo ?? "Nova seção",
                      ativo: true,
                    };
                    atualizar({ secoes: [...config.secoes, nova] });
                    setSecaoAberta(nova.id);
                  }}
                >
                  <option value="">Adicionar seção…</option>
                  {TIPOS_DE_SECAO.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
                </Select>
                <Plus size={16} className="text-mute" />
              </div>
            </section>
          ) : null}

          {aba === "midia" ? <Biblioteca listar={listarFn} /> : null}

          {aba === "aparencia" ? (
            <section className="space-y-4">
              <SectionHeading title="Aparência" description="Ajustes visuais aplicados à página inteira." />
              <div className="grid gap-2 sm:grid-cols-4">
                {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((chave) => (
                  <button key={chave} type="button"
                    onClick={() => atualizar({ aparencia: { ...config.aparencia, preset: chave, ...PRESETS[chave] } })}
                    className={`rounded-lg border p-3 text-left text-sm font-semibold transition-colors ${config.aparencia.preset === chave ? "border-gold text-gold" : "border-line text-paper hover:border-line2"}`}>
                    {ROTULO_PRESET[chave]}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cor de destaque">
                  <input type="color" value={config.aparencia.corDestaque} className="h-11 w-full rounded-md border border-line bg-ink2"
                    onChange={(e) => atualizar({ aparencia: { ...config.aparencia, corDestaque: e.target.value } })} />
                </Field>
                <Field label="Tipografia">
                  <Select value={config.aparencia.tipografia} onChange={(e) => atualizar({ aparencia: { ...config.aparencia, tipografia: e.target.value as ConfigHome["aparencia"]["tipografia"] } })}>
                    <option>Manrope</option><option>Montserrat</option><option>Work Sans</option><option>Sora</option>
                  </Select>
                </Field>
                <Field label="Estilo dos botões">
                  <Select value={config.aparencia.estiloBotao} onChange={(e) => atualizar({ aparencia: { ...config.aparencia, estiloBotao: e.target.value as "solido" | "contorno" } })}>
                    <option value="solido">Sólido</option><option value="contorno">Contorno</option>
                  </Select>
                </Field>
                <Field label="Bordas e sombras">
                  <Select value={config.aparencia.bordas} onChange={(e) => atualizar({ aparencia: { ...config.aparencia, bordas: e.target.value as ConfigHome["aparencia"]["bordas"] } })}>
                    <option value="sutil">Sutis</option><option value="media">Médias</option><option value="forte">Fortes</option>
                  </Select>
                </Field>
                <Field label={`Arredondamento (${config.aparencia.raioPx}px)`}>
                  <input type="range" min={0} max={24} value={config.aparencia.raioPx} className="w-full accent-gold"
                    onChange={(e) => atualizar({ aparencia: { ...config.aparencia, raioPx: Number(e.target.value) } })} />
                </Field>
                <Field label={`Largura do conteúdo (${config.aparencia.larguraPx}px)`}>
                  <input type="range" min={1040} max={1600} step={20} value={config.aparencia.larguraPx} className="w-full accent-gold"
                    onChange={(e) => atualizar({ aparencia: { ...config.aparencia, larguraPx: Number(e.target.value) } })} />
                </Field>
                <Field label="Espaço entre seções">
                  <Select value={config.aparencia.espacamento} onChange={(e) => atualizar({ aparencia: { ...config.aparencia, espacamento: e.target.value as ConfigHome["aparencia"]["espacamento"] } })}>
                    <option value="compacto">Compacto</option><option value="padrao">Padrão</option><option value="amplo">Amplo</option>
                  </Select>
                </Field>
              </div>
            </section>
          ) : null}

          {aba === "seo" ? (
            <section className="space-y-4">
              <SectionHeading title="SEO e compartilhamento" description="Como o Cortaí aparece no Google e ao compartilhar o link." />
              <Field label="Título" hint="Até 60 caracteres funciona melhor">
                <Input value={config.seo.titulo} onChange={(e) => atualizar({ seo: { ...config.seo, titulo: e.target.value } })} />
              </Field>
              <Field label="Descrição">
                <Textarea rows={3} value={config.seo.descricao} onChange={(e) => atualizar({ seo: { ...config.seo, descricao: e.target.value } })} />
              </Field>
              <Field label="Endereço da imagem de compartilhamento" hint="Cole um endereço que comece com https://">
                <Input value={config.seo.imagem} onChange={(e) => atualizar({ seo: { ...config.seo, imagem: e.target.value } })} />
              </Field>
              <Field label="Endereço canônico" hint="Deixe vazio para usar o endereço padrão">
                <Input value={config.seo.canonica} onChange={(e) => atualizar({ seo: { ...config.seo, canonica: e.target.value } })} />
              </Field>
            </section>
          ) : null}

          {aba === "publicar" ? (
            <section className="space-y-4">
              <SectionHeading title="Publicação" description="Revise o que mudou antes de colocar no ar." />
              {mudancas.length ? (
                <ul className="space-y-1 surface p-4 text-sm text-paper">
                  {mudancas.map((m) => <li key={m}>• {m}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-mute">Nada mudou em relação ao que já está publicado.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => publicar.mutate()} disabled={publicar.isPending || !mudancas.length}>Publicar agora</Button>
                <Button variant="outline" onClick={() => salvar.mutate()} disabled={salvar.isPending}>Salvar rascunho</Button>
                <Button variant="ghost" onClick={() => descartar.mutate()} disabled={!data?.temRascunho}>Descartar rascunho</Button>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase text-mute2">Prévia do rascunho</p>
          <div className="overflow-hidden rounded-lg border border-line">
            <div className="h-[70vh] overflow-y-auto">
              <div className="origin-top scale-[0.42] [width:238%]">
                <Previa config={configVisual} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AdminScreen>
  );
}

function Previa({ config }: { config: ConfigHome }) {
  const estilo = {
    "--home-largura": `${config.aparencia.larguraPx}px`,
    "--home-espaco": `${ESPACAMENTO_PX[config.aparencia.espacamento]}px`,
    "--gold": config.aparencia.corDestaque,
    "--radius": `${config.aparencia.raioPx}px`,
    fontFamily: `"${config.aparencia.tipografia}", system-ui, sans-serif`,
  } as React.CSSProperties;
  return (
    <div className="landing-page pointer-events-none bg-ink text-paper" style={estilo}>
      <SecaoHero hero={config.hero} />
      {config.secoes.map((secao) => <SecaoDaHome key={secao.id} secao={secao} aparencia={config.aparencia} />)}
    </div>
  );
}

function EditorSecao({ secao, url, onChange }: { secao: SecaoHome; url?: string | undefined; onChange: (p: Partial<SecaoHome>) => void }) {
  const usaImagem = ["voltai", "texto_imagem", "loja", "rotina", "cta"].includes(secao.tipo);
  const usaItens = ["beneficios", "recursos", "voltai", "rotina", "produto"].includes(secao.tipo);
  const usaTexto = !["parceiros", "rodape"].includes(secao.tipo);
  const itens = secao.itens ?? [];

  return (
    <div className="space-y-4 border-t border-line p-4">
      <Field label="Nome da seção (só no painel)">
        <Input value={secao.nome} onChange={(e) => onChange({ nome: e.target.value })} />
      </Field>
      {usaTexto ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Texto pequeno"><Input value={secao.etiqueta ?? ""} onChange={(e) => onChange({ etiqueta: e.target.value })} /></Field>
            <Field label="Tema">
              <Select value={secao.tema ?? "escuro"} onChange={(e) => onChange({ tema: e.target.value as "escuro" | "claro" })}>
                <option value="escuro">Escuro</option><option value="claro">Claro</option>
              </Select>
            </Field>
          </div>
          <Field label="Título"><Input value={secao.titulo ?? ""} onChange={(e) => onChange({ titulo: e.target.value })} /></Field>
          <Field label="Descrição"><Textarea rows={3} value={secao.texto ?? ""} onChange={(e) => onChange({ texto: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Botão"><Input value={secao.ctaTexto ?? ""} onChange={(e) => onChange({ ctaTexto: e.target.value })} /></Field>
            <Field label="Destino"><Input value={secao.ctaDestino ?? ""} onChange={(e) => onChange({ ctaDestino: e.target.value })} /></Field>
          </div>
        </>
      ) : (
        <p className="text-sm text-mute">Esta seção usa o conteúdo já cadastrado no painel.</p>
      )}
      {usaImagem ? <EscolherImagem valor={secao.imagem ?? ""} url={url} onChange={(caminho) => onChange({ imagem: caminho })} /> : null}
      {usaItens ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-mute2">Itens</p>
          {itens.map((item, index) => (
            <div key={index} className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input placeholder="Título" value={item.titulo}
                onChange={(e) => onChange({ itens: itens.map((i, x) => (x === index ? { ...i, titulo: e.target.value } : i)) })} />
              <Input placeholder="Texto" value={item.texto}
                onChange={(e) => onChange({ itens: itens.map((i, x) => (x === index ? { ...i, texto: e.target.value } : i)) })} />
              <Button size="icon" variant="ghost" aria-label="Remover item"
                onClick={() => onChange({ itens: itens.filter((_, x) => x !== index) })}><Trash2 size={15} /></Button>
            </div>
          ))}
          {itens.length < 12 ? (
            <Button size="sm" variant="outline" onClick={() => onChange({ itens: [...itens, { titulo: "Novo item", texto: "" }] })}>
              <Plus size={14} /> Adicionar item
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Envio e escolha de imagem, com opção de voltar à imagem original. */
function EscolherImagem({ valor, url, onChange }: { valor: string; url?: string | undefined; onChange: (caminho: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (arquivo: File) => {
    setEnviando(true);
    const nome = `${Date.now()}-${arquivo.name.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase()}`;
    const { error } = await supabase.storage.from(BUCKET).upload(nome, arquivo, { upsert: false });
    setEnviando(false);
    if (error) { toast.error("Não foi possível enviar a imagem."); return; }
    onChange(nome);
    toast.success("Imagem enviada.");
  };

  return (
    <div className="surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-md border border-line bg-ink3">
          {url || valor.startsWith("http") ? (
            <img src={url ?? valor} alt="Imagem escolhida" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={18} className="text-mute2" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => input.current?.click()} disabled={enviando}>
            {enviando ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} Enviar imagem
          </Button>
          {valor ? <Button size="sm" variant="ghost" onClick={() => onChange("")}>Usar a imagem original</Button> : null}
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviar(f); e.target.value = ""; }} />
    </div>
  );
}

function Biblioteca({ listar }: { listar: (o: Record<string, never>) => Promise<{ caminho: string; url: string }[]> }) {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["admin", "home", "imagens"], queryFn: () => listar({}) });
  return (
    <section className="space-y-4">
      <SectionHeading title="Imagens" description="Tudo que já foi enviado para a página inicial." action={<Button size="sm" variant="outline" onClick={() => refetch()}>Atualizar</Button>} />
      {isLoading ? <p className="text-sm text-mute">Carregando…</p> : null}
      {data?.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.map((img) => (
            <figure key={img.caminho} className="overflow-hidden surface">
              <img src={img.url} alt={img.caminho} className="h-28 w-full object-cover" />
              <figcaption className="truncate p-2 text-xs text-mute">{img.caminho}</figcaption>
            </figure>
          ))}
        </div>
      ) : !isLoading ? (
        <p className="text-sm text-mute">Nenhuma imagem enviada ainda. Envie pelo campo de imagem do topo ou das seções.</p>
      ) : null}
    </section>
  );
}
