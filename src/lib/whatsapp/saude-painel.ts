/**
 * Apresentação da saúde do WhatsApp para dois públicos.
 * É deliberadamente pura: só interpreta fatos persistidos, nunca executa recuperação.
 * Um status "conectado" antigo NÃO comprova disponibilidade atual.
 */
import type { CentralDeAutomacao } from "./central-automacao";

export const CONFIRMACAO_RECENTE_MS = 40 * 60_000;

export type TomSaude = "ok" | "alerta" | "erro" | "neutro";
export type CategoriaSaudeAdmin =
  | "saudavel"
  | "atencao"
  | "critico"
  | "nao_confirmado"
  | "nao_configurado";

export type SaudeAdmin = {
  categoria: CategoriaSaudeAdmin;
  titulo: string;
  descricao: string;
  tom: TomSaude;
  prioridade: number;
};

export type EntradaSaudeAdmin = {
  status: string;
  compartilhada: boolean;
  verificadoEm: string | null;
  incidenteAberto: boolean;
  tentativasReconexao: number;
};

function confirmadoRecentemente(iso: string | null, agora: Date): boolean {
  if (!iso) return false;
  const ms = Date.parse(iso);
  const idade = agora.getTime() - ms;
  return Number.isFinite(ms) && idade >= 0 && idade <= CONFIRMACAO_RECENTE_MS;
}

export function saudeParaAdmin(n: EntradaSaudeAdmin, agora: Date): SaudeAdmin {
  if (n.status === "sem_conexao") {
    return {
      categoria: "nao_configurado", titulo: "Não configurado",
      descricao: "O estabelecimento ainda não tem conexão principal própria.",
      tom: "neutro", prioridade: 5,
    };
  }
  if (n.compartilhada) {
    return {
      categoria: "nao_confirmado", titulo: "Canal compartilhado",
      descricao: "Não há sessão própria deste estabelecimento para verificar.",
      tom: "neutro", prioridade: 4,
    };
  }
  if (n.incidenteAberto || n.status === "erro") {
    return {
      categoria: "critico", titulo: "Incidente ativo",
      descricao: "A conexão apresentou falha. Consulte o diagnóstico antes de intervir.",
      tom: "erro", prioridade: 0,
    };
  }
  if (n.status === "qr_pronto") {
    return {
      categoria: "atencao", titulo: "Precisa de QR Code",
      descricao: "O responsável pelo número precisa ler o código para conectar.",
      tom: "alerta", prioridade: 1,
    };
  }
  if (n.status === "desconectado") {
    return {
      categoria: "atencao", titulo: "Desconectado",
      descricao: n.tentativasReconexao > 0
        ? "Há tentativas de recuperação registradas. Confira o estado atual."
        : "O número está desconectado. Pode ter sido desligado intencionalmente.",
      tom: "alerta", prioridade: 1,
    };
  }
  if (n.status === "conectado" && confirmadoRecentemente(n.verificadoEm, agora)) {
    return {
      categoria: "saudavel", titulo: "Conexão verificada",
      descricao: "A sessão respondeu recentemente. Entregas individuais exigem acompanhamento próprio.",
      tom: "ok", prioridade: 3,
    };
  }
  return {
    categoria: "nao_confirmado", titulo: "Sem confirmação recente",
    descricao: "A verificação está pendente ou desatualizada; isso não comprova uma queda.",
    tom: "neutro", prioridade: 2,
  };
}

export type SaudeDoNegocio = {
  titulo: string;
  descricao: string;
  orientacao: string;
  tom: TomSaude;
};

export function saudeParaNegocio(central: CentralDeAutomacao): SaudeDoNegocio {
  if (central.possuiConexao === false) {
    return {
      titulo: "Configure o WhatsApp",
      descricao: "Ainda não há um número conectado a este estabelecimento.",
      orientacao: "O responsável pode conectar o número para começar a atender pelo Flow.",
      tom: "neutro",
    };
  }
  if (central.whatsapp === "aguardando_leitura") {
    return {
      titulo: "Seu WhatsApp precisa de confirmação",
      descricao: "É necessário ler o QR Code para terminar a conexão.",
      orientacao: "O responsável pelo número pode abrir a área do WhatsApp para conectar.",
      tom: "alerta",
    };
  }
  if (central.whatsapp === "desconectado") {
    return {
      titulo: "WhatsApp desconectado",
      descricao: "O atendimento e os avisos por WhatsApp podem estar interrompidos.",
      orientacao: "Abra a conexão do WhatsApp ou procure o responsável pelo estabelecimento.",
      tom: "erro",
    };
  }
  if (central.evolution === "offline") {
    return {
      titulo: "Instabilidade no serviço de conexão",
      descricao: "O Flow detectou indisponibilidade no serviço que mantém o WhatsApp conectado.",
      orientacao: "Esse problema exige atenção da equipe do Flow. Não repita o pareamento sem orientação.",
      tom: "erro",
    };
  }
  if (central.evolution === "instavel") {
    return {
      titulo: "Conexão em observação",
      descricao: "Detectamos uma instabilidade e estamos verificando se ela persiste.",
      orientacao: "Não é necessário fazer nada neste momento.",
      tom: "alerta",
    };
  }
  if (
    central.whatsapp === "conectado" &&
    central.evolution === "online" &&
    central.monitoramento === "ativo"
  ) {
    return {
      titulo: "Conexão verificada",
      descricao: "Seu número está conectado e respondeu à verificação recente.",
      orientacao: "Você pode continuar acompanhando os atendimentos normalmente.",
      tom: "ok",
    };
  }
  return {
    titulo: "Verificação pendente",
    descricao: "Ainda não foi possível confirmar a conexão recentemente. Isso não significa que ela caiu.",
    orientacao: "Estamos acompanhando. O responsável pode usar Verificar conexão.",
    tom: "neutro",
  };
}
