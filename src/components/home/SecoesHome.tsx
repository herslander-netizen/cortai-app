import { Link } from "@tanstack/react-router";
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
  Sparkles,
  Store,
  UserCog,
  Users,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";

import heroAsset from "@/assets/cortai-hero-barbearia.png.asset.json";
import lojaImg from "@/assets/landing-loja.jpg";
import ctaImg from "@/assets/landing-cta.jpg";
import { FaixaDeParceiros } from "@/components/institucional/FaixaDeParceiros";
import { Signature } from "@/components/layout/Signature";
import { Button } from "@/components/ui/button";
import type { AparenciaHome, HeroHome, SecaoHome } from "@/lib/home-publica";

const ICONES: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  agenda: CalendarDays,
  clientes: Users,
  financeiro: Banknote,
  fidelidade: Repeat2,
  loja: Store,
  equipe: UserCog,
  whatsapp: MessageCircle,
  relatorios: BarChart3,
  celular: Smartphone,
  rapido: Zap,
  simples: Check,
  marca: PackageCheck,
  barbeiro: Scissors,
  beneficio: CalendarCheck,
  outro: Sparkles,
};

const ICONES_ROTINA = [Smartphone, Zap, Check, PackageCheck, Scissors];

function Icone({ chave, ...props }: { chave?: string; size?: number; className?: string }) {
  const Componente = ICONES[chave ?? "outro"] ?? Sparkles;
  return <Componente {...props} />;
}

/** Botão que respeita destinos internos (/rota) e âncoras (#secao). */
function BotaoDestino({
  texto,
  destino,
  variante = "default",
  className,
}: {
  texto?: string;
  destino?: string;
  variante?: "default" | "ghost" | "outline" | "link";
  className?: string;
}) {
  if (!texto || !destino) return null;
  const conteudo = destino.startsWith("#") ? <a href={destino}>{texto}{variante === "ghost" ? <ArrowDown /> : <ArrowRight />}</a> : <Link to={destino}>{texto} <ArrowRight /></Link>;
  return (
    <Button asChild size="lg" variant={variante} className={className}>
      {conteudo}
    </Button>
  );
}

function Cabecalho({ etiqueta, titulo, texto, claro = false }: { etiqueta?: string; titulo?: string; texto?: string; claro?: boolean }) {
  return (
    <div className="max-w-2xl">
      {etiqueta ? <p className={claro ? "landing-kicker-light" : "landing-kicker"}>{etiqueta}</p> : null}
      {titulo ? <h2 className={claro ? "landing-heading-light" : "landing-heading"}>{titulo}</h2> : null}
      {texto ? <p className={claro ? "landing-copy-light" : "landing-copy"}>{texto}</p> : null}
    </div>
  );
}

const POSICAO_HERO: Record<HeroHome["imagemPosicao"], string> = {
  esquerda: "object-left",
  centro: "object-center",
  direita: "object-right",
  rosto: "object-[68%_center] md:object-[60%_center] lg:object-center",
};

