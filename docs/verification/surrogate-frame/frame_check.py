# Independent check of src/tools/surrogate-frame/frame.ts (NumPy/SciPy), written separately:
# full global stiffness, rigid floors as explicit constraints with an SVD nullspace, consistent loads by Gauss
# integration of the Hermite shape functions, member moments by statics from the end forces.
# Same building, loads, combinations and screens as the tool; see README.md. Units N, mm.
import sys
import numpy as np
from math import pi, sqrt
from numpy.polynomial.legendre import leggauss

E = 210000.0; G = E / 2.6; FY = 355.0; RHO = 7850e-9; GRAV = RHO * 9.81
NX, NY, SX, SY, H, NS, LOWER = 3, 2, 6000.0, 7500.0, 3600.0, 6, 3
DIMS = {  # h, b, tw, tf, r (EN 10365 nominal)
    "HEB200": (200, 200, 9, 15, 18), "HEB220": (220, 220, 9.5, 16, 18), "HEB240": (240, 240, 10, 17, 21),
    "HEB260": (260, 260, 10, 17.5, 24), "HEB280": (280, 280, 10.5, 18, 24), "HEB300": (300, 300, 11, 19, 27),
    "HEB320": (320, 300, 11.5, 20.5, 27), "HEB340": (340, 300, 12, 21.5, 27), "HEB360": (360, 300, 12.5, 22.5, 27),
    "HEB400": (400, 300, 13.5, 24, 27), "HEB450": (450, 300, 14, 26, 27), "HEB500": (500, 300, 14.5, 28, 27),
    "IPE270": (270, 135, 6.6, 10.2, 15), "IPE300": (300, 150, 7.1, 10.7, 15), "IPE330": (330, 160, 7.5, 11.5, 18),
    "IPE360": (360, 170, 8, 12.7, 18), "IPE400": (400, 180, 8.6, 13.5, 21), "IPE450": (450, 190, 9.4, 14.6, 21),
    "IPE500": (500, 200, 10.2, 16, 21), "IPE550": (550, 210, 11.1, 17.2, 24), "IPE600": (600, 220, 12, 19, 24)}
COLS = [k for k in DIMS if k.startswith("HEB")]; BEAMS = [k for k in DIMS if k.startswith("IPE")]

def props(name):
    h, b, tw, tf, r = DIMS[name]
    a = (1 - pi/4)*r*r; c = r*(10 - 3*pi)/(12 - 3*pi); aq = pi*r*r/4; e = 4*r/(3*pi)
    Ic = r**4/3 - (pi*r**4/16 - aq*e*e + aq*(r - e)**2) - a*c*c
    hw = h - 2*tf; zf = h/2 - tf - c; yf = tw/2 + c
    A = 2*b*tf + hw*tw + 4*a
    Iy = (b*h**3 - (b - tw)*hw**3)/12 + 4*(Ic + a*zf*zf)
    Iz = (2*tf*b**3 + hw*tw**3)/12 + 4*(Ic + a*yf*yf)
    Wpl = 2*(b*tf*(h - tf)/2 + tw*hw*hw/8 + 2*a*zf)
    Wplz = tf*b*b/2 + hw*tw*tw/4 + 4*a*yf
    Avz = max(A - 2*b*tf + (tw + 2*r)*tf, hw*tw)
    D = ((r + tw/2)**2 + (r + tf)**2 - r*r)/(2*r + tf)
    It = 2/3*(b - 0.63*tf)*tf**3 + hw*tw**3/3 + 2*(tw/tf)*(0.145 + 0.1*r/tf)*D**4
    return dict(A=A, Iy=Iy, Iz=Iz, It=It, Wpl=Wpl, Wplz=Wplz, Avz=Avz)

# geometry
per = (NX + 1)*(NY + 1); xc, yc = NX*SX/2, NY*SY/2
nodes = np.array([[ix*SX, iy*SY, k*H] for k in range(NS + 1) for iy in range(NY + 1) for ix in range(NX + 1)])
nid = lambda k, ix, iy: k*per + ix + (NX + 1)*iy
mem = []  # (i, j, kind, group, level)
for k in range(NS):
    for iy in range(NY + 1):
        for ix in range(NX + 1): mem.append((nid(k, ix, iy), nid(k + 1, ix, iy), "col", 0 if k < LOWER else 1, k + 1))
for k in range(1, NS + 1):
    for iy in range(NY + 1):
        for ix in range(NX): mem.append((nid(k, ix, iy), nid(k, ix + 1, iy), "bx", 2, k))
    for ix in range(NX + 1):
        for iy in range(NY): mem.append((nid(k, ix, iy), nid(k, ix, iy + 1), "by", 2, k))

def lam(kind, i, j):
    d = nodes[j] - nodes[i]; L = np.linalg.norm(d); ex = d/L
    # web orientation by a reference vector in the local x-z plane: Z for beams, Y for columns
    ref = np.array([0, 1.0, 0]) if kind == "col" else np.array([0, 0, 1.0])
    ez = ref - ex*(ref @ ex); ez /= np.linalg.norm(ez); ey = np.cross(ez, ex)
    return L, np.array([ex, ey, ez])

