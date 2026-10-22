/**
 * Polígonos arredondados (`RoundedPolygon`, `RoundedCorner`, `Feature`, `Shapes.kt`) da biblioteca
 * `androidx.graphics.shapes`. Porte linha a linha do APK; os nomes seguem o português do projeto.
 */
import {
  Cubica,
  DISTANCIA_EPSILON,
  direcao,
  distancia,
  dividido,
  girar90,
  horario,
  interpolarPonto,
  menos,
  produtoEscalar,
  radialParaCartesiano,
  soma,
  vezes,
  type Ponto,
  type Transformador,
} from "./geometria";

export type Arredondamento = { readonly raio: number; readonly suavizacao: number };
export const SEM_ARREDONDAR: Arredondamento = { raio: 0, suavizacao: 0 };
export const arredondar = (raio: number, suavizacao = 0): Arredondamento => ({ raio, suavizacao });

class CantoArredondado {
  readonly d1: Ponto;
  readonly d2: Ponto;
  readonly raio: number;
  readonly suavizacao: number;
  readonly corteArredondadoEsperado: number;
  centro: Ponto = [0, 0];

  constructor(
    readonly p0: Ponto,
    readonly p1: Ponto,
    readonly p2: Ponto,
    arredondamento: Arredondamento | null,
  ) {
    this.d1 = direcao(menos(p0, p1));
    this.d2 = direcao(menos(p2, p1));
    this.raio = arredondamento?.raio ?? 0;
    this.suavizacao = arredondamento?.suavizacao ?? 0;
    const cos = produtoEscalar(this.d1, this.d2);
    const sen = Math.sqrt(1 - cos * cos);
    this.corteArredondadoEsperado = sen > 0.001 ? (this.raio * (cos + 1)) / sen : 0;
  }

  get corteEsperado() {
    return (1 + this.suavizacao) * this.corteArredondadoEsperado;
  }

  cubicas(corte0: number, corte1: number = corte0): Cubica[] {
    const corte = Math.min(corte0, corte1);
    if (this.corteArredondadoEsperado < 1e-4 || corte < 1e-4 || this.raio < 1e-4) {
      this.centro = this.p1;
      return [Cubica.retaReta(this.p1[0], this.p1[1], this.p1[0], this.p1[1])];
    }
    const corteReal = Math.min(corte, this.corteArredondadoEsperado);
    const suavizacao0 = this.suavizacaoReal(corte0);
    const suavizacao1 = this.suavizacaoReal(corte1);
    const raioReal = (this.raio * corteReal) / this.corteArredondadoEsperado;
    this.centro = soma(
      this.p1,
      vezes(
        direcao(dividido(soma(this.d1, this.d2), 2)),
        Math.sqrt(raioReal * raioReal + corteReal * corteReal),
      ),
    );
    const interseccao1 = soma(this.p1, vezes(this.d1, corteReal));
    const interseccao2 = soma(this.p1, vezes(this.d2, corteReal));
    const flanco0 = this.curvaDeFlanco(
      corteReal,
      suavizacao0,
      this.p1,
      this.p0,
      interseccao1,
      interseccao2,
      this.centro,
      raioReal,
    );
    const flanco1 = this.curvaDeFlanco(
      corteReal,
      suavizacao1,
      this.p1,
      this.p2,
      interseccao2,
      interseccao1,
      this.centro,
      raioReal,
    ).inverter();
    return [
      flanco0,
      Cubica.arcoCircular(
        this.centro[0],
        this.centro[1],
        flanco0.ancora1X,
        flanco0.ancora1Y,
        flanco1.ancora0X,
        flanco1.ancora0Y,
      ),
      flanco1,
    ];
  }

  private suavizacaoReal(corte: number): number {
    if (corte > this.corteEsperado) return this.suavizacao;
    if (corte > this.corteArredondadoEsperado) {
      return (
        (this.suavizacao * (corte - this.corteArredondadoEsperado)) /
        (this.corteEsperado - this.corteArredondadoEsperado)
      );
    }
    return 0;
  }

