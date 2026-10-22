/**
 * Transição entre dois polígonos (`Morph`, `MeasuredPolygon`, `AngleMeasurer`, `FeatureMapping`,
 * `DoubleMapper`) da biblioteca `androidx.graphics.shapes`. Porte do APK.
 */
import { Cubica, DOIS_PI, acharMinimo, angulo, interpolar, moduloPositivo } from "./geometria";
import type { Caracteristica, PoligonoArredondado } from "./poligono";

type CaracteristicaComProgresso = { progresso: number; caracteristica: Caracteristica };

// ---- DoubleMapper / FloatMapping -------------------------------------------------------------

function progressoNoIntervalo(progresso: number, de: number, ate: number): boolean {
  return ate >= de ? de <= progresso && progresso <= ate : progresso >= de || progresso <= ate;
}

function validarProgresso(p: readonly number[]) {
  if (!p.every((v) => v >= 0 && v <= 1))
    throw new Error(`FloatMapping - Progress outside of range: ${p.join(",")}`);
  let voltas = 0;
  for (let i = 1; i < p.length; i++) if (p[i]! < p[i - 1]!) voltas++;
  if (voltas > 1) throw new Error(`FloatMapping - Progress wraps more than once: ${p.join(",")}`);
}

function mapaLinear(xs: readonly number[], ys: readonly number[], x: number): number {
  if (x < 0 || x > 1) throw new Error(`Invalid progress: ${x}`);
  for (let i = 0; i < xs.length; i++) {
    const prox = (i + 1) % xs.length;
    if (progressoNoIntervalo(x, xs[i]!, xs[prox]!)) {
      const tamanhoX = moduloPositivo(xs[prox]! - xs[i]!, 1);
      const tamanhoY = moduloPositivo(ys[prox]! - ys[i]!, 1);
      const fracao = tamanhoX < 0.001 ? 0.5 : moduloPositivo(x - xs[i]!, 1) / tamanhoX;
      return moduloPositivo(ys[i]! + tamanhoY * fracao, 1);
    }
  }
  throw new Error("Collection contains no element matching the predicate.");
}

class MapeadorDuplo {
  private readonly origem: number[] = [];
  private readonly destino: number[] = [];

  constructor(pares: ReadonlyArray<readonly [number, number]>) {
    for (const [a, b] of pares) {
      this.origem.push(a);
      this.destino.push(b);
    }
    validarProgresso(this.origem);
    validarProgresso(this.destino);
  }

  mapear(x: number) {
    return mapaLinear(this.origem, this.destino, x);
  }

  mapearDeVolta(x: number) {
    return mapaLinear(this.destino, this.origem, x);
  }
}

// ---- Mapeamento dos cantos -------------------------------------------------------------------

