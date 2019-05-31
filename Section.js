
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
    this.N_limit = 0.4 * this.Area * this.fck / 1000;

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

    for (let c = 0; c <= 3 * this.h; c += 0.5) {

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
        if (round(N) == 0) {
          print(M);
        }
      }
      this.m.push(M);
      this.n.push(N);
    }
    this.PM = new Graph(this.m, this.n);
  }

  add(rebar) {
    this.reinfs.push(rebar);
  }


}