  private curvaDeFlanco(
    corteReal: number,
    suavizacaoReal: number,
    canto: Ponto,
    inicioDoLado: Ponto,
    interseccao: Ponto,
    outraInterseccao: Ponto,
    centroDoCirculo: Ponto,
    raioReal: number,
  ): Cubica {
    const direcaoDoLado = direcao(menos(inicioDoLado, canto));
    const inicioDaCurva = soma(canto, vezes(vezes(direcaoDoLado, corteReal), 1 + suavizacaoReal));
    const p = interpolarPonto(
      interseccao,
      dividido(soma(interseccao, outraInterseccao), 2),
      suavizacaoReal,
    );
    const fimDaCurva = soma(centroDoCirculo, vezes(direcao(menos(p, centroDoCirculo)), raioReal));
    const tangente = girar90(menos(fimDaCurva, centroDoCirculo));
    const ancoraFinal =
      interseccaoDeRetas(inicioDoLado, direcaoDoLado, fimDaCurva, tangente) ?? interseccao;
    const ancoraInicial = dividido(soma(inicioDaCurva, vezes(ancoraFinal, 2)), 3);
    return Cubica.de(inicioDaCurva, ancoraInicial, ancoraFinal, fimDaCurva);
  }
}

function interseccaoDeRetas(p0: Ponto, d0: Ponto, p1: Ponto, d1: Ponto): Ponto | null {
  const giro = girar90(d1);
  const denominador = produtoEscalar(d0, giro);
  if (Math.abs(denominador) < DISTANCIA_EPSILON) return null;
  const numerador = produtoEscalar(menos(p1, p0), giro);
  if (Math.abs(denominador) < Math.abs(numerador) * DISTANCIA_EPSILON) return null;
  return soma(p0, vezes(d0, numerador / denominador));
}

export type Caracteristica =
  | { tipo: "canto"; cubicas: Cubica[]; vertice: Ponto; centroArredondado: Ponto; convexo: boolean }
  | { tipo: "aresta"; cubicas: Cubica[] };

function transformarCaracteristica(c: Caracteristica, f: Transformador): Caracteristica {
  const cubicas = c.cubicas.map((x) => x.transformada(f));
  if (c.tipo === "aresta") return { tipo: "aresta", cubicas };
  return {
    tipo: "canto",
    cubicas,
    vertice: f(c.vertice[0], c.vertice[1]),
    centroArredondado: f(c.centroArredondado[0], c.centroArredondado[1]),
    convexo: c.convexo,
  };
}

export class PoligonoArredondado {
  readonly cubicas: Cubica[];

  constructor(
    readonly caracteristicas: Caracteristica[],
    readonly centroX: number,
    readonly centroY: number,
  ) {
    // Quando o primeiro canto tem 3 curvas, a do meio é dividida para o contorno não começar numa quina.
    // O contorno começa na segunda metade (do meio da curva do meio) e termina com a primeira.
    let inicioDividido: Cubica[] | null = null;
    let fimDividido: Cubica[] | null = null;
    if (caracteristicas.length > 0 && caracteristicas[0]!.cubicas.length === 3) {
      const c = caracteristicas[0]!.cubicas;
      const [a, b] = c[1]!.dividir(0.5);
      fimDividido = [c[0]!, a];
      inicioDividido = [b, c[2]!];
    }
    const lista: Cubica[] = [];
    let primeira: Cubica | null = null;
    let ultima: Cubica | null = null;
    for (let i = 0; i <= caracteristicas.length; i++) {
      let curvas: Cubica[];
      if (i === 0 && inicioDividido) curvas = inicioDividido;
      else if (i !== caracteristicas.length) curvas = caracteristicas[i]!.cubicas;
      else if (!fimDividido) break;
      else curvas = fimDividido;
      for (const curva of curvas) {
        if (!curva.semComprimento()) {
          if (ultima) lista.push(ultima);
          ultima = curva;
          if (!primeira) primeira = curva;
        } else if (ultima) {
          // Curva sem comprimento: só estica o fim da anterior até ela.
          ultima.pontos[6] = curva.ancora1X;
          ultima.pontos[7] = curva.ancora1Y;
        }
      }
    }
    if (ultima && primeira) {
      lista.push(
        new Cubica([
          ultima.ancora0X,
          ultima.ancora0Y,
          ultima.controle0X,
          ultima.controle0Y,
          ultima.controle1X,
          ultima.controle1Y,
          primeira.ancora0X,
          primeira.ancora0Y,
        ]),
      );
    }
    this.cubicas = lista;
    let anterior = lista[lista.length - 1]!;
    for (const atual of lista) {
      if (
        Math.abs(atual.ancora0X - anterior.ancora1X) > DISTANCIA_EPSILON ||
        Math.abs(atual.ancora0Y - anterior.ancora1Y) > DISTANCIA_EPSILON
      ) {
        throw new Error("RoundedPolygon must be contiguous");
      }
      anterior = atual;
    }
  }

