import { CloudOff, RefreshCw, Scissors, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { EsqueletoAgenda } from "@/components/layout/Esqueleto";
import { Button } from "@/components/ui/button";

/** Faixa de conexão: mesma nas duas telas (normal e Modo Foco). */
export function FaixaConexao({
  online,
  origem,
  salvoEm,
  aoVivo,
  temDados,
  fuso,
}: {
  online: boolean;
  origem: "rede" | "cache" | undefined;
  salvoEm: number | null | undefined;
  aoVivo: boolean;
  temDados: boolean;
  fuso?: string;
}) {
  const horaSalva = salvoEm
    ? new Date(salvoEm).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: fuso,
      })
    : null;
  if (origem === "cache")
    return (
      <p className="agenda-faixa agenda-faixa-offline" role="status">
        <CloudOff aria-hidden />
        Mostrando dados salvos · sem conexão{horaSalva ? ` · atualizado às ${horaSalva}` : ""}
      </p>
    );
  if (!online)
    return (
      <p className="agenda-faixa agenda-faixa-offline" role="status">
        <CloudOff aria-hidden />
        Sem conexão · as ações voltam quando a internet voltar
      </p>
    );
  if (temDados && !aoVivo)
    return (
      <p className="agenda-faixa" role="status">
        <RefreshCw aria-hidden />
        Reconectando… a agenda continua atualizando a cada 15 s
      </p>
    );
  return null;
}

export function AgendaCarregando() {
  return (
    <div role="status" aria-label="Carregando agenda">
      <EsqueletoAgenda linhas={5} />
    </div>
  );
}

export function AgendaErro({
  mensagem,
  onTentar,
}: {
  mensagem?: string | undefined;
  onTentar: () => void;
}) {
  return (
    <div className="agenda-estado" role="alert">
      <TriangleAlert aria-hidden />
      <strong>Não conseguimos abrir a agenda</strong>
      <span>{mensagem || "Confira a internet e tente de novo."}</span>
      <Button variant="outline" onClick={onTentar}>
        Tentar de novo
      </Button>
    </div>
  );
}

export function AgendaVazia({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto: string;
  children?: ReactNode;
}) {
  return (
    <div className="agenda-estado">
      <Scissors aria-hidden />
      <strong>{titulo}</strong>
      <span>{texto}</span>
      {children ? <div className="flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
