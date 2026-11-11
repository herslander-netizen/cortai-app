import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/** Gaveta de acesso organizada no modelo de folha (dono, 06/11/2026). Autenticação e regras não mudam. */
const login = readFileSync("src/routes/login.tsx", "utf8");
const gaveta = login.slice(
  login.indexOf("ref={painelLoginRef}"),
  login.indexOf("<ForgotPasswordSheet"),
);

describe("gaveta de acesso", () => {
  it("usa tokens no fundo (inline, porque a regra antiga `.entrada-painel` venceria a classe)", () => {
    expect(gaveta).toContain('background: "var(--painel)"');
    expect(gaveta).not.toMatch(/#[0-9a-f]{3,8}\b|rgba\(/i);
  });

  it("tem uma pílula principal com carregando, sem trocar o texto por 'Aguarde…'", () => {
    expect(gaveta).toContain("loading={enviando}");
    expect(gaveta).not.toContain("Aguarde…");
  });

  it("o 'ou' só aparece junto do Google, e não há um segundo botão de fechar em texto", () => {
    const ou = gaveta.indexOf("\n                      ou\n");
    const google = gaveta.indexOf("Continuar com o Google");
    const condicao = gaveta.lastIndexOf('modo === "criar" || faseLogin === "identificar" ? (', ou);
    expect(ou).toBeGreaterThan(0);
    expect(condicao).toBeGreaterThan(0);
    expect(google).toBeGreaterThan(ou);
    expect(gaveta).not.toContain("Ver como o Flow funciona");
  });

  it("o telefone tira espaços, parênteses, pontos e traços (antes a barra dupla não tirava espaços)", () => {
    expect(login).toContain('identificador.replace(/[\\s().-]/g, "")');
    const limpar = (t: string) => t.replace(/[\s().-]/g, "");
    expect(limpar("+55 (79) 99999-9999")).toBe("+5579999999999");
  });

  it("sempre abre primeiro a vitrine, sem pular para o formulário por parâmetros da URL", () => {
    expect(login).toContain('const [mostrarForm, setMostrarForm] = useState(false);');
    expect(login).toContain('aba === "criar" ? "criar" : "entrar"');
    expect(login).toContain("onCreateAccount={() => {");
    expect(login).toContain("onSignIn={() => {");
    expect(login).toContain("destinoSolicitadoPermitido(proximo, destinoDoPapel(sessao))");
    expect(login).not.toContain('y: "100%"');
  });

  it("a gaveta oferece progresso, movimento curto e uma saída acessível", () => {
    expect(login).toContain("y: 28");
    expect(login).toContain('backdrop-blur-[4px]');
    expect(gaveta).toContain('aria-modal="true"');
    expect(gaveta).toContain('aria-label="Fechar painel de acesso"');
    expect(gaveta).toContain('scaleX: modo === "entrar" && faseLogin === "identificar" ? 0.5 : 1');
    expect(gaveta).toContain('min-h-12 min-w-12');
  });
});
