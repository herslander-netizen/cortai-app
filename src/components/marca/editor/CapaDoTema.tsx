import type { TemaId } from "@/lib/pagina-config";
import { TEMAS } from "@/lib/pagina-config";

/**
 * Imagem de capa de cada tema (no Figaro vem do servidor, `largeCoverImageUri`). Aqui são ilustrações
 * próprias, desenhadas em SVG, que lembram o clima de cada modelo: facetas cinza (Clássico), palco escuro
 * com faixa laranja (Rock n' Roll) e círculo amarelo (Retrô).
 */
export function CapaDoTema({ tema, className = "" }: { tema: TemaId; className?: string }) {
  const cores = TEMAS[tema].cores;
  return (
    <svg
      viewBox="0 0 290 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={`block size-full ${className}`}
    >
      {tema === "figaro-classico" ? (
        <>
          <rect width="290" height="100" fill="#C9C6C3" />
          <polygon points="0,0 120,0 70,55" fill="#B5B2AF" />
          <polygon points="120,0 290,0 200,40" fill="#D8D5D2" />
          <polygon points="0,0 70,55 0,100" fill="#A9A6A3" />
          <polygon points="70,55 200,40 150,100 0,100" fill="#BFBCB9" />
          <polygon points="200,40 290,0 290,100 150,100" fill="#ABA8A5" />
          <polygon points="120,0 200,40 70,55" fill="#8F8C89" opacity="0.55" />
        </>
      ) : tema === "figaro-rock-n-roll" ? (
        <>
          <rect width="290" height="100" fill="#171616" />
          {[28, 62, 96, 130, 164, 198, 232, 266].map((x) => (
            <rect key={x} x={x} y="0" width="2" height="100" fill="#FFFFFF" opacity="0.07" />
          ))}
          <polygon points="0,74 150,92 290,66 290,100 0,100" fill="#262424" />
          <polyline
            points="0,74 150,92 290,66"
            fill="none"
            stroke={cores.destaque}
            strokeWidth="3"
          />
        </>
      ) : tema === "figaro-retro" ? (
        <>
          <rect width="290" height="100" fill="#EFD95A" />
          <circle cx="215" cy="50" r="62" fill="#E3C23F" />
          <circle cx="215" cy="50" r="42" fill="#F4E38A" />
          <circle cx="215" cy="50" r="22" fill="#E3C23F" />
          <rect x="20" y="62" width="90" height="14" rx="7" fill={cores.botao} />
        </>
      ) : (
        <rect width="290" height="100" fill={cores.fundo} />
      )}
    </svg>
  );
}
