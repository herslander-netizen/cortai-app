import { describe, expect, it } from "vitest";
import {
  ehConexaoCentral,
  escolherConexaoDeNotificacao,
  escolherConexaoPorFinalidade,
} from "./finalidade-conexao";
import { podeEnviarPelaConexao } from "./saude-conexao";

type L = {
  id: string;
  sessao_id: string;
  status: string;
  tipo: string;
  compartilhada: boolean;
  escopo: string;
  tenant_id: string | null;
};
const linha = (p: Partial<L>): L => ({
  id: "x",
  sessao_id: "s",
  status: "conectado",
  tipo: "atendimento",
  compartilhada: false,
  escopo: "tenant",
  tenant_id: "t1",
  ...p,
});
const atend = (status = "conectado") => linha({ id: "a", status });
const notif = (status = "conectado") => linha({ id: "n", tipo: "notificacoes", status });
const central = (status = "conectado") =>
  linha({ id: "c", tipo: "notificacoes", escopo: "central", tenant_id: null, status });

const decidir = (o: Partial<Parameters<typeof escolherConexaoDeNotificacao<L>>[0]>) =>
  escolherConexaoDeNotificacao<L>({
    linhasDoTenant: [],
    central: central(),
    ativas: true,
    centralHabilitada: true,
    ...o,
  });

describe("roteamento de notificações", () => {
  it("própria conectada → própria", () => {
    expect(decidir({ linhasDoTenant: [atend(), notif()] })).toMatchObject({
      tipo: "propria",
      conexao: { id: "n" },
    });
  });
  it("própria desconectada → falha, nunca Central (mesmo habilitada)", () => {
    for (const st of ["desconectado", "pendente", "qr_pronto", "erro"]) {
      const d = decidir({ linhasDoTenant: [notif(st)] });
      expect(d).toMatchObject({ tipo: "falha", avisar: "dono" });
    }
  });
  it("sem própria + Central habilitada e conectada → Central", () => {
    expect(decidir({ linhasDoTenant: [atend()] })).toMatchObject({ tipo: "central" });
  });
  it("sem própria + habilitada + Central fora → falha para a plataforma", () => {
    expect(decidir({ central: central("desconectado") })).toMatchObject({
      tipo: "falha",
      avisar: "plataforma",
    });
    expect(decidir({ central: null })).toMatchObject({ tipo: "falha" });
  });
  it("Central desabilitada → legado (comportamento anterior)", () => {
    expect(decidir({ centralHabilitada: false, linhasDoTenant: [atend()] })).toEqual({
      tipo: "legado",
    });
  });
  it("serviço desligado → nada sai pelo WhatsApp", () => {
    expect(decidir({ ativas: false, linhasDoTenant: [notif()] })).toEqual({ tipo: "desativado" });
  });
  it("linha central dentro da lista do tenant nunca vira 'própria'", () => {
    expect(decidir({ centralHabilitada: false, linhasDoTenant: [central()] })).toEqual({
      tipo: "legado",
    });
  });
});

describe("atendimento nunca usa a Central", () => {
  it("atendimento desconectado com Central presente → falha/reserva, nunca Central", () => {
    const r = escolherConexaoPorFinalidade([atend("desconectado"), notif(), central()], "atendimento");
    expect(r.tipo).toBe("falha");
    const r2 = escolherConexaoPorFinalidade([central()], "atendimento");
    expect(r2.tipo).toBe("reserva");
  });
});

describe("compatibilidade e rollback", () => {
  it("regra antiga não interpreta a Central como conexão do tenant", () => {
    expect(escolherConexaoPorFinalidade([central()], "notificacoes").tipo).toBe("reserva");
  });
  it("busca do tenant ignora tenant_id nulo (simulação do filtro eq)", () => {
    const banco = [atend(), central()];
    const doTenant = banco.filter((l) => l.tenant_id === "t1");
    expect(doTenant.some(ehConexaoCentral)).toBe(false);
  });
  it("busca antiga do número oficial (compartilhada=true) não retorna a Central", () => {
    const banco = [central(), linha({ id: "o", compartilhada: true })];
    expect(banco.filter((l) => l.compartilhada).map((l) => l.id)).toEqual(["o"]);
  });
  it("trava de envio bloqueia a Central para qualquer tenant", () => {
    expect(podeEnviarPelaConexao({ tenant_id: null, compartilhada: false }, "t1")).toBe(false);
    expect(podeEnviarPelaConexao({ tenant_id: "t1", compartilhada: false }, "t1")).toBe(true);
  });
  it("conexão única legada segue atendendo os dois papéis", () => {
    expect(escolherConexaoPorFinalidade([atend()], "notificacoes")).toMatchObject({
      tipo: "propria",
      legado: true,
    });
  });
});
