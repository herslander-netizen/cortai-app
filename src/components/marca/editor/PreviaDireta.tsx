import { Clock3, Scissors, UserRound } from "lucide-react";

import { StatusFuncionamento } from "@/components/agendamento/StatusFuncionamento";
import { FontesDaMarca } from "@/components/marca/FontesDaMarca";
import { agendamentoStyle, type PaginaConfig } from "@/lib/pagina-config";
import type { PaginaPublica } from "@/lib/publico.functions";

const preco = (centavos: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);

const HORARIOS = ["09:00", "09:30", "10:00", "10:30", "11:00", "14:00"];
const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb"];

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-mute">{titulo}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Prévia da maneira direta (layout Agendamento): a mesma tela que o cliente vê em `/agendar/{link}`, com a
 * paleta do tema. Serviço, profissional, dia e horário numa página só; sem a página do negócio antes.
 */
export function PreviaDireta({ data, config }: { data: PaginaPublica; config: PaginaConfig }) {
  const { tenant } = data;
  const profissionais = data.profissionais.slice(0, 4);
  return (
    <div
      className="agendamento-marca min-h-full px-5 pb-24 pt-8"
      style={agendamentoStyle(config)}
    >
      <FontesDaMarca config={config} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">Agendar horário</p>
        <span className="text-xs text-mute underline-offset-4">Conhecer o negócio</span>
      </div>
      <h1 className="mt-1 text-2xl font-bold text-paper">{tenant.nome}</h1>
      <StatusFuncionamento
        horarios={data.horarios.map((h) => ({
          diaSemana: h.dia_semana,
          fechado: h.fechado,
          abre: h.abre,
          fecha: h.fecha,
        }))}
        fuso={tenant.fuso || "America/Sao_Paulo"}
      />
      <p className="mt-1 text-sm text-mute">Sem cadastro e sem senha: escolha o horário e pronto.</p>

      <Bloco titulo="Serviço">
        <div className="grid gap-2">
          {data.servicos.length ? (
            data.servicos.slice(0, 4).map((s, i) => (
              <div
                key={s.id}
                className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-4 py-3 ${
                  i === 0 ? "border-gold bg-ink2" : "border-line bg-ink2/60"
                }`}
              >
                <Scissors size={16} className="text-gold" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-paper">{s.nome}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-mute">
                    <Clock3 size={12} aria-hidden />
                    {s.duracao_min} min
                  </span>
                </span>
                <span className="text-sm font-semibold text-paper">{preco(s.preco_centavos)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-mute">Cadastre serviços para aparecerem aqui.</p>
          )}
        </div>
      </Bloco>

      <Bloco titulo="Profissional">
        <div className="flex flex-wrap gap-2">
          {[{ id: "qualquer", nome: "Qualquer profissional" }, ...profissionais].map((p, i) => (
            <span
              key={p.id}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm ${
                i === 0 ? "border-gold text-paper" : "border-line text-mute"
              }`}
            >
              <UserRound size={14} aria-hidden />
              {p.nome}
            </span>
          ))}
        </div>
      </Bloco>

      <Bloco titulo="Data">
        <div className="-mx-5 flex gap-2 overflow-hidden px-5">
          {DIAS.map((d, i) => (
            <span
              key={d}
              className={`flex min-w-14 flex-col items-center rounded-xl border px-3 py-2 text-xs ${
                i === 1 ? "border-gold bg-ink2 text-paper" : "border-line text-mute"
              }`}
            >
              {d}
              <strong className="mt-0.5 text-sm text-paper">{10 + i}</strong>
            </span>
          ))}
        </div>
      </Bloco>

      <Bloco titulo="Horário">
        <div className="flex flex-wrap gap-2">
          {HORARIOS.map((h, i) => (
            <span
              key={h}
              className={`inline-flex min-h-10 items-center rounded-lg border px-4 text-sm ${
                i === 2 ? "border-gold bg-ink2 text-paper" : "border-line text-mute"
              }`}
            >
              {h}
            </span>
          ))}
        </div>
      </Bloco>

      <div className="mt-8 flex min-h-12 items-center justify-center rounded-full bg-[var(--botao-fundo,var(--primary))] text-sm font-semibold text-[var(--botao-texto,var(--primary-foreground))]">
        {config.cta || "Agendar horário"}
      </div>
    </div>
  );
}
