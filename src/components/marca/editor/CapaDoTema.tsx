import { useState } from "react";

import type { TemaId } from "@/lib/pagina-config";
import { TEMAS, TEMAS_COM_CAPA } from "@/lib/pagina-config";

/**
 * Imagem de capa de cada tema (no Figaro vem do servidor, `largeCoverImageUri`). Aqui são ilustrações
 * próprias, desenhadas em SVG, que lembram o clima de cada modelo: facetas cinza (Clássico), palco escuro
 * com faixa laranja (Rock n' Roll) e círculo amarelo (Retrô). Os demais temas mostram uma página em miniatura
 * com as cores reais do tema.
 */
export function CapaDoTema({ tema, className = "" }: { tema: TemaId; className?: string }) {
  const [semImagem, setSemImagem] = useState(false);
  const cores = TEMAS[tema].cores;
  // Só temas com WebP gerado pelo script usam capturas reais; os demais têm SVG próprio de fallback.
  if (!semImagem && (TEMAS_COM_CAPA as readonly string[]).includes(tema)) {
    return (
      <img
        src={`/temas/${tema}.webp`}
        alt=""
        width={780}
        height={439}
        loading="lazy"
        onError={() => setSemImagem(true)}
        className={`block size-full object-cover object-[50%_22%] ${className}`}
      />
    );
  }
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
        <>
          <rect width="290" height="100" fill={cores.fundo} />
          <rect x="0" y="0" width="290" height="46" fill={cores.secundaria} />
          <circle cx="28" cy="23" r="9" fill={cores.principal} />
          <rect x="46" y="16" width="86" height="8" rx="4" fill={cores.texto} opacity="0.9" />
          <rect x="46" y="29" width="56" height="5" rx="2.5" fill={cores.texto} opacity="0.45" />
          <rect x="18" y="58" width="254" height="14" rx="7" fill={cores.secundaria} />
          <rect x="18" y="78" width="254" height="14" rx="7" fill={cores.secundaria} />
          <rect x="196" y="55" width="76" height="20" rx="10" fill={cores.botao} />
          <circle cx="258" cy="23" r="5" fill={cores.destaque} />
        </>
      )}
    </svg>
  );
}
