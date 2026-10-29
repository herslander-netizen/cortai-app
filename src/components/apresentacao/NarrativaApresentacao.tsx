import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, CheckCircle2, Compass, Store, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Explica os públicos e o fluxo geral sem prometer disponibilidade em tempo real.
 * Os passos descrevem a experiência do produto; dados e agenda dependem de cada negócio.
 */
export function NarrativaApresentacao() {
  return (
    <>
      <section
        id="para-quem"
        aria-labelledby="para-quem-titulo"
        className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:px-8"
      >
        <div className="max-w-xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-ink2">Uma experiência para os dois lados</p>
          <h2 id="para-quem-titulo" className="text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
            Mais clareza para escolher. Mais organização para atender.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-mute sm:text-lg">
            O Flow conecta a apresentação do negócio à rotina de agendamentos, respeitando os serviços e as configurações de cada estabelecimento.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-3xl border border-line bg-paper p-6 sm:p-7">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-ink2" aria-hidden="true">
              <Compass className="h-6 w-6" />
            </span>
            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-mute">Para clientes</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-ink">Conheça antes de escolher.</h3>
            <p className="mt-3 text-sm leading-6 text-mute">
              Acesse a página do negócio, conheça os serviços apresentados e siga as opções de agendamento que estiverem habilitadas.
            </p>
            <Button asChild variant="outline" className="mt-6 min-h-12 w-full">
              <Link to="/barbearias">Encontrar estabelecimento <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </article>
          <article className="rounded-3xl border border-line bg-background p-6 sm:p-7">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-ink2" aria-hidden="true">
              <Store className="h-6 w-6" />
            </span>
            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-mute">Para negócios</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-ink">Organize a rotina em um só lugar.</h3>
            <p className="mt-3 text-sm leading-6 text-mute">
              Apresente seus serviços e acompanhe os agendamentos, clientes e recursos disponíveis conforme o plano e a configuração da conta.
            </p>
            <Button asChild variant="primary" className="mt-6 min-h-12 w-full">
              <Link to="/comecar">Cadastrar meu negócio <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </article>
        </div>
      </section>

      <section
        id="como-funciona"
        aria-labelledby="como-funciona-titulo"
        className="border-y border-line bg-background"
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-ink2">Comece pelo essencial</p>
            <h2 id="como-funciona-titulo" className="text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
              Um caminho simples, do perfil ao agendamento.
            </h2>
            <p className="mt-5 text-base leading-7 text-mute sm:text-lg">
              Cada negócio configura sua própria experiência. Os exemplos abaixo explicam o fluxo sem consultar disponibilidade real nem criar reservas.
            </p>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
            <li className="relative rounded-2xl border border-line bg-paper p-5 sm:p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-paper" aria-hidden="true">
                <Store className="h-5 w-5" />
              </span>
              <p className="mt-6 text-xs font-bold uppercase tracking-wider text-mute">Etapa 01</p>
              <h3 className="mt-2 text-lg font-bold text-ink">Apresente seu negócio</h3>
              <p className="mt-2 text-sm leading-6 text-mute">Configure as informações e os serviços que seus clientes poderão conhecer.</p>
            </li>
            <li className="relative rounded-2xl border border-line bg-paper p-5 sm:p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-paper" aria-hidden="true">
                <UserRound className="h-5 w-5" />
              </span>
              <p className="mt-6 text-xs font-bold uppercase tracking-wider text-mute">Etapa 02</p>
              <h3 className="mt-2 text-lg font-bold text-ink">Compartilhe a página</h3>
              <p className="mt-2 text-sm leading-6 text-mute">Facilite o acesso dos clientes às informações do estabelecimento e às opções disponíveis.</p>
            </li>
            <li className="relative rounded-2xl border border-line bg-paper p-5 sm:p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-paper" aria-hidden="true">
                <CalendarCheck className="h-5 w-5" />
              </span>
              <p className="mt-6 text-xs font-bold uppercase tracking-wider text-mute">Etapa 03</p>
              <h3 className="mt-2 text-lg font-bold text-ink">Acompanhe a agenda</h3>
              <p className="mt-2 text-sm leading-6 text-mute">Gerencie os horários e a rotina de atendimento dentro dos recursos habilitados na conta.</p>
            </li>
          </ol>
          <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-mute">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ink2" aria-hidden="true" />
            O agendamento depende das opções configuradas pelo estabelecimento. Esta seção não representa uma consulta de horários em tempo real.
          </p>
        </div>
      </section>
    </>
  );
}
