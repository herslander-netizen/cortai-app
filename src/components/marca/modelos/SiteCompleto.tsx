import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Flame,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Star,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import coverBarbearia from "@/assets/cortai-barbershop-cover.jpg.asset.json";
import coverNeutra from "@/assets/flow-capa-neutra.png.asset.json";
import { IconeDaRede } from "@/components/marca/editor/IconesDasRedes";
import { LogoBarbearia } from "@/components/marca/LogoBarbearia";
import { brl } from "@/lib/format";
import { MOLA } from "@/lib/movimento-figaro";
import { estruturaDoTema, type PaginaConfig } from "@/lib/pagina-config";
import type { PaginaPublica } from "@/lib/publico.functions";
import { linkDaRede } from "@/lib/redes-do-negocio";
import { termos } from "@/lib/segmentos";

export type PropsDoModelo = {
  data: PaginaPublica;
  config: PaginaConfig;
  preview: boolean;
  /** Botão de agendar já resolvido pela página (link do fluxo, WhatsApp ou aviso). */
  renderAgendar: (classe: string, rotulo?: string, servicoId?: string) => ReactNode;
  linkContato: string | null;
  contatoEhWhatsapp: boolean;
  acoesRef: React.RefObject<HTMLDivElement | null>;
  finalRef: React.RefObject<HTMLElement | null>;
  /** "agendamento" = layout focado no agendamento rápido: abertura curta e só os serviços. */
  variante?: "completo" | "agendamento";
};

const nomeCurto = (nome: string) => {
  const [primeiro, ...resto] = nome.trim().split(/\s+/);
  const ultimo = resto[resto.length - 1];
  return ultimo ? `${primeiro} ${ultimo.charAt(0)}.` : (primeiro ?? nome);
};