def klocal(p, L):
    k = np.zeros((12, 12)); EA = E*p["A"]/L; GJ = G*p["It"]/L
    k[np.ix_([0, 6], [0, 6])] = EA*np.array([[1, -1], [-1, 1]])
    k[np.ix_([3, 9], [3, 9])] = GJ*np.array([[1, -1], [-1, 1]])
    for I, idx, s in ((p["Iz"], [1, 5, 7, 11], 1), (p["Iy"], [2, 4, 8, 10], -1)):
        f = E*I/L**3
        k[np.ix_(idx, idx)] = f*np.array([[12, 6*L*s, -12, 6*L*s], [6*L*s, 4*L*L, -6*L*s, 2*L*L],
                                          [-12, -6*L*s, 12, -6*L*s], [6*L*s, 2*L*L, -6*L*s, 4*L*L]])
    return k

def pload(qloc, L):
    """Consistent local nodal loads by 6-point Gauss integration of the shape functions."""
    xs, ws = leggauss(6); f = np.zeros(12)
    for x0, w0 in zip(xs, ws):
        t = (x0 + 1)/2; wt = w0*L/2
        N = [1 - t, t]; H = [1 - 3*t*t + 2*t**3, L*(t - 2*t*t + t**3), 3*t*t - 2*t**3, L*(t**3 - t*t)]
        f[[0, 6]] += wt*qloc[0]*np.array(N)
        f[[1, 5, 7, 11]] += wt*qloc[1]*np.array(H)                       # slope = +rz
        f[[2, 4, 8, 10]] += wt*qloc[2]*np.array([H[0], -H[1], H[2], -H[3]])  # slope = −ry
    return f

