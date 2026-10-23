# Independent check (NumPy/SciPy): LTB of a fork-supported doubly symmetric beam, Hermite FE.
# Coupling sign derived from sigma = -M z / Iy (sagging M > 0, z up), u_flange = v - z*phi:
#   Pi2 = 1/2 Int(EIz v''^2 + GIt phi'^2 + EIw phi''^2) - Int M v'' phi - 1/2 Int q zg phi^2 - 1/2 P zg phi(xP)^2
import sys, json
import numpy as np
from scipy.linalg import eigh
from numpy.polynomial.legendre import leggauss
from math import pi, sqrt

E = 210000.0; G = E / 2.6

def iprops(h, b, tw, tf, r):
    a = (1 - pi/4)*r*r; c = r*(10 - 3*pi)/(12 - 3*pi); aq = pi*r*r/4; e = 4*r/(3*pi)
    Ic = r**4/3 - (pi*r**4/16 - aq*e*e + aq*(r - e)**2) - a*c*c
    hw = h - 2*tf; yf = tw/2 + c
    Iz = (2*tf*b**3 + hw*tw**3)/12 + 4*(Ic + a*yf*yf)
    D = ((r + tw/2)**2 + (r + tf)**2 - r*r)/(2*r + tf)
    It = 2/3*(b - 0.63*tf)*tf**3 + hw*tw**3/3 + 2*(tw/tf)*(0.145 + 0.1*r/tf)*D**4
    Iw = Iz*(h - tf)**2/4
    return Iz, It, Iw

