"""Carbon factors for the embodied-carbon calculator, from ÖKOBAUDAT (EN 15804+A2) by dataset UUID.

    python3 -I scripts/carbon-factors.py CACHE_DIR      (CACHE_DIR keeps the downloaded datasets, outside the repository)

Reads scripts/carbon-factors.config.json and writes src/tools/carbon/carbon-factors.json. Per kg of product:
a1a3 = GWP-fossil + GWP-luluc (A1-A3); biogenic = GWP-biogenic (A1-A3); c3c4 and d = GWP-total of C3 + C4 and of D, in
the dataset's default end-of-life scenario. The mass of one declared unit comes from the EPD's own text ("1 t"), else
the density (m³) or the mass per area (m²); the data's "conversion factor to 1 kg" is used both ways, so it is not read.
"""
import json, os, re, sys, urllib.request

API = "https://oekobaudat.de/OEKOBAU.DAT/resource/processes/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GWP = {"6a37f984-a4b3-458a-a20a-64418c145fa2": "total", "5f635281-343e-44fb-83df-1971b155e6b6": "fossil",
       "2356e1ab-0185-4db5-86e5-16de51c7485c": "biogenic", "4331bbdb-978a-490d-8707-eeb047f01a55": "luluc"}

def fetch(cache, uuid, fmt):
    path = os.path.join(cache, f"{uuid}.{fmt.lower()}")
    if not os.path.exists(path):
        url = API + uuid + ("?format=JSON&view=extended" if fmt == "JSON" else "?format=XML")
        with urllib.request.urlopen(url, timeout=90) as r, open(path, "wb") as f: f.write(r.read())
    return open(path, encoding="utf-8").read()

def text(v, lang="en"):
    if isinstance(v, list):
        return next((x.get("value", "") for x in v if x.get("lang") == lang), v[0].get("value", "") if v else "")
    return v or ""

def factor(cache, cfg):
    uuid = cfg["uuid"]
    j, x = json.loads(fetch(cache, uuid, "JSON")), fetch(cache, uuid, "XML")
    pi = j["processInformation"]
    ref = next(e for e in j["exchanges"]["exchange"] if e.get("referenceFlow"))
    amount = ref.get("resultingflowAmount")
    unit = next((p.get("referenceUnit") for p in ref.get("flowProperties", []) if p.get("referenceFlowProperty")), "")
    props = {m["name"]: float(m["value"]) for m in ref.get("materialProperties", []) if re.fullmatch(r"-?[\d.]+(E-?\d+)?", str(m.get("value", "")), re.I)}
    density = props.get("gross density")
    du = " ".join(re.findall(r"(?:[Dd]eclared unit|[Dd]eklarierte Einheit)[^<]{0,200}", x))
    if re.search(r"\b1\s?(t|ton|tonne|Tonne)\b|1[ .,]?000\s?kg", du): mass = 1000.0
    elif unit in ("m3", "m^3"): mass = density
    elif unit in ("qm", "m2", "m^2"): mass = props.get("grammage")
    elif unit == "kg": mass = amount
    else: raise ValueError(f"{uuid}: no mass for the declared unit {amount} {unit}")
    default = (re.findall(r'<epd:scenario epd:name="([^"]+)"[^>]*epd:default="true"', x) or [None])[0]
    res = {}
    for r in j["LCIAResults"]["LCIAResult"]:
        k = GWP.get(r["referenceToLCIAMethodDataSet"].get("refObjectId"))
        if k:
            vals = {}
            for a in r.get("other", {}).get("anies", []):
                if "module" in a and a.get("value") not in (None, ""): vals[(a["module"], a.get("scenario"))] = float(a["value"])
            res[k] = vals
    def get(k, m):
        v = res.get(k, {})
        for key in ((m, default), (m, None)):
            if key in v: return v[key]
        c = [val for (mm, _), val in v.items() if mm == m]
        if len(c) == 1: return c[0]
        if m == "A1-A3":
            parts = [get(k, mm) for mm in ("A1", "A2", "A3")]
            if any(p is not None for p in parts): return sum(p or 0 for p in parts)
        return None
    kg = lambda v: None if v is None else v / mass
    a1a3 = kg(get("fossil", "A1-A3") + (get("luluc", "A1-A3") or 0))
    c3, c4 = get("total", "C3"), get("total", "C4")
    t = pi.get("time", {})
    owner = text(j.get("administrativeInformation", {}).get("publicationAndOwnership", {}).get("referenceToOwnershipOfDataSet", {}).get("shortDescription"))
    lic = (re.findall(r"<common:licenseType>([^<]*)", x) or [""])[0]
    out = {"id": cfg["id"], "label": cfg["label"], "group": cfg["group"], "unit": "kg", "density": density,
           "a1a3": round(a1a3, 6), "wasteRate": cfg["wasteRate"],
           "source": {"name": text(pi["dataSetInformation"]["name"]["baseName"]), "owner": owner, "uuid": uuid,
                      "version": j.get("version", ""), "referenceYear": t.get("referenceYear"), "validUntil": t.get("dataSetValidUntil"),
                      "geography": pi.get("geography", {}).get("locationOfOperationSupplyOrProduction", {}).get("location", ""),
                      "declaredUnit": f"{amount:g} {unit}", "kgPerDeclaredUnit": mass, "scenario": default,
                      "url": f"https://oekobaudat.de/OEKOBAU.DAT/datasetdetail/process.xhtml?uuid={uuid}", "license": lic}}
    bio = kg(get("biogenic", "A1-A3"))
    if bio is not None and cfg["group"] == "timber": out["biogenic"] = round(bio, 6)
    if c3 is not None or c4 is not None: out["c3c4"] = round(kg((c3 or 0) + (c4 or 0)), 6)
    d = kg(get("total", "D"))
    if d is not None: out["d"] = round(d, 6)
    return out

if __name__ == "__main__":
    cache = sys.argv[1]
    os.makedirs(cache, exist_ok=True)
    cfg = json.load(open(os.path.join(ROOT, "scripts", "carbon-factors.config.json"), encoding="utf-8"))
    data = {"release": cfg["release"], "factors": [factor(cache, c) for c in cfg["factors"]]}
    path = os.path.join(ROOT, "src", "tools", "carbon", "carbon-factors.json")
    json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for f in data["factors"]:
        print(f'{f["id"]:26} A1-A3 {f["a1a3"]:.4f}  bio {f.get("biogenic", "–")}  C3-4 {f.get("c3c4", "–")}  D {f.get("d", "–")}  ρ {f["density"]}  valid {f["source"]["validUntil"]}  {f["source"]["owner"][:30]}')
