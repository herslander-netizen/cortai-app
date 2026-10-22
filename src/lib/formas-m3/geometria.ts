/**
 * Porte da biblioteca `androidx.graphics.shapes` (a mesma que o Material 3 usa para o
 * `LoadingIndicator` do Figaro), lida do APK descompilado. Aqui ficam os pontos e as curvas de Bézier
 * cúbicas; `poligono.ts` monta os polígonos arredondados e `morph.ts` a transição entre eles.
 */

export type Ponto = readonly [number, number];
export type Transformador = (x: number, y: number) => Ponto;

export const DISTANCIA_EPSILON = 1e-4;
export const DOIS_PI = Math.PI * 2;

export const soma = (a: Ponto, b: Ponto): Ponto => [a[0] + b[0], a[1] + b[1]];
export const menos = (a: Ponto, b: Ponto): Ponto => [a[0] - b[0], a[1] - b[1]];
export const vezes = (a: Ponto, k: number): Ponto => [a[0] * k, a[1] * k];
export const dividido = (a: Ponto, k: number): Ponto => [a[0] / k, a[1] / k];
export const produtoEscalar = (a: Ponto, b: Ponto) => a[0] * b[0] + a[1] * b[1];
export const distancia = (x: number, y: number) => Math.sqrt(x * x + y * y);
export const interpolar = (a: number, b: number, t: number) => (1 - t) * a + t * b;
export const moduloPositivo = (x: number, m: number) => ((x % m) + m) % m;
export const girar90 = (p: Ponto): Ponto => [-p[1], p[0]];

export function direcao(p: Ponto): Ponto {
  const d = distancia(p[0], p[1]);
  if (d <= 0) throw new Error("Required distance greater than zero");
  return [p[0] / d, p[1] / d];
}

export function interpolarPonto(a: Ponto, b: Ponto, t: number): Ponto {
  return [interpolar(a[0], b[0], t), interpolar(a[1], b[1], t)];
}

/** `a` e `b` em sentido horário (produto vetorial positivo). */
export const horario = (a: Ponto, b: Ponto) => a[0] * b[1] - a[1] * b[0] > 0;

/** Ângulo do vetor, de 0 a 2π. */
export function angulo(x: number, y: number): number {
  return (Math.atan2(y, x) + DOIS_PI) % DOIS_PI;
}

export function radialParaCartesiano(
  raio: number,
  anguloRad: number,
  centro: Ponto = [0, 0],
): Ponto {
  return soma(vezes([Math.cos(anguloRad), Math.sin(anguloRad)], raio), centro);
}

/** Busca ternária do mínimo de `f` em [a, b] (`Utils.findMinimum`). */
export function acharMinimo(a: number, b: number, passo: number, f: (v: number) => number): number {
  let ini = a;
  let fim = b;
  while (fim - ini > passo) {
    const v1 = (2 * ini + fim) / 3;
    const v2 = (2 * fim + ini) / 3;
    if (f(v1) < f(v2)) fim = v2;
    else ini = v1;
  }
  return (ini + fim) / 2;
}

/** Curva cúbica: `[âncora0, controle0, controle1, âncora1]`, cada um com x e y. */
export class Cubica {
  readonly pontos: number[];

  constructor(pontos: number[]) {
    if (pontos.length !== 8) throw new Error("Points array size should be 8");
    this.pontos = pontos;
  }

  static de(a0: Ponto, c0: Ponto, c1: Ponto, a1: Ponto): Cubica {
    return new Cubica([a0[0], a0[1], c0[0], c0[1], c1[0], c1[1], a1[0], a1[1]]);
  }

  get ancora0X() {
    return this.pontos[0]!;
  }
  get ancora0Y() {
    return this.pontos[1]!;
  }
  get controle0X() {
    return this.pontos[2]!;
  }
  get controle0Y() {
    return this.pontos[3]!;
  }
  get controle1X() {
    return this.pontos[4]!;
  }
  get controle1Y() {
    return this.pontos[5]!;
  }
  get ancora1X() {
    return this.pontos[6]!;
  }
  get ancora1Y() {
    return this.pontos[7]!;
  }

  static retaReta(x0: number, y0: number, x1: number, y1: number): Cubica {
    return new Cubica([
      x0,
      y0,
      interpolar(x0, x1, 1 / 3),
      interpolar(y0, y1, 1 / 3),
      interpolar(x0, x1, 2 / 3),
      interpolar(y0, y1, 2 / 3),
      x1,
      y1,
    ]);
  }

  /** Arco de círculo de centro `(cx, cy)` entre os dois pontos. */
  static arcoCircular(
    cx: number,
    cy: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): Cubica {
    const p0 = direcao([x0 - cx, y0 - cy]);
    const p1 = direcao([x1 - cx, y1 - cy]);
    const giro0 = girar90(p0);
    const giro1 = girar90(p1);
    const sentidoHorario = produtoEscalar(giro0, [x1 - cx, y1 - cy]) >= 0;
    const cosseno = produtoEscalar(p0, p1);
    if (cosseno > 0.999) return Cubica.retaReta(x0, y0, x1, y1);
    const k =
      ((((distancia(x0 - cx, y0 - cy) * 4) / 3) *
        (Math.sqrt(2 * (1 - cosseno)) - Math.sqrt(1 - cosseno * cosseno))) /
        (1 - cosseno)) *
      (sentidoHorario ? 1 : -1);
    return new Cubica([
      x0,
      y0,
      x0 + giro0[0] * k,
      y0 + giro0[1] * k,
      x1 - giro1[0] * k,
      y1 - giro1[1] * k,
      x1,
      y1,
    ]);
  }

