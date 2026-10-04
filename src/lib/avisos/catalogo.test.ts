import { describe, expect, it } from "vitest";

import { EVENTOS, chaveDeDedupe, decidirCanais, eventoValido } from "./catalogo";

const pega = (r: ReturnType<typeof decidirCanais>, c: string) => r.find((d) => d.canal === c);

describe("catálogo de avisos", () => {
  it("todo evento tem prioridade e ao menos um destino", () => {
    for (const def of Object.values(EVENTOS)) {
      expect(def.prioridade).toBeTruthy();
      expect(Object.keys(def.destinos).length).toBeGreaterThan(0);
    }
  });

  it("dinheiro nunca vai ao profissional nem ao cliente", () => {
    expect("profissional" in EVENTOS.pix_informado.destinos).toBe(false);
    expect("cliente" in EVENTOS.pix_informado.destinos).toBe(false);
  });

  it("valida eventos", () => {
    expect(eventoValido("cliente_chegou")).toBe(true);
    expect(eventoValido("qualquer")).toBe(false);
  });

  it("dedupe muda com a versão (duas remarcações avisam as duas)", () => {
    const base = { evento: "agendamento_remarcado", destinatario: "cliente", alvo: "c1", referencia: "a1" } as const;
    expect(chaveDeDedupe({ ...base, versao: "v1" })).not.toBe(chaveDeDedupe({ ...base, versao: "v2" }));
    expect(chaveDeDedupe(base)).toBe(chaveDeDedupe(base));
  });
});

describe("decidirCanais", () => {
  it("sininho sempre registra para a equipe", () => {
    expect(pega(decidirCanais("agendamento_criado", "gestor", {}), "in_app")?.enviar).toBe(true);
  });

  it("destinatário fora do evento não recebe nada", () => {
    expect(decidirCanais("pix_informado", "profissional", {})).toEqual([]);
  });

  it("WhatsApp da equipe só quando ligado e verificado", () => {
    const sem = decidirCanais("cliente_chegou", "profissional", { temWhatsapp: true });
    expect(pega(sem, "whatsapp")).toMatchObject({ enviar: false, motivo: "whatsapp_nao_ligado" });
    const com = decidirCanais("cliente_chegou", "profissional", {
      temWhatsapp: true,
      preferencias: { no_whatsapp: true },
    });
    expect(pega(com, "whatsapp")?.enviar).toBe(true);
  });

  it("push respeita desligamento e inscrição", () => {
    expect(pega(decidirCanais("cliente_chegou", "profissional", {}), "push")?.motivo).toBe("sem_inscricao");
    expect(
      pega(decidirCanais("cliente_chegou", "profissional", { temPush: true, preferencias: { no_push: false } }), "push")
        ?.motivo,
    ).toBe("push_desligado");
  });

  it("silêncio segura o normal, mas não o crítico", () => {
    expect(pega(decidirCanais("lembrete", "cliente", { temWhatsapp: true, emSilencio: true }), "whatsapp")?.enviar).toBe(false);
    expect(
      pega(decidirCanais("atraso_avisado", "cliente", { temWhatsapp: true, emSilencio: true }), "whatsapp")?.enviar,
    ).toBe(true);
  });

  it("relacionamento exige consentimento e plano", () => {
    expect(pega(decidirCanais("relacionamento", "cliente", { temWhatsapp: true }), "whatsapp")?.motivo).toBe(
      "sem_consentimento",
    );
    expect(
      pega(decidirCanais("agendamento_criado", "cliente", { temWhatsapp: true, planoComWhatsapp: false }), "whatsapp")
        ?.motivo,
    ).toBe("plano_sem_whatsapp");
  });
});

import { canaisDaEquipe, destinatarioDoPapel } from "./catalogo";

describe("canaisDaEquipe", () => {
  const base = { temPush: true, temWhatsapp: true };
  it("cada pessoa aparece no máximo uma vez por canal", () => {
    const r = canaisDaEquipe(
      "cliente_chegou",
      [
        { userId: "u1", papel: "barbeiro", ...base, preferencias: { no_whatsapp: true } },
        { userId: "u1", papel: "barbeiro", ...base, preferencias: { no_whatsapp: true } },
      ],
      { planoComWhatsapp: true },
    );
    expect(r.push).toEqual(["u1"]);
    expect(r.whatsapp).toEqual(["u1"]);
  });
  it("respeita preferências e plano de cada pessoa", () => {
    const r = canaisDaEquipe(
      "agendamento_criado",
      [
        { userId: "dono", papel: "dono", ...base, preferencias: { no_push: false, no_whatsapp: true } },
        { userId: "prof", papel: "barbeiro", ...base },
      ],
      { planoComWhatsapp: false },
    );
    expect(r.push).toEqual(["prof"]);
    expect(r.whatsapp).toEqual([]);
    expect(r.registro["dono"]?.["whatsapp"]?.motivo).toBe("plano_sem_whatsapp");
    expect(r.registro["prof"]?.["whatsapp"]?.motivo).toBe("plano_sem_whatsapp");
  });
  it("papéis viram destinatários", () => {
    expect(destinatarioDoPapel("barbeiro")).toBe("profissional");
    expect(destinatarioDoPapel("recepcao")).toBe("gestor");
  });
});

import { EVENTO_DO_CLIENTE } from "./catalogo";

describe("avisos ao cliente", () => {
  it("todo aviso do cliente aponta para evento com destino cliente por WhatsApp", () => {
    for (const evento of Object.values(EVENTO_DO_CLIENTE)) {
      expect(EVENTOS[evento].destinos).toHaveProperty("cliente");
    }
  });
  it("confirmação e cancelamento saem sem consentimento; pós-atendimento não", () => {
    const ctx = { temWhatsapp: true, planoComWhatsapp: true, consentimento: false };
    for (const tipo of ["confirmacao_agendamento", "cancelamento", "lembrete_24h"]) {
      expect(decidirCanais(EVENTO_DO_CLIENTE[tipo]!, "cliente", ctx)[0]?.enviar).toBe(true);
    }
    expect(decidirCanais(EVENTO_DO_CLIENTE["pos_atendimento"]!, "cliente", ctx)[0]?.enviar).toBe(false);
  });
});
