import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** Todos os .tsx de src (sem testes), para varrer o texto-fonte. */
function arquivos(pasta: string, saida: string[] = []): string[] {
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, saida);
    else if (caminho.endsWith(".tsx") && !caminho.endsWith(".test.tsx")) saida.push(caminho);
  }
  return saida;
}

const FONTES = arquivos("src").map((caminho) => ({ caminho, texto: readFileSync(caminho, "utf8") }));

/** Decisão do dono (24/10/2026): toda tela segue o padrão Figaro. Estes testes seguram os primitivos. */
describe("padrão Figaro nos primitivos", () => {
  it("o Chip único é o seletor de escolha: sem chip local nem a classe antiga", () => {
    const locais = FONTES.filter(
      (f) => !f.caminho.endsWith("ui/chip.tsx") && /function Chip\(/.test(f.texto),
    ).map((f) => f.caminho);
    expect(locais).toEqual([]);
    const antigos = FONTES.filter((f) => f.texto.includes("agenda-chip ")).map((f) => f.caminho);
    expect(antigos).toEqual([]);
    const chip = readFileSync("src/components/ui/chip.tsx", "utf8");
    expect(chip).toContain("h-9");
    // FilterChip do Figaro: 8 dp (o `rounded-lg` do tema vale 14 px e deixava o chip quase em pílula).
    expect(chip).toContain("rounded-[8px]");
  });

  it("interruptores de tela usam o primitivo Switch, nunca botão artesanal com role= switch", () => {
    const fora = FONTES.filter(
      (f) => f.texto.includes('role="switch"') && !f.caminho.endsWith("ui/switch.tsx"),
    ).map((f) => f.caminho);
    expect(fora).toEqual([]);
  });

  it("a regra permanente define o celular como alvo principal antes do desktop", () => {
    const ordem = readFileSync("docs/ordem-padrao-figaro.md", "utf8");
    expect(ordem).toContain("Mobile é o alvo principal e vem primeiro");
    expect(ordem).toContain("conferir 360 px");
  });

  it("botão fantasma não vira caixa com contorno ad hoc", () => {
    const fora = FONTES.filter((f) =>
      /variant="ghost"[^>]{0,300}rounded-md border border-line/.test(f.texto),
    ).map((f) => f.caminho);
    expect(fora).toEqual([]);
  });

  it("erro e aviso dentro da tela usam Aviso, não texto com faixa lateral", () => {
    // A faixa de status do item da lista da Agenda é marcador de estado (Figaro), não aviso.
    const fora = FONTES.filter(
      (f) =>
        !f.caminho.endsWith("agenda/ListaAgenda.tsx") &&
        /border-l-2 border-(brick|gold)[^"]*pl-\d/.test(f.texto),
    ).map((f) => f.caminho);
    expect(fora).toEqual([]);
  });

  it("todo <select> usa field-control (campo preenchido do Figaro)", () => {
    const fora: string[] = [];
    for (const f of FONTES) {
      for (const m of f.texto.matchAll(/<select\b/g)) {
        const trecho = f.texto.slice(m.index, m.index + 700).split("</select>")[0] ?? "";
        if (!trecho.includes("field-control") && !trecho.includes("className={input}")) fora.push(f.caminho);
      }
    }
    expect(fora).toEqual([]);
  });

  it("erro geral de rota usa superfície do sistema, sem divisor web legado", () => {
    const fonte = readFileSync("src/components/layout/RouteError.tsx", "utf8");
    expect(fonte).toContain('import { Card } from "@/components/ui/card"');
    expect(fonte).toContain("rounded-[28px]");
    expect(fonte).not.toContain("border-y");
  });

  it("diálogos, cartões e selos seguem os raios do Figaro", () => {
    const le = (p: string) => readFileSync(p, "utf8");
    expect(le("src/components/ui/dialog.tsx")).toContain("rounded-[28px]");
    expect(le("src/components/ui/alert-dialog.tsx")).toContain("rounded-[28px]");
    expect(le("src/components/ui/card.tsx")).toContain("rounded-[12px]");
    expect(le("src/components/ui/badge.tsx")).toContain("rounded-full");
    const css = le("src/styles.css");
    expect(css).toMatch(/@utility surface \{\s*border: 0;\s*border-radius: 12px;/);
  });
});

describe("hierarquia visual Figaro", () => {
  it("cabeçalho de tela como a barra Large do Figaro (vídeo do dono, 29/10): título 36/42 e subtítulo 16/24", () => {
    const header = readFileSync("src/components/layout/CabecalhoDeTela.tsx", "utf8");
    expect(header).toContain("text-[36px] font-bold leading-[42px]");
    expect(header).toContain("text-base leading-6");
    // Ao rolar, o título pequeno (titleLarge 22/28) aparece ao lado do botão de voltar, que não muda de lugar.
    const tela = readFileSync("src/components/layout/Screen.tsx", "utf8");
    expect(tela).toContain("text-[22px] font-normal leading-7");
  });

  it("listas de configuração usam superfícies Figaro, sem depender de tokens da Agenda", () => {
    const arquivos = [
      "src/components/ui/formulario/LinhasDeConfiguracao.tsx",
      "src/components/ui/formulario/LinhaDeOpcoes.tsx",
      "src/components/ui/formulario/GrupoDeCartoes.tsx",
    ];
    for (const arquivo of arquivos) {
      const conteudo = readFileSync(arquivo, "utf8");
      expect(conteudo).toContain("--figaro-surface-container-high");
      expect(conteudo).not.toContain("--agenda-cartao");
    }
  });
});

describe("separação visual em fluxos de divulgação", () => {
  it("indicações e QR mantêm grupos sem divisor web legado", () => {
    const indicacoes = readFileSync("src/routes/barbeiro.indicacoes.tsx", "utf8");
    const qr = readFileSync("src/routes/barbeiro.qr-code.tsx", "utf8");
    expect(indicacoes).not.toContain("border-t border-line");
    expect(qr).not.toContain("border-t border-line");
  });
});

describe("superfícies administrativas no padrão Figaro", () => {
  it("barra fixa de publicação não usa divisor ou fundo web legado", () => {
    const home = readFileSync("src/routes/admin.home.tsx", "utf8");
    expect(home).not.toContain("border-t border-line bg-ink");
    expect(home).toContain("--figaro-background");
    expect(home).toContain('size="lg"');
  });

  it("perfil administrativo usa cartões arredondados em vez de linhas com borda inferior", () => {
    const perfil = readFileSync("src/routes/admin.perfil.tsx", "utf8");
    expect(perfil).not.toContain("border-b border-line");
    expect(perfil).toContain("rounded-[12px] bg-[var(--figaro-surface-container");
  });
});

describe("hierarquia e listas de operação", () => {
  it("automação usa a mesma escala do cabeçalho Figaro", () => {
    const fonte = readFileSync("src/components/automacao/CentralDeAutomacao.tsx", "utf8");
    expect(fonte).toContain('text-[22px] font-semibold leading-7');
    expect(fonte).not.toContain('text-3xl font-bold');
  });

  it("ficha do cliente separa seções com espaço, sem divisor decorativo", () => {
    const fonte = readFileSync("src/routes/barbeiro.clientes.$id.tsx", "utf8");
    expect(fonte).not.toContain("mt-10 border-t border-line");
  });

  it("lista da fila na Visão Casa usa cartões separados, sem linhas horizontais", () => {
    const fonte = readFileSync("src/routes/barbeiro.casa.lazy.tsx", "utf8");
    expect(fonte).not.toContain("divide-y divide-line border-b border-line");
    expect(fonte).toContain('className="space-y-2"');
  });
});

describe("jornada do cliente no padrão Figaro", () => {
  it("passos do agendamento usam espaço em vez de divisores horizontais", () => {
    const agendar = readFileSync("src/routes/app.agendar.tsx", "utf8");
    expect(agendar).not.toContain("border-t border-line");
    expect(agendar).toContain("first:pt-0");
  });

  it("avaliação pós-atendimento segue a escala de título das telas", () => {
    const avaliar = readFileSync("src/routes/avaliar.$token.tsx", "utf8");
    expect(avaliar).toContain("text-[22px] font-semibold leading-7");
    expect(avaliar).not.toContain("text-3xl font-bold leading-tight");
  });
});

describe("seleção de perfil e estados de fidelidade", () => {
  it("seletor de perfil usa Button e tokens Figaro sem alias da Agenda", () => {
    const escolher = readFileSync("src/routes/escolher.tsx", "utf8");
    expect(escolher).toContain('variant="ghost"');
    expect(escolher).toContain("--figaro-surface-container");
    expect(escolher).not.toContain("--agenda-cartao");
    expect(escolher).not.toContain("<button");
    expect(escolher).not.toContain("hover:bg-ink3");
  });

  it("faixa de fidelidade usa token de superfície Figaro", () => {
    const fidelidade = readFileSync("src/routes/barbeiro.fidelidade.tsx", "utf8");
    expect(fidelidade).toContain("--figaro-surface-container-high");
    expect(fidelidade).not.toContain("bg-ink3");
  });

  it("ações do WhatsApp não são separadas por divisor decorativo", () => {
    const whatsapp = readFileSync("src/routes/admin.whatsapp.tsx", "utf8");
    expect(whatsapp).not.toContain("border-t border-line");
  });
});

describe("cadastro de cliente no padrão Figaro", () => {
  it("usa escala de título compacta e botões compartilhados", () => {
    const visitante = readFileSync("src/routes/visitante.tsx", "utf8");
    expect(visitante).toContain("text-[22px] font-semibold leading-7");
    expect(visitante).toContain('variant="secondary"');
    expect(visitante).toContain('variant="ghost"');
    expect(visitante).not.toContain("<button");
    expect(visitante).not.toContain("text-3xl font-bold");
  });
});

describe("cabeçalho mobile no padrão Figaro", () => {
  it("mantém a barra global na Agenda e nas subrotas operacionais", () => {
    const fonte = readFileSync("src/components/layout/ManagementDrawer.tsx", "utf8");
    expect(fonte).toContain('caminho === "/barbeiro"');
    expect(fonte).toContain('caminho.startsWith("/barbeiro/agenda/")');
    expect(fonte).toContain("if (celular && !telaDaAgenda) return null;");
  });
});

describe("chat da CortAI no padrão Figaro", () => {
  it("usa os primitivos de ação e aviso sem herdar estilos exclusivos da Agenda", () => {
    const fonte = readFileSync("src/components/ia/AssistenteCortai.tsx", "utf8");
    expect(fonte).toContain('import { Button } from "@/components/ui/button"');
    expect(fonte).toContain('import { Aviso } from "@/components/ui/aviso"');
    expect(fonte).toContain('className="field-control');
    expect(fonte).not.toContain("--agenda-cartao");
    expect(fonte).not.toContain("btn-primary");
    expect(fonte).not.toContain("<button");
  });
});

describe("linguagem multi-serviços em telas compartilhadas", () => {
  it("usa linguagem neutra para entrar na plataforma e segmentar ofertas", () => {
    const visitante = readFileSync("src/routes/visitante.tsx", "utf8");
    const monetizacao = readFileSync("src/routes/admin.monetizacao.tsx", "utf8");
    const overview = readFileSync("src/routes/admin.index.tsx", "utf8");

    expect(visitante).toContain("Tenho um negócio no Cortaí");
    expect(visitante).not.toContain("Tenho uma barbearia no Cortaí");
    expect(monetizacao).toContain('"negócios novos"');
    expect(monetizacao).toContain('"negócios já clientes"');
    expect(monetizacao).toContain("O negócio paga o preço padrão.");
    expect(monetizacao).not.toContain("barbearias novas");
    expect(monetizacao).not.toContain("barbearias já clientes");

    expect(overview).toContain('label="Negócios"');
    expect(overview).toContain('signal.sample === 1 ? "negócio usou" : "negócios usaram"');
    expect(overview).not.toContain("barbearias usaram");
    expect(overview).not.toContain('label="Barbearias"');
  });
});

describe("painel WhatsApp no padrão Figaro", () => {
  it("usa avisos tonais, estado acessível nas abas e separação por espaçamento", () => {
    const fonte = readFileSync("src/routes/barbeiro.cortai.tsx", "utf8");
    expect(fonte).toContain('import { Aviso } from "@/components/ui/aviso"');
    expect(fonte).toContain("aria-pressed={aba === id}");
    expect(fonte).not.toContain("rounded-[12px] border border-brick/50");
    expect(fonte).not.toContain("border border-gold/50 bg-[var(--figaro-surface-container,var(--ink2))]");
    expect(fonte).not.toContain('className="mt-5 border-t border-line pt-4"');
  });
});

describe("descoberta de negócios no padrão Figaro", () => {
  it("usa título compacto, campo compartilhado e aviso tonal sem assumir barbearia", () => {
    const fonte = readFileSync("src/components/cliente/DescobrirBarbearias.tsx", "utf8");
    expect(fonte).toContain('text-[22px] font-semibold leading-7');
    expect(fonte).toContain("field-control");
    expect(fonte).toContain('import { Aviso } from "@/components/ui/aviso"');
    expect(fonte).toContain("Ainda não há lugares disponíveis.");
    expect(fonte).not.toContain("text-3xl font-bold");
    expect(fonte).not.toContain("<button");
  });
});

describe("fluxos públicos de fila no padrão Figaro", () => {
  it("usa controles e campos compartilhados sem classes de botão antigas", () => {
    const fila = readFileSync("src/routes/f.$slug.tsx", "utf8");
    const vaga = readFileSync("src/routes/vaga.$token.tsx", "utf8");

    expect(fila).toContain('import { Button } from "@/components/ui/button"');
    expect(fila).toContain("field-control");
    expect(fila.match(/className="field-control/g)).toHaveLength(2);
    expect(fila).not.toContain("rounded-lg border border-line2");
    expect(fila).toContain('size="bloco"');
    expect(fila).toContain('import { Aviso } from "@/components/ui/aviso"');
    expect(fila).not.toContain("<button");
    expect(fila).not.toContain("btn-primary");
    expect(fila).not.toContain("btn-secondary");

    expect(vaga).toContain('variant="primary"');
    expect(vaga).toContain('import { Aviso } from "@/components/ui/aviso"');
    expect(vaga).toContain("text-[22px] font-semibold leading-7");
    expect(vaga).not.toContain("<button");
    expect(vaga).not.toContain("btn-primary");
  });
});

describe("administração com avisos e campos Figaro", () => {
  it("usa aviso tonal para falhas locais e field-control para chave de API", () => {
    const whatsapp = readFileSync("src/routes/admin.whatsapp.tsx", "utf8");
    const parceiros = readFileSync("src/routes/admin.parceiros.tsx", "utf8");
    const asaas = readFileSync("src/routes/admin.asaas.tsx", "utf8");

    expect(whatsapp).toContain('import { Aviso } from "@/components/ui/aviso"');
    expect(whatsapp).toContain('<Aviso tom="acao">');
    expect(whatsapp).not.toContain('className="text-sm text-brick" role="alert"');

    expect(parceiros).toContain('import { Aviso } from "@/components/ui/aviso"');
    expect(parceiros).toContain('<Aviso tom="acao">{erro}</Aviso>');
    expect(parceiros).not.toContain('className="text-xs text-brick" role="alert"');

    expect(asaas).toContain('htmlFor="chave-asaas"');
    expect(asaas).toContain('className="field-label" htmlFor="chave-asaas"');
    expect(asaas).toContain('className="field-control min-h-12 rounded-[12px] text-base"');
    expect(asaas).not.toContain("focus:ring-2 focus:ring-[var(--figaro-primary");
  });
});

describe("componentes compartilhados sem divisores web antigos", () => {
  it("painel de lembretes não envolve a lista com bordas horizontais externas", () => {
    const fonte = readFileSync("src/components/notificacoes/PainelDeLembretes.tsx", "utf8");
    expect(fonte).toContain('className="divide-y divide-line/70"');
    expect(fonte).not.toContain("divide-y divide-line border-y border-line");
  });
  it("suporte mantém o separador interno sem duplicar bordas superior e inferior", () => {
    const fonte = readFileSync("src/components/admin/SuporteBarbearia.tsx", "utf8");
    expect(fonte).toContain("border-b border-line py-3");
    expect(fonte).not.toContain("border-y border-line py-3");
  });
});

describe("ordem permanente", () => {
  it("o documento existe e está ligado nos arquivos de regra", () => {
    const ordem = readFileSync("docs/ordem-padrao-figaro.md", "utf8");
    expect(ordem).toContain("ORDEM PERMANENTE");
    expect(readFileSync("AGENTS.md", "utf8")).toContain("docs/ordem-padrao-figaro.md");
    expect(readFileSync("CLAUDE.md", "utf8")).toContain("docs/ordem-padrao-figaro.md");
  });
});

describe("Equipe e Profissionais no padrão Figaro (dono, 29/10)", () => {
  it("lista primeiro em grupo de linhas com avatar de iniciais; convite embaixo; função em botões conectados", () => {
    const equipe = readFileSync("src/routes/barbeiro.equipe.tsx", "utf8");
    expect(equipe.indexOf("Quem tem acesso")).toBeLessThan(equipe.indexOf("Dar acesso a alguém"));
    expect(equipe).toContain("<AvatarDeIniciais");
    expect(equipe).toContain("<OpcoesConectadas");
    expect(equipe).not.toContain("--agenda-cartao");
    const prof = readFileSync("src/routes/barbeiro.profissionais.tsx", "utf8");
    expect(prof).toContain("<AvatarDeIniciais");
    expect(prof).toContain("aria-expanded={estaAberto}");
  });
});
