import { describe, expect, it } from "vitest";

import { derivarCentral, type EntradaDaCentral } from "./central-automacao";

const agora = new Date("2026-10-10T12:00:00Z");
const ha = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();

const saudavel = (): EntradaDaCentral => ({
  conexao: {
    status: "conectado",
    numero: "+55 79 99999-0000",
    verificadoEm: ha(5),
    vistoEm: ha(5),
    conectadoEm: ha(600),
  },
  automacaoLigada: true,
  iaPausadaEm: null,
  iaPausaMotivo: null,
  iaNoServidor: true,
  planoLibera: true,
  avisosAtivos: true,
  servicoConfigurado: true,
  ultimoEventoDoServico: null,
  ultimoEventoDoServicoEm: null,
  agora,
});

describe("estados independentes da Central", () => {
  it("tudo confirmado: automação ativada, IA ativa, Evolution online, monitoramento ativo", () => {
    const c = derivarCentral(saudavel());
    expect(c).toMatchObject({
      whatsapp: "conectado",
      ia: "ativa",
      evolution: "online",
      monitoramento: "ativo",
      avisos: "ativados",
    });
    expect(c.principal).toMatchObject({ titulo: "Automação ativada", tom: "ok" });
  });

  it("WhatsApp conectado, mas IA pausada: a IA não aparece como ativa", () => {
    const c = derivarCentral({
      ...saudavel(),
      iaPausadaEm: ha(60),
      iaPausaMotivo: "limite diário",
    });
    expect(c.whatsapp).toBe("conectado");
    expect(c.ia).toBe("pausada");
    expect(c.principal.titulo).toBe("IA pausada");
  });

  it("toggle desligado: IA pausada pelo dono, canal e avisos independentes", () => {
    const c = derivarCentral({ ...saudavel(), automacaoLigada: false });
    expect(c).toMatchObject({
      whatsapp: "conectado",
      ia: "pausada",
      iaMotivo: "desligada_pelo_dono",
    });
    expect(c.avisos).toBe("ativados");
    expect(c.principal.titulo).toBe("Automação desligada");
  });

  it("IA só é ativa com as dependências: plano e serviço da IA", () => {
    expect(derivarCentral({ ...saudavel(), planoLibera: false }).ia).toBe("indisponivel");
    expect(derivarCentral({ ...saudavel(), iaNoServidor: false }).iaMotivo).toBe("sem_servico");
  });

  it("avisos desativados não mudam o canal nem a IA", () => {
    const c = derivarCentral({ ...saudavel(), avisosAtivos: false });
    expect(c.avisos).toBe("desativados");
    expect(c.ia).toBe("ativa");
    expect(c.whatsapp).toBe("conectado");
  });

  it("Evolution caiu com o toggle ligado: mantém a intenção e informa indisponibilidade", () => {
    const c = derivarCentral({
      ...saudavel(),
      ultimoEventoDoServico: "evolution_indisponivel",
      ultimoEventoDoServicoEm: ha(20),
    });
    expect(c.automacaoLigada).toBe(true);
    expect(c.evolution).toBe("offline");
    expect(c.principal.titulo).toBe("Automação temporariamente indisponível");
  });

  it("falha isolada: Evolution instável, não offline; instabilidade antiga é esquecida", () => {
    const instavel = derivarCentral({
      ...saudavel(),
      ultimoEventoDoServico: "evolution_instavel",
      ultimoEventoDoServicoEm: ha(10),
    });
    expect(instavel.evolution).toBe("instavel");
    const antiga = derivarCentral({
      ...saudavel(),
      ultimoEventoDoServico: "evolution_instavel",
      ultimoEventoDoServicoEm: ha(300),
    });
    expect(antiga.evolution).toBe("online");
  });

  it("sem confirmação recente nunca presume sucesso", () => {
    const c = derivarCentral({
      ...saudavel(),
      conexao: {
        ...saudavel().conexao!,
        verificadoEm: ha(300),
        vistoEm: ha(300),
        conectadoEm: ha(900),
      },
    });
    expect(c.whatsapp).toBe("desconhecido");
    expect(c.evolution).toBe("desconhecido");
    expect(c.monitoramento).toBe("nao_confirmado");
    expect(c.principal.titulo).toBe("Verificando a conexão");
  });

  it("sem conexão: desconectado e pede para conectar", () => {
    const c = derivarCentral({ ...saudavel(), conexao: null });
    expect(c.whatsapp).toBe("desconectado");
    expect(c.principal.acao).toBe("conectar");
  });

  it("serviço não configurado: Evolution desconhecido e monitoramento indisponível", () => {
    const c = derivarCentral({ ...saudavel(), servicoConfigurado: false });
    expect(c.evolution).toBe("desconhecido");
    expect(c.monitoramento).toBe("indisponivel");
  });

  it("QR pronto: aguardando leitura, nunca conectado", () => {
    const c = derivarCentral({
      ...saudavel(),
      conexao: { ...saudavel().conexao!, status: "qr_pronto" },
    });
    expect(c.whatsapp).toBe("aguardando_leitura");
  });
});
