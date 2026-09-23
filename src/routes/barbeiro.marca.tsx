import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Eye, ImagePlus, Monitor, RotateCcw, Save, Send, Share2, Smartphone } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";

import { Carregando } from "@/components/layout/Carregando";
import { Screen } from "@/components/layout/Screen";
import { PaginaPublicaConteudo } from "@/components/marca/PaginaPublica";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { getMarca, publicarPagina, restaurarMarca, salvarRascunhoPagina, type MarcaData, type MarcaForm } from "@/lib/marca.functions";
import { componenteIds, FONTES, LAYOUTS, TEMAS, type PaginaConfig, type TemaId } from "@/lib/pagina-config";
import { getPaginaPublica } from "@/lib/publico.functions";

export const Route = createFileRoute("/barbeiro/marca")({
  head: () => ({ meta: [
    { title: "Personalizar página — Cortaí" },
    { name: "description", content: "Personalize e publique a página pública da sua barbearia." },
    { property: "og:title", content: "Personalizar página — Cortaí" },
    { property: "og:description", content: "Visual, conteúdo, seções e links da página da barbearia." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MarcaPage,
});

const fieldClass = "mt-2 w-full rounded-lg border border-line2 bg-ink2 px-3 py-3 text-sm text-paper outline-none placeholder:text-mute2 focus:border-gold";
const componentes: Record<(typeof componenteIds)[number], string> = {
  apresentacao: "Apresentação", servicos: "Serviços", profissionais: "Profissionais", galeria: "Galeria",
  avaliacoes: "Avaliações", produtos: "Produtos", instagram: "Instagram", localizacao: "Localização",
  horarios: "Horários", whatsapp: "WhatsApp", cta_final: "Chamada final",
};

function Campo({ label, value, onChange, placeholder }: { label: string; value: string | null; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block text-xs font-medium text-mute">{label}<input className={fieldClass} value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function MarcaPage() {
  const query = useQuery({ queryKey: ["marca"], queryFn: () => getMarca(), retry: false });
  if (query.isLoading) return <Screen voltarPara="/barbeiro/mais" title="Personalizar página"><Carregando /></Screen>;
  if (!query.data) return <Screen title="Personalizar página"><p className="text-sm text-brick">Entre como dono da barbearia para personalizar a página.</p></Screen>;
  return <Editor initial={query.data.marca} versions={query.data.versoes} reload={() => query.refetch()} />;
}

function Editor({ initial, versions, reload }: { initial: MarcaData; versions: Awaited<ReturnType<typeof getMarca>>["versoes"]; reload: () => void }) {
  const queryClient = useQueryClient();
  const saveDraft = useServerFn(salvarRascunhoPagina);
  const publish = useServerFn(publicarPagina);
  const restore = useServerFn(restaurarMarca);
  const publicQuery = useQuery({ queryKey: ["pagina-publica", initial.slug], queryFn: () => getPaginaPublica({ data: { slug: initial.slug } }) });
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<MarcaForm>(initial);
  const [config, setConfig] = useState<PaginaConfig>(initial.pagina);
  const [logoPreview, setLogoPreview] = useState(initial.logo_signed_url);
  const [coverPreview, setCoverPreview] = useState(initial.capa_signed_url);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(initial.alteracoes_pendentes ? "Há alterações salvas que ainda não foram publicadas." : null);

  useEffect(() => { setForm(initial); setConfig(initial.pagina); setLogoPreview(initial.logo_signed_url); setCoverPreview(initial.capa_signed_url); }, [initial]);
  const setMarca = <K extends keyof MarcaForm>(key: K, value: MarcaForm[K]) => setForm((old) => ({ ...old, [key]: value }));
  const setPagina = <K extends keyof PaginaConfig>(key: K, value: PaginaConfig[K]) => setConfig((old) => ({ ...old, [key]: value }));

  const upload = async (event: ChangeEvent<HTMLInputElement>, kind: "logo" | "capa") => {
    const file = event.target.files?.[0];
    if (!file) return;
    const max = kind === "logo" ? 2 : 6;
    if (!file.type.startsWith("image/") || file.size > max * 1024 * 1024) { setStatus(`Use uma imagem de até ${max} MB.`); return; }
    setBusy(true);
    const extension = file.name.split(".").pop() ?? "jpg";
    const path = `${initial.id}/${kind}-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("tenant-logos").upload(path, file, { contentType: file.type });
    if (error) setStatus("Não foi possível enviar a imagem.");
    else {
      const preview = URL.createObjectURL(file);
      if (kind === "logo") { setMarca("logo_url", path); setLogoPreview(preview); }
      else { setMarca("capa_url", path); setCoverPreview(preview); }
      setStatus("Imagem pronta. Salve o rascunho para continuar depois.");
    }
    setBusy(false);
  };

  const executar = async (mode: "draft" | "publish") => {
    setBusy(true); setStatus(null);
    try {
      if (mode === "draft") { await saveDraft({ data: { marca: form, pagina: config } }); setStatus("Rascunho salvo. Sua página pública não mudou."); }
      else { await publish({ data: { marca: form, pagina: config } }); await queryClient.invalidateQueries({ queryKey: ["pagina-publica", initial.slug] }); setStatus("Página publicada com sucesso."); }
      await reload();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Não foi possível concluir."); }
    finally { setBusy(false); }
  };

  const previewData = publicQuery.data ? { ...publicQuery.data, tenant: { ...publicQuery.data.tenant, ...form, logo_signed_url: logoPreview, capa_signed_url: coverPreview } } : null;

  return <Screen voltarPara="/barbeiro/mais" title="Personalizar página" subtitle="Seu mini-site para apresentar a barbearia e transformar visitas em agendamentos.">
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild><a href={`/b/${initial.slug}`} target="_blank" rel="noreferrer"><Eye />Ver publicada</a></Button>
      <Button variant="outline" size="sm" onClick={() => navigator.share?.({ title: form.nome, url: `${window.location.origin}/b/${initial.slug}` })}><Share2 />Compartilhar</Button>
      <Button variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/b/${initial.slug}`); setStatus("Link copiado."); }}><Copy />Copiar link</Button>
    </div>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,520px)_minmax(420px,1fr)]">
      <div>
        <Tabs defaultValue="visual">
          <TabsList className="grid h-auto w-full grid-cols-4"><TabsTrigger value="visual">Visual</TabsTrigger><TabsTrigger value="conteudo">Conteúdo</TabsTrigger><TabsTrigger value="secoes">Seções</TabsTrigger><TabsTrigger value="links">Links</TabsTrigger></TabsList>
          <TabsContent value="visual" className="space-y-7 pt-4">
            <EditorSection title="Imagens">
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <button type="button" onClick={() => coverRef.current?.click()} className="relative aspect-video overflow-hidden rounded-lg border border-dashed border-line2 bg-ink2">{coverPreview ? <img src={coverPreview} alt="Capa atual" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center gap-2 text-sm text-mute"><ImagePlus size={17} />Foto de capa</span>}</button>
                <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-line2 bg-ink2">{logoPreview ? <img src={logoPreview} alt="Logo atual" className="h-full w-full object-contain p-2" /> : <ImagePlus className="text-mute" />}</button>
              </div>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(event) => upload(event, "capa")} /><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => upload(event, "logo")} />
            </EditorSection>
            <EditorSection title="Tema"><div className="grid grid-cols-2 gap-3">{Object.entries(TEMAS).map(([id, theme]) => <button type="button" key={id} onClick={() => { setPagina("tema", id as TemaId); setPagina("cores", theme.cores); }} className={`rounded-lg border p-3 text-left ${config.tema === id ? "border-gold" : "border-line"}`}><span className="mb-3 flex gap-1">{Object.values(theme.cores).slice(0, 4).map((color) => <i key={color} className="h-5 flex-1 rounded-sm" style={{ backgroundColor: color }} />)}</span><span className="flex items-center justify-between text-xs font-semibold text-paper">{theme.nome}{config.tema === id ? <Check size={14} className="text-gold" /> : null}</span><small className="mt-1 block text-[10px] text-mute">{theme.descricao}</small></button>)}</div></EditorSection>
            <EditorSection title="Composição"><div className="grid gap-4 sm:grid-cols-2"><SelectNative label="Layout" value={config.layout} options={LAYOUTS} onChange={(value) => setPagina("layout", value as PaginaConfig["layout"])} /><SelectNative label="Fonte dos títulos" value={config.fonteTitulo} options={FONTES} onChange={(value) => setPagina("fonteTitulo", value as PaginaConfig["fonteTitulo"])} /><SelectNative label="Fonte do texto" value={config.fonteTexto} options={FONTES} onChange={(value) => setPagina("fonteTexto", value as PaginaConfig["fonteTexto"])} /><SelectNative label="Espaçamento" value={config.densidade} options={{ compacta: "Compacto", equilibrada: "Equilibrado", espacosa: "Espaçoso" }} onChange={(value) => setPagina("densidade", value as PaginaConfig["densidade"])} /><SelectNative label="Cantos" value={config.bordas} options={{ quadrado: "Quadrados", suave: "Suaves", moderno: "Modernos", arredondado: "Arredondados" }} onChange={(value) => setPagina("bordas", value as PaginaConfig["bordas"])} /><SelectNative label="Botões" value={config.botoes} options={{ solido: "Sólidos", contorno: "Contorno", minimalista: "Minimalistas" }} onChange={(value) => setPagina("botoes", value as PaginaConfig["botoes"])} /></div></EditorSection>
            <EditorSection title="Cores"><div className="grid grid-cols-3 gap-3">{Object.entries(config.cores).map(([key, value]) => <label key={key} className="text-[10px] capitalize text-mute">{key}<input type="color" className="mt-2 h-11 w-full rounded-md border border-line bg-ink2 p-1" value={value} onChange={(event) => setPagina("cores", { ...config.cores, [key]: event.target.value.toUpperCase() })} /></label>)}</div></EditorSection>
          </TabsContent>

          <TabsContent value="conteudo" className="space-y-5 pt-4"><Campo label="Nome da barbearia" value={form.nome} onChange={(value) => setMarca("nome", value)} /><Campo label="Frase principal" value={config.frase} onChange={(value) => setPagina("frase", value)} /><label className="block text-xs font-medium text-mute">Sobre a barbearia<textarea className={`${fieldClass} min-h-32 resize-y`} maxLength={1200} value={config.sobre} onChange={(event) => setPagina("sobre", event.target.value)} /></label><Campo label="Texto do botão principal" value={config.cta} onChange={(value) => setPagina("cta", value)} /><Campo label="Endereço" value={form.endereco} onChange={(value) => setMarca("endereco", value || null)} /></TabsContent>

          <TabsContent value="secoes" className="pt-4"><div className="divide-y divide-line rounded-lg border border-line">{componenteIds.map((id) => <label key={id} className="flex items-center justify-between gap-4 px-4 py-3"><span className="text-sm text-paper">{componentes[id]}</span><Switch checked={config.componentes[id]} onCheckedChange={(checked) => setPagina("componentes", { ...config.componentes, [id]: checked })} /></label>)}</div><p className="mt-3 text-xs leading-relaxed text-mute">Uma seção só aparece quando estiver ativa e houver informações reais cadastradas.</p></TabsContent>

          <TabsContent value="links" className="space-y-5 pt-4"><Campo label="WhatsApp" value={form.whatsapp} onChange={(value) => setMarca("whatsapp", value || null)} /><Campo label="Telefone" value={form.telefone} onChange={(value) => setMarca("telefone", value || null)} /><Campo label="Instagram" value={form.instagram} onChange={(value) => setMarca("instagram", value || null)} placeholder="@sua_barbearia" /><Campo label="Facebook" value={form.facebook} onChange={(value) => setMarca("facebook", value || null)} /></TabsContent>
        </Tabs>

        <div className="sticky bottom-20 z-20 mt-6 grid grid-cols-2 gap-2 rounded-lg border border-line bg-ink/95 p-2 shadow-xl backdrop-blur"><Button variant="outline" disabled={busy} onClick={() => executar("draft")}><Save />{busy ? "Salvando…" : "Salvar rascunho"}</Button><Button disabled={busy} onClick={() => executar("publish")}><Send />{busy ? "Publicando…" : "Publicar"}</Button></div>
        {status ? <p role="status" className="mt-3 text-sm text-sage">{status}</p> : null}
        <EditorSection title="Versões anteriores"><ul>{versions.length ? versions.map((version) => <li key={version.id} className="flex items-center justify-between border-b border-line py-3"><span className="text-xs text-mute">Versão {version.versao} · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(version.criado_em))}</span><Button size="sm" variant="ghost" disabled={busy} onClick={async () => { setBusy(true); await restore({ data: { versaoId: version.id } }); await reload(); setStatus("Versão restaurada como rascunho."); setBusy(false); }}><RotateCcw />Restaurar</Button></li>) : <li className="text-sm text-mute">As versões aparecem após a primeira publicação.</li>}</ul></EditorSection>
      </div>

      <aside className="hidden xl:block"><div className="sticky top-5"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase text-mute">Prévia ao vivo</p><div className="flex rounded-md border border-line p-1"><Button variant={device === "mobile" ? "secondary" : "ghost"} size="icon" aria-label="Prévia no celular" title="Celular" onClick={() => setDevice("mobile")}><Smartphone /></Button><Button variant={device === "desktop" ? "secondary" : "ghost"} size="icon" aria-label="Prévia no computador" title="Computador" onClick={() => setDevice("desktop")}><Monitor /></Button></div></div><div className={`mx-auto h-[720px] overflow-y-auto rounded-lg border border-line bg-background shadow-xl transition-[width] ${device === "mobile" ? "w-[390px]" : "w-full"}`}>{previewData ? <PaginaPublicaConteudo data={previewData} config={config} preview /> : <Carregando />}</div></div></aside>
    </div>
  </Screen>;
}

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border-t border-line pt-6 first:border-0 first:pt-0"><h2 className="mb-4 text-sm font-semibold text-paper">{title}</h2>{children}</section>; }
function SelectNative({ label, value, options, onChange }: { label: string; value: string; options: Record<string, string>; onChange: (value: string) => void }) { return <label className="text-xs font-medium text-mute">{label}<select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>{Object.entries(options).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }