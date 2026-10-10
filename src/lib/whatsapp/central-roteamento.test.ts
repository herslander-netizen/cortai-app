import { describe, expect, it } from "vitest";

import {
  escolherConexaoDeNotificacao,
  escolherConexaoPorFinalidade,
  ehConexaoCentral,
} from "./finalidade-conexao";
import { podeEnviarPelaConexao } from "./saude-conexao";

type L = {
  id: string;
  sessao_id: string;
  status: string | null;
  tipo: string | null;
  compartilhada?: boolean | null;
  escopo?: string | null;
  tenant_id?: string | null;
};

const principal = (status = "conectado"): L => ({
  id: "a",
  sessao_id: "s_a",
  status,
  tipo: "atendimento",
  compartilhada: false,
  escopo: "tenant",
  tenant_id: "t1",
});
const legadoNotif = (status = "conectado"): L => ({
  id: "n",
  sessao_id: "s_n",
  status,
  tipo: "notificacoes",
  compartilhada: false,
  escopo: "tenant",
  tenant_id: "t1",
});
const central = (): L => ({
  id: "c",
  sessao_id: "cortai_central_x",
  status: "conectado",
  tipo: "notificacoes",
  compartilhada: false,
  escopo: "central",
  tenant_id: null,
});

describe("Central de Notificações = interruptor", () => {
  it("ligada → segue pela conexão principal", () => {
    expect(escolherConexaoDeNotificacao({ ativas: true })).toEqual({ tipo: "principal" });
  });
  it("desligada → nada sai pelo WhatsApp", () => {
    expect(escolherConexaoDeNotificacao({ ativas: false })).toEqual({ tipo: "desativado" });
  });
});

describe("uma conexão por negócio", () => {
  it("avisos e atendimento saem pelo mesmo número", () => {
    const a = escolherConexaoPorFinalidade([principal()], "atendimento");
    const n = escolherConexaoPorFinalidade([principal()], "notificacoes");
    expect(a).toMatchObject({ tipo: "propria", conexao: { id: "a" } });
    expect(n).toMatchObject({ tipo: "propria", conexao: { id: "a" } });
  });
  it("linha legada de notificações nunca envia", () => {
    const r = escolherConexaoPorFinalidade([principal(), legadoNotif()], "notificacoes");
    expect(r).toMatchObject({ tipo: "propria", conexao: { id: "a" } });
    expect(escolherConexaoPorFinalidade([legadoNotif()], "notificacoes").tipo).toBe("indisponivel");
  });
  it("principal desconectada → indisponível, nunca a linha legada ou o número oficial", () => {
    const r = escolherConexaoPorFinalidade(
      [principal("desconectado"), legadoNotif()],
      "notificacoes",
    );
    expect(r.tipo).toBe("indisponivel");
  });
  it("linha da plataforma nunca conta como conexão do negócio", () => {
    expect(ehConexaoCentral(central())).toBe(true);
    expect(escolherConexaoPorFinalidade([central()], "notificacoes").tipo).toBe("indisponivel");
    expect(escolherConexaoPorFinalidade([central()], "atendimento").tipo).toBe("indisponivel");
  });
  it("trava de envio bloqueia a linha da plataforma para qualquer negócio", () => {
    expect(podeEnviarPelaConexao({ tenant_id: null, compartilhada: false }, "t1")).toBe(false);
  });
});
