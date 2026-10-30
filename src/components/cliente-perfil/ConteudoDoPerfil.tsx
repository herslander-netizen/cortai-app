import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Plus, TriangleAlert, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { GrupoDeCartoes, LinhaDeCartao } from "@/components/ui/formulario/GrupoDeCartoes";
import { SecaoDeFormulario } from "@/components/ui/formulario/SecaoDeFormulario";
import { FotoDoCorte } from "@/components/cliente-perfil/FotoDoCorte";
import {
  EditorDetalhes,
  EditorFicha,
  EditorPreferencias,
} from "@/components/cliente-perfil/EditoresDoPerfil";
import { getCapacidades } from "@/lib/capacidades.functions";
import { brl } from "@/lib/format";
import {
  apagarFotoCorte,
  getPerfilCliente,
  type PerfilCliente,
} from "@/lib/perfil-cliente.functions";
import { ROTULOS_PREFERENCIAS } from "@/lib/preferencias-cliente";
import { termos as termosPara, type Segmento } from "@/lib/segmentos";

function data(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(iso));
}

function BotaoAdicionar({
  aberto,
  rotulo,
  onClick,
}: {
  aberto: boolean;
  rotulo: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className="min-h-12 rounded-full"
      aria-expanded={aberto}
      onClick={onClick}
    >
      {aberto ? null : <Plus aria-hidden />}
      {aberto ? "Fechar" : rotulo}
    </Button>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <GrupoDeCartoes vazio={children} />;
}

export function Conteudo({
  p,
  segmento,
  mostrarLinkFicha = true,
}: {
  p: PerfilCliente;
  segmento: Segmento;
  mostrarLinkFicha?: boolean;
}) {
  const termos = termosPara(segmento);
  const barbeiro = segmento === "barbearia";
  const qc = useQueryClient();
  const apagar = useServerFn(apagarFotoCorte);
  const [verFoto, setVerFoto] = useState<string | null>(null);
  const [editarFicha, setEditarFicha] = useState(false);
  const [editarPref, setEditarPref] = useState(false);
  const [editarDetalhes, setEditarDetalhes] = useState(false);
  // Figaro (`MissingContactBanner`): com o WhatsApp do plano ligado e a ficha sem telefone com DDD, avisa a recepção.
  const capacidades = useQuery({ queryKey: ["capacidades"], queryFn: () => getCapacidades() });
  const semTelefoneValido =
    !p.cliente.avulso && (p.cliente.telefone ?? "").replace(/\D/g, "").length < 10;
  const avisarTelefone =
    semTelefoneValido && capacidades.data?.liberados["secretaria_whatsapp"] !== false;
  const recarregar = () => qc.invalidateQueries({ queryKey: ["perfil-cliente", p.cliente.id] });
  const pref = Object.entries(p.preferencias ?? {}).filter(([, v]) => typeof v === "string" && v);
  const rotuloPref = (k: string, v: string) =>
    (ROTULOS_PREFERENCIAS as Record<string, Record<string, string> | undefined>)[k]?.[v] ?? v;
  const nomesPref: Record<string, string> = {
    conversa: "Conversa",
    ar: "Ambiente",
    bebida: "Bebida",
    musica: "Música",
    corte_habitual: "Atendimento de sempre",
    atencao: "Cuidados",
    assuntos: "Assuntos de que gosta",
  };

  return (
    <div className="space-y-7">
      {p.ficha.alergias ? (
        <p className="flex items-start gap-2 rounded-[var(--raio-grupo)] bg-brick px-4 py-3 text-sm font-semibold text-ink">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          Alergia: {p.ficha.alergias}
        </p>
      ) : null}

      <SecaoDeFormulario
        rotulo="Detalhes"
        acao={
          p.cliente.avulso ? undefined : (
            <Button
              variant="secondary"
              size="sm"
              className="min-h-12 rounded-full"
              aria-expanded={editarDetalhes}
              onClick={() => setEditarDetalhes((v) => !v)}
            >
              {editarDetalhes ? "Fechar" : "Editar"}
            </Button>
          )
        }
      >
        {avisarTelefone && !editarDetalhes ? (
          <div className="mb-3">
            <Aviso
              tom="atencao"
              titulo="Sem telefone para o WhatsApp"
              acao={
                <Button
                  variant="secondary"
                  size="sm"
                  className="min-h-12 rounded-full"
                  onClick={() => setEditarDetalhes(true)}
                >
                  Adicionar telefone
                </Button>
              }
            >
              Adicione o telefone do cliente com DDD para ativar os lembretes por WhatsApp.
            </Aviso>
          </div>
        ) : null}
        {editarDetalhes ? (
          <div className="mb-3">
            <EditorDetalhes
              p={p}
              onSalvo={() => {
                setEditarDetalhes(false);
                recarregar();
              }}
            />
          </div>
        ) : null}
        <GrupoDeCartoes>
          <LinhaDeCartao rotulo="Nome" valor={p.cliente.nome} />
          {!p.cliente.avulso ? (
            <>
              <LinhaDeCartao rotulo="Telefone" valor={p.cliente.telefone || "—"} />
              <LinhaDeCartao
                rotulo="E-mail"
                valor={<span className="break-all">{p.cliente.email || "—"}</span>}
              />
            </>
          ) : null}
          <LinhaDeCartao
            rotulo="Último atendimento"
            valor={p.resumo.ultimo ? data(p.resumo.ultimo, p.fuso) : "—"}
          />
          <LinhaDeCartao rotulo="Profissional" valor={p.resumo.profissional ?? "—"} />
          <LinhaDeCartao
            rotulo="Total"
            valor={<span className="money-value">{brl(p.resumo.totalCentavos)}</span>}
          />
          {p.retornoSugerido ? (
            <LinhaDeCartao
              rotulo="Retorno sugerido"
              valor={`${data(p.retornoSugerido.data, p.fuso)} · ${p.retornoSugerido.servico}`}
            />
          ) : null}
          {p.faltas || p.cancelamentos ? (
            <LinhaDeCartao
              rotulo="Ausências"
              valor={[
                p.faltas ? `${p.faltas} falta${p.faltas > 1 ? "s" : ""}` : null,
                p.cancelamentos
                  ? `${p.cancelamentos} cancelamento${p.cancelamentos > 1 ? "s" : ""}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          ) : null}
        </GrupoDeCartoes>
      </SecaoDeFormulario>

      {p.cliente.avulso ? (
        <p className="text-sm text-mute">
          Cliente avulso: identifique na comanda para guardar ficha e fotos.
        </p>
      ) : (
        <>
          <SecaoDeFormulario
            rotulo={barbeiro ? "Ficha de corte" : "Ficha"}
            acao={
              <BotaoAdicionar
                aberto={editarFicha}
                rotulo="Adicionar"
                onClick={() => setEditarFicha((v) => !v)}
              />
            }
          >
            {editarFicha ? (
              <EditorFicha p={p} onSalvo={recarregar} />
            ) : p.ficha.chips.length || p.ficha.texto ? (
              <div className="space-y-3 rounded-[var(--raio-grupo)] bg-ink3 p-4">
                {p.ficha.chips.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {p.ficha.chips.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-line px-3 py-1 text-sm font-semibold text-paper"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : null}
                {p.ficha.texto ? <p className="text-base text-paper">{p.ficha.texto}</p> : null}
              </div>
            ) : (
              <Vazio>
                <span className="font-semibold text-paper">Nada marcado por enquanto</span>
                <span>Toque em Adicionar para anotar.</span>
              </Vazio>
            )}
          </SecaoDeFormulario>

          <SecaoDeFormulario
            rotulo="Preferências"
            acao={
              <BotaoAdicionar
                aberto={editarPref}
                rotulo="Adicionar"
                onClick={() => setEditarPref((v) => !v)}
              />
            }
          >
            {editarPref ? (
              <EditorPreferencias p={p} onSalvo={recarregar} />
            ) : pref.length ? (
              <GrupoDeCartoes>
                {pref.map(([k, v]) => (
                  <LinhaDeCartao
                    key={k}
                    rotulo={nomesPref[k] ?? k}
                    valor={rotuloPref(k, v as string)}
                  />
                ))}
              </GrupoDeCartoes>
            ) : (
              <Vazio>
                <span className="font-semibold text-paper">Sem preferências</span>
                <span>Toque em Adicionar para anotar.</span>
              </Vazio>
            )}
          </SecaoDeFormulario>

          <SecaoDeFormulario rotulo={barbeiro ? "Fotos do corte" : "Fotos do resultado"}>
            {p.fotos.length ? (
              <ul className="grid grid-cols-3 gap-2">
                {p.fotos.map((f) => (
                  <li key={f.id} className="relative">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto min-h-12 w-full overflow-hidden p-0"
                      onClick={() => setVerFoto(f.url)}
                      aria-label={`Ver ${termos.fotoAtendimento.toLocaleLowerCase("pt-BR")}`}
                    >
                      <img
                        src={f.url}
                        alt={`${barbeiro ? "Corte" : "Resultado"} em ${data(f.criadoEm, p.fuso)}`}
                        className="aspect-square w-full rounded-[var(--raio-imagem)] object-cover"
                        loading="lazy"
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="icon"
                      size="icon"
                      aria-label="Apagar foto"
                      className="absolute right-1 top-1 rounded-full bg-ink text-paper"
                      onClick={async () => {
                        await apagar({ data: { fotoId: f.id } });
                        recarregar();
                      }}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <Vazio>
                <span className="font-semibold text-paper">Sem fotos</span>
                <span>Adicione uma foto depois do atendimento.</span>
              </Vazio>
            )}
            <FotoDoCorte clienteId={p.cliente.id} onEnviada={recarregar} segmento={segmento} />
          </SecaoDeFormulario>
        </>
      )}

      <SecaoDeFormulario rotulo="Histórico">
        {p.historico.length ? (
          <ul className="space-y-2">
            {p.historico.map((h) => (
              <li key={h.id} className="rounded-[var(--raio-grupo)] bg-ink3 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-mute">{data(h.inicio, p.fuso)}</span>
                  <span
                    className={`money-value ${h.status === "finalizado" ? "text-paper" : "text-mute"}`}
                  >
                    {h.status === "finalizado" ? brl(h.valorCentavos) : "—"}
                  </span>
                </div>
                <p className="mt-1 truncate text-base font-semibold text-paper">{h.servico}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-mute">
                  <span className="truncate">{h.profissional}</span>
                  <StatusBadge status={h.status} segmento={segmento} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Vazio>
            <span className="font-semibold text-paper">Ainda sem histórico</span>
            <span>Os atendimentos aparecem aqui.</span>
          </Vazio>
        )}
      </SecaoDeFormulario>

      {mostrarLinkFicha && !p.cliente.avulso ? (
        <Button asChild variant="secondary" className="min-h-12 w-full rounded-full">
          <Link to="/barbeiro/clientes/$id" params={{ id: p.cliente.id }}>
            Ver ficha completa
          </Link>
        </Button>
      ) : null}

      {verFoto ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-overlay/90 p-4"
          onClick={() => setVerFoto(null)}
          role="dialog"
          aria-label={termos.fotoAtendimento}
        >
          <img
            src={verFoto}
            alt={`Foto de ${p.cliente.nome}`}
            className="max-h-full max-w-full rounded-[var(--raio-imagem)]"
          />
        </div>
      ) : null}
    </div>
  );
}