function mediaPtBr(media: number | null) {
  return (media ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Grupo do acordeão de serviços: "Mais procurados 🔥" e uma categoria por grupo, como no Figaro. */
function GrupoDeServicos({
  titulo,
  contagem,
  destaque,
  abertoInicial,
  children,
}: {
  titulo: string;
  contagem?: number;
  destaque?: boolean;
  abertoInicial: boolean;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  const reduzir = useReducedMotion();
  return (
    <div className="fg-grupo">
      <button
        type="button"
        className="fg-grupo-cabecalho"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
      >
        <span>
          {titulo}
          {contagem !== undefined ? <small> · {contagem}</small> : null}
          {destaque ? <Flame size={16} className="fg-chama" aria-hidden /> : null}
        </span>
        <motion.span
          animate={{ rotate: aberto ? 180 : 0 }}
          transition={reduzir ? { duration: 0 } : MOLA.setaAcordeao}
        >
          <ChevronDown size={22} aria-hidden />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: aberto ? "auto" : 0, opacity: aberto ? 1 : 0 }}
        transition={reduzir ? { duration: 0 } : { height: MOLA.tamanho, opacity: MOLA.tamanho }}
        style={{ overflow: "hidden" }}
        inert={!aberto}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Modelo "Site Completo" do Figaro (landing_peek_site do APK): topo com nome e menu, abertura em tela
 * cheia com título, texto e botão, e depois Equipe, Serviços em acordeão ("Mais procurados" e categorias),
 * Galeria de Fotos, Avaliações, Localização, Contato e Redes. Os três temas mudam fonte, cor e forma do
 * botão; o Rock n' Roll ainda corta o fim da abertura em diagonal, com a faixa laranja.
 */
export function SiteCompleto({
  data,
  config,
  preview,
  renderAgendar,
  linkContato,
  contatoEhWhatsapp,
  acoesRef,
  finalRef,
  variante = "completo",
}: PropsDoModelo) {
  const { tenant } = data;
  const [menuAberto, setMenuAberto] = useState(false);
  const reduzir = useReducedMotion();
  const vocabulario = termos(tenant.segmento);
  const rapido = variante === "agendamento";
  const estrutura = estruturaDoTema(config.tema);
  const on = config.componentes;
  const sec = config.secoes;
  const instagram = tenant.instagram?.replace(/^@/, "") || null;
  const capa =
    tenant.capa_signed_url ??
    (tenant.segmento === "barbearia" ? coverBarbearia.url : coverNeutra.url);
  const extras = (["tiktok", "youtube", "site"] as const)
    .map((r) => ({ r, href: linkDaRede(r, config.redes?.[r]) }))
    .filter((x): x is { r: "tiktok" | "youtube" | "site"; href: string } => Boolean(x.href));

  const populares = sec.servicos.populares
    ? [...data.servicos]
        .filter((s) => s.popularidade > 0)
        .sort((a, b) => b.popularidade - a.popularidade)
        .slice(0, 3)
    : [];
  const porCategoria = new Map<string, PaginaPublica["servicos"]>();
  for (const s of data.servicos) {
    const chave = s.categoria?.trim() || "Outros";
    porCategoria.set(chave, [...(porCategoria.get(chave) ?? []), s]);
  }
  const linhaDeServico = (s: PaginaPublica["servicos"][number]) => (
    <li key={s.id} className="fg-servico">
      <div>
        <h3>{s.nome}</h3>
        <p>
          {brl(s.preco_centavos)}
          <span>
            <Clock3 size={14} aria-hidden /> {s.duracao_min} min
          </span>
        </p>
      </div>
      {renderAgendar("fg-btn-linha", "Agendar", s.id)}
    </li>
  );

  const cartaDeServico = (s: PaginaPublica["servicos"][number]) => (
    <li key={s.id} className="fg-carta">
      <h4>{s.nome}</h4>
      <span className="fg-preco">{brl(s.preco_centavos)}</span>
      <small>
        <Clock3 size={14} aria-hidden /> {s.duracao_min} min
      </small>
      {renderAgendar("fg-btn-linha", "Agendar", s.id)}
    </li>
  );

  const temServicos = on.servicos && data.servicos.length > 0;
  const temEquipe = !rapido && on.profissionais && data.profissionais.length > 0;
  const temGaleria = !rapido && on.galeria && tenant.fotos_signed_urls.length > 0;
  const temAvaliacoes = !rapido && on.avaliacoes && data.avaliacoes.quantidade > 0;
  const temLocal = !rapido && on.localizacao && Boolean(tenant.endereco);
  const temContato = !rapido && on.whatsapp && Boolean(linkContato);
  const temRedes = !rapido && on.instagram && (Boolean(instagram) || extras.length > 0);
  const ancoras = [
    temEquipe && { id: "fg-equipe", nome: "Equipe" },
    temServicos && { id: "fg-servicos", nome: "Serviços" },
    temGaleria && { id: "fg-galeria", nome: sec.galeria.titulo || "Galeria de Fotos" },
    temAvaliacoes && { id: "fg-avaliacoes", nome: "Avaliações" },
    temLocal && { id: "fg-local", nome: "Localização" },
    temContato && { id: "fg-contato", nome: "Contato" },
  ].filter(Boolean) as { id: string; nome: string }[];

  const ir = (id: string) => {
    setMenuAberto(false);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "start" });
  };

  return (
    <div
      className={`fg ${preview ? "is-preview" : ""} ${rapido ? "fg-rapido" : ""}`}
      data-tema={config.tema}
      data-estrutura={estrutura}
    >
      <header className="fg-hero">
        <img
          src={capa}
          alt=""
          className="fg-capa"
          width={1200}
          height={1500}
          fetchPriority="high"
          decoding="async"
        />
        <div className="fg-veu" />
        <div className="fg-topo">
          <div className="fg-marca">
            <LogoBarbearia
              nome={tenant.nome}
              url={tenant.logo_signed_url}
              size={36}
              className="fg-logo"
            />
            <strong>{tenant.nome}</strong>
          </div>
          <button
            type="button"
            className="fg-menu"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto(true)}
          >
            <Menu size={30} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        <div className="fg-centro">
          {estrutura === "arco" ? (
            <img src={capa} alt="" className="fg-arco" width={600} height={760} decoding="async" />
          ) : null}
          <h1>{config.frase || tenant.nome}</h1>
          {tenant.descricao || tenant.texto_boas_vindas || config.sobre ? (
            <p>{tenant.descricao || tenant.texto_boas_vindas || config.sobre}</p>
          ) : null}
          <div ref={acoesRef}>{renderAgendar("fg-cta", config.cta)}</div>
        </div>
        {rapido ? null : (
          <button type="button" className="fg-saiba" onClick={() => ir(ancoras[0]?.id ?? "fg-fim")}>
            Saiba mais sobre {vocabulario.comArtigo.startsWith("a ") ? "nossa" : "nosso"}{" "}
            {vocabulario.nome}
            <ChevronDown size={26} aria-hidden />
          </button>
        )}
        {estrutura === "vibrante" ? (
          <svg className="fg-onda" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
            <path d="M0 6 C 12 0, 25 0, 37 5 S 62 10, 75 5 S 92 0, 100 4 V10 H0Z" />
          </svg>
        ) : null}
        <svg className="fg-diagonal" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden>
          <polygon points="0,8 18,12 100,3 100,12 0,12" className="fg-diagonal-fundo" />
          <polyline
            points="0,8 18,12 100,3"
            className="fg-diagonal-linha"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </header>

      {estrutura === "cartao" && !rapido && ancoras.length > 0 ? (
        <nav className="fg-chips" aria-label="Seções da página">
          {ancoras.map((a) => (
            <button key={a.id} type="button" onClick={() => ir(a.id)}>
              {a.nome}
            </button>
          ))}
        </nav>
      ) : null}

      <AnimatePresence>
        {menuAberto ? (
          <motion.nav
            className="fg-painel-menu"
            aria-label="Menu da página"
            initial={reduzir ? { opacity: 0 } : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduzir ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={reduzir ? { duration: 0.12 } : MOLA.padraoCompose}
          >
            <button
              type="button"
              className="fg-menu fg-fechar"
              aria-label="Fechar menu"
              onClick={() => setMenuAberto(false)}
            >
              <X size={30} strokeWidth={1.5} aria-hidden />
            </button>
            <ul>
              {ancoras.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => ir(a.id)}>
                    {a.nome}
                  </button>
                </li>
              ))}
            </ul>
            <div className="fg-menu-cta">{renderAgendar("fg-cta", config.cta)}</div>
          </motion.nav>
        ) : null}
      </AnimatePresence>

      <main className="fg-corpo">
        {temEquipe ? (
          <section id="fg-equipe" className="fg-secao">
            <h2>Equipe</h2>
            <ul className="fg-equipe">
              {data.profissionais.map((p) => (
                <li key={p.id}>
                  {sec.profissionais.mostrarFoto ? (
                    p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={p.nome}
                        loading="lazy"
                        width={125}
                        height={160}
                      />
                    ) : (
                      <span className="fg-iniciais">{p.nome.charAt(0)}</span>
                    )
                  ) : null}
                  <strong>{nomeCurto(p.nome)}</strong>
                  <small>
                    {vocabulario.profissional.charAt(0).toUpperCase() +
                      vocabulario.profissional.slice(1)}
                  </small>
                  {sec.profissionais.mostrarDetalhes && p.descricao ? <p>{p.descricao}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {temServicos ? (
          <section id="fg-servicos" className="fg-secao">
            <h2>Serviços</h2>
            {estrutura === "arco" || estrutura === "vibrante" ? (
              <div className="fg-cartas">
                {populares.length ? (
                  <>
                    <h3 className="fg-categoria">
                      Mais procurados <Flame size={16} className="fg-chama" aria-hidden />
                    </h3>
                    <ul>{populares.map(cartaDeServico)}</ul>
                  </>
                ) : null}
                {[...porCategoria.entries()].map(([categoria, lista]) => (
                  <div key={categoria}>
                    <h3 className="fg-categoria">{categoria}</h3>
                    <ul>{lista.map(cartaDeServico)}</ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="fg-acordeao">
                {populares.length ? (
                  <GrupoDeServicos titulo="Mais procurados" destaque abertoInicial>
                    <ul>{populares.map(linhaDeServico)}</ul>
                  </GrupoDeServicos>
                ) : null}
                {[...porCategoria.entries()].map(([categoria, lista], i) => (
                  <GrupoDeServicos
                    key={categoria}
                    titulo={categoria}
                    contagem={lista.length}
                    abertoInicial={!populares.length && i === 0}
                  >
                    <ul>{lista.map(linhaDeServico)}</ul>
                  </GrupoDeServicos>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {temGaleria ? (
          <section id="fg-galeria" className="fg-secao">
            <h2>{sec.galeria.titulo || "Galeria de Fotos"}</h2>
            {sec.galeria.subtitulo ? <p className="fg-sub">{sec.galeria.subtitulo}</p> : null}
            <div className="fg-galeria">
              {tenant.fotos_signed_urls.map((foto, i) => (
                <img
                  key={foto}
                  src={foto}
                  alt={`Foto ${i + 1} de ${tenant.nome}`}
                  loading="lazy"
                  width={400}
                  height={400}
                />
              ))}
            </div>
          </section>
        ) : null}

        {temAvaliacoes ? (
          <section id="fg-avaliacoes" className="fg-secao">
            <h2>Avaliações</h2>
            {sec.avaliacoes.mostrarResumo ? (
              <p className="fg-nota">
                <Star size={22} fill="currentColor" aria-hidden />
                <strong>{mediaPtBr(data.avaliacoes.media)}</strong>
                <span>{data.avaliacoes.quantidade} avaliações verificadas</span>
              </p>
            ) : (
              <p className="fg-sub">{data.avaliacoes.quantidade} avaliações verificadas</p>
            )}
          </section>
        ) : null}

        {temLocal ? (
          <section id="fg-local" className="fg-secao">
            <h2>Localização</h2>
            <a
              className="fg-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.endereco ?? "")}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={20} aria-hidden />
              {tenant.endereco}
            </a>
            {sec.localizacao.mostrarDetalhes && sec.localizacao.bio ? (
              <p className="fg-sub">{sec.localizacao.bio}</p>
            ) : null}
          </section>
        ) : null}

        {temContato ? (
          <section id="fg-contato" className="fg-secao">
            <h2>Contato</h2>
            <a
              className="fg-link"
              href={linkContato ?? undefined}
              target={contatoEhWhatsapp ? "_blank" : undefined}
              rel="noreferrer"
            >
              {contatoEhWhatsapp ? (
                <MessageCircle size={20} aria-hidden />
              ) : (
                <Phone size={20} aria-hidden />
              )}
              {contatoEhWhatsapp ? "Chamar no WhatsApp" : "Ligar"}
            </a>
          </section>
        ) : null}

        {temRedes ? (
          <section className="fg-secao">
            <h2>Redes Sociais</h2>
            <div className="fg-redes">
              {instagram ? (
                <a
                  className="fg-link"
                  href={`https://instagram.com/${instagram}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Instagram size={20} aria-hidden />@{instagram}
                </a>
              ) : null}
              {extras.map(({ r, href }) => (
                <a key={r} className="fg-link" href={href} target="_blank" rel="noreferrer">
                  <IconeDaRede rede={r} />
                  {{ tiktok: "TikTok", youtube: "YouTube", site: "Site" }[r]}
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section id="fg-fim" className="fg-final" ref={finalRef}>
          <CalendarDays size={28} aria-hidden />
          <h2>Seu próximo horário começa aqui.</h2>
          {renderAgendar("fg-cta", config.cta)}
        </section>
      </main>
    </div>
  );
}
