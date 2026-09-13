import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BarChart3, Banknote, Boxes, CalendarCheck, CalendarDays, Check,
  Gift, MessageCircle, PackageCheck, Repeat2, Search, Scissors, Smartphone,
  Store, UserCog, Users, Zap,
} from "lucide-react";

import { FaixaDeParceiros } from "@/components/institucional/FaixaDeParceiros";
import { Signature } from "@/components/layout/Signature";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/landing-hero.jpg";
import lojaImg from "@/assets/landing-loja.jpg";
import ctaImg from "@/assets/landing-cta.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Cortaí — sua barbearia, no controle" },
    { name: "description", content: "Agenda, clientes, caixa, loja, estoque e fidelidade para sua barbearia crescer com controle." },
    { property: "og:title", content: "Cortaí — sua barbearia, no controle" },
    { property: "og:description", content: "A plataforma completa para controlar e fazer sua barbearia crescer." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Inicio,
});

const GANHOS = [
  { icone: CalendarCheck, texto: "Organize sua agenda" },
  { icone: Zap, texto: "Atenda sem perder tempo" },
  { icone: Banknote, texto: "Controle o caixa" },
  { icone: Repeat2, texto: "Faça clientes voltarem" },
  { icone: Store, texto: "Venda produtos" },
];

const FUNCIONALIDADES = [
  { icone: CalendarDays, etiqueta: "Agenda", titulo: "Sua agenda no controle.", texto: "Horários por profissional, encaixes, bloqueios e fila no mesmo lugar." },
  { icone: Users, etiqueta: "Clientes", titulo: "Conheça quem senta na sua cadeira.", texto: "Histórico, frequência e preferências para atender melhor a cada visita." },
  { icone: Banknote, etiqueta: "Caixa", titulo: "Saiba quanto sua barbearia está fazendo.", texto: "Acompanhe o faturamento, o que entrou e o que ainda falta receber." },
  { icone: Boxes, etiqueta: "Loja & estoque", titulo: "Venda mais. Não deixe produto faltar.", texto: "Controle o estoque interno e escolha o que aparece na loja pública." },
  { icone: Repeat2, etiqueta: "Voltaí", titulo: "Seu cliente corta. Ganha. Volta.", texto: "Fidelidade configurável para premiar quem sempre escolhe sua barbearia." },
  { icone: UserCog, etiqueta: "Equipe", titulo: "Cada profissional no ritmo certo.", texto: "Organize profissionais, serviços e horários sem embolar a operação." },
  { icone: MessageCircle, etiqueta: "WhatsApp", titulo: "Chame o cliente na hora certa.", texto: "Use mensagens prontas para conversar com quem está na hora de voltar." },
  { icone: BarChart3, etiqueta: "Relatórios", titulo: "Veja o que acontece no seu negócio.", texto: "Ocupação, crescimento e indicadores para decidir com mais segurança." },
];

const ROTINA = [
  { icone: Smartphone, texto: "No celular" }, { icone: Zap, texto: "Rápido de usar" },
  { icone: Check, texto: "Sem complicação" }, { icone: PackageCheck, texto: "Sua marca na frente" },
  { icone: Scissors, texto: "Feito para o barbeiro" },
];

function Cabecalho({ etiqueta, titulo, texto }: { etiqueta: string; titulo: string; texto?: string }) {
  return <div className="max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">{etiqueta}</p><h2 className="mt-3 text-[30px] font-bold leading-[1.08] text-paper md:text-[44px]">{titulo}</h2>{texto ? <p className="mt-4 max-w-xl text-sm leading-7 text-mute md:text-base">{texto}</p> : null}</div>;
}

