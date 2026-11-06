/**
 * Os passos do Onboarding desenhados a partir do estado de `useConfiguracaoInicial` (a rota só monta a moldura,
 * as boas-vindas e a tela final). Cada passo usa os componentes desta pasta e o rodapé padrão.
 */
import { AjustadorImagem } from "@/components/ui/ajustador-imagem";
import { EtapasAnimadas } from "@/components/ui/EtapasAnimadas";
import { EditorDeHorarios } from "@/components/onboarding/EditorDeHorarios";
import { EditorDeServicos } from "@/components/onboarding/EditorDeServicos";
import type { useConfiguracaoInicial } from "@/components/onboarding/useConfiguracaoInicial";
import { ETAPAS_DO_ONBOARDING, REGRAS_RECOMENDADAS } from "@/lib/onboarding.functions";
import { RodapeDoPasso } from "./MolduraDoPasso";
import { PassoDaEquipe } from "./PassoDaEquipe";
import { PassoDasRegras } from "./PassoDasRegras";
import { PassoDoLink } from "./PassoDoLink";
import { PassoDoModo } from "./PassoDoModo";
import { PassoDoNegocio } from "./PassoDoNegocio";

export function PassosDoOnboarding({ c }: { c: ReturnType<typeof useConfiguracaoInicial> }) {
  const {
    salvarDados,
    gravarHorarios,
    gravarRegras,
    marcar,
    concluir,
    gravarModo,
    data,
    salvando,
    etapa,
    indice,
    nome,
    setNome,
    whatsapp,
    setWhatsapp,
    endereco,
    setEndereco,
    logo,
    enviandoLogo,
    logoPendente,
    setLogoPendente,
    horarios,
    setHorarios,
    servicos,
    setServicos,
    regras,
    setRegras,
    novoNome,
    setNovoNome,
    novoEmail,
    setNovoEmail,
    novaFuncao,
    setNovaFuncao,
    adicionando,
    copiado,
    modo,
    setModo,
    valorNome,
    segmento,
    vocabulario,
    valorWhatsapp,
    valorEndereco,
    valorHorarios,
    valorRegras,
    valorModo,
    valorServicos,
    profissionais,
    link,
    linkCurto,
    proxima,
    anterior,
    garantirDonoNaAgenda,
    enviarLogo,
    enviarLogoAjustada,
    adicionarPessoa,
    salvarServicosAgora,
    copiarLink,
    marcarLinkCompartilhado,
  } = c;
  if (!data) return null;
  const totalDePassos = ETAPAS_DO_ONBOARDING.length - 1;
  const rodape = (
    aoContinuar: () => void,
    rotulo = "Continuar",
    desabilitado = false,
    pular?: () => void,
  ) => (
    <RodapeDoPasso
      onContinuar={aoContinuar}
      rotulo={rotulo}
      desabilitado={desabilitado}
      carregando={salvando}
      onVoltar={indice > 0 ? anterior : undefined}
      onPular={pular}
    />
  );

  return (
    <EtapasAnimadas etapa={indice}>
      {etapa === "dados" ? (
        <div>
          <PassoDoNegocio
            logoUrl={logo?.previa ?? data.tenant.logoAssinada ?? null}
            enviandoLogo={enviandoLogo}
            onEscolherLogo={enviarLogo}
            rotuloNome={`Nome ${vocabulario.de}`}
            rotuloWhatsapp={`WhatsApp ${vocabulario.de}`}
            nome={valorNome}
            onNome={setNome}
            whatsapp={valorWhatsapp}
            onWhatsapp={setWhatsapp}
            endereco={valorEndereco}
            onEndereco={setEndereco}
          />
          {logoPendente ? (
            <AjustadorImagem
              file={logoPendente}
              titulo="Ajustar logo ou foto"
              proporcao={1}
              fit="contain"
              onCancelar={() => setLogoPendente(null)}
              onConfirmar={(arquivo) => void enviarLogoAjustada(arquivo)}
            />
          ) : null}
          {rodape(
            () =>
              proxima(() =>
                salvarDados({
                  data: {
                    nome: valorNome.trim(),
                    whatsapp: valorWhatsapp,
                    endereco: valorEndereco,
                    ...(logo ? { logoUrl: logo.caminho } : {}),
                  },
                }),
              ),
            "Continuar",
            valorNome.trim().length < 2 || enviandoLogo,
          )}
        </div>
      ) : null}

      {etapa === "equipe" ? (
        <div>
          <PassoDaEquipe
            profissionais={profissionais}
            salvando={salvando}
            onSozinho={() =>
              proxima(async () => {
                await garantirDonoNaAgenda();
                await marcar({ data: { chave: "sozinho", feito: true } });
              })
            }
            funcao={novaFuncao}
            onFuncao={setNovaFuncao}
            nome={novoNome}
            onNome={setNovoNome}
            email={novoEmail}
            onEmail={setNovoEmail}
            adicionando={adicionando}
            onAdicionar={() => void adicionarPessoa()}
          />
          {rodape(() => proxima(garantirDonoNaAgenda))}
        </div>
      ) : null}

      {etapa === "servicos" ? (
        <div>
          <p className="mb-4 px-1 text-[13px] leading-5 text-mute">
            Já deixamos sugestões. Ajuste preço e duração ou apague o que não faz.
          </p>
          <EditorDeServicos
            servicos={valorServicos}
            onChange={setServicos}
            profissionais={profissionais.map((p) => ({ id: p.id, nome: p.nome }))}
            semIA
            segmento={segmento}
            tenantId={data.tenant.id}
          />
          {rodape(
            () => proxima(salvarServicosAgora),
            "Continuar",
            !valorServicos.some((s) => s.nome.trim().length >= 2),
          )}
        </div>
      ) : null}

      {etapa === "horarios" ? (
        <div>
          <p className="mb-4 px-1 text-[13px] leading-5 text-mute">
            Já vem preenchido. Mude só o que for diferente.
          </p>
          <EditorDeHorarios
            horarios={valorHorarios}
            onChange={setHorarios}
            semIA
            segmento={segmento}
          />
          {rodape(() => proxima(() => gravarHorarios({ data: { horarios: valorHorarios } })))}
        </div>
      ) : null}

      {etapa === "regras" ? (
        <div>
          <PassoDasRegras
            regras={valorRegras}
            onRegras={setRegras}
            salvando={salvando}
            onPadrao={() => {
              setRegras(REGRAS_RECOMENDADAS);
              proxima(() => gravarRegras({ data: REGRAS_RECOMENDADAS }));
            }}
          />
          {rodape(() => proxima(() => gravarRegras({ data: valorRegras }).then(() => concluir())))}
        </div>
      ) : null}

      {etapa === "canais" ? (
        <div>
          <p className="mb-4 px-1 text-[13px] leading-5 text-mute">
            Escolha agora ou mantenha o formato atual. Você pode mudar depois.
          </p>
          <PassoDoModo modo={valorModo} onModo={setModo} />
          {rodape(
            () => proxima(() => gravarModo({ data: { modo: valorModo } })),
            "Continuar",
            false,
            () => proxima(),
          )}
        </div>
      ) : null}

      {etapa === "link" ? (
        <div>
          <PassoDoLink
            link={link}
            linkCurto={linkCurto}
            frase={`Este é o link ${vocabulario.de}. Mande para seus clientes agendarem.`}
            textoDoCompartilhar={`Agende seu horário na ${data.tenant.nome}: ${link}`}
            copiado={copiado}
            onCopiar={() => void copiarLink()}
            onCompartilhou={marcarLinkCompartilhado}
          />
          {rodape(() => proxima(), "Concluir")}
        </div>
      ) : null}
    </EtapasAnimadas>
  );
}
