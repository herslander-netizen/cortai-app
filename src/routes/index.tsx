import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Banknote,
  Boxes,
  CalendarCheck,
  CalendarDays,
  Check,
  Gift,
  MessageCircle,
  PackageCheck,
  Repeat2,
  Scissors,
  Smartphone,
  Store,
  UserCog,
  Users,
  Zap,
} from "lucide-react";

import heroImg from "@/assets/landing-hero.jpg";
import lojaImg from "@/assets/landing-loja.jpg";
import ctaImg from "@/assets/landing-cta.jpg";
import { FaixaDeParceiros } from "@/components/institucional/FaixaDeParceiros";
import { Signature } from "@/components/layout/Signature";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cortaí — sua barbearia, no controle" },
      {
        name: "description",
        content: "Agenda, clientes, caixa, loja, estoque e fidelidade para sua barbearia crescer com controle.",
      },
      { property: "og:title", content: "Cortaí — sua barbearia, no controle" },
      { property: "og:description", content: "A plataforma completa para controlar e fazer sua barbearia crescer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inicio,
});

const BENEFICIOS = [
  { icone: CalendarCheck, titulo: "Agenda", texto: "Horários organizados" },
  { icone: Users, titulo: "Clientes", texto: "Histórico e recorrência" },
  { icone: Banknote, titulo: "Financeiro", texto: "Caixa sob controle" },
  { icone: Repeat2, titulo: "Fidelidade", texto: "Clientes que voltam" },
  { icone: Store, titulo: "Sua marca", texto: "Sempre na frente" },
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
  { icone: Smartphone, texto: "No celular" },
  { icone: Zap, texto: "Rápido de usar" },
  { icone: Check, texto: "Sem complicação" },
  { icone: PackageCheck, texto: "Sua marca na frente" },
  { icone: Scissors, texto: "Feito para o barbeiro" },
];

function Cabecalho({
  etiqueta,
  titulo,
  texto,
  claro = false,
}: {
  etiqueta: string;
  titulo: string;
  texto?: string;
  claro?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p className={claro ? "landing-kicker-light" : "landing-kicker"}>{etiqueta}</p>
      <h2 className={claro ? "landing-heading-light" : "landing-heading"}>{titulo}</h2>
      {texto ? <p className={claro ? "landing-copy-light" : "landing-copy"}>{texto}</p> : null}
    </div>
  );
}

