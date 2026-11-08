/**
 * Flow Core — Worker independente com Durable Object SQLite.
 * Sem rota pública de execução: a classe RPC só deve ser chamada
 * por binding privado de outra aplicação Cloudflare.
 */
import { DurableObject } from "cloudflare:workers";
import { reservarCotaSincrona, type PedidoCotaGlobal, type PersistenciaDaCota } from "./regras";

export class CotaGlobalDuravel extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS reservas (
          idempotencia TEXT PRIMARY KEY NOT NULL,
          instante_ms INTEGER NOT NULL
        )
      `);
      ctx.storage.sql.exec(
        "CREATE INDEX IF NOT EXISTS idx_cota_instante ON reservas(instante_ms)",
      );
    });
  }

  /** RPC interno: rejeita duplicatas, exceções e estouros de cota. */
  async reservar(pedido: PedidoCotaGlobal): Promise<boolean> {
    const sql = this.ctx.storage.sql;
    const persistencia: PersistenciaDaCota = {
      transacao: (executar) => this.ctx.storage.transactionSync(executar),
      existe: (id) => sql.exec<{ idempotencia: string }>(
        "SELECT idempotencia FROM reservas WHERE idempotencia = ? LIMIT 1", id,
      ).toArray().length > 0,
      contarDesde: (desde) => Number(sql.exec<{ total: number }>(
        "SELECT COUNT(*) AS total FROM reservas WHERE instante_ms > ?", desde,
      ).one().total),
      inserir: (id, ms) => {
        sql.exec("INSERT INTO reservas (idempotencia, instante_ms) VALUES (?, ?)", id, ms);
      },
      apagarAntes: (ms) => {
        sql.exec("DELETE FROM reservas WHERE instante_ms <= ?", ms);
      },
    };

    try {
      return reservarCotaSincrona(persistencia, pedido, Date.now());
    } catch {
      // Uma falha de armazenamento nunca autoriza uso do provedor.
      return false;
    }
  }
}

export default {
  async fetch(): Promise<Response> {
    return new Response("Not Found", { status: 404 });
  },
};
