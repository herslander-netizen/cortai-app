import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { itensDoDiaADiaNoMenuMovel } from "./navegacao-barbeiro";

describe("navegação móvel", () => {
  it("leva os antigos atalhos para Dia a dia e mantém a Agenda primeiro", () => {
    const itens = itensDoDiaADiaNoMenuMovel([
      "criar_agendamento",
      "visualizar_clientes",
      "visualizar_financeiro",
    ]);
    expect(itens[0]?.to).toBe("/barbeiro");
    expect(itens.map((item) => item.to)).toEqual(
      expect.arrayContaining([
        "/barbeiro",
        "/barbeiro/clientes",
        "/barbeiro/caixa",
        "/barbeiro/fila",
      ]),
    );
  });

  it("não renderiza mais a barra inferior", () => {
    const fonte = readFileSync("src/components/layout/NavegacaoEquipe.tsx", "utf8");
    expect(fonte).not.toContain("equipe-barra");
  });

  it("mantém o drawer operacional e move itens secundários para Ajustes", () => {
    const drawer = readFileSync("src/components/layout/ManagementDrawer.tsx", "utf8");
    const ajustes = readFileSync("src/components/layout/DrawerAjustes.tsx", "utf8");
    expect(drawer).not.toContain('titulo: "Sistema"');
    expect(drawer).not.toContain("ModeMenuItem");
    expect(drawer).toContain("DrawerDestaques");
    // Topo como no Figaro (dono, 26/10): logo, nome e "pessoa · papel", sem saudação.
    expect(drawer).not.toContain("saudacao.titulo");
    expect(ajustes).toContain("Opções da conta");
    expect(ajustes).toContain("Plano");
    expect(ajustes).toContain("Aparência do aplicativo");
    expect(ajustes).toContain("Sua Página");
    expect(ajustes).toContain('to: "/barbeiro/marca"');
    const pagina = readFileSync("src/routes/barbeiro.sua-pagina.tsx", "utf8");
    const qrPage = readFileSync("src/routes/barbeiro.qr-code.tsx", "utf8");
    const layoutTema = readFileSync("src/routes/barbeiro.marca.layout-tema.tsx", "utf8");
    expect(pagina).toContain('createFileRoute("/barbeiro/sua-pagina")');
    expect(pagina).toContain('to: "/barbeiro/marca"');
    expect(pagina).toContain('to: "/barbeiro/qr-code"');
    expect(layoutTema).toContain('title="Layout & Tema"');
    expect(layoutTema).toContain('to: "/barbeiro/marca"');
    const secoes = readFileSync("src/components/marca/editor/SecaoConteudo.tsx", "utf8");
    const editorSecao = readFileSync("src/routes/barbeiro.marca.secao.$secao.tsx", "utf8");
    expect(secoes).toContain('to="/barbeiro/marca/secao/$secao"');
    expect(editorSecao).toContain('NOMES_SECOES[secao]');
    const paginaPrincipal = readFileSync("src/routes/barbeiro.marca.index.tsx", "utf8");
    expect(paginaPrincipal).toContain('aria-label="Mais ações da página"');
    expect(paginaPrincipal).toContain('to="/barbeiro/qr-code"');
    expect(paginaPrincipal).not.toContain('search={{ qr: "1" }}');
    expect(paginaPrincipal).not.toContain("Ver como ficou");
    expect(paginaPrincipal).toContain("Ver prévia");
    expect(paginaPrincipal).not.toContain("Prévia do rascunho");
    expect(paginaPrincipal).not.toContain("<Copy />");
    // Menu ⋮ do Figaro (dono, 30/10): Editar Link, QR Code e Colocar Página Offline/Online.
    expect(paginaPrincipal).toContain("Editar Link");
    expect(paginaPrincipal).toContain("Colocar Página Offline");
    expect(paginaPrincipal).not.toContain("Compartilhar link");
    expect(paginaPrincipal).not.toContain("Experiência de agendamento");
    expect(layoutTema).toContain("No layout Agendamento o link abre direto");
    expect(layoutTema).toContain("Ao tocar em Agendar");
    expect(qrPage).toContain('title="QR Code"');
    expect(qrPage).not.toContain("Layout & Tema");
    expect(qrPage).not.toContain("Personalizar Página");
    expect(qrPage).not.toContain("marca.lacunas");
    expect(qrPage).toContain("Salvar na Galeria");
    expect(qrPage).toContain("Imprimir");
    const temasLegado = readFileSync("src/routes/barbeiro.temas.tsx", "utf8");
    expect(temasLegado).toContain('to: "/barbeiro/conta"');
    const funcionalidades = readFileSync("src/lib/funcionalidades.ts", "utf8");
    expect(funcionalidades).toContain('detalhe: "Cores e estilo do app"');
    expect(funcionalidades).toContain('configurar: "/barbeiro/conta"');
    expect(paginaPrincipal).toContain("query.isError && !query.data");
    expect(paginaPrincipal).toContain('titulo="Não foi possível carregar sua página"');
    expect(paginaPrincipal).toContain("Tentar novamente");
    expect(paginaPrincipal).toContain("Desativar Página?");
    expect(paginaPrincipal).toContain("alterarStatusPaginaPublica");
    expect(paginaPrincipal).toContain('aria-label="Seções da página pública"');
    expect(paginaPrincipal).toContain("<SecaoConteudo config={e.config} />");
    expect(paginaPrincipal).toContain("Outras configurações");
    expect(paginaPrincipal).toContain("<AnimatePresence>");
    expect(paginaPrincipal).toContain('height: "auto"');
    const conteudoSecoes = readFileSync("src/components/marca/editor/SecaoConteudo.tsx", "utf8");
    expect(conteudoSecoes).toContain("useReducedMotion");
    expect(conteudoSecoes).toContain("<AnimatePresence initial={false}>");
    const paineis = readFileSync("src/components/marca/editor/PaineisDoEditor.tsx", "utf8");
    expect(paineis).not.toContain('TabsTrigger value="conteudo"');
    expect(paginaPrincipal).toContain("Sua página ficará inacessível para visitantes.");
    expect(pagina).toContain('validateSearch: z.object({ qr: z.string().optional() })');
    expect(ajustes).not.toContain('hash={item.label === "Notificações" ? "avisos" : undefined}');
    expect(ajustes).toContain('to: "/barbeiro/notificacoes"');
    expect(ajustes).toContain("Ajuda e suporte");
    expect(ajustes).toContain("Sair da conta");
  });

  it("mapeia as seções Figaro para controles reais ou para a gestão correspondente", () => {
    const editor = readFileSync("src/components/marca/editor/EditorDaSecaoPublica.tsx", "utf8");
    const rota = readFileSync("src/routes/barbeiro.marca.secao.$secao.tsx", "utf8");
    for (const secao of ["apresentacao", "servicos", "profissionais", "galeria", "avaliacoes", "produtos", "instagram", "localizacao", "horarios", "whatsapp", "cta_final"]) {
      expect(editor).toContain('case "' + secao + '"');
    }
    const editores = readFileSync("src/components/marca/editor/secoes/editores.tsx", "utf8");
    expect(editores).toContain('to="/barbeiro/servicos"');
    expect(editores).toContain('to="/barbeiro/avaliacoes"');
    expect(editor).toContain('to="/barbeiro/produtos"');
    expect(editor).toContain('to="/barbeiro/horarios"');
    expect(rota).toContain("<EditorDaSecaoPublica secao={secao} e={e} reportarErro={reportarErro} />");
    expect(editores).toContain('titulo="Fotos da galeria da página"');
    expect(editores).toContain("e.definirFotos(");
    const hook = readFileSync("src/components/marca/editor/useEditorDaPagina.ts", "utf8");
    expect(hook).toContain("form.fotos.length >= 8");
    expect(hook).toContain("createSignedUrl(path, 60 * 60)");
  });
  it("promove Agenda ao primeiro destaque fora dos grupos", () => {
    const destaques = readFileSync("src/components/layout/DrawerDestaques.tsx", "utf8");
    const drawer = readFileSync("src/components/layout/ManagementDrawer.tsx", "utf8");
    expect(destaques).toContain('to="/barbeiro"');
    expect(destaques).toContain("Agenda");
    expect(drawer).toContain('item.to !== "/barbeiro"');
  });
});
