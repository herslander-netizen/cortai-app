#!/usr/bin/env node
/**
 * Inventário estrutural de 23 áreas Figaroo → Flow.
 * Só constata rotas e quantidade de testes com nomes relacionados.
 * NÃO confunde rota existente nem teste unitário com fluxo E2E homologado.
 * Sem credenciais, sem API, sem banco, sem download ou deploy.
 */
import { existsSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function procurarArquivos(dir, out = []) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = path.posix.join(dir, entrada.name);
    if (entrada.isDirectory()) procurarArquivos(caminho, out);
    else out.push(caminho);
  }
  return out;
}
const arquivos = procurarArquivos("src");
const testes = arquivos.filter((f) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f));
const dominios = [
  ["Entrada e autenticação", ["src/routes/login.tsx", "src/routes/comecar.tsx"], /(login|auth|entrada|conta)/i],
  ["Onboarding", ["src/routes/barbeiro.configurar.tsx"], /onboarding|configuracao|configurar/i],
  ["Home e navegação", ["src/routes/barbeiro.index.tsx"], /navegacao|layout|home|inicio/i],
  ["Agenda", ["src/routes/barbeiro.agenda.tsx"], /agenda|timeline|foco/i],
  ["Ficha de agendamento", ["src/routes/barbeiro.agendamento.tsx"], /ficha|agendamento|remarcacao/i],
  ["Clientes e fichas", ["src/routes/barbeiro.clientes.index.tsx"], /cliente|crm/i],
  ["Equipe e profissional", ["src/routes/barbeiro.equipe.tsx", "src/routes/barbeiro.equipe_.$userId.tsx"], /equipe|profission|membro/i],
  ["Serviços", ["src/routes/barbeiro.servicos.tsx", "src/routes/barbeiro.categorias.tsx"], /servico|categorias/i],
  ["Combos", [], /combo/i],
  ["Localidades", [], /localidad|filial/i],
  ["Pacotes e fidelidade", ["src/routes/barbeiro.pacotes.tsx"], /pacote|fidelidade/i],
  ["Checkout e cobranças", ["src/routes/barbeiro.financeiro.tsx"], /checkout|comanda|pagamento/i],
  ["Vendas e caixa", ["src/routes/barbeiro.caixa.tsx"], /venda|caixa|produto/i],
  ["Campanhas e marketing", ["src/routes/barbeiro.campanhas.tsx"], /campanha|marketing|promocao/i],
  ["Avaliações", ["src/routes/barbeiro.avaliacoes.tsx"], /avalia|nota/i],
  ["Notificações", ["src/routes/barbeiro.notificacoes.tsx"], /notifica|aviso/i],
  ["Configurações do negócio", ["src/routes/barbeiro.negocio.tsx"], /negocio|configuracao|funcionalidade/i],
  ["Configurações da conta", ["src/routes/barbeiro.conta.tsx"], /conta|senha|perfil/i],
  ["Assinatura", ["src/routes/barbeiro.plano.tsx"], /plano|assinatura/i],
  ["Galeria e mídia", ["src/routes/barbeiro.marca.index.tsx"], /foto|galeria|imagem|marca/i],
  ["Página pública", ["src/routes/b.$slug.tsx"], /publica|pagina|tema/i],
  ["Agendamento público", ["src/routes/agendar.$slug.tsx"], /agendamento|publico|reserva/i],
  ["Relatórios e desempenho", ["src/routes/barbeiro.crescimento.tsx"], /insight|relatorio|crescimento|financeiro/i],
];

const saida = [
  "# Figaroo → Flow — inventário estrutural automatizado",
  "",
  "> **Não é homologação funcional.** Existir uma rota ou teste de nome relacionado não comprova lista → ficha → criação → edição → persistência, permissões, falha de rede, nem paridade visual com o APK.",
  "",
  "| Área | Rota(s) de referência | Arquivos de teste relacionados | Evidência de fluxo ponta a ponta |",
  "| --- | --- | ---: | --- |",
];
for (const [nome, rotas, padrao] of dominios) {
  const presentes = rotas.filter((p) => existsSync(p));
  const total = testes.filter((p) => padrao.test(p)).length;
  const rotasTxt = rotas.length === 0
    ? "Sem equivalente próprio comprovado"
    : rotas.map((p) => (presentes.includes(p) ? "✓ " : "✕ ") + "`" + p.replace("src/routes/", "") + "`").join(", ");
  saida.push(`| ${nome} | ${rotasTxt} | ${total} | Pendente | `);
}
saida.push(
  "",
  `**Cobertura de nomes (não funcional):** ${dominios.length} áreas catalogadas; ${testes.length} arquivos de teste no projeto.`,
  "",
  "## Critério para mudar 'Pendente' para 'Validado'",
  "",
  "Para cada módulo: identificar funções comprovadas no APK, mapear cada ação para o Flow, testar com dados isolados lista → ficha → criar/editar → salvar → voltar → persistência → erro → permissão/tenant → mobile 360/390 → claro/escuro; registrar link do job, captura ou log e commit. Nenhum status é promovido automaticamente por este relatório.",
  "",
  "Fontes: `docs/paridade-figaroo-flow-inventario-2026-11-08.md`, `docs/referencia-figaro/apk/7-modulos.md` e o código desta branch.",
  "",
);
mkdirSync("test-results/figaroo", { recursive: true });
writeFileSync("test-results/figaroo/inventario.md", saida.join("\n"));
console.log(`Inventário Figaroo: ${dominios.length} áreas; ${testes.length} arquivos de teste; arquivo test-results/figaroo/inventario.md`);
if (dominios.length !== 23) throw new Error("O inventário deixou de ter 23 áreas");
