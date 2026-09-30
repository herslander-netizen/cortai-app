import { Link } from "@tanstack/react-router";
import { FontesDaMarca } from "@/components/marca/FontesDaMarca";
import { CalendarDays, Clock3, Instagram, MapPin, MessageCircle, Phone, Share2, Star } from "lucide-react";
import { type ReactNode } from "react";

import coverNeutra from "@/assets/cortai-cover-official.png.asset.json";
import coverBarbearia from "@/assets/cortai-barbershop-cover.jpg.asset.json";
import { LogoBarbearia } from "@/components/marca/LogoBarbearia";
import { brl } from "@/lib/format";
import { type PaginaConfig, paginaStyle } from "@/lib/pagina-config";
import type { PaginaPublica } from "@/lib/publico.functions";
import { SEGMENTOS_CONFIG, termos } from "@/lib/segmentos";

const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function Secao({ titulo, children, id }: { titulo: string; children: ReactNode; id?: string }) {
  return <section id={id} className="brand-section scroll-mt-20"><p className="brand-kicker">{titulo}</p><div className="brand-section-content">{children}</div></section>;
}

export function PaginaPublicaConteudo({ data, config, preview = false }: { data: PaginaPublica; config: PaginaConfig; preview?: boolean }) {
  const { tenant } = data;
  const whatsapp = tenant.whatsapp?.replace(/\D/g, "") || null;
  const telefone = tenant.telefone?.replace(/\D/g, "") || null;
  const linkContato = whatsapp ? `https://wa.me/${whatsapp}` : telefone ? `tel:+${telefone}` : null;
  const instagram = tenant.instagram?.replace(/^@/, "") || null;
  const agendar = <Link to="/agendar/$slug" params={{ slug: tenant.slug }} className="brand-cta"><CalendarDays size={18} />{config.cta}</Link>;
  const layout = config.layout;
  const definicao = SEGMENTOS_CONFIG[tenant.segmento];
  const vocabulario = termos(tenant.segmento);

  return <div className={`client-brand public-brand theme-${config.tema} layout-${layout} buttons-${config.botoes} ${preview ? "is-preview" : ""}`} style={paginaStyle(config)} data-hide-signature={tenant.assinatura_visivel === false} data-segmento={tenant.segmento}>
    <FontesDaMarca config={config} />
    <header className="brand-hero">
      <img src={tenant.capa_signed_url ?? (tenant.segmento === "barbearia" ? coverBarbearia.url : coverNeutra.url)} alt={`Ambiente de ${tenant.nome}`} width={1200} height={1500} fetchPriority="high" className="brand-cover" />
      <div className="brand-overlay" />
      <div className="brand-hero-content">
        <LogoBarbearia nome={tenant.nome} url={tenant.logo_signed_url} size={preview ? 48 : 68} className="brand-logo" />
        <p className="brand-eyebrow">{definicao.rotulo}</p>
        <h1>{tenant.nome}</h1>
        {config.componentes.apresentacao ? <p className="brand-lead">{config.frase || tenant.descricao || tenant.texto_boas_vindas}</p> : null}
        <div className="brand-actions">{agendar}{config.componentes.whatsapp && linkContato ? <a className="brand-secondary-action" href={linkContato} target={whatsapp ? "_blank" : undefined} rel="noreferrer">{whatsapp ? <MessageCircle size={17} /> : <Phone size={17} />}WhatsApp</a> : null}</div>
      </div>
    </header>

    <main className="brand-main">
      {config.componentes.servicos && data.servicos.length ? <Secao titulo="Serviços" id="servicos"><div className="brand-service-grid">{data.servicos.map((servico) => <article key={servico.id} className="brand-service"><div><h2>{servico.nome}</h2><p><Clock3 size={13} />{servico.duracao_min} min</p></div><strong>{brl(servico.preco_centavos)}</strong></article>)}</div></Secao> : null}

      {config.componentes.profissionais && data.profissionais.length ? <Secao titulo="Profissionais" id="profissionais"><div className="brand-people-grid">{data.profissionais.map((p) => <article key={p.id} className="brand-person">{p.avatar_url ? <img src={p.avatar_url} alt={p.nome} loading="lazy" /> : <span>{p.nome.charAt(0)}</span>}<div><h3>{p.nome}</h3>{p.descricao ? <p>{p.descricao}</p> : null}</div></article>)}</div></Secao> : null}

      {config.componentes.galeria && tenant.fotos_signed_urls.length ? <Secao titulo="Destaques" id="galeria"><div className="brand-gallery">{tenant.fotos_signed_urls.map((foto, index) => <img key={foto} src={foto} alt={`Ambiente da ${tenant.nome} ${index + 1}`} loading="lazy" />)}</div></Secao> : null}

      {config.componentes.apresentacao && config.sobre ? <Secao titulo={`Sobre ${vocabulario.comArtigo}`} id="sobre"><p className="brand-about">{config.sobre}</p></Secao> : null}

      {config.componentes.avaliacoes && data.avaliacoes.quantidade > 0 ? <Secao titulo="Avaliações" id="avaliacoes"><div className="brand-rating"><Star fill="currentColor" /><strong>{data.avaliacoes.media?.toFixed(1)}</strong><span>{data.avaliacoes.quantidade} avaliações verificadas</span></div></Secao> : null}

      {config.componentes.produtos && data.loja_ativa && data.produtos.length ? <Secao titulo="Produtos" id="produtos"><div className="brand-products">{data.produtos.map((produto) => <article key={produto.id}>{produto.foto_url ? <img src={produto.foto_url} alt={produto.nome} loading="lazy" /> : <div className="brand-product-placeholder" />}<div><h3>{produto.nome}</h3><p>{produto.categoria}</p><strong>{brl(produto.preco_centavos)}</strong></div></article>)}</div></Secao> : null}

      <div className="brand-info-grid">
        {config.componentes.instagram && instagram ? <Secao titulo="Instagram"><a className="brand-info-link" href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer"><Instagram />@{instagram}</a></Secao> : null}
        {config.componentes.localizacao && tenant.endereco ? <Secao titulo="Localização"><a className="brand-info-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.endereco)}`} target="_blank" rel="noreferrer"><MapPin />{tenant.endereco}</a></Secao> : null}
        {config.componentes.horarios && data.horarios.length ? <Secao titulo="Horário de funcionamento"><ul className="brand-hours">{data.horarios.map((h) => <li key={h.dia_semana}><span>{dias[h.dia_semana]}</span><strong>{h.fechado ? "Fechado" : `${h.abre.slice(0, 5)}–${h.fecha.slice(0, 5)}`}</strong></li>)}</ul></Secao> : null}
      </div>

      {config.componentes.cta_final ? <section className="brand-final"><p>Seu próximo horário começa aqui.</p><h2>Escolha o serviço e reserve em poucos passos.</h2>{agendar}</section> : null}
      {!preview ? <section className="brand-share"><Share2 size={16} /><span>Compartilhe {vocabulario.comArtigo}</span></section> : null}
    </main>
  </div>;
}
