import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rotaEquipe = readFileSync("src/routes/barbeiro.equipe.tsx", "utf8");
const rotaFicha = readFileSync("src/routes/barbeiro.equipe_.$userId.tsx", "utf8");
const servidor = readFileSync("src/lib/painel-membro.functions.ts", "utf8");
const editarDados = readFileSync("src/routes/barbeiro.equipe-dados.$userId.tsx", "utf8");
const salvarPerfil = readFileSync("src/lib/crescimento.functions.ts", "utf8");
const escala = readFileSync("src/components/barbeiro/EscalaDaEquipe.tsx", "utf8");

describe("Ficha individual de equipe — paridade estrutural Figaroo", () => {
  it("abre ficha própria a partir da lista sem remover as permissões existentes", () => {
    expect(rotaEquipe).toContain('to="/barbeiro/equipe/$userId"');
    expect(rotaEquipe).toContain("Ver ficha do membro");
    expect(rotaEquipe).toContain("<CartaoMembro");
    expect(rotaFicha).toContain('createFileRoute("/barbeiro/equipe_/$userId")');
  });

  it("não confunde conta de acesso e profissional por nome ou e-mail", () => {
    expect(servidor).toContain('.eq("user_id", data.userId)');
    expect(servidor).toContain('.eq("tenant_id", tenantId)');
    expect(servidor).toContain('vinculo: "multiplo"');
    expect(servidor).toContain('vinculo: "ausente"');
    expect(servidor).toContain('exigirPermissao(context, tenantId, "gerenciar_permissoes")');
    expect(rotaFicha).toContain("não associamos registros por nome");
  });

  it("mantém indicadores associados aos registros reais, sem exemplos fictícios", () => {
    expect(servidor).toContain('.from("agendamentos")');
    expect(servidor).toContain('.from("avaliacoes")');
    expect(servidor).toContain('.from("escalas_de_profissional")');
    expect(servidor).toContain('.not("pagamento_confirmado_em", "is", null)');
    expect(servidor).toContain(".range(de, de + PAGINA - 1)");
    expect(rotaFicha).toContain("Histórico total.");
  });

  it("possui editor separado de dados com confirmação de alterações não salvas", () => {
    expect(rotaFicha).toContain('to="/barbeiro/equipe-dados/$userId"');
    expect(editarDados).toContain('createFileRoute("/barbeiro/equipe-dados/$userId")');
    expect(editarDados).toContain("sujo={sujo}");
    expect(editarDados).toContain("Salvar alterações");
    expect(editarDados).toContain("getPerfilDoMembroParaEdicao");
    expect(editarDados).toContain("salvarPerfilProfissional");
    expect(editarDados).toContain("portfolio: perfil.portfolio");
  });

  it("valida vínculo/tenant e atualiza somente os campos autorizados do profissional", () => {
    expect(servidor).toContain('exigirPermissao(context, tenantId, "gerenciar_profissionais")');
    expect(servidor).toContain('exigirPermissao(context, tenantId, "gerenciar_permissoes")');
    expect(servidor).toContain('.eq("user_id", data.userId)');
    expect(servidor).toContain('.eq("tenant_id", tenantId)');
    expect(salvarPerfil).toContain('if (data.userId) gravacao = gravacao.eq("user_id", data.userId)');
    expect(salvarPerfil).toContain('if (!atualizado) throw new Error("Profissional não encontrado');
  });

  it("reaproveita edição de escala do Flow em vez de inventar segundo mecanismo", () => {
    expect(rotaFicha).toContain("<EscalaDaEquipe profissionalFixo={profissional.id} />");
    expect(escala).toContain("profissionalFixo || prof || equipe.data?.[0]?.id");
    expect(escala).toContain("salvarEscalaDoProfissional");
  });
});
