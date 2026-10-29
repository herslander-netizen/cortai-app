import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { useSucessoDoBotao } from "@/hooks/useSucessoDoBotao";
import { Button } from "@/components/ui/button";
import {
  getEscalaDoProfissional,
  listarEquipeDaEscala,
  salvarEscalaDoProfissional,
  type DiaDaEscala,
} from "@/lib/bloqueios.functions";
import { aviso } from "@/lib/avisos";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
type Modo = "negocio" | "folga" | "proprio";

/** Escala individual: cada dia segue o expediente do negócio, folga ou horário próprio. */
export function EscalaDaEquipe() {
  const equipeFn = useServerFn(listarEquipeDaEscala);
  const getFn = useServerFn(getEscalaDoProfissional);
  const salvarFn = useServerFn(salvarEscalaDoProfissional);
  const qc = useQueryClient();
  const equipe = useQuery({ queryKey: ["equipe-escala"], queryFn: () => equipeFn() });
  const [prof, setProf] = useState("");
  const [dias, setDias] = useState<{ modo: Modo; abre: string; fecha: string }[]>([]);
  const [salvando, setSalvando] = useState(false);
  const salvou = useSucessoDoBotao();
  const id = prof || equipe.data?.[0]?.id || "";
  const escala = useQuery({
    queryKey: ["escala", id],
    queryFn: () => getFn({ data: { profissionalId: id } }),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!escala.data) return;
    setDias(
      DIAS.map((_, i) => {
        const d = escala.data.find((x) => x.diaSemana === i);
        if (!d) return { modo: "negocio" as Modo, abre: "09:00", fecha: "18:00" };
        return d.trabalha
          ? { modo: "proprio" as Modo, abre: d.abre, fecha: d.fecha }
          : { modo: "folga" as Modo, abre: "09:00", fecha: "18:00" };
      }),
    );
  }, [escala.data]);

  if (!equipe.data?.length) return null;

  const salvar = async () => {
    setSalvando(true);
    try {
      const lista: DiaDaEscala[] = dias.flatMap((d, i) =>
        d.modo === "negocio"
          ? []
          : [{ diaSemana: i, trabalha: d.modo === "proprio", abre: d.abre, fecha: d.fecha }],
      );
      await salvarFn({ data: { profissionalId: id, dias: lista } });
      void qc.invalidateQueries({ queryKey: ["escala", id] });
      void qc.invalidateQueries({ queryKey: ["agenda-dia"] });
      salvou.confirmar();
      aviso.ok("Escala salva. A agenda e o agendamento já seguem esses horários.");
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não foi possível salvar a escala.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="mt-8" aria-labelledby="titulo-escala">
      <h2 id="titulo-escala" className="text-base font-semibold text-paper">
        Escala por profissional
      </h2>
      <p className="mt-1 text-sm text-mute">
        Sem ajuste, o profissional segue o expediente do negócio.
      </p>
      {equipe.data.length > 1 ? (
        <select
          aria-label="Profissional"
          value={id}
          onChange={(e) => setProf(e.target.value)}
          className="field-control mt-3 min-h-11 w-full"
        >
          {equipe.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      ) : null}
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {dias.map((d, i) => (
          <li key={DIAS[i]} className="flex min-h-12 flex-wrap items-center gap-2 py-2">
            <span className="w-10 text-sm font-semibold text-paper">{DIAS[i]}</span>
            <select
              aria-label={`${DIAS[i]}: como trabalha`}
              value={d.modo}
              onChange={(e) =>
                setDias((v) =>
                  v.map((x, j) => (j === i ? { ...x, modo: e.target.value as Modo } : x)),
                )
              }
              className="field-control min-h-11 flex-1"
            >
              <option value="negocio">Expediente do negócio</option>
              <option value="folga">Folga</option>
              <option value="proprio">Horário próprio</option>
            </select>
            {d.modo === "proprio" ? (
              <span className="flex w-full items-center gap-2 pl-12">
                <input
                  type="time"
                  aria-label={`${DIAS[i]}: início`}
                  value={d.abre}
                  onChange={(e) =>
                    setDias((v) => v.map((x, j) => (j === i ? { ...x, abre: e.target.value } : x)))
                  }
                  className="field-control min-h-11 flex-1"
                />
                <span className="text-mute">até</span>
                <input
                  type="time"
                  aria-label={`${DIAS[i]}: fim`}
                  value={d.fecha}
                  onChange={(e) =>
                    setDias((v) => v.map((x, j) => (j === i ? { ...x, fecha: e.target.value } : x)))
                  }
                  className="field-control min-h-11 flex-1"
                />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <Button
        className="mt-4 w-full"
        variant="outline"
        disabled={salvando || !dias.length}
        loading={salvando}
        success={salvou.sucesso}
        onClick={() => void salvar()}
      >
        Salvar escala
      </Button>
    </section>
  );
}