  transformado(f: Transformador): PoligonoArredondado {
    const centro = f(this.centroX, this.centroY);
    return new PoligonoArredondado(
      this.caracteristicas.map((c) => transformarCaracteristica(c, f)),
      centro[0],
      centro[1],
    );
  }

  /** `[minX, minY, maxX, maxY]`. O valor inicial dos máximos é `Float.MIN_VALUE`, como no original. */
  limites(aproximado = true): [number, number, number, number] {
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;
    for (const c of this.cubicas) {
      const [a, b, d, e] = c.limites(aproximado);
      minX = Math.min(minX, a);
      minY = Math.min(minY, b);
      maxX = Math.max(maxX, d);
      maxY = Math.max(maxY, e);
    }
    return [minX, minY, maxX, maxY];
  }

  /** Quadrado centrado no polígono que cobre qualquer giro dele. */
  limitesMaximos(): [number, number, number, number] {
    let maior = 0;
    for (const c of this.cubicas) {
      const meio = c.pontoNaCurva(0.5);
      const d0 = (c.ancora0X - this.centroX) ** 2 + (c.ancora0Y - this.centroY) ** 2;
      const d1 = (meio[0] - this.centroX) ** 2 + (meio[1] - this.centroY) ** 2;
      maior = Math.max(maior, d0, d1);
    }
    const r = Math.sqrt(maior);
    return [this.centroX - r, this.centroY - r, this.centroX + r, this.centroY + r];
  }

  /** Encaixa o polígono num quadrado de lado 1, centrado (`normalized()`). */
  normalizado(): PoligonoArredondado {
    const [minX, minY, maxX, maxY] = this.limites();
    const largura = maxX - minX;
    const altura = maxY - minY;
    const lado = Math.max(largura, altura);
    const dx = (lado - largura) / 2 - minX;
    const dy = (lado - altura) / 2 - minY;
    return this.transformado((x, y) => [(x + dx) / lado, (y + dy) / lado]);
  }
}

