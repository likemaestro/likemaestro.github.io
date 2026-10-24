// Latin hypercube sampling (McKay, Beckman and Conover 1979): n points in [0, 1)^d with one point in each of the n
// equal strata of every dimension.
import { shuffle, type Rng } from "../rng";

export function lhs(n: number, d: number, rng: Rng): number[][] {
  const cols = Array.from({ length: d }, () => shuffle(rng, Array.from({ length: n }, (_, i) => i)));
  return Array.from({ length: n }, (_, i) => cols.map((c) => (c[i] + rng()) / n));
}