  pontoNaCurva(t: number): Ponto {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * t * u * u;
    const c = 3 * t * t * u;
    const d = t * t * t;
    return [
      this.ancora0X * a + this.controle0X * b + this.controle1X * c + this.ancora1X * d,
      this.ancora0Y * a + this.controle0Y * b + this.controle1Y * c + this.ancora1Y * d,
    ];
  }

  semComprimento(): boolean {
    return (
      Math.abs(this.ancora0X - this.ancora1X) < DISTANCIA_EPSILON &&
      Math.abs(this.ancora0Y - this.ancora1Y) < DISTANCIA_EPSILON
    );
  }

  /** `[minX, minY, maxX, maxY]`; aproximado usa os pontos de controle. */
  limites(aproximado: boolean): [number, number, number, number] {
    if (this.semComprimento()) return [this.ancora0X, this.ancora0Y, this.ancora0X, this.ancora0Y];
    let minX = Math.min(this.ancora0X, this.ancora1X);
    let minY = Math.min(this.ancora0Y, this.ancora1Y);
    let maxX = Math.max(this.ancora0X, this.ancora1X);
    let maxY = Math.max(this.ancora0Y, this.ancora1Y);
    if (aproximado) {
      return [
        Math.min(minX, this.controle0X, this.controle1X),
        Math.min(minY, this.controle0Y, this.controle1Y),
        Math.max(maxX, this.controle0X, this.controle1X),
        Math.max(maxY, this.controle0Y, this.controle1Y),
      ];
    }
    const quase0 = (v: number) => Math.abs(v) < DISTANCIA_EPSILON;
    const extremos = (a0: number, c0: number, c1: number, a1: number, eixo: 0 | 1) => {
      const a = -a0 + 3 * c0 - 3 * c1 + a1;
      const b = 2 * a0 - 4 * c0 + 2 * c1;
      const c = -a0 + c0;
      const ts: number[] = [];
      if (quase0(a)) {
        if (b !== 0) ts.push((2 * c) / (-2 * b));
      } else {
        const delta = b * b - 4 * a * c;
        if (delta >= 0) {
          const raiz = Math.sqrt(delta);
          ts.push((-b + raiz) / (2 * a), (-b - raiz) / (2 * a));
        }
      }
      for (const t of ts) {
        if (t >= 0 && t <= 1) {
          const v = this.pontoNaCurva(t)[eixo];
          if (eixo === 0) {
            minX = Math.min(minX, v);
            maxX = Math.max(maxX, v);
          } else {
            minY = Math.min(minY, v);
            maxY = Math.max(maxY, v);
          }
        }
      }
    };
    extremos(this.ancora0X, this.controle0X, this.controle1X, this.ancora1X, 0);
    extremos(this.ancora0Y, this.controle0Y, this.controle1Y, this.ancora1Y, 1);
    return [minX, minY, maxX, maxY];
  }

  dividir(t: number): [Cubica, Cubica] {
    const u = 1 - t;
    const p = this.pontoNaCurva(t);
    const u2 = u * u;
    const ut = 2 * u * t;
    const t2 = t * t;
    return [
      new Cubica([
        this.ancora0X,
        this.ancora0Y,
        this.ancora0X * u + this.controle0X * t,
        this.ancora0Y * u + this.controle0Y * t,
        this.ancora0X * u2 + this.controle0X * ut + this.controle1X * t2,
        this.ancora0Y * u2 + this.controle0Y * ut + this.controle1Y * t2,
        p[0],
        p[1],
      ]),
      new Cubica([
        p[0],
        p[1],
        this.controle0X * u2 + this.controle1X * ut + this.ancora1X * t2,
        this.controle0Y * u2 + this.controle1Y * ut + this.ancora1Y * t2,
        this.controle1X * u + this.ancora1X * t,
        this.controle1Y * u + this.ancora1Y * t,
        this.ancora1X,
        this.ancora1Y,
      ]),
    ];
  }

  inverter(): Cubica {
    return new Cubica([
      this.ancora1X,
      this.ancora1Y,
      this.controle1X,
      this.controle1Y,
      this.controle0X,
      this.controle0Y,
      this.ancora0X,
      this.ancora0Y,
    ]);
  }

  transformada(f: Transformador): Cubica {
    const novos: number[] = [];
    for (let i = 0; i < 8; i += 2) {
      const [x, y] = f(this.pontos[i]!, this.pontos[i + 1]!);
      novos.push(x, y);
    }
    return new Cubica(novos);
  }
}