def run(cL, cU, bm, qp=0.9, gk=4.0, qk=3.0, lim=300):
    secs = [props(COLS[cL]), props(COLS[cU]), props(BEAMS[bm])]
    nn = len(nodes); nm = 3*NS; N = 6*nn + nm
    K = np.zeros((N, N)); Fs = np.zeros((7, N)); qG = []; qQ = []; geo = []
    for (i, j, kind, g, lev) in mem:
        p = secs[g]; L, R = lam(kind, i, j); geo.append((L, R))
        T = np.kron(np.eye(4), R); dof = list(range(6*i, 6*i + 6)) + list(range(6*j, 6*j + 6))
        K[np.ix_(dof, dof)] += T.T @ klocal(p, L) @ T
        wG = GRAV*p["A"]; wQ = 0.0
        if kind == "by":
            ix = round(nodes[i][0]/SX); width = SX/2 if ix in (0, NX) else SX
            wG += gk*1e-3*width
            if lev < NS: wQ = qk*1e-3*width
        qG.append(np.array([0, 0, -wG])); qQ.append(np.array([0, 0, -wQ]))
        Fs[0, dof] += T.T @ pload(R @ qG[-1], L); Fs[1, dof] += T.T @ pload(R @ qQ[-1], L)
    # vertical load arriving at each level, imperfection and wind at the masters
    VG = np.zeros(NS + 1); VQ = np.zeros(NS + 1)
    for k in range(NS + 1):
        VG[k] = -Fs[0, [6*(k*per + g) + 2 for g in range(per)]].sum(); VQ[k] = -Fs[1, [6*(k*per + g) + 2 for g in range(per)]].sum()
    phi = 1/200*min(1, max(2/3, 2/sqrt(NS*H/1000)))*sqrt(0.5*(1 + 1/(NY + 1)))
    mdof = lambda k, a: 6*nn + 3*(k - 1) + a
    for k in range(1, NS + 1):
        hk = H if k < NS else H/2
        Fs[2, mdof(k, 1)] += 1.3*qp*1e-3*NX*SX*hk
        Fs[3, mdof(k, 1)] += phi*VG[k]; Fs[4, mdof(k, 1)] += phi*VQ[k]
        Fs[5, mdof(k, 0)] += phi*VG[k]; Fs[6, mdof(k, 0)] += phi*VQ[k]
    # constraints: fixed bases and rigid floors
    rows = []
    for g in range(per):
        for a in range(6): r = np.zeros(N); r[6*g + a] = 1; rows.append(r)
    for k in range(1, NS + 1):
        for g in range(per):
            nd = k*per + g; x, y = nodes[nd][:2]
            r = np.zeros(N); r[6*nd] = 1; r[mdof(k, 0)] = -1; r[mdof(k, 2)] = (y - yc); rows.append(r)
            r = np.zeros(N); r[6*nd + 1] = 1; r[mdof(k, 1)] = -1; r[mdof(k, 2)] = -(x - xc); rows.append(r)
    C = np.array(rows); _, s, vt = np.linalg.svd(C); T = vt[len(rows):].T
    Kr = T.T @ K @ T; U = np.linalg.solve(Kr, T.T @ Fs.T); U = (T @ U).T   # global displacements per case

    def forces(e, u, q):
        i, j, kind, g, lev = mem[e]; L, R = geo[e]; p = secs[g]; Tm = np.kron(np.eye(4), R)
        dof = list(range(6*i, 6*i + 6)) + list(range(6*j, 6*j + 6)); ql = R @ q
        f = klocal(p, L) @ (Tm @ u[dof]) - pload(ql, L)   # end forces on the member, local
        xs = np.linspace(0, L, 201)
        My = np.abs(f[4] + xs*f[2] + ql[2]*xs*xs/2).max()      # statics on the segment [0, x]
        Mz = np.abs(f[5] - xs*f[1] - ql[1]*xs*xs/2).max()
        return dict(N0=-f[0], N1=f[6], My=My, Mz=Mz, Vz=max(abs(f[2]), abs(f[8])))
    combos = [((1.35, 1.5), 0.9), ((1.35, 1.05), 1.5)]
    acrY = acrX = np.inf; util = np.zeros(len(mem)); amps = []
    for (gG, gQ), w in combos:
        grav = gG*U[0] + gQ*U[1]; hy = w*U[2] + gG*U[3] + gQ*U[4]; hx = gG*U[5] + gQ*U[6]
        Hy = np.array([sum(w*Fs[2, mdof(j, 1)] + gG*Fs[3, mdof(j, 1)] + gQ*Fs[4, mdof(j, 1)] for j in range(k, NS + 1)) for k in range(1, NS + 1)])
        Hx = np.array([sum(gG*Fs[5, mdof(j, 0)] + gQ*Fs[6, mdof(j, 0)] for j in range(k, NS + 1)) for k in range(1, NS + 1)])
        V = np.zeros(NS)
        for e, (i, j, kind, g, lev) in enumerate(mem):
            if kind == "col": V[lev - 1] += -forces(e, grav, gG*qG[e] + gQ*qQ[e])["N0"]
        def horne(u, a, Hs):
            d = [u[mdof(k, a)] - (u[mdof(k - 1, a)] if k > 1 else 0) for k in range(1, NS + 1)]
            return min(Hs[s]/V[s]*H/abs(d[s]) for s in range(NS))
        ay = horne(hy, 1, Hy); ax = horne(hx, 0, Hx); acrY = min(acrY, ay); acrX = min(acrX, ax)
        amp = 1/(1 - 1/ay) if 3 <= ay < 10 else 1.0; amps.append(amp)
        uu = grav + amp*hy
        for e, (i, j, kind, g, lev) in enumerate(mem):
            f = forces(e, uu, gG*qG[e] + gQ*qQ[e]); s = secs[g]
            if kind == "col":
                Npl = s["A"]*FY; Nc = max(0, -min(f["N0"], f["N1"])); Nt = max(0, f["N0"], f["N1"])
                chis = []
                for I, al in ((s["Iy"], 0.34), (s["Iz"], 0.49)):
                    lb = sqrt(Npl/(pi**2*E*I/H**2))
                    if lb <= 0.2: chis.append(1.0); continue
                    ph = 0.5*(1 + al*(lb - 0.2) + lb*lb); chis.append(min(1, 1/(ph + sqrt(ph*ph - lb*lb))))
                r = max(Nc/(min(chis)*Npl), Nt/Npl) + f["My"]/(s["Wpl"]*FY) + f["Mz"]/(s["Wplz"]*FY)
            else:
                r = max(f["My"]/(s["Wpl"]*FY), f["Vz"]/(s["Avz"]*FY/sqrt(3)))
            util[e] = max(util[e], r)
    uy = [0] + [U[2][mdof(k, 1)] for k in range(1, NS + 1)]
    drift = max(abs(uy[k + 1] - uy[k])/H for k in range(NS))
    grp = lambda gg: max(util[e] for e, m in enumerate(mem) if m[3] == gg)
    mass = sum(secs[m[3]]["A"]*geo[e][0]*RHO for e, m in enumerate(mem))/1000
    return dict(drift=drift, uCL=grp(0), uCU=grp(1), uB=grp(2), acrY=acrY, acrX=acrX, mass=mass, amp=amps)

if __name__ == "__main__":
    for d in ((5, 2, 4), (0, 0, 0), (11, 11, 8), (5, 1, 3), (3, 6, 2)):
        r = run(*d)
        print(f"{COLS[d[0]]} {COLS[d[1]]} {BEAMS[d[2]]}: drift 1/{1/r['drift']:.1f} uCL {r['uCL']:.4f} uCU {r['uCU']:.4f} "
              f"uB {r['uB']:.4f} acrY {r['acrY']:.3f} acrX {r['acrX']:.3f} amp {r['amp'][0]:.3f},{r['amp'][1]:.3f} mass {r['mass']:.3f} t")
