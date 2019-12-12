
class Section {

  constructor(b, h, fck, cover) {
    this.b = b;
    this.h = h;
    this.fck = fck;
    this.cover = cover;
    this.Area = b * h;

    this.fcd = fck / 1.5;
    if (fck < 30) {
      this.k1 = 0.85;
    } else if (fck == 30) {
      this.k1 = 0.82;
    } else if (fck == 35) {
      this.k1 = 0.79;
    } else if (fck == 40) {
      this.k1 = 0.76;
    } else if (fck == 45) {
      this.k1 = 0.73;
    } else if (fck == 50) {
      this.k1 = 0.70;
    }

    this.e_min = (15 + 0.03 * this.h);
    this.N_limit = 0.4 * this.Area * this.fck / 1000; //TBDY-2018
    //this.N_limit = 0.9 * this.Area * this.fcd / 1000; //TS-500

    this.reinfs = [];
    this.m = []
    this.n = [];
  }

  calcPC() {
    let Fc = 0.85 * this.fcd * this.h * this.b;
    let sumF = Fc;
    let sumM = Fc * (this.h / 2);

    for (let reinf of this.reinfs) {
      sumM += (reinf.fyd * reinf.As) * reinf.y;
      sumF += reinf.fyd * reinf.As;
    }
    this.PC = sumM / sumF;
  }


  PMDiag() {
    this.calcPC();
    this.m = []
    this.n = [];

    for (let c = 4 * this.h; c >= 0; c -= this.h / 25) {

      let a = this.k1 * c;
      if (a > this.h) {
        a = this.h;
      }

      let Fc = 0.85 * this.fcd * a * this.b;

      let N = Fc / 1000;
      let M = Fc * (this.PC - a / 2) / pow(10, 6);

      for (let reinf of this.reinfs) {
        let fs = 600 * (1 - reinf.y / c);
        if (abs(fs) >= reinf.fyd) {
          fs = reinf.fyd * Math.sign(fs);
        }
        let Fs = fs * reinf.As;
        N += Fs / 1000;
        M += Fs * (this.PC - reinf.y) / pow(10, 6);
      }

      this.m.push(M);
      this.n.push(N);
    }

  }

  graph() {
    this.PM = new Graph(this.m, this.n);
    this.pure();
  }

  pure() {
    for (let i = 0; i < this.m.length; i++) {
      let x = this.PM.mapX(this.m[i]);
      let y = this.PM.mapY(this.n[i]);
      if (floor(this.m[i]) == 0) {
        text(" M: " + nf(this.m[i], 1, 3) + " , " + "N: " + nf(this.n[i], 1, 3), x, y);
        ellipse(x, y, 5, 5);
      }
      if (Math.sign(this.n[i]) != Math.sign(this.n[i + 1])) {
        var m0 = (this.m[i + 1] - this.m[i]) / (this.n[i + 1] - this.n[i]) * (0 - this.n[i]) + this.m[i];
        text(" M: " + nf(m0, 1, 3) + " , " + "N: " + 0, this.PM.mapX(m0), this.PM.mapY(0));
        ellipse(this.PM.mapX(m0), this.PM.mapY(0), 5, 5);
      }
    }

    let maxM = max(this.m);
    let Np = this.n[this.m.indexOf(maxM)];
    let x = this.PM.mapX(maxM);
    let y = this.PM.mapY(Np);
    text(" M: " + nf(maxM, 1, 3) + " , " + "N: " + nf(float(Np), 1, 3), x, y);
    ellipse(x, y, 5, 5);

  }


  add(rebar) {
    if (this.reinfs.find(x => x.y === rebar.y)) {
      alert("Aynı konuma birden fazla donatı konulamaz.");
    } else {
      this.reinfs.push(rebar);
    }
  }

}