function TelaProduto({ tipo }: { tipo: "agenda" | "clientes" | "caixa" | "voltai" }) {
  if (tipo === "agenda") return <div className="landing-product-screen"><div className="border-b border-line px-4 py-3"><p className="text-[10px] font-bold uppercase text-gold">Cortaí Gestão</p><p className="mt-1 text-sm font-bold text-paper">Agenda</p></div><div className="space-y-2 p-4">{[["09:00","Carlos","Corte + barba"],["10:00","Horário livre","Oferecer à fila"],["11:30","Rafael","Corte degradê"]].map((i,n)=><div key={i[0]} className={`grid grid-cols-[48px_1fr] gap-3 border-l-2 px-3 py-2 ${n===1?"border-line2":"border-gold"}`}><span className="text-xs font-semibold text-mute">{i[0]}</span><span><b className="block text-xs text-paper">{i[1]}</b><small className="text-mute">{i[2]}</small></span></div>)}</div></div>;
  if (tipo === "clientes") return <div className="landing-product-screen"><div className="border-b border-line px-4 py-3"><p className="text-[10px] font-bold uppercase text-gold">Clientes</p><p className="mt-1 text-sm font-bold text-paper">Na hora de voltar</p></div><div className="p-4"><p className="text-[11px] text-mute">Voltaí acompanha a frequência de cada cliente.</p>{["Cliente recorrente","Cliente em retorno","Contato recente"].map((n,i)=><div key={n} className="mt-3 flex items-center justify-between border-b border-line pb-2"><span><b className="block text-xs text-paper">{n}</b><small className="text-mute">A cada {22+i*5} dias</small></span><em className={i===1?"text-[9px] not-italic text-gold":"text-[9px] not-italic text-sage"}>{i===1?"EM RETORNO":"RECORRENTE"}</em></div>)}</div></div>;
  if (tipo === "caixa") return <div className="landing-product-screen"><div className="border-b border-line px-4 py-3"><p className="text-[10px] font-bold uppercase text-gold">Financeiro</p><p className="mt-1 text-sm font-bold text-paper">Visão do mês</p></div><div className="p-4"><p className="text-[10px] text-mute">Faturamento</p><p className="mt-1 text-2xl font-bold text-paper">R$ 8.420</p><div className="mt-4 h-1.5 rounded-full bg-ink3"><div className="h-full w-3/4 rounded-full bg-gold" /></div><div className="mt-5 grid grid-cols-2 gap-2">{[["Serviços","R$ 6.980"],["Produtos","R$ 1.440"]].map(i=><div key={i[0]} className="rounded-md bg-ink3 p-3"><small className="text-mute">{i[0]}</small><b className="mt-1 block text-xs text-paper">{i[1]}</b></div>)}</div></div></div>;
  return <div className="landing-product-screen"><div className="flex items-center justify-between border-b border-line px-4 py-3"><div><p className="text-[10px] font-bold uppercase text-gold">Voltaí</p><p className="mt-1 text-sm font-bold text-paper">Fidelidade do Cortaí</p></div><Gift size={18} className="text-gold" /></div><div className="p-4"><p className="text-[11px] text-mute">Progresso para o próximo corte</p><div className="mt-4 flex gap-2">{Array.from({length:6}).map((_,i)=><span key={i} className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold ${i<4?"border-gold bg-gold text-ink":"border-line2 text-mute"}`}>{i+1}</span>)}</div><p className="mt-4 text-xs font-semibold text-paper">Faltam 2 cortes para ganhar.</p></div></div>;
}

function Inicio() {
  return <div className="min-h-screen overflow-hidden bg-ink">
    <header className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-5 md:px-8"><MarcaCortai variante="escura" className="h-auto w-32 md:w-36" prioridade /><Button asChild variant="ghost" className="text-paper"><Link to="/login">Entrar</Link></Button></header>
    <main>
      <section className="relative flex min-h-[760px] items-end overflow-hidden border-b border-line md:min-h-[820px]"><img src={heroImg} alt="Barbeiro atendendo um cliente em uma barbearia" width={1114} height={768} className="absolute inset-0 h-full w-full object-cover object-[60%_center] opacity-70 md:object-center"/><div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/30 md:bg-gradient-to-r md:from-ink md:via-ink/75 md:to-ink/10"/><div className="landing-reveal relative mx-auto w-full max-w-[1180px] px-5 pb-16 pt-32 md:px-8 md:pb-20"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Gestão completa para barbearias</p><h1 className="mt-4 max-w-[11ch] text-[44px] font-bold leading-[1.02] text-paper md:text-[68px]">Sua barbearia, no controle.</h1><p className="mt-5 max-w-xl text-base leading-7 text-paper/80 md:text-lg">Agenda, clientes, caixa, loja e fidelidade em um só lugar — com a sua marca na frente.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="h-12 px-6 font-bold"><a href="#conhecer">Conhecer o Cortaí <ArrowRight/></a></Button><Button asChild size="lg" variant="outline" className="h-12 border-line2 bg-ink/40 px-6 text-paper"><Link to="/barbearias"><Search/>Encontrar uma barbearia</Link></Button></div></div></section>
      <section id="conhecer" className="scroll-mt-10 border-b border-line py-10"><div className="mx-auto max-w-[1180px] px-5 md:px-8"><p className="mb-6 text-center text-xs font-semibold text-mute">Menos improviso. Mais controle em cada corte.</p><ul className="grid grid-cols-2 gap-6 md:grid-cols-5">{GANHOS.map(item=>{const Icone=item.icone;return <li key={item.texto} className="flex items-center gap-3 md:flex-col md:text-center"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-ink2"><Icone size={16} className="text-gold"/></span><span className="text-xs font-semibold text-paper">{item.texto}</span></li>})}</ul></div></section>
      <section className="mx-auto max-w-[1180px] px-5 py-20 md:px-8 md:py-28"><Cabecalho etiqueta="Tudo que sua barbearia precisa" titulo="Do primeiro horário ao fechamento do caixa." texto="O Cortaí reúne a rotina da cadeira e a visão do negócio. Fila é parte da Agenda. Voltaí é a fidelidade. Tudo na mesma plataforma."/><ul className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">{FUNCIONALIDADES.map(item=>{const Icone=item.icone;return <li key={item.etiqueta} className="group bg-ink2 p-6 transition-colors hover:bg-ink3 md:p-8"><div className="flex justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{item.etiqueta}</span><Icone size={18} className="text-mute group-hover:text-gold"/></div><h3 className="mt-8 max-w-[22ch] text-xl font-bold leading-tight text-paper md:text-2xl">{item.titulo}</h3><p className="mt-3 max-w-md text-sm leading-6 text-mute">{item.texto}</p></li>})}</ul></section>
      <section className="border-y border-line bg-ink2 py-20 md:py-28"><div className="mx-auto grid max-w-[1180px] gap-12 px-5 md:grid-cols-[.8fr_1.2fr] md:items-center md:px-8"><div><Cabecalho etiqueta="Voltaí" titulo="Seu cliente corta. Ganha. Volta." texto="Uma fidelidade simples de entender e fácil de acompanhar. Você define a regra, o Cortaí mostra o progresso e o cliente tem mais um motivo para voltar."/><p className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-paper"><Repeat2 size={15} className="text-gold"/>Uma função do Cortaí, não outro aplicativo.</p></div><div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-lg border border-line bg-ink p-5 md:p-8">{["Corta","Ganha","Volta"].map((t,i)=><div key={t} className="contents"><div className="text-center"><span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border text-xs font-bold ${i===2?"border-gold bg-gold text-ink":"border-line2 bg-ink2 text-paper"}`}>0{i+1}</span><p className="mt-3 text-xs font-semibold text-paper">{t}</p></div>{i<2?<ArrowRight className="text-mute" size={16}/>:null}</div>)}</div></div></section>
      <section className="mx-auto max-w-[1180px] px-5 py-20 md:px-8 md:py-28"><Cabecalho etiqueta="Por dentro do Cortaí" titulo="O controle que você usa de verdade." texto="Visualizações baseadas nos módulos que já existem na área de gestão do Cortaí."/><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{(["agenda","clientes","caixa","voltai"] as const).map((tipo,i)=><figure key={tipo}><TelaProduto tipo={tipo}/><figcaption className="mt-3 text-xs font-semibold text-mute">{["Agenda, horários e fila","Clientes e frequência","Caixa e financeiro","Fidelidade Voltaí"][i]}</figcaption></figure>)}</div></section>
      <section className="relative overflow-hidden border-y border-line py-20 md:py-28"><img src={lojaImg} alt="Produtos de barbearia organizados para venda" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-20"/><div className="absolute inset-0 bg-ink/80"/><div className="relative mx-auto max-w-[1180px] px-5 md:px-8"><Cabecalho etiqueta="Feito para a rotina da barbearia" titulo="Profissional sem ficar complicado."/><ul className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-5">{ROTINA.map(item=>{const Icone=item.icone;return <li key={item.texto} className="flex min-h-28 flex-col justify-between bg-ink2/95 p-5"><Icone size={18} className="text-gold"/><span className="mt-5 text-sm font-semibold text-paper">{item.texto}</span></li>})}</ul></div></section>
      <section className="relative flex min-h-[560px] items-end overflow-hidden"><img src={ctaImg} alt="Cadeira de barbeiro em uma barbearia premium" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-55"/><div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/20"/><div className="relative mx-auto w-full max-w-[1180px] px-5 pb-16 md:px-8 md:pb-20"><h2 className="max-w-2xl text-[34px] font-bold leading-[1.05] text-paper md:text-[52px]">Pronto para colocar sua barbearia no Cortaí?</h2><p className="mt-4 max-w-lg text-sm leading-6 text-paper/75 md:text-base">Organize a rotina, acompanhe o negócio e mantenha sua marca na frente.</p><Button asChild size="lg" className="mt-7 h-12 px-7 font-bold"><Link to="/comecar">Começar agora <ArrowRight/></Link></Button></div></section>
      <div className="mx-auto max-w-[1180px] px-5 md:px-8"><FaixaDeParceiros/></div>
    </main>
    <div className="mx-auto max-w-[1180px]"><Signature/></div>
  </div>;
}
