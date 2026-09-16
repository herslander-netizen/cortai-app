import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAcao } from "@/hooks/useAcao";
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
  const [precos, setPrecos] = useState<Record<"essencial" | "pro" | "studio", string>>({ essencial: "", pro: "", studio: "" }); const [erroPreco, setErroPreco] = useState(""); const acao = useAcao();
  useEffect(() => { if (query.data) { setForm(query.data); setPrecos({ essencial: String(query.data.preco_essencial_centavos / 100), pro: String(query.data.preco_pro_centavos / 100), studio: String(query.data.preco_studio_centavos / 100) }); } }, [query.data]);
  if (query.isError) return <AdminScreen title="Design system" subtitle="A base visual de todos os tenants."><AdminNotice error={query.error}/></AdminScreen>;
  return <AdminScreen title="Design system" subtitle="Alterações aqui definem a base para todos os tenants.">
    {!form ? <Carregando texto="Carregando configuração…" /> : <form onSubmit={(e) => { e.preventDefault(); setStatus(""); setErroPreco("");
      const vazio = (["essencial", "pro", "studio"] as const).find((p) => precos[p].trim() === "" || !Number.isFinite(Number(precos[p])));
      if (vazio) { setErroPreco(`Informe o preço do plano ${vazio}. O campo não pode ficar vazio.`); return; }
      const centavos = { essencial: Math.round(Number(precos.essencial) * 100), pro: Math.round(Number(precos.pro) * 100), studio: Math.round(Number(precos.studio) * 100) };
      void acao.executar("design", () => save({ data: { preco_essencial_centavos: centavos.essencial, preco_pro_centavos: centavos.pro, preco_studio_centavos: centavos.studio, cor_fundo: form.cor_fundo, cor_superficie: form.cor_superficie, cor_primaria: form.cor_primaria, cor_texto: form.cor_texto, tipografia: form.tipografia as "Montserrat" | "Work Sans" | "Sora", raio_px: form.raio_px, whatsapp_alvo: form.whatsapp_alvo } }), { sucesso: "Design system salvo e aplicado.", aoConcluir: () => setStatus("Design system salvo e aplicado.") }); }}>
      <Section title="Preços mensais dos planos"><div className="grid gap-4 sm:grid-cols-3">{(["essencial", "pro", "studio"] as const).map((plan) => <label key={plan} className="text-xs capitalize text-mute">{plan}<input type="number" min="0" step="100" inputMode="decimal" value={precos[plan]} onChange={(e) => setPrecos({ ...precos, [plan]: e.target.value })} className="mt-2 w-full rounded-md border border-line2 bg-ink2 px-3 py-3 text-sm text-paper"/><span className="mt-1 block text-[10px] text-mute2">R$ por mês</span></label>)}</div>{erroPreco ? <p className="mt-3 text-xs text-brick" role="alert">{erroPreco}</p> : null}</Section>

      <Section title="Paleta base"><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{(["cor_fundo", "cor_superficie", "cor_primaria", "cor_texto"] as const).map((key) => <label key={key} className="text-xs text-mute">{{ cor_fundo: "Fundo", cor_superficie: "Superfície", cor_primaria: "Primária", cor_texto: "Texto" }[key]}<input type="color" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value.toUpperCase() })} className="mt-2 h-12 w-full rounded-md border border-line bg-ink2 p-1"/><span className="mt-1 block text-[10px] text-mute2">{form[key]}</span></label>)}</div></Section>
      <Section title="Tipografia e forma"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs text-mute">Tipografia<select value={form.tipografia} onChange={(e) => setForm({ ...form, tipografia: e.target.value })} className="mt-2 w-full rounded-md border border-line2 bg-ink2 px-3 py-3 text-sm text-paper"><option>Montserrat</option><option>Work Sans</option><option>Sora</option></select></label><label className="text-xs text-mute">Raio de borda: {form.raio_px}px<input type="range" min="0" max="24" value={form.raio_px} onChange={(e) => setForm({ ...form, raio_px: Number(e.target.value) })} className="mt-4 w-full accent-gold"/></label></div></Section>
      <Section title="Contato da Alvo Digital"><label className="block text-xs text-mute">WhatsApp exibido no rodapé público<input type="tel" inputMode="tel" placeholder="(11) 99999-9999" value={form.whatsapp_alvo ?? ""} onChange={(e) => setForm({ ...form, whatsapp_alvo: e.target.value })} className="mt-2 w-full rounded-md border border-line2 bg-ink2 px-3 py-3 text-sm text-paper"/><span className="mt-1 block text-[10px] text-mute2">Deixe vazio para esconder o contato. DDD obrigatório; o código 55 é adicionado automaticamente.</span></label>{(() => { const d = String(form.whatsapp_alvo ?? "").replace(/\D/g, ""); const n = d.length >= 10 ? (d.length <= 11 ? `55${d}` : d) : null; return n ? <a href={`https://wa.me/${n}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-gold">Testar link: wa.me/{n}</a> : null; })()}</Section>
      <Section title="Princípios travados"><div className="space-y-4">{["Tema escuro por padrão", "Sem gradientes", "Um único dourado por tela", "Listas com divisores de 1 px", "Cards somente para saldo e indicadores"].map((rule) => <div key={rule} className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-sm text-paper"><LockKeyhole size={14} className="text-mute"/>{rule}</span><Switch checked disabled/></div>)}</div></Section>
      {status ? <p className="mb-4 text-sm text-sage" role="status">{status}</p> : null}<Button type="submit" size="lg" disabled={acao.ocupado}>{acao.estaEm("design") ? "Salvando…" : "Salvar alterações"}</Button>
    </form>}
  </AdminScreen>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border-t border-line py-7 first:border-0 first:pt-0"><h2 className="mb-5 text-sm font-semibold text-paper">{title}</h2>{children}</section>; }