import { useState } from "react";

/** Foto redonda do profissional (como no Figaro); sem foto, a inicial no mesmo espaço. */
export function FotoDoProfissional({
  nome,
  url,
  className = "agenda-ficha-avatar",
}: {
  nome: string;
  url?: string | null | undefined;
  className?: string;
}) {
  const [falhou, setFalhou] = useState(false);
  return (
    <span className={className} aria-hidden>
      {url && !falhou ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full rounded-full object-cover"
          onError={() => setFalhou(true)}
        />
      ) : (
        nome.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}
