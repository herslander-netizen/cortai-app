import type { PaginaConfig } from "@/lib/pagina-config";
export type SetPagina = <K extends keyof PaginaConfig>(key: K, value: PaginaConfig[K]) => void;
