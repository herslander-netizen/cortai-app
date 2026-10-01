// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { StatusBadge, type StatusKey } from "./badge";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
afterEach(() => { host?.remove(); host = null; });

const estados: Array<[StatusKey, string]> = [
  ["agendado", "Agendado"], ["chegou", "Chegou"], ["na_cadeira", "Em atendimento"],
  ["finalizado", "Finalizado"], ["remarcado", "Remarcado"], ["cancelado", "Cancelado"],
  ["nao_compareceu", "Não compareceu"], ["aguardando_pagamento", "Aguardando pagamento"],
  ["atrasado", "Atrasado"],
  ["pago", "Pago"], ["pendente", "Pendente"], ["livre", "Livre"],
];

describe("StatusBadge", () => {
  it.each(estados)("mostra texto e ícone para %s", (status, texto) => {
    host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(<StatusBadge status={status} />));
    expect(host.textContent).toContain(texto);
    expect(host.querySelector("svg")).not.toBeNull();
  });
  it("usa atendimento fora da barbearia", () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(<StatusBadge status="na_cadeira" segmento="salao" />));
    expect(host.textContent).toContain("Em atendimento");
  });
});