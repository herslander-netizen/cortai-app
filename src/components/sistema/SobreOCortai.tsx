import { useQuery } from "@tanstack/react-query";

import { APP_VERSION, CHANGELOG, buscarVersaoPublicada } from "@/lib/versao";

/**
 * "Sobre o Flow": versão instalada, situação da publicação e histórico.
 * Somente leitura — ninguém altera a versão pela interface.
 */
export function SobreOCortai() {
  const { data } = useQuery({
    queryKey: ["versao-publicada"],
    queryFn: buscarVersaoPublicada,
    staleTime: 300000,
  });
  const publicada = data?.atual ?? APP_VERSION;
  const emDia = publicada === APP_VERSION;

  return (
    <section className="mt-10">
      <h2 className="mb-2 text-xs font-semibold uppercase text-mute2">Sobre o Flow</h2>
      <div className="surface p-4">
        <p className="text-sm font-semibold text-paper">Flow · v{APP_VERSION}</p>
        <p className="mt-1 text-xs text-mute">
          {emDia
            ? "Você está na versão mais recente."
            : `Versão disponível: ${publicada}. Atualize para ver as novidades.`}
        </p>
        <p className="mt-1 text-xs text-mute">
          Última atualização: {CHANGELOG[0]!.data.split("-").reverse().join("/")}
        </p>

        <div className="mt-5 space-y-5">
          {CHANGELOG.map((item) => (
            <article key={item.versao} className="border-t border-line pt-4">
              <p className="text-xs font-semibold text-gold">
                v{item.versao} · {item.titulo}
              </p>
              <p className="mt-1 text-xs text-mute">{item.descricao}</p>
              <ul className="mt-2 space-y-1">
                {[...item.funcionalidades, ...item.visual, ...item.correcoes]
                  .slice(0, 6)
                  .map((linha) => (
                    <li key={linha} className="text-xs leading-5 text-mute">
                      • {linha}
                    </li>
                  ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
