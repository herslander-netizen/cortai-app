import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ImagePlus, LockKeyhole, RotateCcw } from "lucide-react";
import { type ChangeEvent, type CSSProperties, useEffect, useRef, useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  getMarca,
  restaurarMarca,
  salvarMarca,
  type MarcaData,
  type MarcaForm,
} from "@/lib/marca.functions";

export const Route = createFileRoute("/barbeiro/marca")({
  head: () => ({
    meta: [
      { title: "Marca — Painel do barbeiro | Cortaí" },
      { name: "description", content: "Configure a identidade da sua barbearia no app dos clientes." },
      { property: "og:title", content: "Marca — Painel do barbeiro | Cortaí" },
      { property: "og:description", content: "Logo, cores, contatos e textos da sua barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MarcaPage,
});

const temas = [
  { id: "classica", nome: "Clássica", cores: ["#D4AF6A", "#1C1B19", "#8FA882"] },
  { id: "dourada", nome: "Dourada", cores: ["#E1B955", "#29251C", "#B78D35"] },
  { id: "vibrante", nome: "Vibrante", cores: ["#2FC8A0", "#172721", "#F2B84B"] },
  { id: "escura", nome: "Escura", cores: ["#B9C1C9", "#17191B", "#78909C"] },
  { id: "quente", nome: "Quente", cores: ["#D77A61", "#2A1D1A", "#E2B44C"] },
  { id: "clara", nome: "Clara", cores: ["#80A88A", "#E8E9E4", "#C9785B"] },
] as const;

const fieldClass = "mt-2 w-full rounded-lg border border-line2 bg-ink2 px-3 py-3 text-sm text-paper outline-none placeholder:text-mute2 focus:border-gold";

function Campo({ label, value, onChange, placeholder }: { label: string; value: string | null; onChange: (v: string) => void; placeholder?: string }) {
  return <label className="block text-xs font-medium text-mute">{label}<input className={fieldClass} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Secao({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-t border-line py-7 first:border-0 first:pt-0"><h2 className="mb-4 text-sm font-semibold text-paper">{title}</h2>{children}</section>;
}

function MarcaPage() {
  const query = useQuery({ queryKey: ["marca"], queryFn: () => getMarca() });
  if (query.isLoading) return <Screen title="Marca"><p className="text-sm text-mute">Carregando…</p></Screen>;
  if (!query.data) return <Screen title="Marca"><p className="text-sm text-brick">Entre como dono da barbearia para configurar a marca.</p></Screen>;
  return <MarcaFormPage initial={query.data.marca} versions={query.data.versoes} reload={() => query.refetch()} />;
}

function MarcaFormPage({ initial, versions, reload }: { initial: MarcaData; versions: Awaited<ReturnType<typeof getMarca>>["versoes"]; reload: () => void }) {
  const save = useServerFn(salvarMarca);
  const restore = useServerFn(restaurarMarca);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<MarcaForm>(initial);
  const [logoPreview, setLogoPreview] = useState(initial.logo_signed_url);
  const [custom, setCustom] = useState(initial.tema === "personalizada");
  const [welcomeDefault, setWelcomeDefault] = useState(!initial.texto_boas_vindas);
  const [walletDefault, setWalletDefault] = useState(!initial.rotulo_carteira);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => { setForm(initial); setLogoPreview(initial.logo_signed_url); }, [initial]);

  const set = <K extends keyof MarcaForm>(key: K, value: MarcaForm[K]) => setForm((old) => ({ ...old, [key]: value }));
  const chooseTheme = (theme: typeof temas[number]) => {
    setForm((old) => ({ ...old, tema: theme.id, cor_primaria: theme.cores[0], cor_secundaria: theme.cores[1], cor_accent: theme.cores[2] }));
    setCustom(false);
  };

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png" || file.size > 2 * 1024 * 1024) { setStatus("Use um PNG de até 2 MB."); return; }
    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = async () => {
      if (image.width !== image.height || image.width < 512) { setStatus("A logo precisa ser quadrada e ter pelo menos 512 px."); URL.revokeObjectURL(image.src); return; }
      setBusy(true);
      const path = `${initial.id}/logo-${Date.now()}.png`;
      const { error } = await supabase.storage.from("tenant-logos").upload(path, file, { contentType: "image/png" });
      if (error) setStatus(error.message);
      else { set("logo_url", path); setLogoPreview(image.src); setStatus("Logo pronta para salvar."); }
      setBusy(false);
    };
  };

  const previewStyle = {
    "--preview-primary": form.cor_primaria,
    "--preview-secondary": form.cor_secundaria,
    "--preview-accent": form.cor_accent,
  } as CSSProperties;

  return <Screen title="Marca" subtitle="A identidade que seus clientes veem.">
    <Secao title="Prévia do app">
      <div className="overflow-hidden rounded-lg border border-line bg-ink2" style={previewStyle}>
        <div className="h-1 bg-[var(--preview-primary)]" />
        <div className="flex items-center gap-3 p-4">
          {logoPreview ? <img src={logoPreview} alt={`Logo ${form.nome}`} className="h-12 w-12 rounded-lg object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-line2 text-[9px] text-mute">SUA LOGO</div>}
          <div><p className="text-sm font-bold text-paper">{form.nome || "Sua barbearia"}</p><p className="text-[11px] text-mute">{form.texto_boas_vindas || "Sua barbearia, no seu tempo."}</p></div>
        </div>
        <div className="mx-4 mb-4 flex gap-2"><span className="h-8 flex-1 rounded-md bg-[var(--preview-primary)]" /><span className="h-8 flex-1 rounded-md bg-[var(--preview-secondary)]" /><span className="h-8 w-8 rounded-md bg-[var(--preview-accent)]" /></div>
      </div>
    </Secao>

    <Secao title="Logo">
      <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-4 rounded-lg border border-dashed border-line2 p-4 text-left">
        {logoPreview ? <img src={logoPreview} alt="Logo atual" className="h-16 w-16 rounded-lg object-contain" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-line2 text-[10px] text-mute">SUA LOGO</div>}
        <span><span className="flex items-center gap-2 text-sm font-semibold text-paper"><ImagePlus size={17} /> Escolher PNG</span><span className="mt-1 block text-xs text-mute">Quadrada, 512 px ou maior, até 2 MB.</span></span>
      </button>
      <input ref={fileRef} type="file" accept="image/png" className="hidden" onChange={uploadLogo} />
    </Secao>

    <Secao title="Tema de cor">
      <div className="grid grid-cols-2 gap-3">{temas.map((theme) => <button key={theme.id} type="button" onClick={() => chooseTheme(theme)} className={`relative rounded-lg border p-3 text-left ${form.tema === theme.id ? "border-gold" : "border-line"}`}>
        <span className="mb-3 flex gap-1">{theme.cores.map((color) => <span key={color} className="h-5 flex-1 rounded-sm" style={{ backgroundColor: color }} />)}</span>
        <span className="text-xs font-medium text-paper">{theme.nome}</span>{form.tema === theme.id ? <Check className="absolute bottom-3 right-3 text-gold" size={14} /> : null}
      </button>)}</div>
      <button type="button" className="btn-tertiary mt-4 text-sm" onClick={() => { setCustom(true); set("tema", "personalizada"); }}>Montar paleta própria</button>
      {custom ? <div className="mt-4 grid grid-cols-3 gap-3">{(["cor_primaria", "cor_secundaria", "cor_accent"] as const).map((key, index) => <label key={key} className="text-[10px] text-mute">{["Primária", "Secundária", "Accent"][index]}<input type="color" className="mt-2 h-11 w-full rounded-md border border-line bg-ink2 p-1" value={form[key]} onChange={(e) => set(key, e.target.value.toUpperCase())} /></label>)}</div> : null}
    </Secao>

    <Secao title="Dados da barbearia"><div className="space-y-4"><Campo label="Nome" value={form.nome} onChange={(v) => set("nome", v)} /><Campo label="Endereço" value={form.endereco} onChange={(v) => set("endereco", v)} /><Campo label="Telefone" value={form.telefone} onChange={(v) => set("telefone", v)} /><Campo label="Instagram" value={form.instagram} onChange={(v) => set("instagram", v)} placeholder="@sua_barbearia" /><Campo label="WhatsApp" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} /><Campo label="Facebook" value={form.facebook} onChange={(v) => set("facebook", v)} /></div></Secao>

    <Secao title="Textos no app">
      <ToggleText title="Usar rótulo padrão da carteira" checked={walletDefault} onChecked={(checked) => { setWalletDefault(checked); if (checked) set("rotulo_carteira", null); }} />
      {!walletDefault ? <input className={fieldClass} value={form.rotulo_carteira ?? ""} onChange={(e) => set("rotulo_carteira", e.target.value)} placeholder="Ex.: Meu saldo" /> : null}
      <div className="mt-5"><ToggleText title="Usar mensagem padrão de boas-vindas" checked={welcomeDefault} onChecked={(checked) => { setWelcomeDefault(checked); if (checked) set("texto_boas_vindas", null); }} /></div>
      {!welcomeDefault ? <textarea className={`${fieldClass} min-h-24 resize-none`} value={form.texto_boas_vindas ?? ""} onChange={(e) => set("texto_boas_vindas", e.target.value)} placeholder="Escreva sua mensagem" /> : null}
    </Secao>

    <Secao title="Assinatura">
      <div className="flex items-center justify-between gap-4"><div><p className="text-sm text-paper">Mostrar assinatura da Alvo Digital</p><p className="mt-1 text-xs text-mute">{initial.plano === "essencial" ? "Incluída no plano Essencial." : "Você pode ocultar a assinatura neste plano."}</p></div><div className="flex items-center gap-2">{initial.plano === "essencial" ? <LockKeyhole size={14} className="text-mute" /> : null}<Switch checked={initial.plano === "essencial" ? true : form.assinatura_visivel} disabled={initial.plano === "essencial"} onCheckedChange={(checked) => set("assinatura_visivel", checked)} /></div></div>
    </Secao>

    <Secao title="Versões anteriores">
      {versions.length ? <ul>{versions.map((version) => <li key={version.id} className="flex items-center justify-between gap-3 border-b border-line py-4 first:pt-0"><div><p className="text-sm text-paper">Versão {version.versao}</p><p className="mt-1 text-xs text-mute">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(version.criado_em))}</p></div><Button variant="outline" size="sm" disabled={busy} onClick={async () => { setBusy(true); await restore({ data: { versaoId: version.id } }); await reload(); setStatus("Versão restaurada."); setBusy(false); }}><RotateCcw /> Restaurar</Button></li>)}</ul> : <p className="text-sm text-mute">As versões aparecem depois da primeira alteração.</p>}
    </Secao>

    {status ? <p className="mb-4 text-sm text-sage" role="status">{status}</p> : null}
    <Button className="h-12 w-full text-sm font-bold" disabled={busy} onClick={async () => { setBusy(true); setStatus(null); try { await save({ data: form }); await reload(); setStatus("Marca salva e aplicada ao app dos clientes."); } catch (error) { setStatus(error instanceof Error ? error.message : "Não foi possível salvar."); } finally { setBusy(false); } }}>{busy ? "Salvando…" : "Salvar marca"}</Button>
  </Screen>;
}

function ToggleText({ title, checked, onChecked }: { title: string; checked: boolean; onChecked: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between gap-3"><p className="text-sm text-paper">{title}</p><Switch checked={checked} onCheckedChange={onChecked} /></div>;
}