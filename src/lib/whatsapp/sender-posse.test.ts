import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  conexao: "evolution",
  posse: vi.fn(),
  filtros: [] as [string, string][],
  enviarMensagem: vi.fn(),
  enviarInterativo: vi.fn(),
  enviarTemplate: vi.fn(),
  marcarComoLida: vi.fn(),
  digitando: vi.fn(),
  insert: vi.fn(),
}));
vi.mock("./conexao-envio.server", () => ({
  gatewayDaSessao: async () => ({
    provedor: () => m.conexao,
    capacidades: () => ({ botoes: m.conexao === "meta" }),
    enviarMensagem: m.enviarMensagem,
    enviarInterativo: m.enviarInterativo,
    enviarTemplate: m.enviarTemplate,
    marcarComoLida: m.marcarComoLida,
    digitando: m.digitando,
  }),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(tabela: string) {
      const q = {
        select: () => q,
        eq: (chave: string, valor: string) => {
          if (tabela === "conversas_whatsapp") m.filtros.push([chave, valor]);
          return q;
        },
        order: () => q,
        limit: () => q,
        update: () => q,
        insert: m.insert,
        maybeSingle: async () =>
          tabela === "conversas_whatsapp" ? m.posse() : { data: null, error: null },
      };
      return q;
    },
  },
}));

import { enviarPelaBarbearia } from "./fluxo.server";

const livre = { data: { status: "ativa", modo_humano: false, modo_humano_ate: null }, error: null };
const humano = { data: { status: "humano", modo_humano: false, modo_humano_ate: null }, error: null };
const base = {
  tenantId: "tenant-teste",
  conversaId: "conversa-teste",
  conexaoId: "conexao-teste",
  sessaoId: "sessao-teste",
  telefone: "550000000000",
  texto: "Resposta de teste",
  porIa: true,
};
const interativo = [{ id: "opcao", titulo: "Escolher" }];
const modelo = { nome: "teste", idioma: "pt_BR", parametros: [], botoes: [] };

beforeEach(() => {
  vi.resetAllMocks();
  m.conexao = "evolution";
  m.filtros.length = 0;
  m.posse.mockResolvedValue(livre);
  m.enviarMensagem.mockResolvedValue({ id: "texto-teste" });
  m.enviarInterativo.mockResolvedValue({ id: "botao-teste" });
  m.enviarTemplate.mockResolvedValue({ id: "modelo-teste" });
  m.digitando.mockResolvedValue(undefined);
  m.marcarComoLida.mockResolvedValue(undefined);
});

describe("posse humana no envio reativo por IA", () => {
  it("protege interativo Meta e qualifica a consulta pelo negócio", async () => {
    m.conexao = "meta";
    m.posse.mockResolvedValue(humano);
    expect(await enviarPelaBarbearia({ ...base, interativo })).toMatchObject({ suprimido: true });
    expect(m.filtros).toEqual([["id", base.conversaId], ["tenant_id", base.tenantId]]);
    expect(m.enviarInterativo).not.toHaveBeenCalled();
    expect(m.insert).not.toHaveBeenCalled();
  });

  it("revalida posse antes do modelo alternativo após a Meta sinalizar janela fechada", async () => {
    m.conexao = "meta";
    m.posse.mockResolvedValueOnce(livre).mockResolvedValueOnce(humano);
    m.enviarInterativo.mockRejectedValue(new Error("131047"));
    expect(await enviarPelaBarbearia({ ...base, interativo, modelo })).toMatchObject({
      suprimido: true,
    });
    expect(m.enviarInterativo).toHaveBeenCalledOnce();
    expect(m.enviarTemplate).not.toHaveBeenCalled();
  });

  it("não envia quando a equipe assume durante o digitando na Evolution", async () => {
    m.posse.mockResolvedValueOnce(livre).mockResolvedValueOnce(humano);
    expect(await enviarPelaBarbearia(base)).toMatchObject({ suprimido: true });
    expect(m.digitando).toHaveBeenCalledOnce();
    expect(m.enviarMensagem).not.toHaveBeenCalled();
    expect(m.insert).not.toHaveBeenCalled();
  });

  it.each([
    { data: null, error: null },
    { data: livre.data, error: { message: "timeout" } },
    { data: { ...livre.data, status: "encerrada" }, error: null },
  ])("bloqueia posse inconclusiva ou conversa encerrada (%j)", async (posse) => {
    m.posse.mockResolvedValue(posse);
    expect(await enviarPelaBarbearia(base)).toMatchObject({ suprimido: true });
    expect(m.digitando).not.toHaveBeenCalled();
    expect(m.enviarMensagem).not.toHaveBeenCalled();
  });

  it("rejeição da consulta também falha fechada", async () => {
    m.posse.mockRejectedValue(new Error("leitura indisponível"));
    expect(await enviarPelaBarbearia(base)).toMatchObject({ suprimido: true });
    expect(m.enviarMensagem).not.toHaveBeenCalled();
    expect(m.insert).not.toHaveBeenCalled();
  });

  it("preserva texto com posse livre, mensagens manuais e modelo proativo de equipe", async () => {
    expect(await enviarPelaBarbearia(base)).toMatchObject({ externoId: "texto-teste" });
    expect(m.posse).toHaveBeenCalledTimes(2);
    m.posse.mockClear();
    m.posse.mockResolvedValue(humano);
    expect(await enviarPelaBarbearia({ ...base, autorUserId: "atendente-teste" })).toMatchObject({
      externoId: "texto-teste",
    });
    m.conexao = "meta";
    expect(await enviarPelaBarbearia({
      ...base,
      iniciadaPelaBarbearia: true,
      consentimento: "equipe",
      modelo,
    })).toMatchObject({ externoId: "modelo-teste" });
    expect(m.posse).not.toHaveBeenCalled();
  });
});
