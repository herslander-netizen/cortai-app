import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const businesses = ["Studio Horizonte", "Ateliê da Vila"];
const services = [
  { name: "Corte", duration: "30 min", price: "R$ 35,00" },
  { name: "Corte + acabamento", duration: "45 min", price: "R$ 50,00" },
  { name: "Consultoria de estilo", duration: "30 min", price: "R$ 25,00" },
];
const times = ["09:30", "10:15", "11:00", "13:30"];
const labels = ["Estabelecimento", "Serviço", "Horário", "Resumo"];

/** Exemplo inteiramente local. Não consulta APIs nem cria reservas. */
export function DemoAgendamento() {
  const [step, setStep] = useState(0);
  const [business, setBusiness] = useState(0);
  const [service, setService] = useState(1);
  const [time, setTime] = useState("10:15");
  const selectedBusiness = businesses[business] ?? "Studio Horizonte";
  const selectedService = services[service] ?? { name: "Corte + acabamento", duration: "45 min", price: "R$ 50,00" };
  const summary: [string, string][] = [["Estabelecimento", selectedBusiness], ["Serviço", selectedService.name], ["Horário ilustrativo", time], ["Valor ilustrativo", selectedService.price]];
  const reset = () => { setStep(0); setBusiness(0); setService(1); setTime("10:15"); };
  return (
    <section id="demo-interativa" aria-labelledby="demo-title" className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8">
      <div className="max-w-xl">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-ink2">Explore sem criar uma conta</p>
        <h2 id="demo-title" className="text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">Entenda o fluxo. <span className="text-ink2">No seu ritmo.</span></h2>
        <p className="mt-5 max-w-lg text-base leading-7 text-mute sm:text-lg">Experimente uma demonstração guiada de como a escolha pode acontecer. Nomes, serviços, preços e horários são fictícios e servem apenas para ilustrar a experiência.</p>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line px-4 py-3 text-sm text-mute"><Check className="h-4 w-4 text-ink2" /> Nenhuma reserva será criada</p>
      </div>
      <div className="overflow-hidden rounded-[1.75rem] border border-line bg-paper shadow-xl shadow-ink/5">
        <div className="border-b border-line bg-background px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-mute">Demonstração interativa</p><h3 className="mt-1 text-lg font-bold text-ink">Sua próxima escolha</h3></div><span className="rounded-full bg-gold/10 px-3 py-1 text-xs font-bold text-ink2">Passo {step + 1} de 4</span></div>
          <ol className="mt-5 grid grid-cols-4 gap-2" aria-label="Progresso da demonstração">{labels.map((label, i) => <li key={label}><div className={`h-1.5 rounded-full transition-colors duration-200 ${i <= step ? "bg-gold" : "bg-line"}`} /><span className={`mt-2 block truncate text-[11px] font-semibold sm:text-xs ${i === step ? "text-ink" : "text-mute"}`}>{label}</span></li>)}</ol>
        </div>
        <div className="min-h-[300px] px-5 py-6 sm:px-7 sm:py-7" aria-live="polite">
          {step === 0 && <div><h4 className="font-bold text-ink">1. Escolha um exemplo</h4><p className="mt-1 text-sm text-mute">Perfis e dados fictícios.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{businesses.map((name, i) => <button key={name} type="button" aria-pressed={business === i} onClick={() => setBusiness(i)} className={`min-h-28 rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${business === i ? "border-gold bg-gold/5" : "border-line bg-background hover:border-ink3"}`}><span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sm font-extrabold text-paper">{i ? "AV" : "SH"}</span><strong className="mt-3 block text-sm text-ink">{name}</strong><span className="mt-1 block text-xs text-mute">Exemplo ilustrativo</span></button>)}</div></div>}
          {step === 1 && <div><h4 className="font-bold text-ink">2. Veja os serviços</h4><p className="mt-1 text-sm text-mute">{selectedBusiness} · exemplo fictício</p><div className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-background">{services.map((item, i) => <button key={item.name} type="button" aria-pressed={service === i} onClick={() => setService(i)} className={`flex min-h-20 w-full items-center justify-between gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold ${service === i ? "bg-gold/5" : "hover:bg-paper"}`}><span><strong className="block text-sm text-ink">{item.name}</strong><span className="mt-1 block text-xs text-mute">{item.duration}</span></span><strong className="text-sm text-ink">{item.price}</strong></button>)}</div></div>}
          {step === 2 && <div><h4 className="font-bold text-ink">3. Visualize opções de horário</h4><p className="mt-1 text-sm text-mute">Não representa disponibilidade em tempo real.</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{times.map(t => <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)} className={`min-h-14 rounded-xl border text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${time === t ? "border-ink bg-ink text-paper" : "border-line bg-background text-ink hover:border-ink3"}`}>{t}</button>)}</div></div>}
          {step === 3 && <div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-ink2"><Check className="h-6 w-6" /></span><h4 className="mt-4 text-xl font-bold text-ink">Resumo da demonstração</h4><p className="mt-2 text-sm leading-6 text-mute">Em um fluxo real, o próximo passo dependeria das configurações e da disponibilidade do estabelecimento.</p><dl className="mt-5 divide-y divide-line rounded-2xl border border-line bg-background px-4">{summary.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-3 text-sm"><dt className="text-mute">{k}</dt><dd className="text-right font-semibold text-ink">{v}</dd></div>)}</dl><p className="mt-4 rounded-xl border border-line bg-paper p-3 text-xs leading-5 text-mute">Nada foi enviado ao sistema e nenhuma reserva foi registrada.</p></div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-background px-5 py-4 sm:px-7"><Button type="button" variant="ghost" onClick={step === 0 ? reset : () => setStep(s => s - 1)} className="min-h-12">{step === 0 ? <RotateCcw className="mr-2 h-4 w-4" /> : <ArrowLeft className="mr-2 h-4 w-4" />}{step === 0 ? "Reiniciar" : "Voltar"}</Button>{step < 3 ? <Button type="button" variant="primary" className="min-h-12" onClick={() => setStep(s => s + 1)}>{step === 2 ? "Ver resumo" : "Continuar"} <ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button type="button" variant="outline" className="min-h-12" onClick={reset}>Fazer novamente <RotateCcw className="ml-2 h-4 w-4" /></Button>}</div>
      </div>
    </section>
  );
}