function distanciaDeCaracteristicas(a: Caracteristica, b: Caracteristica): number {
  if (a.tipo === "canto" && b.tipo === "canto" && a.convexo !== b.convexo) return Number.MAX_VALUE;
  const meio = (c: Caracteristica): [number, number] => {
    const primeira = c.cubicas[0]!;
    const ultima = c.cubicas[c.cubicas.length - 1]!;
    return [(primeira.ancora0X + ultima.ancora1X) / 2, (primeira.ancora0Y + ultima.ancora1Y) / 2];
  };
  const [ax, ay] = meio(a);
  const [bx, by] = meio(b);
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

function mapear(
  f1: CaracteristicaComProgresso[],
  f2: CaracteristicaComProgresso[],
): CaracteristicaComProgresso[] {
  let melhor = 0;
  let menorDistancia = distanciaDeCaracteristicas(f1[0]!.caracteristica, f2[0]!.caracteristica);
  for (let i = 1; i < f2.length; i++) {
    const d = distanciaDeCaracteristicas(f1[0]!.caracteristica, f2[i]!.caracteristica);
    if (menorDistancia > d) {
      melhor = i;
      menorDistancia = d;
    }
  }
  const n1 = f1.length;
  const n2 = f2.length;
  const mapeadas = [f2[melhor]!];
  let anterior = melhor;
  for (let i = 1; i < n1; i++) {
    let limite = melhor - (n1 - i);
    if (limite <= anterior) limite += n2;
    let escolhido = anterior + 1;
    let menor = distanciaDeCaracteristicas(
      f1[i]!.caracteristica,
      f2[escolhido % n2]!.caracteristica,
    );
    for (let j = anterior + 2; j <= limite; j++) {
      const d = distanciaDeCaracteristicas(f1[i]!.caracteristica, f2[j % n2]!.caracteristica);
      if (menor > d) {
        escolhido = j;
        menor = d;
      }
    }
    anterior = escolhido;
    mapeadas.push(f2[anterior % n2]!);
  }
  return mapeadas;
}

function mapeadorDeCaracteristicas(
  f1: CaracteristicaComProgresso[],
  f2: CaracteristicaComProgresso[],
): MapeadorDuplo {
  const cantos1 = f1.filter((f) => f.caracteristica.tipo === "canto");
  const cantos2 = f2.filter((f) => f.caracteristica.tipo === "canto");
  let a: CaracteristicaComProgresso[];
  let b: CaracteristicaComProgresso[];
  if (cantos1.length > cantos2.length) {
    a = mapear(cantos2, cantos1);
    b = cantos2;
  } else {
    a = cantos1;
    b = mapear(cantos1, cantos2);
  }
  const pares: Array<readonly [number, number]> = [];
  for (let i = 0; i < a.length && i !== b.length; i++)
    pares.push([a[i]!.progresso, b[i]!.progresso]);
  return new MapeadorDuplo(pares);
}

// ---- Polígono medido -------------------------------------------------------------------------

class MedidorDeAngulo {
  constructor(
    private readonly cx: number,
    private readonly cy: number,
  ) {}

  medir(c: Cubica): number {
    const m = moduloPositivo(
      angulo(c.ancora1X - this.cx, c.ancora1Y - this.cy) -
        angulo(c.ancora0X - this.cx, c.ancora0Y - this.cy),
      DOIS_PI,
    );
    return m > DOIS_PI - 1e-4 ? 0 : m;
  }

  acharPontoDeCorte(c: Cubica, m: number): number {
    const inicio = angulo(c.ancora0X - this.cx, c.ancora0Y - this.cy);
    return acharMinimo(0, 1, 1e-5, (t) => {
      const p = c.pontoNaCurva(t);
      return Math.abs(moduloPositivo(angulo(p[0] - this.cx, p[1] - this.cy) - inicio, DOIS_PI) - m);
    });
  }
}

class CubicaMedida {
  readonly tamanho: number;

  constructor(
    private readonly dono: PoligonoMedido,
    readonly cubica: Cubica,
    public inicio: number,
    public fim: number,
  ) {
    if (fim < inicio)
      throw new Error(
        "endOutlineProgress is expected to be equal or greater than startOutlineProgress",
      );
    this.tamanho = dono.medidor.medir(cubica);
  }

  cortarEm(progressoDoCorte: number): [CubicaMedida, CubicaMedida] {
    const corte = Math.min(Math.max(progressoDoCorte, this.inicio), this.fim);
    const t = this.dono.medidor.acharPontoDeCorte(
      this.cubica,
      ((corte - this.inicio) / (this.fim - this.inicio)) * this.tamanho,
    );
    if (!(t >= 0 && t <= 1)) throw new Error("Cubic cut point is expected to be between 0 and 1");
    const [a, b] = this.cubica.dividir(t);
    return [
      new CubicaMedida(this.dono, a, this.inicio, corte),
      new CubicaMedida(this.dono, b, corte, this.fim),
    ];
  }
}

class PoligonoMedido {
  readonly cubicas: CubicaMedida[] = [];

  constructor(
    readonly medidor: MedidorDeAngulo,
    readonly caracteristicas: CaracteristicaComProgresso[],
    cubicas: Cubica[],
    progressoDoContorno: number[],
  ) {
    if (progressoDoContorno.length !== cubicas.length + 1)
      throw new Error("Outline progress size is expected to be the cubics size + 1");
    if (progressoDoContorno[0] !== 0)
      throw new Error("First outline progress value is expected to be zero");
    if (progressoDoContorno[progressoDoContorno.length - 1] !== 1)
      throw new Error("Last outline progress value is expected to be one");
    let inicio = 0;
    for (let i = 0; i < cubicas.length; i++) {
      if (progressoDoContorno[i + 1]! - progressoDoContorno[i]! > 1e-4) {
        this.cubicas.push(new CubicaMedida(this, cubicas[i]!, inicio, progressoDoContorno[i + 1]!));
        inicio = progressoDoContorno[i + 1]!;
      }
    }
    this.cubicas[this.cubicas.length - 1]!.fim = 1;
  }

  static medir(medidor: MedidorDeAngulo, poligono: PoligonoArredondado): PoligonoMedido {
    const cubicas: Cubica[] = [];
    const cantos: Array<{ caracteristica: Caracteristica; indice: number }> = [];
    for (const f of poligono.caracteristicas) {
      f.cubicas.forEach((c, i) => {
        if (f.tipo === "canto" && i === Math.floor(f.cubicas.length / 2))
          cantos.push({ caracteristica: f, indice: cubicas.length });
        cubicas.push(c);
      });
    }
    const acumulado = [0];
    for (const c of cubicas) {
      const m = medidor.medir(c);
      if (m < 0) throw new Error("Measured cubic is expected to be greater or equal to zero");
      acumulado.push(acumulado[acumulado.length - 1]! + m);
    }
    const total = acumulado[acumulado.length - 1]!;
    const progresso = acumulado.map((v) => v / total);
    const caracteristicas = cantos.map(({ caracteristica, indice }) => ({
      progresso: (progresso[indice]! + progresso[indice + 1]!) / 2,
      caracteristica,
    }));
    return new PoligonoMedido(medidor, caracteristicas, cubicas, progresso);
  }

  cortarEDeslocar(pontoDeCorte: number): PoligonoMedido {
    if (pontoDeCorte < 0 || pontoDeCorte > 1)
      throw new Error("Cutting point is expected to be between 0 and 1");
    if (pontoDeCorte < 1e-4) return this;
    const alvo = this.cubicas.findIndex((c) => c.inicio <= pontoDeCorte && pontoDeCorte <= c.fim);
    const [antes, depois] = this.cubicas[alvo]!.cortarEm(pontoDeCorte);
    const cubicas: Cubica[] = [depois.cubica];
    for (let i = 1; i < this.cubicas.length; i++)
      cubicas.push(this.cubicas[(i + alvo) % this.cubicas.length]!.cubica);
    cubicas.push(antes.cubica);
    const progresso: number[] = [];
    for (let i = 0; i < this.cubicas.length + 2; i++) {
      if (i === 0) progresso.push(0);
      else if (i === this.cubicas.length + 1) progresso.push(1);
      else
        progresso.push(
          moduloPositivo(this.cubicas[(alvo + i - 1) % this.cubicas.length]!.fim - pontoDeCorte, 1),
        );
    }
    const caracteristicas = this.caracteristicas.map((f) => ({
      progresso: moduloPositivo(f.progresso - pontoDeCorte, 1),
      caracteristica: f.caracteristica,
    }));
    return new PoligonoMedido(this.medidor, caracteristicas, cubicas, progresso);
  }
}

// ---- Morph -----------------------------------------------------------------------------------

function parearCubicas(p1: PoligonoArredondado, p2: PoligonoArredondado): Array<[Cubica, Cubica]> {
  const medido1 = PoligonoMedido.medir(new MedidorDeAngulo(p1.centroX, p1.centroY), p1);
  const medido2 = PoligonoMedido.medir(new MedidorDeAngulo(p2.centroX, p2.centroY), p2);
  const mapeador = mapeadorDeCaracteristicas(medido1.caracteristicas, medido2.caracteristicas);
  const deslocamento = mapeador.mapear(0);
  const medido2Deslocado = medido2.cortarEDeslocar(deslocamento);
  const pares: Array<[Cubica, Cubica]> = [];
  let i1 = 1;
  let i2 = 1;
  let atual1: CubicaMedida | undefined = medido1.cubicas[0];
  let atual2: CubicaMedida | undefined = medido2Deslocado.cubicas[0];
  while (atual1 && atual2) {
    const fim1 = i1 === medido1.cubicas.length ? 1 : atual1.fim;
    const fim2 =
      i2 === medido2Deslocado.cubicas.length
        ? 1
        : mapeador.mapearDeVolta(moduloPositivo(atual2.fim + deslocamento, 1));
    const corte = Math.min(fim1, fim2);
    let a: CubicaMedida;
    let b: CubicaMedida;
    if (fim1 > corte + 1e-6) {
      [a, atual1] = atual1.cortarEm(corte);
    } else {
      a = atual1;
      atual1 = medido1.cubicas[i1];
      i1++;
    }
    if (fim2 > corte + 1e-6) {
      [b, atual2] = atual2.cortarEm(moduloPositivo(mapeador.mapear(corte) - deslocamento, 1));
    } else {
      b = atual2;
      atual2 = medido2Deslocado.cubicas[i2];
      i2++;
    }
    pares.push([a.cubica, b.cubica]);
  }
  if (atual1 || atual2) throw new Error("Expected both Polygon's Cubic to be fully matched");
  return pares;
}

export class Transicao {
  private readonly pares: Array<[Cubica, Cubica]>;

  constructor(inicio: PoligonoArredondado, fim: PoligonoArredondado) {
    this.pares = parearCubicas(inicio, fim);
  }

  /**
   * Curvas do contorno em `progresso` (pode passar de 1 com a mola). A última curva é refeita para fechar
   * no início da primeira, como em `Morph.asCubics`.
   */
  cubicas(progresso: number): Cubica[] {
    const lista: Cubica[] = [];
    let primeira: Cubica | null = null;
    let anterior: Cubica | null = null;
    for (const [a, b] of this.pares) {
      const pontos: number[] = [];
      for (let i = 0; i < 8; i++) pontos.push(interpolar(a.pontos[i]!, b.pontos[i]!, progresso));
      const atual = new Cubica(pontos);
      if (!primeira) primeira = atual;
      if (anterior) lista.push(anterior);
      anterior = atual;
    }
    if (anterior && primeira) {
      lista.push(
        new Cubica([
          anterior.ancora0X,
          anterior.ancora0Y,
          anterior.controle0X,
          anterior.controle0Y,
          anterior.controle1X,
          anterior.controle1Y,
          primeira.ancora0X,
          primeira.ancora0Y,
        ]),
      );
    }
    return lista;
  }
}
