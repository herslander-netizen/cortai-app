import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Gift,
  Link2,
  Package,
  Palette,
  Search,
  Store,
  UserRound,
  Users,
} from "lucide-react";

import { FaixaDeParceiros } from "@/components/institucional/FaixaDeParceiros";
import { CardInstalar } from "@/components/pwa/CardInstalar";
import { Signature } from "@/components/layout/Signature";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import heroMobile from "@/assets/landing-hero-720.webp.asset.json";
import heroDesktop from "@/assets/landing-hero-1400.webp.asset.json";
import agendaMobile from "@/assets/landing-agenda-640.webp.asset.json";
import agendaDesktop from "@/assets/landing-agenda-1200.webp.asset.json";
import lojaMobile from "@/assets/landing-loja-640.webp.asset.json";
import lojaDesktop from "@/assets/landing-loja-1200.webp.asset.json";
import ctaMobile from "@/assets/landing-cta-640.webp.asset.json";
import ctaDesktop from "@/assets/landing-cta-1400.webp.asset.json";

export const Route = createFileRoute("/apresentacao")({
  head: () => ({
    meta: [
      { title: "Conhecer o Cortaí — sua barbearia, no controle" },
      {
        name: "description",
        content: "Agenda • Clientes • Loja • Fidelidade — tudo com a cara da sua barbearia.",
      },
      { property: "og:title", content: "Cortaí" },
      {
        property: "og:description",
        content: "Sua barbearia, no controle. Agenda • Clientes • Loja • Fidelidade.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://cortai.dev/og-cortai.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "640" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://cortai.dev/og-cortai.jpg" },
    ],
    links: [{ rel: "preload", as: "image", href: heroMobile.url, fetchPriority: "high" }],
  }),
  component: Inicio,
});

const BENEFICIOS = [
  { icone: CalendarCheck, titulo: "Agendamento online", texto: "O cliente marca sozinho, a qualquer hora." },
  { icone: CalendarDays, titulo: "Agenda inteligente", texto: "Horários, profissionais e encaixes no mesmo painel." },
  { icone: Users, titulo: "Clientes", texto: "Perfil, histórico e preferências de cada um." },
  { icone: Store, titulo: "Loja e produtos", texto: "Venda produtos direto pela sua página." },
  { icone: Gift, titulo: "Fidelidade", texto: "Cartão digital que traz o cliente de volta." },
  { icone: UserRound, titulo: "Atendimento presencial", texto: "Fila de espera e quem chegou na barbearia." },
];

const RECURSOS = [
  { icone: CalendarDays, texto: "Agenda por profissional e agendamento manual" },
  { icone: UserRound, texto: "Fila de espera para quem chega sem marcar" },
  { icone: Users, texto: "Ficha do cliente com histórico de atendimentos" },
  { icone: Package, texto: "Estoque interno separado da loja pública" },
  { icone: Gift, texto: "Fidelidade configurável, com ativar e desativar" },
  { icone: Palette, texto: "Logo, capa, cores e informações da barbearia" },
  { icone: Link2, texto: "Link público para compartilhar no WhatsApp" },
  { icone: BarChart3, texto: "Caixa, financeiro e indicadores de crescimento" },
];

