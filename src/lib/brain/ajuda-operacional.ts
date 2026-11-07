/**
 * Flow Core — suporte operacional da Flow IA.
 * Não cria regras de negócio, não consulta dados do cliente e não executa comandos.
 * Roteiro e navegação vêm das fontes oficiais já usadas pelo painel.
 */
import { GUIAS } from "../guia/tours";
import { MODULOS_DE_NAVEGACAO } from "../navegacao-barbeiro";
import type { ContextoDoCerebro } from "./acoes.server";

const SINONIMOS: Readonly<Record<string, readonly string[]>> = {
  Agenda: ["agendar", "marcar horario", "remarcar", "cancelar agendamento", "atendimento"],
  "Lista de espera": ["lista de espera", "fila de espera", "vaga liberada", "fila"],
  Clientes: ["cliente", "cadastro de cliente", "historico de cliente", "ficha do cliente"],
  Financeiro: ["financeiro", "caixa", "comissao", "receita", "relatorios financeiros"],
  Serviços: ["servico", "servicos", "precos dos servicos", "duracao do servico"],
  Equipe: ["equipe", "colaborador", "profissional", "permissao de acesso"],
  Horários: ["horario de funcionamento", "expediente", "abrir o negocio", "horarios de atendimento"],
  WhatsApp: ["whatsapp", "evolution", "conectar numero", "mensagem automatica", "automacao"],
  "Sua Página": ["minha pagina", "pagina publica", "site", "link de agendamento", "divulgar pagina"],
  "Loja e estoque": ["estoque", "produto", "produtos", "venda de produto"],
  Crescimento: ["crescimento", "divulgacao", "marketing", "retorno dos clientes"],
};

export type ResultadoAjudaOperacional =
  | {
      encontrado: true;
      titulo: string;
      caminho: string;
      descricao: string;
      passos: { titulo: string; texto: string }[];
      aviso: string;
    }
  | {
      encontrado: false;
      motivo: "canal_nao_autorizado" | "assunto_ausente" | "assunto_sem_guia_verificado";
      areasDisponiveis?: string[];
    };

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function consultarAjudaOperacional(
  assunto: string,
  contexto: Pick<ContextoDoCerebro, "canal" | "papel" | "permissoes">,
): ResultadoAjudaOperacional {
  // Não deve ser uma API pública: ferramenta disponível apenas à equipe autenticada.
  const equipe =
    contexto.canal === "painel" ||
    (contexto.canal === "whatsapp" &&
      (contexto.papel === "dono" || contexto.papel === "profissional"));
  if (!equipe) return { encontrado: false, motivo: "canal_nao_autorizado" as const };

  const modulos = MODULOS_DE_NAVEGACAO.filter(
    (item) =>
      contexto.papel === "dono" ||
      Boolean(contexto.permissoes?.includes(item.permissao)),
  );
  const pergunta = normalizar(String(assunto ?? "").slice(0, 240));
  if (!pergunta) {
    return {
      encontrado: false,
      motivo: "assunto_ausente" as const,
      areasDisponiveis: modulos.map((m) => m.label),
    };
  }

  const candidatos = modulos
    .map((modulo) => {
      const termos = [modulo.label, ...(SINONIMOS[modulo.label] ?? [])];
      const pontos = termos.reduce((maior, termo) => {
        const busca = normalizar(termo);
        if (!busca || !(` ${pergunta} `).includes(` ${busca} `)) return maior;
        return Math.max(maior, busca.split(" ").length * 10 + busca.length);
      }, 0);
      return { modulo, pontos };
    })
    .filter((item) => item.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos);

  const escolhido = candidatos[0]?.modulo;
  if (!escolhido) {
    return {
      encontrado: false,
      motivo: "assunto_sem_guia_verificado" as const,
      areasDisponiveis: modulos.map((m) => m.label),
    };
  }

  // A fonte de passos é o guia real do app. Sem guia, orientar somente a localização.
  const guia = GUIAS.find(
    (g) => g.id.startsWith("gestao-") &&
      (g.rota === escolhido.to || (escolhido.to === "/barbeiro" && g.rota === "/barbeiro/agenda")),
  );
  return {
    encontrado: true,
    titulo: escolhido.label,
    caminho: escolhido.to,
    descricao: escolhido.detail,
    passos: guia?.passos.map((passo) => ({
      titulo: passo.titulo,
      texto: passo.texto,
    })) ?? [],
    aviso: "As opções disponíveis dependem das permissões e configurações do negócio. Nenhuma alteração foi realizada.",
  };
}