/** `RoundedPolygon(vertices, rounding, perVertexRounding, centerX, centerY)`. */
export function poligonoDeVertices(
  vertices: readonly number[],
  arredondamento: Arredondamento = SEM_ARREDONDAR,
  porVertice: ReadonlyArray<Arredondamento | null> | null = null,
  centroX?: number,
  centroY?: number,
): PoligonoArredondado {
  if (vertices.length < 6) throw new Error("Polygons must have at least 3 vertices");
  if (vertices.length % 2 === 1) throw new Error("The vertices array should have even size");
  if (porVertice && porVertice.length * 2 !== vertices.length) {
    throw new Error(
      "perVertexRounding list should be either null or the same size as the number of vertices",
    );
  }
  const n = vertices.length / 2;
  const v = (i: number): Ponto => [vertices[i * 2]!, vertices[i * 2 + 1]!];
  const cantos: CantoArredondado[] = [];
  for (let i = 0; i < n; i++) {
    cantos.push(
      new CantoArredondado(
        v((i + n - 1) % n),
        v(i),
        v((i + 1) % n),
        porVertice?.[i] ?? arredondamento,
      ),
    );
  }
  // Quanto cada lado precisa ceder para caber os dois cantos.
  const ajustes = cantos.map((canto, i) => {
    const seguinte = cantos[(i + 1) % n]!;
    const corteArredondado = canto.corteArredondadoEsperado + seguinte.corteArredondadoEsperado;
    const corte = canto.corteEsperado + seguinte.corteEsperado;
    const a = v(i);
    const b = v((i + 1) % n);
    const lado = distancia(a[0] - b[0], a[1] - b[1]);
    if (corteArredondado > lado) return [lado / corteArredondado, 0] as const;
    if (corte > lado) return [1, (lado - corteArredondado) / (corte - corteArredondado)] as const;
    return [1, 1] as const;
  });
  const curvasDosCantos = cantos.map((canto, i) => {
    const cortes = [0, 1].map((delta) => {
      const [razao, suave] = ajustes[(i + n - 1 + delta) % n]!;
      return (
        canto.corteArredondadoEsperado * razao +
        (canto.corteEsperado - canto.corteArredondadoEsperado) * suave
      );
    });
    return canto.cubicas(cortes[0]!, cortes[1]!);
  });
  const caracteristicas: Caracteristica[] = [];
  for (let i = 0; i < n; i++) {
    const proximo = (i + 1) % n;
    const vertice = v(i);
    caracteristicas.push({
      tipo: "canto",
      cubicas: curvasDosCantos[i]!,
      vertice,
      centroArredondado: cantos[i]!.centro,
      convexo: horario(menos(vertice, v((i + n - 1) % n)), menos(v(proximo), vertice)),
    });
    const ultima = curvasDosCantos[i]![curvasDosCantos[i]!.length - 1]!;
    const primeira = curvasDosCantos[proximo]![0]!;
    caracteristicas.push({
      tipo: "aresta",
      cubicas: [
        Cubica.retaReta(ultima.ancora1X, ultima.ancora1Y, primeira.ancora0X, primeira.ancora0Y),
      ],
    });
  }
  // `calculateCenter` do APK divide a soma dos x por (tamanho do array × 2), não pelo número de pontos.
  let centro: Ponto;
  if (centroX === undefined || centroY === undefined) {
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < vertices.length; i += 2) {
      sx += vertices[i]!;
      sy += vertices[i + 1]!;
    }
    centro = [sx / vertices.length / 2, sy / vertices.length / 2];
  } else {
    centro = [centroX, centroY];
  }
  return new PoligonoArredondado(caracteristicas, centro[0], centro[1]);
}

/** `RoundedPolygon(numVertices, radius, centerX, centerY, rounding)`. */
export function poligonoRegular(
  numVertices: number,
  raio = 1,
  centroX = 0,
  centroY = 0,
  arredondamento: Arredondamento = SEM_ARREDONDAR,
): PoligonoArredondado {
  const vertices: number[] = [];
  for (let i = 0; i < numVertices; i++) {
    const p = soma(radialParaCartesiano(raio, (Math.PI / numVertices) * 2 * i), [centroX, centroY]);
    vertices.push(p[0], p[1]);
  }
  return poligonoDeVertices(vertices, arredondamento, null, centroX, centroY);
}

/** `RoundedPolygon.circle`: polígono de 8 lados cujos cantos têm raio igual ao do círculo. */
export function circulo(numVertices = 8, raio = 1, centroX = 0, centroY = 0): PoligonoArredondado {
  if (numVertices < 3) throw new Error("Circle must have at least three vertices");
  return poligonoRegular(
    numVertices,
    raio / Math.cos(Math.PI / numVertices),
    centroX,
    centroY,
    arredondar(raio),
  );
}

/** `RoundedPolygon.star` sem arredondamento interno separado. */
export function estrela(
  numPontas: number,
  raio: number,
  raioInterno: number,
  arredondamento: Arredondamento,
  centroX = 0,
  centroY = 0,
): PoligonoArredondado {
  if (raio <= 0 || raioInterno <= 0) throw new Error("Star radii must both be greater than 0");
  if (raioInterno >= raio) throw new Error("innerRadius must be less than radius");
  const vertices: number[] = [];
  for (let i = 0; i < numPontas; i++) {
    const externo = radialParaCartesiano(raio, (Math.PI / numPontas) * 2 * i);
    vertices.push(externo[0] + centroX, externo[1] + centroY);
    const interno = radialParaCartesiano(raioInterno, (Math.PI / numPontas) * (i * 2 + 1));
    vertices.push(interno[0] + centroX, interno[1] + centroY);
  }
  return poligonoDeVertices(vertices, arredondamento, null, centroX, centroY);
}
