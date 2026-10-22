/**
 * As sete formas do indicador de carregamento do Material 3 (`MaterialShapes` no APK) na ordem de
 * `LoadingIndicatorDefaults.IndeterminateIndicatorPolygons`: soft burst, cookie 9, pentágono, pílula,
 * sunny, cookie 4 e oval. Os números vêm do código descompilado; todas passam por `normalized()`.
 */
import {
  arredondar,
  circulo,
  estrela,
  poligonoDeVertices,
  type Arredondamento,
  type PoligonoArredondado,
} from "./poligono";
import type { Ponto } from "./geometria";

type PontoEArredondamento = { p: Ponto; r: Arredondamento | null };
const pr = (x: number, y: number, r: Arredondamento | null = null): PontoEArredondamento => ({
  p: [x, y],
  r,
});

const paraRadianos = (graus: number) => (graus / 360) * 2 * Math.PI;
const anguloEmGraus = (p: Ponto) => (Math.atan2(p[1], p[0]) * 180) / Math.PI;

function girarGraus(p: Ponto, graus: number, centro: Ponto = [0, 0]): Ponto {
  const a = paraRadianos(graus);
  const x = p[0] - centro[0];
  const y = p[1] - centro[1];
  return [
    x * Math.cos(a) - y * Math.sin(a) + centro[0],
    x * Math.sin(a) + y * Math.cos(a) + centro[1],
  ];
}

/** `MaterialShapes.doRepeat`: repete (e, com `espelhar`, espelha) os pontos em volta do centro. */
function repetir(pontos: PontoEArredondamento[], vezes: number, centro: Ponto, espelhar: boolean) {
  const resultado: PontoEArredondamento[] = [];
  if (espelhar) {
    const angulos = pontos.map((x) => anguloEmGraus([x.p[0] - centro[0], x.p[1] - centro[1]]));
    const distancias = pontos.map((x) => Math.hypot(x.p[0] - centro[0], x.p[1] - centro[1]));
    const secoes = vezes * 2;
    const angulodaSecao = 360 / secoes;
    for (let it = 0; it < secoes; it++) {
      for (let index = 0; index < pontos.length; index++) {
        const i = it % 2 === 0 ? index : pontos.length - 1 - index;
        if (i > 0 || it % 2 === 0) {
          const base = it % 2 === 0 ? angulos[i]! : angulodaSecao - angulos[i]! + 2 * angulos[0]!;
          const a = paraRadianos(angulodaSecao * it + base);
          resultado.push({
            p: [Math.cos(a) * distancias[i]! + centro[0], Math.sin(a) * distancias[i]! + centro[1]],
            r: pontos[i]!.r,
          });
        }
      }
    }
    return resultado;
  }
  const n = pontos.length;
  for (let i = 0; i < n * vezes; i++) {
    const x = pontos[i % n]!;
    resultado.push({ p: girarGraus(x.p, (Math.floor(i / n) * 360) / vezes, centro), r: x.r });
  }
  return resultado;
}

function personalizado(
  pontos: PontoEArredondamento[],
  vezes: number,
  espelhar: boolean,
): PoligonoArredondado {
  const centro: Ponto = [0.5, 0.5];
  const lista = repetir(pontos, vezes, centro, espelhar);
  return poligonoDeVertices(
    lista.flatMap((x) => [x.p[0], x.p[1]]),
    undefined,
    lista.map((x) => x.r),
    centro[0],
    centro[1],
  );
}

const girarPoligono = (poligono: PoligonoArredondado, graus: number) =>
  poligono.transformado((x, y) => girarGraus([x, y], graus));

const softBurst = () =>
  personalizado(
    [pr(0.193, 0.277, arredondar(0.053)), pr(0.176, 0.055, arredondar(0.053))],
    10,
    false,
  ).normalizado();

const cookie9 = () => girarPoligono(estrela(9, 1, 0.8, arredondar(0.5)), -90).normalizado();

const pentagono = () =>
  personalizado(
    [
      pr(0.5, -0.009, arredondar(0.172)),
      pr(1.03, 0.365, arredondar(0.164)),
      pr(0.828, 0.97, arredondar(0.169)),
    ],
    1,
    true,
  ).normalizado();

const pilula = () =>
  personalizado(
    [pr(0.961, 0.039, arredondar(0.426)), pr(1.001, 0.428), pr(1.0, 0.609, arredondar(1))],
    2,
    true,
  ).normalizado();

const sunny = () => estrela(8, 1, 0.8, arredondar(0.15)).normalizado();

const cookie4 = () =>
  personalizado(
    [pr(1.237, 1.236, arredondar(0.258)), pr(0.5, 0.918, arredondar(0.233))],
    4,
    false,
  ).normalizado();

const oval = () =>
  girarPoligono(
    circulo().transformado((x, y) => [x, y * 0.64]),
    -45,
  ).normalizado();

let cache: PoligonoArredondado[] | null = null;

/** Formas do indicador indeterminado, na ordem do APK. */
export function formasDoIndicador(): PoligonoArredondado[] {
  cache ??= [softBurst(), cookie9(), pentagono(), pilula(), sunny(), cookie4(), oval()];
  return cache;
}

/** `calculateScaleFactor`: o quanto a forma pode crescer sem sair do quadrado ao girar. */
export function fatorDeEscala(formas: PoligonoArredondado[]): number {
  let fator = 1;
  for (const forma of formas) {
    const [a, b, c, d] = forma.limites(true);
    const [ma, mb, mc, md] = forma.limitesMaximos();
    fator = Math.min(fator, Math.max((c - a) / (mc - ma), (d - b) / (md - mb)));
  }
  return fator;
}
