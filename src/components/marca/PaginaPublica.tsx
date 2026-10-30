import { Link } from "@tanstack/react-router";
import { IconeDaRede } from "@/components/marca/editor/IconesDasRedes";
import { linkDaRede } from "@/lib/redes-do-negocio";
import { FontesDaMarca } from "@/components/marca/FontesDaMarca";
import {
  CalendarDays,
  Clock3,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { useMediaQuery } from "@/hooks/use-mobile";
import { useConsentimento } from "@/lib/consentimento";
import { buscaParaAgendar, origemDaVisita, type OrigemFunil } from "@/lib/funil";

import coverNeutra from "@/assets/flow-capa-neutra.png.asset.json";
import coverBarbearia from "@/assets/cortai-barbershop-cover.jpg.asset.json";
import { LogoBarbearia } from "@/components/marca/LogoBarbearia";
import { Raizes } from "@/components/marca/modelos/Raizes";
import { SiteCompleto } from "@/components/marca/modelos/SiteCompleto";
import { StatusFuncionamento } from "@/components/agendamento/StatusFuncionamento";
import { brl } from "@/lib/format";
import { type PaginaConfig, paginaStyle } from "@/lib/pagina-config";
import type { PaginaPublica } from "@/lib/publico.functions";
import { SEGMENTOS_CONFIG, termos } from "@/lib/segmentos";

const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function Secao({ titulo, children, id }: { titulo: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="brand-section scroll-mt-20">
      <p className="brand-kicker">{titulo}</p>
      <div className="brand-section-content">{children}</div>
    </section>
  );
}

function mediaPtBr(media: number | null) {
  return (media ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function PaginaPublicaConteudo({
  data,
  config,
  preview = false,
  previaCelular = false,
  onBarraVisivel,
}: {
  data: PaginaPublica;
  config: PaginaConfig;
  preview?: boolean;
  previaCelular?: boolean;
  onBarraVisivel?: (visivel: boolean) => void;
}) {
  const [origem, setOrigem] = useState<OrigemFunil>("direto");
  useEffect(() => {
    if (!preview) setOrigem(origemDaVisita());
  }, [preview]);
  const celular = useMediaQuery("(max-width: 767px)");
  const { pronto, consentimento } = useConsentimento();
  const acoesRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLElement>(null);
  const [capaFora, setCapaFora] = useState(false);
  const [finalVisivel, setFinalVisivel] = useState(false);
  useEffect(() => {
    const acoes = acoesRef.current;
    if (!acoes || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setCapaFora(!e?.isIntersecting));
    obs.observe(acoes);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    const final = finalRef.current;
    if (!final || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setFinalVisivel(Boolean(e?.isIntersecting)));
    obs.observe(final);
    return () => obs.disconnect();
  }, [config.componentes.cta_final]);
  const bannerAberto = !preview && pronto && !consentimento;
  const nota = data.avaliacoes;
  const mostrarSelo = config.componentes.avaliacoes && nota.quantidade >= 5 && nota.media != null;
  const { tenant } = data;
  const whatsapp = tenant.whatsapp?.replace(/\D/g, "") || null;
  const telefone = tenant.telefone?.replace(/\D/g, "") || null;
  const linkContato = whatsapp ? `https://wa.me/${whatsapp}` : telefone ? `tel:+${telefone}` : null;
  const instagram = tenant.instagram?.replace(/^@/, "") || null;
  const limiteAtingido = !preview && data.agendaOnline === "limite_atingido";
  const linkAgendarContato = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent("Olá! Quero agendar um horário.")}`
    : telefone
      ? `tel:+${telefone}`
      : null;
  const agendar = !limiteAtingido ? (
    <Link
      to="/agendar/$slug"
      params={{ slug: tenant.slug }}
      search={buscaParaAgendar(origem)}
      className="brand-cta"
    >
      <CalendarDays size={18} />
      {config.cta}
    </Link>
  ) : linkAgendarContato ? (
    <a
      className="brand-cta"
      href={linkAgendarContato}
      target={whatsapp ? "_blank" : undefined}
      rel="noreferrer"
    >
      {whatsapp ? <MessageCircle size={18} /> : <Phone size={18} />}
      {whatsapp ? "Chamar no WhatsApp" : "Ligar para agendar"}
    </a>
  ) : null;
  const agendarOuAviso = agendar ?? (
    <p className="brand-lead">Agenda online indisponível no momento</p>
  );
  const barraVisivel =
    config.botaoFixo &&
    agendar !== null &&
    (preview ? previaCelular : celular) &&
    capaFora &&
    !finalVisivel &&
    !bannerAberto;
  useEffect(() => {
    onBarraVisivel?.(barraVisivel);
  }, [barraVisivel, onBarraVisivel]);
  const layout = config.layout;
  const renderAgendar = (classe: string, rotulo?: string, servicoId?: string) =>
    !limiteAtingido ? (
      <Link
        to="/agendar/$slug"
        params={{ slug: tenant.slug }}
        search={{ ...buscaParaAgendar(origem), ...(servicoId ? { servico: servicoId } : {}) }}
        className={classe}
      >
        <CalendarDays size={18} aria-hidden />
        {rotulo ?? config.cta}
      </Link>
    ) : linkAgendarContato ? (
      <a
        className={classe}
        href={linkAgendarContato}
        target={whatsapp ? "_blank" : undefined}
        rel="noreferrer"
      >
        {whatsapp ? "Chamar no WhatsApp" : "Ligar para agendar"}
      </a>
    ) : (
      <span className={classe} aria-disabled>
        Agenda indisponível
      </span>
    );
  const definicao = SEGMENTOS_CONFIG[tenant.segmento];
  const vocabulario = termos(tenant.segmento);
  const cartaoDeServico = (servico: PaginaPublica["servicos"][number]) => (
    <article key={servico.id} className="brand-service">
      <div>
        <h2>{servico.nome}</h2>
        <p>
          <Clock3 size={13} />
          {servico.duracao_min} min
        </p>
      </div>
      <strong>{brl(servico.preco_centavos)}</strong>
    </article>
  );
  // Serviços populares (Figaro `popularServicesType`): os 3 mais atendidos em 90 dias, se houver o que comparar.
  const destaques = config.secoes.servicos.populares
    ? [...data.servicos]
        .filter((s) => s.popularidade > 0)
        .sort((a, b) => b.popularidade - a.popularidade)
        .slice(0, 3)
    : [];

  return (
    <div
      className={`client-brand public-brand theme-${config.tema} layout-${layout} buttons-${config.botoes} ${preview ? "is-preview" : ""}`}
      style={paginaStyle(config)}
      data-hide-signature={tenant.assinatura_visivel === false}
      data-segmento={tenant.segmento}
    >
      <FontesDaMarca config={config} semEspera={preview} />
      {layout === "figaro-raizes" ? (
        <Raizes
          data={data}
          config={config}
          preview={preview}
          renderAgendar={renderAgendar}
          linkContato={linkContato}
          contatoEhWhatsapp={Boolean(whatsapp)}
          acoesRef={acoesRef}
          finalRef={finalRef}
        />
      ) : layout === "figaro-site-completo" || layout === "figaro-agendamento" ? (
        <SiteCompleto
          variante={layout === "figaro-agendamento" ? "agendamento" : "completo"}
          data={data}
          config={config}
          preview={preview}
          renderAgendar={renderAgendar}
          linkContato={linkContato}
          contatoEhWhatsapp={Boolean(whatsapp)}
          acoesRef={acoesRef}
          finalRef={finalRef}
        />
      ) : (
        <>
          <header className="brand-hero">
            <img
              src={
                tenant.capa_signed_url ??
                (tenant.segmento === "barbearia" ? coverBarbearia.url : coverNeutra.url)
              }
              alt={`Ambiente de ${tenant.nome}`}
              width={1200}
              height={1500}
              fetchPriority="high"
              decoding="async"
              className="brand-cover"
            />
            <div className="brand-overlay" />
            <div className="brand-hero-content">
              <StatusFuncionamento
                fuso={tenant.fuso}
                horarios={data.horarios.map((h) => ({
                  diaSemana: h.dia_semana,
                  fechado: h.fechado,
                  abre: h.abre,
                  fecha: h.fecha,
                }))}
              />
              <LogoBarbearia
                nome={tenant.nome}
                url={tenant.logo_signed_url}
                size={preview ? 48 : 68}
                className="brand-logo"
              />
              <p className="brand-eyebrow">{definicao.rotulo}</p>
              <h1>{tenant.nome}</h1>
              {config.componentes.apresentacao ? (
                <p className="brand-lead">
                  {config.frase || tenant.descricao || tenant.texto_boas_vindas}
                </p>
              ) : null}
              {mostrarSelo ? (
                <p className="brand-hero-rating">
                  <Star size={14} fill="currentColor" aria-hidden />
                  <strong>{mediaPtBr(nota.media)}</strong>
                  <span>· {nota.quantidade} avaliações</span>
                </p>
              ) : null}
              <div className="brand-actions" ref={acoesRef}>
                {agendarOuAviso}
                {config.componentes.whatsapp && linkContato && !limiteAtingido ? (
                  <a
                    className="brand-secondary-action"
                    href={linkContato}
                    target={whatsapp ? "_blank" : undefined}
                    rel="noreferrer"
                  >
                    {whatsapp ? <MessageCircle size={17} /> : <Phone size={17} />}WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </header>

          <main className="brand-main">
            {config.componentes.servicos && data.servicos.length ? (
              <Secao titulo="Serviços" id="servicos">
                {destaques.length ? (
                  <>
                    <p className="brand-subtitle">Mais pedidos</p>
                    <div className="brand-service-grid">{destaques.map(cartaoDeServico)}</div>
                    <p className="brand-subtitle">Todos os serviços</p>
                  </>
                ) : null}
                <div className="brand-service-grid">{data.servicos.map(cartaoDeServico)}</div>
              </Secao>
            ) : null}

            {config.componentes.profissionais && data.profissionais.length ? (
              <Secao titulo="Profissionais" id="profissionais">
                <div className="brand-people-grid">
                  {data.profissionais.map((p) => (
                    <article key={p.id} className="brand-person">
                      {config.secoes.profissionais.mostrarFoto ? (
                        p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={p.nome}
                            loading="lazy"
                            width={96}
                            height={96}
                            className="size-24 rounded-full object-cover"
                          />
                        ) : (
                          <span>{p.nome.charAt(0)}</span>
                        )
                      ) : null}
                      <div>
                        <h3>{p.nome}</h3>
                        {config.secoes.profissionais.mostrarDetalhes && p.descricao ? (
                          <p>{p.descricao}</p>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </Secao>
            ) : null}

            {config.componentes.galeria && tenant.fotos_signed_urls.length ? (
              <Secao titulo={config.secoes.galeria.titulo || "Destaques"} id="galeria">
                {config.secoes.galeria.subtitulo ? (
                  <p className="brand-subtitle">{config.secoes.galeria.subtitulo}</p>
                ) : null}
                <div className="brand-gallery">
                  {tenant.fotos_signed_urls.map((foto, index) => (
                    <img
                      key={foto}
                      src={foto}
                      alt={`Ambiente da ${tenant.nome} ${index + 1}`}
                      loading="lazy"
                      width={800}
                      height={800}
                    />
                  ))}
                </div>
              </Secao>
            ) : null}

            {config.componentes.apresentacao && config.sobre ? (
              <Secao titulo={`Sobre ${vocabulario.comArtigo}`} id="sobre">
                <p className="brand-about">{config.sobre}</p>
              </Secao>
            ) : null}

            {config.componentes.avaliacoes && data.avaliacoes.quantidade > 0 ? (
              <Secao titulo="Avaliações" id="avaliacoes">
                {config.secoes.avaliacoes.mostrarResumo ? (
                  <div className="brand-rating">
                    <Star fill="currentColor" />
                    <strong>{mediaPtBr(data.avaliacoes.media)}</strong>
                    <span>{data.avaliacoes.quantidade} avaliações verificadas</span>
                  </div>
                ) : (
                  <p className="brand-subtitle">
                    {data.avaliacoes.quantidade} avaliações verificadas
                  </p>
                )}
              </Secao>
            ) : null}

            {config.componentes.produtos && data.loja_ativa && data.produtos.length ? (
              <Secao titulo="Produtos" id="produtos">
                <div className="brand-products">
                  {data.produtos.map((produto) => (
                    <article key={produto.id}>
                      {produto.foto_url ? (
                        <img src={produto.foto_url} alt={produto.nome} loading="lazy" />
                      ) : (
                        <div className="brand-product-placeholder" />
                      )}
                      <div>
                        <h3>{produto.nome}</h3>
                        <p>{produto.categoria}</p>
                        <strong>{brl(produto.preco_centavos)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </Secao>
            ) : null}

            <div className="brand-info-grid">
              {config.componentes.instagram && instagram ? (
                <Secao titulo="Instagram">
                  <a
                    className="brand-info-link"
                    href={`https://instagram.com/${instagram}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Instagram />@{instagram}
                  </a>
                </Secao>
              ) : null}
              {(() => {
                const extras = (["tiktok", "youtube", "site"] as const)
                  .map((r) => ({ r, href: linkDaRede(r, config.redes?.[r]) }))
                  .filter((x) => x.href);
                if (!extras.length) return null;
                const nomes = { tiktok: "TikTok", youtube: "YouTube", site: "Site" };
                return (
                  <Secao titulo="Redes sociais">
                    {extras.map(({ r, href }) => (
                      <a
                        key={r}
                        className="brand-info-link"
                        href={href!}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <IconeDaRede rede={r} />
                        {nomes[r]}
                      </a>
                    ))}
                  </Secao>
                );
              })()}
              {config.componentes.localizacao && tenant.endereco ? (
                <Secao titulo="Localização">
                  <a
                    className="brand-info-link"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.endereco)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin />
                    {tenant.endereco}
                  </a>
                  {config.secoes.localizacao.mostrarDetalhes && config.secoes.localizacao.bio ? (
                    <p className="brand-about">{config.secoes.localizacao.bio}</p>
                  ) : null}
                </Secao>
              ) : null}
              {config.componentes.horarios && data.horarios.length ? (
                <Secao titulo="Horário de funcionamento">
                  <ul className="brand-hours">
                    {data.horarios.map((h) => (
                      <li key={h.dia_semana}>
                        <span>{dias[h.dia_semana]}</span>
                        <strong>
                          {h.fechado ? "Fechado" : `${h.abre.slice(0, 5)}–${h.fecha.slice(0, 5)}`}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </Secao>
              ) : null}
            </div>

            {config.componentes.cta_final ? (
              <section className="brand-final" ref={finalRef}>
                <p>Seu próximo horário começa aqui.</p>
                <h2>Escolha o serviço e reserve em poucos passos.</h2>
                {agendarOuAviso}
              </section>
            ) : null}
          </main>
        </>
      )}
      <div
        className="brand-sticky-bar"
        data-visivel={barraVisivel || undefined}
        aria-hidden={!barraVisivel}
        inert={!barraVisivel}
      >
        {config.componentes.whatsapp && linkContato && !limiteAtingido ? (
          <a
            className="brand-sticky-icon"
            href={linkContato}
            target={whatsapp ? "_blank" : undefined}
            rel="noreferrer"
            aria-label={whatsapp ? "Conversar no WhatsApp" : "Ligar"}
          >
            {whatsapp ? <MessageCircle size={20} /> : <Phone size={20} />}
          </a>
        ) : null}
        {agendar}
      </div>
    </div>
  );
}
