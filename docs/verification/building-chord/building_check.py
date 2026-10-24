# Independent check of src/tools/building-chord/building.ts (NumPy/SciPy): the storey stiffness from the explicit sums
# Kx = Σkx, Ky = Σky, Kθ = Σ(kx y² + ky x²), Kxθ = −Σ kx y, Kyθ = Σ ky x; masses as in the tool; scipy.linalg.eigh(K, M).
import numpy as np
from math import pi, sqrt
from scipy.linalg import eigh

E = 210e9; H = 3.6; SPAN = 6.0; GK, QK = 4.0, 3.0; AREA = 144.0; ALPHA = 0.0015
def iz_iy(h, b, tw, tf, r):   # mm → m⁴, same nominal-dimension formulas as the site's sections module
    a = (1 - pi/4)*r*r; c = r*(10 - 3*pi)/(12 - 3*pi); aq = pi*r*r/4; e = 4*r/(3*pi)
    Ic = r**4/3 - (pi*r**4/16 - aq*e*e + aq*(r - e)**2) - a*c*c; hw = h - 2*tf
    Iy = (b*h**3 - (b - tw)*hw**3)/12 + 4*(Ic + a*(h/2 - tf - c)**2)
    Iz = (2*tf*b**3 + hw*tw**3)/12 + 4*(Ic + a*(tw/2 + c)**2)
    return Iz*1e-12, Iy*1e-12
HEB260 = iz_iy(260, 260, 10, 17.5, 24); HEB220 = iz_iy(220, 220, 9.5, 16, 18)
LINES = [(-6 + 6*((k - 1) % 3), -6 + 6*((k - 1)//3)) for k in range(1, 10)]
A_BRACE = pi/4*(139.7**2 - 123.7**2)*1e-6; LD = sqrt(SPAN**2 + H**2); KB = 2*E*A_BRACE*(SPAN/LD)**2/LD
BAYS = [("x", -3, 0), ("x", 3, 0), ("y", 0, -3), ("y", 0, 3)]

def freqs(n, sys="moment", T=15, occ=0.3, dmg=None):
    t = 1 - ALPHA*(T - 15); N = 3*n; K = np.zeros((N, N)); M = np.zeros((N, N))
    for j in range(1, n + 1):
        Iz, Iy = HEB260 if j <= 3 else HEB220
        sp = []
        for k, (x, y) in enumerate(LINES, 1):
            f = 1 - dmg[3] if dmg and dmg[0] == "c" and dmg[1] == j and dmg[2] == k else 1
            sp.append((x, y, f*t*12*E*Iz/H**3, f*t*12*E*Iy/H**3))
        if sys == "braced":
            for i, (d, x, y) in enumerate(BAYS, 1):
                f = 1 - dmg[3] if dmg and dmg[0] == "b" and dmg[1] == j and dmg[2] == i else 1
                sp.append((x, y, f*t*KB if d == "x" else 0, f*t*KB if d == "y" else 0))
        kx = sum(s[2] for s in sp); ky = sum(s[3] for s in sp)
        kt = sum(s[2]*s[1]**2 + s[3]*s[0]**2 for s in sp)
        kxt = -sum(s[2]*s[1] for s in sp); kyt = sum(s[3]*s[0] for s in sp)
        Ks = np.array([[kx, 0, kxt], [0, ky, kyt], [kxt, kyt, kt]])
        r = 3*(j - 1); K[r:r+3, r:r+3] += Ks
        if j > 1:
            q = 3*(j - 2); K[q:q+3, q:q+3] += Ks; K[q:q+3, r:r+3] -= Ks; K[r:r+3, q:q+3] -= Ks
        m = 1000*(GK + (occ*QK if j < n else 0))*AREA/9.81
        M[r, r] = M[r+1, r+1] = m; M[r+2, r+2] = m*(12**2 + 12**2)/12
    w2 = eigh(K, M, eigvals_only=True)
    return np.sqrt(np.maximum(w2, 0))/(2*pi)

if __name__ == "__main__":
    for label, args in (("moment, 6 storeys", (6,)), ("braced, 6 storeys", (6, "braced")), ("moment, c1-4 at 70 %", (6, "moment", 15, 0.3, ("c", 1, 4, 0.7))),
                        ("braced, b2-3 at 50 %", (6, "braced", 15, 0.3, ("b", 2, 3, 0.5))), ("moment, 30 °C, occupancy 0.6", (6, "moment", 30, 0.6)), ("moment, 4 storeys", (4,))):
        print(f"{label}: " + " ".join(f"{f:.6f}" for f in freqs(*args)[:9]))
