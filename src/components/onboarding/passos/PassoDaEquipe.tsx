/**
 * Passo "Equipe" do Onboarding: atalho "Trabalho sozinho", quem já está na equipe em linhas de grupo (ícone neutro,
 * sem símbolo de segmento) e o cartão para adicionar alguém com a função em opções conectadas.
 */
import { Plus, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
import { formaDaLinha } from "../DiaDoHorario";
import { AtalhoDoPasso } from "./MolduraDoPasso";

export type Funcao = "barbeiro" | "recepcao" | "gerente";
export const FUNCOES: { valor: Funcao; texto: string; detalhe: string }[] = [
  { valor: "barbeiro", texto: "Profissional", detalhe: "Atende e vê só os próprios números." },
  { valor: "recepcao", texto: "Recepção", detalhe: "Agenda, fila e caixa do dia." },
  { valor: "gerente", texto: "Gerente", detalhe: "Gestão completa, menos plano e fiado." },
];

export function PassoDaEquipe({
  profissionais,
  salvando,
  onSozinho,
  funcao,
  onFuncao,
  nome,
  onNome,
  email,
  onEmail,
  adicionando,
  onAdicionar,
}: {
  profissionais: { id: string; nome: string }[];
  salvando: boolean;
  onSozinho: () => void;
  funcao: Funcao;
  onFuncao: (f: Funcao) => void;
  nome: string;
  onNome: (v: string) => void;
  email: string;
  onEmail: (v: string) => void;
  adicionando: boolean;
  onAdicionar: () => void;
}) {
  return (
    <div>
      <AtalhoDoPasso
        icone={<UserRound aria-hidden />}
        titulo="Trabalho sozinho"
        detalhe="Você aparece como o profissional. Pula este passo."
        onClick={onSozinho}
        desabilitado={salvando}
      />

      <p className="mb-2 mt-6 px-1 text-sm font-semibold text-mute">Quem trabalha com você</p>
      <ul className="flex flex-col gap-[3px]">
        {profissionais.length === 0 ? (
          <li className="rounded-[28px] bg-[var(--agenda-cartao,var(--figaro-card-tile))] px-5 py-4 text-[15px] text-mute">
            Ninguém cadastrado ainda.
          </li>
        ) : null}
        {profissionais.map((p, i) => (
          <li
            key={p.id}
            className={`flex min-h-14 items-center gap-3 bg-[var(--agenda-cartao,var(--figaro-card-tile))] px-5 ${formaDaLinha(i, profissionais.length)}`}
          >
            <UserRound className="size-5 shrink-0 text-mute" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[15px] text-paper">{p.nome}</span>
          </li>
        ))}
      </ul>

      <p className="mb-2 mt-6 px-1 text-sm font-semibold text-mute">Adicionar alguém</p>
      <div className="space-y-3 rounded-[28px] bg-[var(--agenda-cartao,var(--figaro-card-tile))] p-4">
        <OpcoesConectadas rotulo="Função" valor={funcao} opcoes={FUNCOES} onChange={onFuncao} />
        <p className="px-1 text-[13px] leading-5 text-mute">
          {FUNCOES.find((f) => f.valor === funcao)?.detalhe} As permissões da função entram
          sozinhas.
        </p>
        {funcao !== "recepcao" ? (
          <input
            value={nome}
            onChange={(e) => onNome(e.target.value)}
            placeholder="Nome"
            aria-label="Nome de quem vai entrar na equipe"
            className="field-control w-full"
          />
        ) : null}
        <input
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          type="email"
          inputMode="email"
          placeholder={funcao === "recepcao" ? "E-mail" : "E-mail (opcional)"}
          aria-label={
            funcao === "recepcao"
              ? "E-mail para enviar o convite"
              : "E-mail para dar acesso ao app (opcional)"
          }
          className="field-control w-full"
        />
        <Button
          type="button"
          loading={adicionando}
          disabled={adicionando}
          onClick={onAdicionar}
          variant="outline"
          className="h-12 w-full rounded-full"
        >
          <Plus className="size-4" aria-hidden /> Adicionar
        </Button>
      </div>
    </div>
  );
}
