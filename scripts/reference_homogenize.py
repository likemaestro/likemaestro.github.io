"""Independent NumPy reference for periodic homogenization (Andreassen & Andreasen 2014).

Dense assembly, natural node numbering, its own element integration: shares no code with
src/lab/unitcell.ts. Writes src/lab/__fixtures__/homogenize.json, which the Jest suite compares against.

Usage: python scripts/reference_homogenize.py
"""
import json
import pathlib

import numpy as np

NU = 0.3
N = 8


def element_stiffness(nu, h):
    D = np.array([[1, nu, 0], [nu, 1, 0], [0, 0, (1 - nu) / 2]]) / (1 - nu**2)
    xy = np.array([[0, 0], [h, 0], [h, h], [0, h]], float)
    ke = np.zeros((8, 8))
    g = 1 / np.sqrt(3)
    for xi in (-g, g):
        for eta in (-g, g):
            dN = 0.25 * np.array([[-(1 - eta), (1 - eta), (1 + eta), -(1 + eta)],
                                  [-(1 - xi), -(1 + xi), (1 + xi), (1 - xi)]])
            J = dN @ xy
            dNx = np.linalg.solve(J, dN)
            B = np.zeros((3, 8))
            B[0, 0::2] = dNx[0]
            B[1, 1::2] = dNx[1]
            B[2, 0::2] = dNx[1]
            B[2, 1::2] = dNx[0]
            ke += B.T @ D @ B * np.linalg.det(J)
    return ke, xy


def homogenize(E, n, nu):
    h = 1.0 / n
    ke, xy = element_stiffness(nu, h)
    ndof = 2 * n * n
    K = np.zeros((ndof, ndof))
    F = np.zeros((ndof, 3))
    eps = np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]], float)
    chi0 = np.zeros((8, 3))
    for c in range(3):
        e11, e22, g12 = eps[c]
        for a, (x, y) in enumerate(xy):
            chi0[2 * a, c] = e11 * x + 0.5 * g12 * y
            chi0[2 * a + 1, c] = 0.5 * g12 * x + e22 * y
    dofs = []
    for ey in range(n):
        for ex in range(n):
            nodes = [((ex) % n, ey % n), ((ex + 1) % n, ey % n), ((ex + 1) % n, (ey + 1) % n), (ex % n, (ey + 1) % n)]
            d = []
            for x, y in nodes:
                node = y * n + x
                d += [2 * node, 2 * node + 1]
            e = ey * n + ex
            K[np.ix_(d, d)] += E[e] * ke
            F[d, :] += E[e] * (ke @ chi0)
            dofs.append(d)
    free = np.arange(2, ndof)                     # node 0 fixed
    chi = np.zeros((ndof, 3))
    chi[free] = np.linalg.solve(K[np.ix_(free, free)], F[free])
    C = np.zeros((3, 3))
    for e, d in enumerate(dofs):
        de = chi0 - chi[d, :]
        C += E[e] * de.T @ ke @ de
    return C


def field(kind, n):
    E = np.ones(n * n)
    for ey in range(n):
        for ex in range(n):
            x, y = ex + 0.5 - n / 2, ey + 0.5 - n / 2
            if kind == "square_void" and abs(x) < n / 4 and abs(y) < n / 4:
                E[ey * n + ex] = 1e-3
            if kind == "cross" and abs(x) > 1 and abs(y) > 1:
                E[ey * n + ex] = 1e-3
            if kind == "graded":
                E[ey * n + ex] = 0.05 + 0.9 * ((ex * 7 + ey * 3) % n) / n
    return E


def main():
    cases = []
    for kind in ("square_void", "cross", "graded"):
        E = field(kind, N)
        C = homogenize(E, N, NU)
        cases.append({"name": kind, "E": E.tolist(), "C": C.reshape(-1).tolist()})
    out = pathlib.Path(__file__).resolve().parents[1] / "src" / "lab" / "__fixtures__" / "homogenize.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"n": N, "nu": NU, "cases": cases}, indent=1))
    print("wrote", out)
    for c in cases:
        print(c["name"], np.round(c["C"], 6))


if __name__ == "__main__":
    main()
