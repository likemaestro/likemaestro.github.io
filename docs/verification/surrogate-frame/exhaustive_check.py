# Exhaustive search of all 1,296 catalog designs with the independent NumPy model (frame_check.py), h/300, default loads.
import os, time, importlib.util
spec = importlib.util.spec_from_file_location("fc", os.path.join(os.path.dirname(os.path.abspath(__file__)), "frame_check.py"))
fc = importlib.util.module_from_spec(spec); spec.loader.exec_module(fc)
t0 = time.time(); best = None; nf = 0
for a in range(12):
    for b in range(12):
        for c in range(9):
            r = fc.run(a, b, c)
            if r["drift"] <= 1/300 and r["uCL"] <= 1 and r["uCU"] <= 1 and r["uB"] <= 1 and min(r["acrY"], r["acrX"]) >= 3:
                nf += 1
                if best is None or r["mass"] < best[0]: best = (r["mass"], (a, b, c))
    print(f"cL {a} done, {time.time()-t0:.0f} s", flush=True)
print(f"NumPy exhaustive: feasible {nf} of 1296; optimum {fc.COLS[best[1][0]]} {fc.COLS[best[1][1]]} {fc.BEAMS[best[1][2]]} {best[0]:.3f} t; {time.time()-t0:.0f} s")
