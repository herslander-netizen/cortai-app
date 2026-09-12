import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminNotice, AdminScreen } from "@/components/layout/AdminScreen";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getPlatformConfig, savePlatformConfig } from "@/lib/admin.functions";
import { Carregando } from "@/components/layout/Carregando";

export const Route = createFileRoute("/admin/ajustes")({ head: () => ({ meta: [
  { title: "Design system global — Cortaí" }, { name: "description", content: "Paleta, tipografia, preços e princípios globais do Cortaí." },
  { property: "og:title", content: "Design system global — Cortaí" }, { property: "og:description", content: "Configuração visual da plataforma Cortaí." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: DesignSystemPage });

function DesignSystemPage() {
  const query = useQuery({ queryKey: ["platform-config"], queryFn: () => getPlatformConfig(), retry: false }); const save = useServerFn(savePlatformConfig);
  const [form, setForm] = useState<Awaited<ReturnType<typeof getPlatformConfig>> | null>(null); const [status, setStatus] = useState("");
  useEffect(() => { if (query.data) setForm(query.data); }, [query.data]);
  if (query.isError) return <AdminScreen title="Design system" subtitle="A base visual de todos os tenants."><AdminNotice error={query.error}/></AdminScreen>;
  return <AdminScreen title="Design system" subtitle="Alterações aqui definem a base para todos os tenants.">
    {!form ? <Carregando texto="Carregando configuração…" /> : <form onSubmit={async (e) => { e.preventDefault(); setStatus(""); await save({ data: { preco_essencial_centavos: form.preco_essencial_centavos, preco_pro_centavos: form.preco_pro_centavos, preco_studio_centavos: form.preco_studio_centavos, cor_fundo: form.cor_fundo, cor_superficie: form.cor_superficie, cor_primaria: form.cor_primaria, cor_texto: form.cor_texto, tipografia: form.tipografia as "Montserrat" | "Work Sans" | "Sora", raio_px: form.raio_px } }); setStatus("Design system salvo e aplicado."); }}>
      <Section title="Preços mensais dos planos"><div className="grid gap-4 sm:grid-cols-3">{(["essencial", "pro", "studio"] as const).map((plan) => { const key = `preco_${plan}_centavos` as const; return <label key={plan} className="text-xs capitalize text-mute">{plan}<input type="number" min="0" step="100" value={form[key] / 100} onChange={(e) => setForm({ ...form, [key]: Math.round(Number(e.target.value) * 100) })} className="mt-2 w-full rounded-md border border-line2 bg-ink2 px-3 py-3 text-sm text-paper"/><span className="mt-1 block text-[10px] text-mute2">R$ por mês</span></label>; })}</div></Section>
      <Section title="Paleta base"><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{(["cor_fundo", "cor_superficie", "cor_primaria", "cor_texto"] as const).map((key) => <label key={key} className="text-xs text-mute">{{ cor_fundo: "Fundo", cor_superficie: "Superfície", cor_primaria: "Primária", cor_texto: "Texto" }[key]}<input type="color" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value.toUpperCase() })} className="mt-2 h-12 w-full rounded-md border border-line bg-ink2 p-1"/><span className="mt-1 block text-[10px] text-mute2">{form[key]}</span></label>)}</div></Section>
      <Section title="Tipografia e forma"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs text-mute">Tipografia<select value={form.tipografia} onChange={(e) => setForm({ ...form, tipografia: e.target.value })} className="mt-2 w-full rounded-md border border-line2 bg-ink2 px-3 py-3 text-sm text-paper"><option>Montserrat</option><option>Work Sans</option><option>Sora</option></select></label><label className="text-xs text-mute">Raio de borda: {form.raio_px}px<input type="range" min="0" max="24" value={form.raio_px} onChange={(e) => setForm({ ...form, raio_px: Number(e.target.value) })} className="mt-4 w-full accent-gold"/></label></div></Section>
      <Section title="Princípios travados"><div className="space-y-4">{["Tema escuro por padrão", "Sem gradientes", "Um único dourado por tela", "Listas com divisores de 1 px", "Cards somente para saldo e indicadores"].map((rule) => <div key={rule} className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-sm text-paper"><LockKeyhole size={14} className="text-mute"/>{rule}</span><Switch checked disabled/></div>)}</div></Section>
      {status ? <p className="mb-4 text-sm text-sage" role="status">{status}</p> : null}<Button type="submit" size="lg">Salvar alterações</Button>
    </form>}
  </AdminScreen>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border-t border-line py-7 first:border-0 first:pt-0"><h2 className="mb-5 text-sm font-semibold text-paper">{title}</h2>{children}</section>; }