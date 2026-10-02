const NOVENTA_DIAS = 90 * 24 * 60 * 60 * 1000;

export function chaveLembretePreferencias(slug: string) {
  return `cortai-preferencias-atendimento:${slug}`;
}

export function deveMostrarPreferencias(slug: string, agora = Date.now()) {
  try {
    const valor = localStorage.getItem(chaveLembretePreferencias(slug));
    if (!valor) return true;
    const salvoEm = Number(valor);
    return !Number.isFinite(salvoEm) || agora - salvoEm >= NOVENTA_DIAS;
  } catch {
    return true;
  }
}

export function lembrarPreferencias(slug: string) {
  try {
    localStorage.setItem(chaveLembretePreferencias(slug), String(Date.now()));
  } catch {
    /* armazenamento opcional */
  }
}