export function SecaoHero({ hero }: { hero: HeroHome }) {
  if (!hero.ativo) return null;
  const centro = hero.alinhamento === "centro";
  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden">
      <img
        src={hero.imagem || heroAsset.url}
        alt="Barbeiro em uma barbearia premium com iluminação quente"
        width={1024}
        height={1536}
        fetchPriority="high"
        className={`absolute inset-0 h-full w-full object-cover ${POSICAO_HERO[hero.imagemPosicao]}`}
      />
      <div className="landing-hero-overlay absolute inset-0" style={{ opacity: hero.overlay / 55 }} />
      <div className="landing-reveal relative mx-auto w-full max-w-[var(--home-largura)] px-5 pb-10 pt-32 md:px-10 md:pb-16 lg:pb-20">
        <div className={centro ? "mx-auto max-w-[760px] text-center" : "max-w-[680px]"}>
          {hero.mostrarSelo && hero.etiqueta ? (
            <p className={`landing-hero-badge ${centro ? "mx-auto" : ""}`}>
              <Scissors size={13} /> {hero.etiqueta}
            </p>
          ) : null}
          <h1 className={`mt-5 text-[46px] font-bold leading-[1.01] text-paper sm:text-[56px] md:text-[74px] lg:text-[84px] ${centro ? "" : "max-w-[11ch]"}`}>
            {hero.titulo}
          </h1>
          {hero.texto ? (
            <p className={`mt-5 max-w-[590px] text-[15px] leading-7 text-paper/80 md:text-lg md:leading-8 ${centro ? "mx-auto" : ""}`}>{hero.texto}</p>
          ) : null}
          <div className={`mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center ${centro ? "sm:justify-center" : ""}`}>
            <BotaoDestino texto={hero.ctaTexto} destino={hero.ctaDestino} className="h-13 px-7 font-bold" />
            <BotaoDestino texto={hero.cta2Texto} destino={hero.cta2Destino} variante="ghost" className="h-13 justify-start px-2 text-paper sm:px-5" />
          </div>
        </div>
      </div>
    </section>
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
            {[["Atendimentos", "08"], ["Horários livres", "03"], ["A receber", "R$ 180"], ["Clientes ativos", "126"]].map(([label, value]) => (
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
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className={`flex h-7 w-7 items-center justify-center rounded-full border text-[9px] font-bold ${index < 3 ? "border-gold bg-gold text-ink" : "border-line2 text-mute"}`}>{index + 1}</span>
          ))}
        </div>
        <p className="mt-4 text-[10px] text-mute">Faltam 2 cortes para o prêmio.</p>
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

const BLOCO = "mx-auto max-w-[var(--home-largura)] px-5 md:px-10";
const ALTURA = { paddingTop: "var(--home-espaco)", paddingBottom: "var(--home-espaco)" };

/** Renderiza uma seção da Home a partir da configuração publicada. */
export function SecaoDaHome({ secao, aparencia }: { secao: SecaoHome; aparencia: AparenciaHome }) {
  if (!secao.ativo) return null;
  const claro = secao.tema === "claro";
  const itens = secao.itens ?? [];

  if (secao.tipo === "beneficios") {
    return (
      <section id="conhecer" className="scroll-mt-0 border-y border-line bg-ink2/90">
        <h2 className="sr-only">{secao.nome}</h2>
        <ul className={`mx-auto grid max-w-[var(--home-largura)] grid-cols-2 px-5 md:grid-cols-5 md:px-10`}>
          {itens.map((item, index) => (
            <li key={item.titulo + index} className={`landing-benefit ${index === itens.length - 1 && itens.length % 2 === 1 ? "col-span-2 md:col-span-1" : ""}`}>
              <Icone chave={item.icone} size={18} className="shrink-0 text-gold" />
              <span><b>{item.titulo}</b><small>{item.texto}</small></span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (secao.tipo === "produto") {
    return (
      <section id="como-funciona" className={`scroll-mt-0 ${claro ? "landing-light-section" : ""}`}>
        <div className={`grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-16 ${BLOCO}`} style={ALTURA}>
          <div>
            <Cabecalho claro={claro} etiqueta={secao.etiqueta} titulo={secao.titulo} texto={secao.texto} />
            {itens.length ? (
              <div className={`mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold ${claro ? "text-landing-light-muted" : "text-mute"}`}>
                {itens.map((item) => (
                  <span key={item.titulo} className="flex items-center gap-2">
                    <Check size={15} className={claro ? "text-landing-light-gold" : "text-gold"} /> {item.titulo}
                  </span>
                ))}
              </div>
            ) : null}
            {secao.ctaTexto && secao.ctaDestino ? (
              <BotaoDestino texto={secao.ctaTexto} destino={secao.ctaDestino} variante="link" className={`mt-7 h-auto p-0 ${claro ? "text-landing-light-ink" : "text-paper"}`} />
            ) : null}
          </div>
          <MockupCortai />
        </div>
      </section>
    );
  }

  if (secao.tipo === "recursos") {
    return (
      <section className={claro ? "landing-light-section" : ""}>
        <div className={BLOCO} style={ALTURA}>
          <Cabecalho claro={claro} etiqueta={secao.etiqueta} titulo={secao.titulo} texto={secao.texto} />
          <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {itens.map((item, index) => (
              <li key={item.titulo + index} className="landing-feature group bg-ink2 p-6 md:p-8">
                <div className="flex justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{item.icone ?? ""}</span>
                  <Icone chave={item.icone} size={18} className="text-mute transition-colors group-hover:text-gold" />
                </div>
                <h3 className="mt-10 max-w-[22ch] text-xl font-bold leading-tight text-paper md:text-2xl">{item.titulo}</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-mute">{item.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (secao.tipo === "voltai" || secao.tipo === "texto_imagem" || secao.tipo === "loja") {
    const ciclo = secao.tipo === "voltai" ? itens : [];
    return (
      <section className={`${claro ? "landing-light-section border-y border-landing-light-line" : "border-y border-line"}`}>
        <div className={`grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-20 ${BLOCO}`} style={ALTURA}>
          <div className="relative min-h-[420px] overflow-hidden rounded-lg md:min-h-[560px]">
            <img src={secao.imagem || lojaImg} alt={secao.titulo ?? "Barbearia"} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div>
            <Cabecalho claro={claro} etiqueta={secao.etiqueta} titulo={secao.titulo} texto={secao.texto} />
            {secao.tipo === "voltai" ? (
              <p className={`mt-7 inline-flex items-center gap-2 text-xs font-semibold ${claro ? "text-landing-light-ink" : "text-paper"}`}>
                <Repeat2 size={15} className={claro ? "text-landing-light-gold" : "text-gold"} /> Uma função do Cortaí, não outro aplicativo.
              </p>
            ) : null}
            {ciclo.length === 3 ? (
              <div className={`mt-9 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 border-t pt-7 ${claro ? "border-landing-light-line" : "border-line"}`}>
                {ciclo.map((etapa, index) => (
                  <div key={etapa.titulo} className="contents">
                    <div className="text-center">
                      <span className={index === 2
                        ? `mx-auto flex h-11 w-11 items-center justify-center rounded-full text-xs font-bold ${claro ? "bg-landing-light-gold text-landing-light-surface" : "bg-gold text-ink"}`
                        : `mx-auto flex h-11 w-11 items-center justify-center rounded-full border text-xs font-bold ${claro ? "border-landing-light-line text-landing-light-ink" : "border-line2 text-paper"}`}>0{index + 1}</span>
                      <p className={`mt-3 text-xs font-semibold ${claro ? "text-landing-light-ink" : "text-paper"}`}>{etapa.titulo}</p>
                    </div>
                    {index < 2 ? <ArrowRight className={claro ? "text-landing-light-muted" : "text-mute"} size={16} /> : null}
                  </div>
                ))}
              </div>
            ) : null}
            {secao.ctaTexto && secao.ctaDestino ? (
              <BotaoDestino texto={secao.ctaTexto} destino={secao.ctaDestino} variante="link" className={`mt-7 h-auto p-0 ${claro ? "text-landing-light-ink" : "text-paper"}`} />
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (secao.tipo === "telas") {
    return (
      <section className={claro ? "landing-light-section" : ""}>
        <div className={BLOCO} style={ALTURA}>
          <Cabecalho claro={claro} etiqueta={secao.etiqueta} titulo={secao.titulo} texto={secao.texto} />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(["agenda", "clientes", "caixa", "voltai"] as const).map((tipo, index) => (
              <figure key={tipo} className="landing-interface">
                <TelaProduto tipo={tipo} />
                <figcaption className="mt-3 text-xs font-semibold text-mute">
                  {["Agenda, horários e fila", "Clientes e frequência", "Caixa e financeiro", "Fidelidade Voltaí"][index]}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (secao.tipo === "rotina") {
    return (
      <section className="relative overflow-hidden border-y border-line" style={ALTURA}>
        <img src={secao.imagem || lojaImg} alt="Ambiente e produtos de uma barbearia" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-ink/85" />
        <div className={`relative ${BLOCO}`}>
          <Cabecalho etiqueta={secao.etiqueta} titulo={secao.titulo} texto={secao.texto} />
          <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-5">
            {itens.map((item, index) => (
              <li key={item.titulo} className="flex min-h-28 flex-col justify-between bg-ink2/95 p-5">
                <Icone chave={item.icone} size={18} className="text-gold" />
                {(() => {
                  const Fallback = ICONES_ROTINA[index % ICONES_ROTINA.length]!;
                  return item.icone ? null : <Fallback size={0} className="hidden" />;
                })()}
                <span className="mt-5 text-sm font-semibold text-paper">{item.titulo}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (secao.tipo === "cta") {
    return (
      <section className="relative flex min-h-[600px] items-end overflow-hidden">
        <img src={secao.imagem || ctaImg} alt="Cadeira de barbeiro em uma barbearia premium" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/65 to-ink/20" />
        <div className={`relative w-full pb-16 md:pb-20 ${BLOCO}`}>
          <h2 className="max-w-2xl text-[38px] font-bold leading-[1.04] text-paper md:text-[58px]">{secao.titulo}</h2>
          {secao.texto ? <p className="mt-5 max-w-lg text-sm leading-7 text-paper/75 md:text-base">{secao.texto}</p> : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <BotaoDestino texto={secao.ctaTexto} destino={secao.ctaDestino} className="h-13 px-7 font-bold" />
            <BotaoDestino texto={secao.cta2Texto} destino={secao.cta2Destino} variante="outline" className="h-13 border-paper/25 bg-ink/40 px-7 text-paper hover:bg-ink2" />
          </div>
        </div>
      </section>
    );
  }

  if (secao.tipo === "parceiros") {
    return <div className={BLOCO}><FaixaDeParceiros /></div>;
  }

  if (secao.tipo === "rodape") {
    return <div className="mx-auto max-w-[var(--home-largura)]"><Signature /></div>;
  }

  void aparencia;
  return null;
}
