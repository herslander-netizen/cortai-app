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
      ) : tema === "feminino-rose" ? (
        <>
          <rect width="290" height="100" fill="#F6D9DE" />
          <circle cx="60" cy="30" r="46" fill="#EFC0C8" />
          <circle cx="235" cy="78" r="58" fill="#E8AEB8" />
          <circle cx="150" cy="95" r="34" fill="#F9E6E9" />
          <circle cx="205" cy="18" r="14" fill="#B76E79" opacity="0.8" />
        </>
      ) : tema === "feminino-lavanda" ? (
        <>
          <rect width="290" height="100" fill="#E6DDF5" />
          <path d="M0 62 Q70 28 145 58 T290 44 V100 H0Z" fill="#CDBDEB" />
          <path d="M0 80 Q80 52 160 78 T290 68 V100 H0Z" fill="#9B7FD9" opacity="0.75" />
          <circle cx="228" cy="26" r="16" fill="#F8F3FF" />
        </>
      ) : tema === "feminino-pessego" ? (
        <>
          <rect width="290" height="100" fill="#FFDCCB" />
          <circle cx="200" cy="62" r="58" fill="#FFC4A8" />
          <circle cx="200" cy="62" r="36" fill="#F9A98A" />
          <circle cx="200" cy="62" r="16" fill={cores.botao} />
          <path d="M0 84 Q70 64 140 86 T290 80 V100 H0Z" fill="#FFF3EA" />
        </>
      ) : (
        <rect width="290" height="100" fill={cores.fundo} />
      )}
    </svg>
  );
}
