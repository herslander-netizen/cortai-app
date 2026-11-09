import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Clock3, ImagePlus, ShieldCheck, Star, Wallet } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { AvatarDeIniciais } from "@/components/ui/avatar-iniciais";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { EscalaDaEquipe } from "@/components/barbeiro/EscalaDaEquipe";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { getFichaCompletaDoMembro } from "@/lib/painel-membro.functions";
import { brl } from "@/lib/format";
import { PAPEIS, type PapelDeEquipe } from "@/lib/permissoes";

export const Route = createFileRoute("/barbeiro/equipe_/$userId")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "equipe_avancada"),
  head: () => ({
    meta: [
      { title: "Ficha do membro — Flow" },
      { name: "description", content: "Perfil individual, agenda, escala e acessos do membro da equipe." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FichaMembroPage,
});

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function AcaoDeSecao({
  titulo,
  detalhe,
  destino,
}: {
  titulo: string;
  detalhe: string;
  destino: "/barbeiro/profissionais" | "/barbeiro/horarios" | "/barbeiro/servicos" | "/barbeiro/equipe";
}) {
  return (
    <Link
      to={destino}
      className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-[var(--figaro-surface-container-high,var(--ink2))] px-4 py-3 transition-opacity hover:opacity-80"
    >
      <span className="min-w-0">
        <strong className="block text-sm font-semibold text-paper">{titulo}</strong>
        <span className="mt-1 block text-xs text-mute">{detalhe}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-mute" />
    </Link>
  );
}

function FichaMembroPage() {
  const { userId } = Route.useParams();
  const ficha = useQuery({
    queryKey: ["ficha-completa-membro", userId],
    queryFn: () => getFichaCompletaDoMembro({ data: { userId } }),
    retry: false,
  });

  if (ficha.isLoading) {
    return (
      <Screen voltarPara="/barbeiro/equipe" title="Ficha da equipe">
        <EsqueletoFormulario campos={5} />
      </Screen>
    );
  }

  if (ficha.isError || !ficha.data) {
    return (
      <Screen voltarPara="/barbeiro/equipe" title="Ficha da equipe">
        <div className="space-y-3 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
          <Aviso tom="atencao">Não foi possível carregar a ficha deste membro.</Aviso>
          <Button type="button" variant="outline" onClick={() => void ficha.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </Screen>
    );
  }

  const { membro, profissional, vinculo, metricas, servicos, disponibilidade } = ficha.data;

  return (
    <Screen voltarPara="/barbeiro/equipe" title="Membro da equipe" subtitle="Perfil e gestão individual">
      <div className="space-y-8 pb-10">
        <section aria-label="Identificação" className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
          <div className="flex items-center gap-4">
            {profissional?.foto ? (
              <img
                src={profissional.foto}
                alt={"Foto de " + profissional.nome}
                className="size-20 shrink-0 rounded-[22px] object-cover"
                width={80}
                height={80}
              />
            ) : (
              <AvatarDeIniciais nome={membro.nome ?? profissional?.nome ?? membro.email ?? "Membro"} />
            )}
            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold text-paper">
                {membro.nome ?? profissional?.nome ?? membro.email ?? "Membro"}
              </h2>
              <p className="mt-1 break-all text-sm text-mute">{membro.email ?? "Sem e-mail cadastrado"}</p>
              <p className="mt-2 text-xs font-semibold text-[var(--figaro-primary,var(--primary))]">
                {PAPEIS[membro.papel as PapelDeEquipe] ?? membro.papel}
                {" · "}{membro.ativo ? "Acesso ativo" : "Acesso suspenso"}
              </p>
            </div>
          </div>
          {!membro.aceitoEm ? (
            <p className="mt-4 rounded-xl bg-[var(--figaro-warning-container,var(--ink3))] p-3 text-sm text-paper">
              Convite pendente de aceitação.
            </p>
          ) : null}
          {profissional && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-mute">
              <span className="rounded-full bg-[var(--figaro-surface-container-highest,var(--ink3))] px-3 py-2">
                {profissional.ativo ? "Atende clientes" : "Perfil de atendimento desativado"}
              </span>
              <span className="rounded-full bg-[var(--figaro-surface-container-highest,var(--ink3))] px-3 py-2">
                Perfil vinculado à conta
              </span>
            </div>
          )}
        </section>

        {vinculo === "multiplo" ? (
          <Aviso tom="atencao" titulo="Vínculo duplicado">
            Há mais de um perfil de profissional ligado a esta conta. Para evitar mostrar dados
            ou alterar a agenda de outra pessoa, a ficha operacional permanece bloqueada até
            que o vínculo seja corrigido.
          </Aviso>
        ) : null}

        {vinculo === "ausente" ? (
          <Aviso tom="info" titulo="Sem perfil de atendimento">
            Esta pessoa possui acesso ao Flow, mas não há um cadastro de profissional
            vinculado ao seu usuário. Por segurança, não associamos registros por nome
            ou e-mail. A agenda e as avaliações não são exibidas como se fossem dela.
          </Aviso>
        ) : null}

        {metricas && profissional ? (
          <>
            <section aria-labelledby="indicadores-membro">
              <h2 id="indicadores-membro" className="mb-3 text-base font-bold text-paper">Indicadores</h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="min-w-0 rounded-[20px] bg-[var(--figaro-surface-container,var(--ink2))] p-3">
                  <CalendarDays aria-hidden className="size-5 text-mute" />
                  <strong className="mt-3 block text-lg font-bold tabular-nums text-paper">
                    {metricas.agendamentosFinalizados}
                  </strong>
                  <span className="block text-xs text-mute">Atendimentos</span>
                </div>
                <div className="min-w-0 rounded-[20px] bg-[var(--figaro-surface-container,var(--ink2))] p-3">
                  <Wallet aria-hidden className="size-5 text-mute" />
                  <strong className="mt-3 block break-words text-sm font-bold tabular-nums text-paper">
                    {brl(metricas.receitaConfirmadaCentavos)}
                  </strong>
                  <span className="block text-xs text-mute">Pagos</span>
                </div>
                <div className="min-w-0 rounded-[20px] bg-[var(--figaro-surface-container,var(--ink2))] p-3">
                  <Star aria-hidden className="size-5 text-mute" />
                  <strong className="mt-3 block text-lg font-bold tabular-nums text-paper">
                    {metricas.mediaAvaliacao === null ? "—" : metricas.mediaAvaliacao.toFixed(1).replace(".", ",")}
                  </strong>
                  <span className="block text-xs text-mute">
                    {metricas.avaliacoes} avaliações
                  </span>
                </div>
              </div>
              <p className="mt-2 px-1 text-xs text-mute">
                Histórico total. Valor pago considera apenas atendimentos finalizados com pagamento confirmado.
              </p>
            </section>

            <section aria-labelledby="disponibilidade-membro" className="space-y-3">
              <h2 id="disponibilidade-membro" className="text-base font-bold text-paper">
                Disponibilidade
              </h2>
              <div className="overflow-hidden rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))]">
                {disponibilidade.map((dia) => (
                  <div key={dia.diaSemana} className="flex min-h-14 items-center justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0">
                    <span className="text-sm font-semibold text-paper">{DIAS[dia.diaSemana]}</span>
                    <span className="text-right text-xs text-mute">
                      {dia.trabalha && dia.abre && dia.fecha
                        ? dia.abre + "–" + dia.fecha
                        : "Fechado"}
                      {dia.fonte === "negocio" ? (
                        <span className="block text-[11px]">Expediente do negócio</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
              {profissional.ativo ? (
                <div className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 pb-5">
                  <EscalaDaEquipe profissionalFixo={profissional.id} />
                </div>
              ) : (
                <Aviso tom="atencao">
                  O perfil está desativado. Reative antes de configurar novos horários de atendimento.
                </Aviso>
              )}
              {profissional.ativo ? (
                <Link
                  to="/barbeiro/equipe-data/$userId"
                  params={{ userId }}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-[var(--figaro-surface-container-high,var(--ink2))] px-4 py-3 transition-opacity hover:opacity-80"
                >
                  <span className="min-w-0">
                    <strong className="block text-sm font-semibold text-paper">Disponibilidade por data</strong>
                    <span className="mt-1 block text-xs text-mute">Adicionar ou editar um horário individual para uma data</span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-mute" />
                </Link>
              ) : null}
            </section>

            <section aria-labelledby="dados-membro" className="space-y-3">
              <h2 id="dados-membro" className="text-base font-bold text-paper">Dados pessoais</h2>
              <div className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
                <p className="text-xs text-mute">Nome de atendimento</p>
                <p className="mt-1 text-sm font-semibold text-paper">{profissional.nome}</p>
                <p className="mt-4 text-xs text-mute">Apresentação</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-paper">
                  {profissional.descricao?.trim() || "Nenhuma descrição cadastrada."}
                </p>
              </div>
              <Link
                to="/barbeiro/equipe-dados/$userId"
                params={{ userId }}
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-[var(--figaro-surface-container-high,var(--ink2))] px-4 py-3 transition-opacity hover:opacity-80"
              >
                <span className="min-w-0">
                  <strong className="block text-sm font-semibold text-paper">Editar dados pessoais</strong>
                  <span className="mt-1 block text-xs text-mute">Nome de atendimento e descrição pública</span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-mute" />
              </Link>
              <AcaoDeSecao
                titulo="Editar foto e portfólio"
                detalhe="Gerenciar as imagens da apresentação pública"
                destino="/barbeiro/profissionais"
              />
            </section>

            <section aria-labelledby="servicos-membro" className="space-y-3">
              <h2 id="servicos-membro" className="text-base font-bold text-paper">Serviços</h2>
              {servicos.length ? (
                <ul className="overflow-hidden rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))]">
                  {servicos.map((servico) => (
                    <li key={servico.id} className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold text-paper">{servico.nome}</span>
                        {servico.equipeToda ? (
                          <span className="mt-1 block text-xs text-mute">Disponível para toda a equipe</span>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-right text-xs text-mute">
                        <span className="block">{brl(servico.precoCentavos)}</span>
                        <span className="mt-1 inline-flex items-center gap-1">
                          <Clock3 aria-hidden className="size-3.5" /> {servico.duracaoMin} min
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Aviso tom="info">Nenhum serviço ativo atribuído a este profissional.</Aviso>
              )}
              <AcaoDeSecao
                titulo="Gerenciar serviços"
                detalhe="Alterar serviços e profissionais autorizados a atendê-los"
                destino="/barbeiro/servicos"
              />
            </section>
          </>
        ) : null}

        <section aria-labelledby="acesso-membro" className="space-y-3">
          <h2 id="acesso-membro" className="text-base font-bold text-paper">Acesso e gestão</h2>
          <AcaoDeSecao
            titulo="Função, permissões e acesso"
            detalhe="Alterar papel, recuperar acesso, suspender ou remover o vínculo"
            destino="/barbeiro/equipe"
          />
          <div className="flex items-start gap-2 px-1 text-xs text-mute">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>
              Remover o acesso ao Flow e desativar um profissional de atendimento são ações
              diferentes. As operações existentes seguem suas permissões e confirmações.
            </p>
          </div>
        </section>

        <div className="flex items-center gap-2 text-xs text-mute">
          <ImagePlus aria-hidden className="size-4" />
          <span>Dados e alterações limitados ao negócio em uso.</span>
        </div>
      </div>
    </Screen>
  );
}