function MockupCortai() {
  return (
    <div className="landing-device-stage" aria-label="Exemplo da interface de gestão do Cortaí">
      <div className="landing-device-card landing-device-card-left" aria-hidden>
        <p className="text-[9px] font-bold uppercase text-gold">Agenda de hoje</p>
        <p className="mt-2 text-2xl font-bold text-paper">8 horários</p>
        <div className="mt-5 space-y-3">
          {["09:00 · Corte + barba", "10:30 · Corte", "11:15 · Horário livre"].map((item, index) => (
            <div key={item} className="flex items-center gap-3 border-b border-line pb-3 text-[10px] text-mute">
              <span className={index === 2 ? "h-2 w-2 rounded-full bg-mute2" : "h-2 w-2 rounded-full bg-gold"} />
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="landing-phone">
        <div className="landing-phone-speaker" />
        <div className="landing-phone-screen">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-bold uppercase text-gold">Cortaí Gestão</p>
              <p className="mt-1 text-sm font-bold text-paper">Bom dia, Matheus</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink3 text-gold"><Scissors size={14} /></span>
          </div>
          <div className="mt-5 rounded-lg bg-ink3 p-4">
            <p className="text-[9px] text-mute">Faturamento de hoje</p>
            <p className="mt-1 text-2xl font-bold text-paper">R$ 1.240</p>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-line"><div className="h-full w-3/4 rounded-full bg-gold" /></div>
            <p className="mt-2 text-[8px] text-mute">75% da agenda ocupada</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[['Atendimentos', '08'], ['Horários livres', '03'], ['A receber', 'R$ 180'], ['Clientes ativos', '126']].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-ink2 p-3">
                <p className="text-[8px] text-mute">{label}</p>
                <p className="mt-1 text-sm font-bold text-paper">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-[8px] text-mute">
            <span className="text-gold">Início</span><span>Agenda</span><Scissors size={13} className="text-gold" /><span>Clientes</span><span>Mais</span>
          </div>
        </div>
      </div>

      <div className="landing-device-card landing-device-card-right" aria-hidden>
        <div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase text-gold">Voltaí</p><Gift size={16} className="text-gold" /></div>
        <p className="mt-3 text-base font-bold text-paper">Clientes que voltam.</p>
        <div className="mt-5 flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => <span key={index} className={index < 3 ? "h-7 w-7 rounded-full bg-gold" : "h-7 w-7 rounded-full border border-line2"} />)}
        </div>
        <p className="mt-4 text-[10px] text-mute">3 de 5 cortes concluídos</p>
      </div>
    </div>
  );
}

function TelaProduto({ tipo }: { tipo: "agenda" | "clientes" | "caixa" | "voltai" }) {
  if (tipo === "agenda") return <div className="landing-product-screen"><div className="border-b border-line px-4 py-3"><p className="text-[10px] font-bold uppercase text-gold">Cortaí Gestão</p><p className="mt-1 text-sm font-bold text-paper">Agenda</p></div><div className="space-y-2 p-4">{[["09:00", "Carlos", "Corte + barba"], ["10:00", "Horário livre", "Oferecer à fila"], ["11:30", "Rafael", "Corte degradê"]].map((item, index) => <div key={item[0]} className={`grid grid-cols-[48px_1fr] gap-3 border-l-2 px-3 py-2 ${index === 1 ? "border-line2" : "border-gold"}`}><span className="text-xs font-semibold text-mute">{item[0]}</span><span><b className="block text-xs text-paper">{item[1]}</b><small className="text-mute">{item[2]}</small></span></div>)}</div></div>;
  if (tipo === "clientes") return <div className="landing-product-screen"><div className="border-b border-line px-4 py-3"><p className="text-[10px] font-bold uppercase text-gold">Clientes</p><p className="mt-1 text-sm font-bold text-paper">Na hora de voltar</p></div><div className="p-4"><p className="text-[11px] text-mute">Voltaí acompanha a frequência de cada cliente.</p>{["Cliente recorrente", "Cliente em retorno", "Contato recente"].map((nome, index) => <div key={nome} className="mt-3 flex items-center justify-between border-b border-line pb-2"><span><b className="block text-xs text-paper">{nome}</b><small className="text-mute">A cada {22 + index * 5} dias</small></span><em className={index === 1 ? "text-[9px] not-italic text-gold" : "text-[9px] not-italic text-sage"}>{index === 1 ? "EM RETORNO" : "RECORRENTE"}</em></div>)}</div></div>;
  if (tipo === "caixa") return <div className="landing-product-screen"><div className="border-b border-line px-4 py-3"><p className="text-[10px] font-bold uppercase text-gold">Financeiro</p><p className="mt-1 text-sm font-bold text-paper">Visão do mês</p></div><div className="p-4"><p className="text-[10px] text-mute">Faturamento</p><p className="mt-1 text-2xl font-bold text-paper">R$ 8.420</p><div className="mt-4 h-1.5 rounded-full bg-ink3"><div className="h-full w-3/4 rounded-full bg-gold" /></div><div className="mt-5 grid grid-cols-2 gap-2">{[["Serviços", "R$ 6.980"], ["Produtos", "R$ 1.440"]].map((item) => <div key={item[0]} className="rounded-md bg-ink3 p-3"><small className="text-mute">{item[0]}</small><b className="mt-1 block text-xs text-paper">{item[1]}</b></div>)}</div></div></div>;
  return <div className="landing-product-screen"><div className="flex items-center justify-between border-b border-line px-4 py-3"><div><p className="text-[10px] font-bold uppercase text-gold">Voltaí</p><p className="mt-1 text-sm font-bold text-paper">Fidelidade do Cortaí</p></div><Gift size={18} className="text-gold" /></div><div className="p-4"><p className="text-[11px] text-mute">Progresso para o próximo corte</p><div className="mt-4 flex gap-2">{Array.from({ length: 6 }).map((_, index) => <span key={index} className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold ${index < 4 ? "border-gold bg-gold text-ink" : "border-line2 text-mute"}`}>{index + 1}</span>)}</div><p className="mt-4 text-xs font-semibold text-paper">Faltam 2 cortes para ganhar.</p></div></div>;
}

function Inicio() {
  return (
    <div className="landing-page min-h-screen overflow-hidden bg-ink">
      <header className="absolute inset-x-0 top-0 z-20 mx-auto grid w-full max-w-[1280px] grid-cols-[minmax(0,1fr)_auto] items-center gap-5 px-5 py-5 md:px-10 md:py-7">
        <MarcaCortai variante="escura" className="h-auto w-32 md:w-40" prioridade />
        <Button asChild variant="ghost" className="text-paper hover:bg-paper/10"><Link to="/login">Entrar</Link></Button>
      </header>

      <main>
        <section className="relative flex min-h-[100svh] items-end overflow-hidden">
          <img src={heroImg} alt="Barbeiro atendendo um cliente em uma barbearia premium" width={1114} height={768} className="absolute inset-0 h-full w-full object-cover object-[57%_center] md:object-center" />
          <div className="landing-hero-overlay absolute inset-0" />
          <div className="landing-reveal relative mx-auto w-full max-w-[1280px] px-5 pb-10 pt-32 md:px-10 md:pb-16 lg:pb-20">
            <div className="max-w-[680px]">
              <p className="landing-hero-badge"><Scissors size={13} /> Gestão completa para barbearias</p>
              <h1 className="mt-5 max-w-[11ch] text-[46px] font-bold leading-[1.01] text-paper sm:text-[56px] md:text-[74px] lg:text-[84px]">Sua barbearia, no controle.</h1>
              <p className="mt-5 max-w-[590px] text-[15px] leading-7 text-paper/80 md:text-lg md:leading-8">Agenda, clientes, caixa, loja e fidelidade em um só lugar — com a sua marca na frente.</p>
              <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="h-13 px-7 font-bold"><a href="#conhecer">Conhecer o Cortaí <ArrowRight /></a></Button>
                <Button asChild size="lg" variant="ghost" className="h-13 justify-start px-2 text-paper sm:px-5"><a href="#como-funciona">Ver como funciona <ArrowDown /></a></Button>
              </div>
            </div>
          </div>
        </section>

        <section id="conhecer" className="scroll-mt-0 border-y border-line bg-ink2/90">
          <h2 className="sr-only">Benefícios do Cortaí</h2>
          <ul className="mx-auto grid max-w-[1280px] grid-cols-2 px-5 md:grid-cols-5 md:px-10">
            {BENEFICIOS.map((item, index) => {
              const Icone = item.icone;
              return <li key={item.titulo} className={`landing-benefit ${index === BENEFICIOS.length - 1 ? "col-span-2 md:col-span-1" : ""}`}><Icone size={18} className="shrink-0 text-gold" /><span><b>{item.titulo}</b><small>{item.texto}</small></span></li>;
            })}
          </ul>
        </section>

        <section id="como-funciona" className="landing-light-section scroll-mt-0">
          <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-16 lg:py-32">
            <div>
              <Cabecalho claro etiqueta="Um sistema. Toda a operação." titulo="Gestão completa para o seu negócio" texto="Da agenda ao relacionamento com seus clientes, o Cortaí organiza a rotina sem tirar o foco do que importa: o atendimento." />
              <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-landing-light-muted">
                <span className="flex items-center gap-2"><Check size={15} className="text-landing-light-gold" /> Simples no celular</span>
                <span className="flex items-center gap-2"><Check size={15} className="text-landing-light-gold" /> Visão clara do negócio</span>
              </div>
              <Button asChild variant="link" className="mt-7 h-auto p-0 text-landing-light-ink"><Link to="/comecar">Começar agora <ArrowRight /></Link></Button>
            </div>
            <MockupCortai />
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-20 md:px-10 md:py-28">
          <Cabecalho etiqueta="Tudo que sua barbearia precisa" titulo="Do primeiro horário ao fechamento do caixa." texto="O Cortaí reúne a rotina da cadeira e a visão do negócio. Fila é parte da Agenda. Voltaí é a fidelidade. Tudo na mesma plataforma." />
          <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {FUNCIONALIDADES.map((item) => {
              const Icone = item.icone;
              return <li key={item.etiqueta} className="landing-feature group bg-ink2 p-6 md:p-8"><div className="flex justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{item.etiqueta}</span><Icone size={18} className="text-mute transition-colors group-hover:text-gold" /></div><h3 className="mt-10 max-w-[22ch] text-xl font-bold leading-tight text-paper md:text-2xl">{item.titulo}</h3><p className="mt-3 max-w-md text-sm leading-6 text-mute">{item.texto}</p></li>;
            })}
          </ul>
        </section>

        <section className="landing-light-section border-y border-landing-light-line">
          <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-20">
            <div className="relative min-h-[420px] overflow-hidden rounded-lg md:min-h-[560px]">
              <img src={lojaImg} alt="Produtos de barbearia organizados para venda" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <div>
              <Cabecalho claro etiqueta="Voltaí" titulo="Seu cliente corta. Ganha. Volta." texto="Uma fidelidade simples de entender e fácil de acompanhar. Você define a regra, o Cortaí mostra o progresso e o cliente tem mais um motivo para voltar." />
              <p className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-landing-light-ink"><Repeat2 size={15} className="text-landing-light-gold" /> Uma função do Cortaí, não outro aplicativo.</p>
              <div className="mt-9 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 border-t border-landing-light-line pt-7">
                {["Corta", "Ganha", "Volta"].map((texto, index) => <div key={texto} className="contents"><div className="text-center"><span className={index === 2 ? "mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-landing-light-gold text-xs font-bold text-landing-light-surface" : "mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-landing-light-line text-xs font-bold text-landing-light-ink"}>0{index + 1}</span><p className="mt-3 text-xs font-semibold text-landing-light-ink">{texto}</p></div>{index < 2 ? <ArrowRight className="text-landing-light-muted" size={16} /> : null}</div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-20 md:px-10 md:py-28">
          <Cabecalho etiqueta="Por dentro do Cortaí" titulo="O controle que você usa de verdade." texto="Visualizações baseadas nos módulos que já existem na área de gestão do Cortaí." />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(["agenda", "clientes", "caixa", "voltai"] as const).map((tipo, index) => <figure key={tipo} className="landing-interface"><TelaProduto tipo={tipo} /><figcaption className="mt-3 text-xs font-semibold text-mute">{["Agenda, horários e fila", "Clientes e frequência", "Caixa e financeiro", "Fidelidade Voltaí"][index]}</figcaption></figure>)}
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-line py-20 md:py-28">
          <img src={lojaImg} alt="Ambiente e produtos de uma barbearia" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-ink/85" />
          <div className="relative mx-auto max-w-[1280px] px-5 md:px-10">
            <Cabecalho etiqueta="Feito para a rotina da barbearia" titulo="Profissional sem ficar complicado." />
            <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-5">
              {ROTINA.map((item) => { const Icone = item.icone; return <li key={item.texto} className="flex min-h-28 flex-col justify-between bg-ink2/95 p-5"><Icone size={18} className="text-gold" /><span className="mt-5 text-sm font-semibold text-paper">{item.texto}</span></li>; })}
            </ul>
          </div>
        </section>

        <section className="relative flex min-h-[600px] items-end overflow-hidden">
          <img src={ctaImg} alt="Cadeira de barbeiro em uma barbearia premium" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/65 to-ink/20" />
          <div className="relative mx-auto w-full max-w-[1280px] px-5 pb-16 md:px-10 md:pb-20">
            <h2 className="max-w-2xl text-[38px] font-bold leading-[1.04] text-paper md:text-[58px]">Pronto para colocar sua barbearia no Cortaí?</h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-paper/75 md:text-base">Organize a rotina, acompanhe o negócio e mantenha sua marca na frente.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-13 px-7 font-bold"><Link to="/comecar">Começar agora <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline" className="h-13 border-paper/25 bg-ink/40 px-7 text-paper hover:bg-ink2"><Link to="/barbearias">Encontrar uma barbearia</Link></Button>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1280px] px-5 md:px-10"><FaixaDeParceiros /></div>
      </main>
      <div className="mx-auto max-w-[1280px]"><Signature /></div>
    </div>
  );
}