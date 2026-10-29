import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Menu, Star, X } from "lucide-react";
import { type ReactNode, useState } from "react";

import coverBarbearia from "@/assets/cortai-barbershop-cover.jpg.asset.json";
import coverNeutra from "@/assets/flow-capa-neutra.png.asset.json";
import type { PropsDoModelo } from "@/components/marca/modelos/SiteCompleto";
import { LogoBarbearia } from "@/components/marca/LogoBarbearia";
import { brl } from "@/lib/format";
import { MOLA } from "@/lib/movimento-figaro";
import {
  duracaoEmTexto,
  economiaDoPacote,
  precoSeparado,
  validadeEmTexto,
  type PacoteDoNegocio,
} from "@/lib/pacotes";
import { FRASES_DA_LINHA_DO_TEMPO } from "@/lib/pagina-config";
import { coresDoRaizes, horariosAgrupados, linkDoMapa, nomeParaBotao } from "@/lib/raizes";
import { linkDaRede } from "@/lib/redes-do-negocio";

function mediaPtBr(media: number | null) {
  return (media ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Entrada discreta ao rolar: sobe um pouco e aparece (só transform e opacity). */
function Aparece({ children, className }: { children: ReactNode; className?: string }) {
  const reduzir = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduzir ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={reduzir ? { duration: 0 } : MOLA.padraoCompose}
    >
      {children}
    </motion.div>
  );
}

function CartaoDePacote({
  pacote,
  querEste,
}: {
  pacote: PacoteDoNegocio;
  querEste: (classe: string, rotulo: string) => ReactNode;
}) {
  const { centavos, percentual } = economiaDoPacote(pacote);
  const validade = validadeEmTexto(pacote.validadeDias);
  return (
    <article className={`rz-pacote ${pacote.destaque ? "is-destaque" : ""}`}>
      <div className="rz-pacote-topo">
        {pacote.destaque ? <span className="rz-selo">Mais vendido</span> : <span />}
        {percentual > 0 ? <span className="rz-desconto">−{percentual}%</span> : null}
      </div>
      <h3>{pacote.nome}</h3>
      {validade ? <p className="rz-pacote-validade">Válido por {validade}</p> : null}
      <p className="rz-pacote-preco">{brl(pacote.precoCentavos)}</p>
      {centavos > 0 ? (
        <p className="rz-pacote-economia">
          {brl(precoSeparado(pacote.itens))} separado · você economiza {brl(centavos)}
        </p>
      ) : null}
      <ul className="rz-pacote-itens">
        {pacote.itens.map((i) => (
          <li key={i.servicoId}>
            <span>{i.quantidade}×</span> {i.nome}
          </li>
        ))}
      </ul>
      {pacote.descricao ? <p className="rz-pacote-descricao">{pacote.descricao}</p> : null}
      {querEste("rz-botao rz-botao-cheio", "Quero este pacote")}
    </article>
  );
}

/**
 * Layout "Raízes" (Figaro): a página conta a história do negócio em três capítulos — Ontem (quem corta),
 * Hoje (o trabalho e os números) e Amanhã (o horário do cliente) — com abertura em foto, menu em tela cheia,
 * pacotes e combos, endereço e horários. O tema escolhe as cores; o escuro e o claro alternam por capítulo.
 */
export function Raizes({
  data,
  config,
  renderAgendar,
  linkContato,
  contatoEhWhatsapp,
  acoesRef,
  finalRef,
}: PropsDoModelo) {
  const { tenant } = data;
  const reduzir = useReducedMotion();
  const [menuAberto, setMenuAberto] = useState(false);
  const on = config.componentes;
  const frases = { ...FRASES_DA_LINHA_DO_TEMPO, ...config.secoes.linhaDoTempo };
  const { escuro, claro, acento } = coresDoRaizes(config.cores);
  const botao = nomeParaBotao(tenant.nome);
  const instagram = tenant.instagram?.replace(/^@/, "") || null;
  const capa =
    tenant.capa_signed_url ??
    (tenant.segmento === "barbearia" ? coverBarbearia.url : coverNeutra.url);
  const bio = (config.sobre || tenant.descricao || "").trim();
  const equipe = on.profissionais ? data.profissionais.filter((p) => p.avatar_url).slice(0, 2) : [];
  const fotos = on.galeria ? tenant.fotos_signed_urls : [];
  const populares = config.secoes.servicos.populares
    ? [...data.servicos]
        .filter((s) => s.popularidade > 0)
        .sort((a, b) => b.popularidade - a.popularidade)
    : [];
  const maisProcurados = (populares.length ? populares : data.servicos).slice(0, 3);
  const pacotes = on.pacotes ? data.pacotes.filter((p) => p.tipo === "pacote") : [];
  const combos = on.pacotes ? data.pacotes.filter((p) => p.tipo === "combo") : [];
  const temPacotes = pacotes.length + combos.length > 0;
  const maiorEconomia = Math.max(0, ...data.pacotes.map((p) => economiaDoPacote(p).percentual));
  const promocao = pacotes.find((p) => p.destaque) ?? pacotes[0];
  const horarios = horariosAgrupados(data.horarios);
  const extras = (["tiktok", "youtube", "site"] as const)
    .map((r) => ({ r, href: linkDaRede(r, config.redes?.[r]) }))
    .filter((x): x is { r: "tiktok" | "youtube" | "site"; href: string } => Boolean(x.href));
  const querPacote = (classe: string, rotulo: string) =>
    contatoEhWhatsapp && linkContato ? (
      <a className={classe} href={linkContato} target="_blank" rel="noreferrer">
        {rotulo}
        <ArrowRight size={18} aria-hidden />
      </a>
    ) : (
      renderAgendar(classe, rotulo)
    );

  const irPara = (id: string) => {
    setMenuAberto(false);
    window.setTimeout(
      () =>
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "start" }),
      reduzir ? 0 : 180,
    );
  };
  const atalhos = [
    on.servicos ? { id: "rz-servicos", rotulo: "Serviços" } : null,
    temPacotes ? { id: "rz-pacotes", rotulo: "Pacotes" } : null,
    fotos.length ? { id: "rz-galeria", rotulo: "Galeria" } : null,
    on.avaliacoes && data.avaliacoes.quantidade ? { id: "rz-numeros", rotulo: "Avaliações" } : null,
    on.localizacao && tenant.endereco ? { id: "rz-endereco", rotulo: "Endereço" } : null,
  ].filter((x): x is { id: string; rotulo: string } => x !== null);
  const capitulos = [
    { id: "rz-ontem", titulo: "Ontem", nota: "De onde eu vim" },
    { id: "rz-hoje", titulo: "Hoje", nota: "O trabalho e os números" },
    { id: "rz-amanha", titulo: "Amanhã", nota: "O seu horário" },
  ];

  return (
    <div
      className="rz"
      style={
        { "--rz-escuro": escuro, "--rz-claro": claro, "--rz-acento": acento } as React.CSSProperties
      }
    >
      <header className="rz-hero" id="rz-topo">
        <img
          src={capa}
          alt={`Ambiente de ${tenant.nome}`}
          className="rz-hero-foto"
          fetchPriority="high"
          decoding="async"
        />
        <div className="rz-hero-veu" aria-hidden />
        <div className="rz-barra">
          <LogoBarbearia
            nome={tenant.nome}
            url={tenant.logo_signed_url}
            size={52}
            className="rz-logo"
          />
          <button
            type="button"
            className="rz-menu-botao"
            onClick={() => setMenuAberto(true)}
            aria-haspopup="dialog"
          >
            Menu <Menu size={18} aria-hidden />
          </button>
        </div>
        <div className="rz-hero-texto">
          <h1 className="rz-nome">{tenant.nome}</h1>
          {on.apresentacao && config.frase ? <p className="rz-frase">{config.frase}</p> : null}
          <div ref={acoesRef} className="rz-hero-acoes">
            {promocao && temPacotes ? (
              <button type="button" className="rz-promocao" onClick={() => irPara("rz-pacotes")}>
                <span>
                  Pacote {promocao.nome} por {brl(promocao.precoCentavos)}
                  {economiaDoPacote(promocao).percentual > 0
                    ? `, economize ${economiaDoPacote(promocao).percentual}%`
                    : ""}
                </span>
                <ArrowRight size={18} aria-hidden />
              </button>
            ) : null}
            {renderAgendar("rz-botao rz-botao-cheio rz-hero-agendar")}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuAberto ? (
          <motion.div
            className="rz-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={reduzir ? { opacity: 0 } : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduzir ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={reduzir ? { duration: 0.12 } : MOLA.padraoCompose}
          >
            <div className="rz-barra rz-barra-menu">
              <LogoBarbearia
                nome={tenant.nome}
                url={tenant.logo_signed_url}
                size={40}
                className="rz-logo"
              />
              <span className="rz-barra-nome">{tenant.nome}</span>
              <button
                type="button"
                className="rz-menu-fechar"
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar menu"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <nav className="rz-capitulos" aria-label="Capítulos da página">
              {capitulos.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  className={i === 0 ? "is-ativo" : ""}
                  onClick={() => irPara(c.id)}
                >
                  <span className="rz-capitulo-titulo">{c.titulo}</span>
                  <small>{c.nota}</small>
                </button>
              ))}
            </nav>
            <ul className="rz-atalhos">
              {atalhos.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => irPara(a.id)}>
                    {a.rotulo}
                    <ArrowRight size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            {renderAgendar("rz-botao rz-botao-cheio rz-overlay-agendar", `Agendar com ${botao}`)}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {on.linha_do_tempo ? (
        <section className="rz-capitulo rz-escuro" id="rz-ontem" aria-labelledby="rz-ontem-titulo">
          <Aparece>
            <h2 id="rz-ontem-titulo" className="rz-grande">
              Ontem
            </h2>
            <p className="rz-subtitulo">{frases.ontem}</p>
          </Aparece>
          {bio ? (
            <Aparece className="rz-bio">
              <p className="rz-kicker">Quem corta</p>
              <p className="rz-bio-texto">{bio}</p>
            </Aparece>
          ) : null}
          {equipe.length ? (
            <Aparece className="rz-equipe">
              {equipe.map((p, i) => (
                <figure key={p.id} className={i % 2 ? "is-recuada" : ""}>
                  <img src={p.avatar_url ?? ""} alt={p.nome} loading="lazy" decoding="async" />
                  <figcaption>{p.nome}</figcaption>
                </figure>
              ))}
            </Aparece>
          ) : null}
        </section>
      ) : null}

      {on.linha_do_tempo || fotos.length || on.avaliacoes ? (
        <section className="rz-capitulo rz-escuro" id="rz-hoje" aria-labelledby="rz-hoje-titulo">
          {on.linha_do_tempo ? (
            <Aparece>
              <h2 id="rz-hoje-titulo" className="rz-grande">
                Hoje
              </h2>
              <p className="rz-subtitulo">{frases.hoje}</p>
            </Aparece>
          ) : null}
          {fotos.length ? (
            <Aparece className="rz-trabalho">
              <div id="rz-galeria" className="rz-trabalho-foto">
                <img src={fotos[0]} alt="Um trabalho recente" loading="lazy" decoding="async" />
                <div className="rz-trabalho-legenda">
                  <h3>{config.secoes.galeria.titulo || "O trabalho"}</h3>
                  {fotos.length > 1 ? (
                    <span>
                      Ver {fotos.length} fotos <ArrowRight size={14} aria-hidden />
                    </span>
                  ) : null}
                </div>
              </div>
              {fotos.length > 1 ? (
                <ul className="rz-fotos-tira">
                  {fotos.slice(1).map((f) => (
                    <li key={f}>
                      <img src={f} alt="" loading="lazy" decoding="async" />
                    </li>
                  ))}
                </ul>
              ) : null}
            </Aparece>
          ) : null}
          <Aparece className="rz-relance">
            <h3 id="rz-numeros" className="rz-grande rz-medio">
              Num relance
            </h3>
            <div className="rz-grade">
              {on.avaliacoes && data.avaliacoes.quantidade ? (
                <div className="rz-bloco">
                  <p className="rz-kicker">Avaliações</p>
                  <p className="rz-numero">
                    <Star size={22} aria-hidden fill="currentColor" />{" "}
                    {mediaPtBr(data.avaliacoes.media)}
                  </p>
                  <small>{data.avaliacoes.quantidade} avaliações</small>
                </div>
              ) : null}
              {horarios[0] && horarios[0].horario !== "Fechado" ? (
                <div className="rz-bloco">
                  <p className="rz-kicker">Funcionamento</p>
                  <p className="rz-numero rz-numero-hora">
                    {horarios[0].horario.replace(/ – /g, "–").toUpperCase()}
                  </p>
                  <small>{horarios[0].dias}</small>
                </div>
              ) : null}
              {on.servicos && maisProcurados.length ? (
                <div className="rz-bloco rz-largo">
                  <p className="rz-kicker">
                    Mais procurados{" "}
                    <button type="button" onClick={() => irPara("rz-servicos")}>
                      Ver todos
                    </button>
                  </p>
                  <ul className="rz-mais">
                    {maisProcurados.map((s) => (
                      <li key={s.id}>
                        <span>{s.nome}</span>
                        <strong>{brl(s.preco_centavos)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {temPacotes ? (
                <button
                  type="button"
                  className="rz-bloco rz-largo rz-bloco-botao"
                  onClick={() => irPara("rz-pacotes")}
                >
                  <p className="rz-kicker">
                    Pacotes e combos <ArrowUpRight size={14} aria-hidden />
                  </p>
                  <p className="rz-chamada">
                    {maiorEconomia > 0 ? `Economize até ${maiorEconomia}%` : "Veja as ofertas"}
                  </p>
                  <small>
                    {pacotes.length} {pacotes.length === 1 ? "pacote" : "pacotes"} e {combos.length}{" "}
                    {combos.length === 1 ? "combo" : "combos"}
                  </small>
                </button>
              ) : null}
              {on.instagram && instagram ? (
                <a
                  className="rz-bloco"
                  href={`https://instagram.com/${instagram}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <p className="rz-kicker">
                    Instagram <ArrowUpRight size={14} aria-hidden />
                  </p>
                  <p className="rz-pequeno">@{instagram}</p>
                </a>
              ) : null}
              {on.localizacao && tenant.endereco ? (
                <a
                  className="rz-bloco"
                  href={linkDoMapa(tenant.endereco)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <p className="rz-kicker">
                    Endereço <ArrowUpRight size={14} aria-hidden />
                  </p>
                  <p className="rz-pequeno">{tenant.endereco}</p>
                </a>
              ) : null}
              <div className="rz-bloco rz-largo rz-bloco-acento">
                <p className="rz-kicker">Agendamento online</p>
                {renderAgendar("rz-agendar-grande", "Agendar horário")}
              </div>
            </div>
          </Aparece>
        </section>
      ) : null}

      <section className="rz-capitulo rz-claro" id="rz-amanha" aria-labelledby="rz-amanha-titulo">
        <Aparece>
          <h2 id="rz-amanha-titulo" className="rz-grande">
            Amanhã
          </h2>
          <p className="rz-subtitulo">{frases.amanha}</p>
        </Aparece>
        <Aparece>
          <section ref={finalRef}>
            {renderAgendar("rz-botao rz-botao-cheio rz-botao-grande", `Agendar com ${botao}`)}
            <p className="rz-ajuda">Escolha serviço, dia e horário.</p>
          </section>
        </Aparece>

        {on.servicos && data.servicos.length ? (
          <Aparece className="rz-secao">
            <h3 id="rz-servicos" className="rz-titulo-secao">
              Serviços
            </h3>
            <ul className="rz-linhas">
              {data.servicos.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>{s.nome}</strong>
                    <small>
                      {duracaoEmTexto(s.duracao_min)}
                      {s.categoria ? ` · ${s.categoria}` : ""}
                    </small>
                  </div>
                  <span className="rz-preco">{brl(s.preco_centavos)}</span>
                  {renderAgendar("rz-link-agendar", "Agendar", s.id)}
                </li>
              ))}
            </ul>
          </Aparece>
        ) : null}

        {pacotes.length ? (
          <Aparece className="rz-secao">
            <h3 id="rz-pacotes" className="rz-titulo-secao">
              Pacotes
            </h3>
            <p className="rz-texto">
              Quem volta sempre paga menos. O pacote é vendido{" "}
              {tenant.segmento === "barbearia" ? "na barbearia" : "no local"}, e as visitas você
              agenda por aqui.
            </p>
            <div className="rz-carrossel">
              {pacotes.map((p) => (
                <CartaoDePacote key={p.id} pacote={p} querEste={querPacote} />
              ))}
            </div>
          </Aparece>
        ) : null}

        {combos.length ? (
          <Aparece className="rz-secao">
            <h3 id={pacotes.length ? undefined : "rz-pacotes"} className="rz-titulo-secao">
              Combos
            </h3>
            <p className="rz-texto">Serviços juntos, na mesma visita, com desconto.</p>
            <ul className="rz-linhas rz-combos">
              {combos.map((c) => {
                const { centavos } = economiaDoPacote(c);
                return (
                  <li key={c.id}>
                    <div>
                      <strong>{c.nome}</strong>
                      <small>
                        {centavos > 0 ? (
                          <>
                            <span className="rz-etiqueta">−{brl(centavos)}</span>
                            <s>{brl(precoSeparado(c.itens))}</s>{" "}
                          </>
                        ) : null}
                        {c.itens.map((i) => i.nome).join(" + ")}
                      </small>
                    </div>
                    <span className="rz-preco">{brl(c.precoCentavos)}</span>
                  </li>
                );
              })}
            </ul>
          </Aparece>
        ) : null}

        {on.localizacao && (tenant.endereco || horarios.length) ? (
          <Aparece className="rz-secao">
            <p className="rz-kicker" id="rz-endereco">
              Onde a cadeira está
            </p>
            {tenant.endereco ? (
              <>
                <p className="rz-endereco">{tenant.endereco}</p>
                <a
                  className="rz-sublinhado"
                  href={linkDoMapa(tenant.endereco)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir no mapa <ArrowUpRight size={14} aria-hidden />
                </a>
              </>
            ) : null}
            <ul className="rz-horarios">
              {horarios.map((h) => (
                <li key={h.dias}>
                  <span>{h.dias}</span>
                  <strong>{h.horario}</strong>
                </li>
              ))}
            </ul>
            {config.secoes.localizacao.mostrarDetalhes && config.secoes.localizacao.bio ? (
              <p className="rz-texto">{config.secoes.localizacao.bio}</p>
            ) : null}
            <p className="rz-redes">
              {on.instagram && instagram ? (
                <a
                  className="rz-sublinhado"
                  href={`https://instagram.com/${instagram}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
              ) : null}
              {on.instagram
                ? extras.map((x) => (
                    <a
                      key={x.r}
                      className="rz-sublinhado"
                      href={x.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {x.r === "tiktok" ? "TikTok" : x.r === "youtube" ? "YouTube" : "Site"}
                    </a>
                  ))
                : null}
            </p>
          </Aparece>
        ) : null}

        <footer className="rz-rodape">
          <LogoBarbearia
            nome={tenant.nome}
            url={tenant.logo_signed_url}
            size={96}
            className="rz-logo-grande"
          />
          <p>{tenant.nome}</p>
        </footer>
      </section>
    </div>
  );
}