function Secao({
  etiqueta,
  titulo,
  texto,
  destaque,
  imagem,
  imagemMobile,
  alt,
  invertido = false,
}: {
  etiqueta: string;
  titulo: string;
  texto: string;
  destaque?: string;
  imagem?: string;
  imagemMobile?: string;
  alt?: string;
  invertido?: boolean;
}) {
  return (
    <section className="render-later mt-16 first:mt-0">
      <div className={`grid gap-6 md:grid-cols-2 md:items-center ${invertido ? "md:[&>figure]:order-last" : ""}`}>
        {imagem ? (
          <figure className="overflow-hidden rounded-2xl border border-line">
            <img
              src={imagem}
              srcSet={imagemMobile ? `${imagemMobile} 640w, ${imagem} 1200w` : undefined}
              sizes="(max-width: 767px) calc(100vw - 40px), 430px"
              alt={alt ?? ""}
              width={1200}
              height={912}
              loading="lazy"
              className="h-52 w-full object-cover md:h-64"
            />
          </figure>
        ) : null}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{etiqueta}</p>
          <h2 className="mt-2 text-[24px] font-bold leading-tight text-paper md:text-[28px]">{titulo}</h2>
          <p className="mt-3 text-sm leading-relaxed text-mute">{texto}</p>
          {destaque ? (
            <p className="mt-4 rounded-xl border border-gold/30 bg-gold-soft px-4 py-3 text-sm font-semibold text-gold">
              {destaque}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Inicio() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-4 px-5 pt-6">
        <MarcaCortai tamanho="md" />
        <Link to="/login" className="text-sm font-semibold text-paper">
          Entrar
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[900px] px-5 pb-10">
        {/* HERO */}
        <section className="relative mt-8 overflow-hidden rounded-2xl border border-line">
          <img
            src={heroDesktop.url}
            srcSet={`${heroMobile.url} 720w, ${heroDesktop.url} 1400w`}
            sizes="(max-width: 940px) calc(100vw - 40px), 900px"
            alt="Barbeiro atendendo um cliente em uma barbearia moderna de estética preta e dourada"
            width={1400}
            height={966}
            fetchPriority="high"
            className="h-[420px] w-full object-cover md:h-[520px]"
          />
          <div className="absolute inset-0 bg-ink/55" />
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-ink/75" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
            <h1 className="max-w-[12ch] text-[34px] font-bold leading-[1.05] text-paper md:text-[48px]">
              Sua barbearia, no controle.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-mute md:text-base">
              Agenda, clientes, loja e fidelidade em um só lugar — com a sua marca na frente.
            </p>
            <div className="mt-6 flex max-w-md flex-col items-start gap-3 sm:flex-row sm:items-center">
              <a
                href="#conhecer"
                className="cta-premium"
              >
                Conhecer o Cortaí
                <ArrowDown size={14} aria-hidden />
              </a>
              <Link
                to="/barbearias"
                className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 py-2 text-xs font-semibold text-mute transition-colors hover:text-paper"
              >
                <Search size={15} aria-hidden />
                Encontrar uma barbearia
              </Link>
            </div>
          </div>
        </section>

        {/* BENEFÍCIO IMEDIATO */}
        <section id="conhecer" className="scroll-mt-6 pt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Tudo em um app</p>
          <h2 className="mt-2 text-[26px] font-bold leading-tight text-paper">
            O que sua barbearia passa a ter.
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {BENEFICIOS.map((item) => {
              const Icone = item.icone;
              return (
                <li
                  key={item.titulo}
                  className="rounded-lg border border-line bg-ink2 px-4 py-4 transition-colors hover:border-line2"
                >
                  <Icone size={18} className="text-gold" aria-hidden />
                  <span className="mt-3 block text-sm font-semibold text-paper">{item.titulo}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-mute">{item.texto}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* AGENDA */}
        <Secao
          etiqueta="Agenda"
          titulo="O dia inteiro numa tela só."
          texto="Veja horários por profissional, abra encaixes e registre atendimentos na hora, sem caderno e sem perder ninguém."
          destaque="Marque também quem chegou na barbearia."
          imagem={agendaDesktop.url}
          imagemMobile={agendaMobile.url}
          alt="Barbeiro fazendo um degradê com máquina dourada"
        />

        {/* CLIENTES */}
        <Secao
          etiqueta="Clientes"
          titulo="Cada cliente com a própria ficha."
          texto="Histórico de cortes, preferências, observações e o que ele costuma consumir — para atender do jeito que ele gosta na próxima visita."
          invertido
        />

        {/* LOJA + ESTOQUE */}
        <Secao
          etiqueta="Loja e estoque"
          titulo="Controle o estoque, escolha o que vende."
          texto="Cadastre seus produtos, acompanhe o que entra e sai e publique na loja apenas o que você quer vender."
          destaque="Venda produtos sem misturar com seu estoque interno."
          imagem={lojaDesktop.url}
          imagemMobile={lojaMobile.url}
          alt="Produtos masculinos de barbearia sobre superfície escura"
        />

        {/* FIDELIDADE */}
        <Secao
          etiqueta="Fidelidade"
          titulo="Ligue quando quiser. Do seu jeito."
          texto="Defina quantos cortes valem um grátis, veja o desconto real antes de ativar e escolha quem participa do programa."
          invertido
        />

        {/* LINK DA BARBEARIA */}
        <Secao
          etiqueta="Link da barbearia"
          titulo="Um link só, bonito, que agenda por você."
          texto="Seu cliente escolhe serviço, profissional, dia e horário em poucos toques. Compartilhe no WhatsApp, no Instagram ou na porta da loja."
          imagem={ctaDesktop.url}
          imagemMobile={ctaMobile.url}
          alt="Cadeira de barbeiro preta com detalhes dourados"
        />

        {/* PERSONALIZAÇÃO */}
        <Secao
          etiqueta="Personalização"
          titulo="A página é sua, não nossa."
          texto="Logo, capa, cores permitidas, informações, serviços, profissionais e horários: tudo configurado pela própria barbearia."
          invertido
        />

        {/* RECURSOS */}
        <section className="render-later mt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Recursos</p>
          <h2 className="mt-2 text-[26px] font-bold leading-tight text-paper">Já está tudo pronto.</h2>
          <ul className="mt-6 grid gap-2 md:grid-cols-2">
            {RECURSOS.map((item) => {
              const Icone = item.icone;
              return (
                <li key={item.texto} className="flex items-center gap-3 rounded-lg border border-line bg-ink2 px-4 py-3">
                  <Icone size={16} className="shrink-0 text-gold" aria-hidden />
                  <span className="text-sm text-paper">{item.texto}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* CTA FINAL */}
        <section className="render-later mt-16 rounded-xl border border-line bg-ink2 px-6 py-10 text-center">
          <h2 className="text-[24px] font-bold leading-tight text-paper">
            Pronto para colocar sua barbearia no Cortaí?
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-mute">
            Crie sua barbearia em poucos minutos e comece a receber agendamentos hoje.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/comecar" className="flex h-12 items-center rounded-lg bg-gold px-6 text-sm font-bold text-ink">
              Cadastrar minha barbearia
            </Link>
            <Link
              to="/barbearias"
              className="flex h-12 items-center rounded-lg border border-line2 px-6 text-sm font-semibold text-paper"
            >
              Sou cliente
            </Link>
          </div>
        </section>

        <CardInstalar className="mt-8" />

        <FaixaDeParceiros />
      </main>

      <div className="mx-auto w-full max-w-[900px]">
        <Signature mostrarRedesSociais />
      </div>
    </div>
  );
}