def fe(Iz, It, Iw, L, load, zg=0.0, n=40, restr=(), ztop=0.0, sign=+1):
    nd = 4*(n + 1); K = np.zeros((nd, nd)); Kg = np.zeros((nd, nd)); le = L/n
    xg, wg = leggauss(5)
    P = 1000.0
    for i in range(n):
        ds = np.arange(4*i, 4*i + 8)
        for x0, w0 in zip(xg, wg):
            t = (x0 + 1)/2; x = (i + t)*le; wt = w0*le/2
            H = np.array([1 - 3*t*t + 2*t**3, le*(t - 2*t*t + t**3), 3*t*t - 2*t**3, le*(-t*t + t**3)])
            Hp = np.array([(-6*t + 6*t*t)/le, 1 - 4*t + 3*t*t, (6*t - 6*t*t)/le, -2*t + 3*t*t])
            Hpp = np.array([(-6 + 12*t)/le**2, (-4 + 6*t)/le, (6 - 12*t)/le**2, (-2 + 6*t)/le])
            def emb(h, off):
                v = np.zeros(8); v[[off, off + 1, off + 4, off + 5]] = h; return v
            Bv, Np, Tp, Wp = emb(Hpp, 0), emb(H, 2), emb(Hp, 2), emb(Hpp, 2)
            if load == 'moment': M, q = 1e6, 0.0
            elif load == 'udl': q = 1.0; M = q*x*(L - x)/2
            else: q = 0.0; M = P*min(x, L - x)/2
            K[np.ix_(ds, ds)] += wt*(E*Iz*np.outer(Bv, Bv) + G*It*np.outer(Tp, Tp) + E*Iw*np.outer(Wp, Wp))
            Kg[np.ix_(ds, ds)] += wt*(sign*M*(np.outer(Bv, Np) + np.outer(Np, Bv)) + q*zg*np.outer(Np, Np))
    if load == 'point': Kg[4*(n//2) + 2, 4*(n//2) + 2] += P*zg
    Mmax = {'moment': 1e6, 'udl': L*L/8, 'point': P*L/4}[load]
    # constraint matrix rows: fork ends v = phi = 0, restraints
    rows = []
    def row(entries):
        r_ = np.zeros(nd)
        for k, c in entries: r_[k] = c
        rows.append(r_)
    for k in (0, n):
        row([(4*k, 1)]); row([(4*k + 2, 1)])
    for (frac, kind) in restr:
        k = int(round(frac*n))
        if kind == 'full': row([(4*k, 1)]); row([(4*k + 2, 1)])
        elif kind == 'top': row([(4*k, 1), (4*k + 2, -ztop)])
        elif kind == 'bottom': row([(4*k, 1), (4*k + 2, +ztop)])
    C = np.array(rows)
    # nullspace by SVD (different route from the browser code)
    u, s, vt = np.linalg.svd(C)
    T = vt[len(rows):].T
    A = T.T @ K @ T; B = T.T @ Kg @ T
    mu, X = eigh(B, A)   # B x = mu A x
    j = np.argmax(mu); lam = 1/mu[j]; d = T @ X[:, j]
    return lam*Mmax, d

def uniform(Iz, It, Iw, L):
    return (pi/L)*sqrt(E*Iz*G*It)*sqrt(1 + pi*pi*E*Iw/(L*L*G*It))

if __name__ == "__main__":
    h, b, tw, tf, r = 300, 150, 7.1, 10.7, 15
    Iz, It, Iw = iprops(h, b, tw, tf, r); L = 6000; zt = (h - tf)/2
    M0 = uniform(Iz, It, Iw, L)
    print("IPE 300 Iz It Iw", Iz, It, Iw, "kappa", E*Iw/(G*It*L*L))
    print("closed form uniform moment kNm", M0/1e6)
    out = {}
    for load in ('moment', 'udl', 'point'):
        for name, zg in (('top', h/2), ('centre', 0.0), ('bottom', -h/2)):
            if load == 'moment' and name != 'centre': continue
            m, d = fe(Iz, It, Iw, L, load, zg)
            out[f"{load}-{name}"] = m/1e6
            print(f"{load:6s} {name:6s} Mcr = {m/1e6:9.4f} kNm  ratio {m/M0:.4f}")
    m, d = fe(Iz, It, Iw, L, 'udl')
    v = d[0::4]; ph = d[2::4]
    ut = v - zt*ph; ub = v + zt*ph
    print("sagging udl mode: max|u_top| =", abs(ut).max(), " max|u_bot| =", abs(ub).max(), "(compression flange should move more)")
    for kind in ('top', 'bottom', 'full'):
        m, _ = fe(Iz, It, Iw, L, 'udl', 0.0, restr=[(0.5, kind)], ztop=zt)
        print(f"udl centre, midspan {kind:6s} restraint: Mcr = {m/1e6:.4f}")
    m, _ = fe(Iz, It, Iw, L, 'moment', 0.0, restr=[(0.5, 'full')], ztop=zt)
    print("moment, midspan full restraint:", m/1e6, " closed form at L/2:", uniform(Iz, It, Iw, L/2)/1e6)
    m40, _ = fe(Iz, It, Iw, L, 'udl', h/2, n=40); m80, _ = fe(Iz, It, Iw, L, 'udl', h/2, n=80)
    print("mesh udl top: n40", m40/1e6, "n80", m80/1e6, "diff %", (m40/m80 - 1)*100)
    # reversed coupling sign: same unrestrained Mcr, but which flange does the 'top' restraint hold?
    for sgn in (+1, -1):
        mt, _ = fe(Iz, It, Iw, L, 'udl', 0.0, restr=[(0.5, 'top')], ztop=zt, sign=sgn)
        print(f"coupling sign {sgn:+d}: midspan top-flange restraint Mcr = {mt/1e6:.4f}")
    # kappa -> 0 limit: tiny Iw
    for load, ref in (('udl', 1.127), ('point', 1.348)):
        for Iwx in (Iw, Iw*1e-6):
            m, _ = fe(Iz, It, Iwx, L, load, 0.0, n=80)
            print(f"{load} kappa={E*Iwx/(G*It*L*L):.2e}: ratio {m/uniform(Iz, It, Iwx, L):.4f} (SN003 kappa=0: {ref})")
