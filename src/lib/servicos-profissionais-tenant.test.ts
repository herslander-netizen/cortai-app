import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const servidor = readFileSync("src/lib/onboarding.functions.ts", "utf8");
const pagina = readFileSync("src/routes/barbeiro.servicos.tsx", "utf8");
const editor = readFileSync("src/components/onboarding/EditorDeServicos.tsx", "utf8");

describe("Figaroo → Flow: fluxo real de profissionais por serviço", () => {
  it("faz leitura da equipe ativa somente no estabelecimento e pela autorização existente", () => {
    const inicio = servidor.indexOf("export const listarProfissionaisParaServicos =");
    const fim = servidor.indexOf("export const salvarServicos =", inicio);
    const funcao = servidor.slice(inicio, fim);
    expect(inicio).toBeGreaterThan(0);
    expect(funcao).toContain("requireSupabaseAuth");
    expect(funcao).toContain('exigirPermissao(context, tenantId, "alterar_dados_barbearia")');
    expect(funcao).toContain('.from("profissionais")');
    expect(funcao).toContain('.eq("tenant_id", tenantId)');
    expect(funcao).toContain('.eq("ativo", true)');
    expect(funcao).toContain("if (error) throw new Error");
  });

  it("rejeita IDs de profissionais de outro tenant ANTES de gravar serviços", () => {
    const inicio = servidor.indexOf("export const salvarServicos =");
    const fim = servidor.indexOf("export const removerServico =", inicio);
    const funcao = servidor.slice(inicio, fim);
    const valida = funcao.indexOf("if (idsProfissionais.some((id) => !validos.has(id)))");
    const primeiraEscrita = funcao.indexOf("db.from(\"servicos\").insert");
    expect(valida).toBeGreaterThan(0);
    expect(primeiraEscrita).toBeGreaterThan(valida);
    expect(funcao).toContain('.eq("tenant_id", tenantId)');
    expect(funcao).toContain("Um dos profissionais não pertence a este negócio.");
  });

  it("conecta a tela de Serviços ao componente que já grava profissionalIds", () => {
    expect(pagina).toContain("listarProfissionaisParaServicos()");
    expect(pagina).toContain("profissionais={profissionaisQuery.data ?? []}");
    expect(pagina).toContain("profissionaisQuery.isError");
    expect(pagina).toContain("Tentar novamente");
    expect(pagina).toContain("const { data, isLoading, isError, refetch } = useQuery({");
    expect(pagina).toContain("Não foi possível carregar os serviços do negócio.");
    expect(pagina).toContain("{isError ? (");
    expect(pagina).toContain("!isLoading && !isError && iniciado");
    expect(pagina).toContain("onClick={() => void refetch()}");
    expect(editor).toContain("Selecionar todos");
    expect(editor).toContain("disabled={ultimoSelecionado}");
    expect(pagina).toContain("profissionalIds: servico.profissionalIds");
  });
});
