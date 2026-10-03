import { CalendarDays, Star } from "lucide-react";

import type { PaginaPublica } from "@/lib/publico.functions";
import type { PaginaConfig } from "@/lib/pagina-config";

const DIAS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function situacaoDeHoje(data: PaginaPublica) {
  const dia = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: data.tenant.fuso || "America/Sao_Paulo",
  })
    .format(new Date())
    .toLowerCase();
  const hoje = data.horarios.find((h) => DIAS[h.dia_semana] === dia);
  if (!hoje || hoje.fechado) return "Fechado hoje";
  return `Hoje, ${hoje.abre.slice(0, 5)} às ${hoje.fecha.slice(0, 5)}`;
}

function preco(centavos: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    centavos / 100,
  );
}

/** Prévia leve da experiência Direta: cabeçalho e lista real de serviços. */
export function PreviaDireta({ data, config }: { data: PaginaPublica; config: PaginaConfig }) {
  const { tenant, avaliacoes } = data;
  const comNota = avaliacoes.quantidade >= 5 && avaliacoes.media !== null;
  return (
    <div
      className="min-h-full p-4"
      style={{ backgroundColor: config.cores.fundo, color: config.cores.texto }}
    >
      <header className="flex items-center gap-3">
        {tenant.logo_signed_url ? (
          <img
            src={tenant.logo_signed_url}
            alt=""
            className="size-12 rounded-full object-cover"
            width={48}
            height={48}
          />
        ) : (
          <span
            className="grid size-12 place-items-center rounded-full text-lg font-bold"
            style={{ backgroundColor: config.cores.secundaria }}
          >
            {tenant.nome.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{tenant.nome}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs opacity-80">
            {comNota ? (
              <span className="inline-flex items-center gap-1">
                <Star size={12} aria-hidden />
                {avaliacoes.media!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
              </span>
            ) : null}
            <span>{situacaoDeHoje(data)}</span>
          </p>
        </div>
      </header>
      <p className="mt-6 text-sm font-semibold">Escolha o serviço</p>
      <ul className="mt-3 space-y-2">
        {data.servicos.length ? (
          data.servicos.map((s) => (
            <li
              key={s.id}
              className="flex min-h-14 items-center justify-between gap-3 rounded-lg px-4 py-2"
              style={{ backgroundColor: config.cores.secundaria }}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{s.nome}</span>
                <span className="text-xs opacity-75">{s.duracao_min} min</span>
              </span>
              <span className="text-sm font-semibold">{preco(s.preco_centavos)}</span>
            </li>
          ))
        ) : (
          <li className="text-sm opacity-75">Cadastre serviços para aparecerem aqui.</li>
        )}
      </ul>
      <p className="mt-6 inline-flex items-center gap-2 text-xs opacity-70">
        <CalendarDays size={14} aria-hidden />
        Depois: profissional e horário.
      </p>
    </div>
  );
}
