
let ecu = 0.003;
let ey = 0.001825;

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

    this.e_min = (15 + 0.03 * this.h);
    this.N_limit = 0.4 * this.Area * this.fck / 1000;

    for (let c = 3*this.h; c >= 0; c -= 20) {

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

      this.summary = { "c(mm)": c, "M(kNm)": nf(M, 1, 5), "N(kN)": nf(N, 1, 5), "e(mm)": nf(M / N * 1000, 1, 5) };
      print(summary);
    }
    this.drawDiag();
  }


  drawDiag() {
    push();
    noFill();
    stroke(random(100,255), random(100,255), random(100,255));
    beginShape()
    for (let i = 0; i < this.m.length; i++) {
      let x = this.mapX(this.m[i]);
      let y = this.mapY(this.n[i]);
      vertex(x, y);
      //text(nf(m[i], 1, 2) + " , " + nf(n[i], 1, 2), x, y)
    }
    endShape();
    line(this.mapX(0), height, this.mapX(0), 0);
    line(0, this.mapY(0), width, this.mapY(0));
    line(this.mapX(0), this.mapY(0), this.mapX(100), this.mapX(100) / this.e_min);
    line(this.mapX(0), this.mapY(this.N_limit), width, this.mapY(this.N_limit));
    text("M", width - 20, this.mapY(0));
    text("N", this.mapX(0), 20);
    pop();
  }

  drawSection(x, y) {
    push();
    translate(x, y);
    scale(0.6);
    noFill();
    strokeWeight(2);
    stroke(255, 150, 0);
    rectMode(CENTER);
    rect(0, 0, this.b, this.h);
    for (let reinf of this.reinfs) {
      let a = (this.b - 2 * this.cover) / (reinf.n - 1);
      if (reinf.n != 1) {
        for (let i = 0; i < reinf.n; i++) {
          ellipse(this.cover - this.b / 2 + a * i, reinf.y - this.h / 2, reinf.D);
        }
      } else {
        ellipse(0, reinf.y - this.h / 2, reinf.D);
      }
    }

    textSize(20);

    textAlign(CENTER, CENTER);
    for (let reinf of this.reinfs) {
      text(reinf.n + "phi" + reinf.D, 0, reinf.y - this.h / 2 - 2 * reinf.D * Math.sign(reinf.y - this.h / 2));
    }

    text("GC", -40 - this.b / 2, - 5);
    line(-50 - this.b / 2, 0, this.b / 2 + 50, 0);
    if (this.h / 2 != round(this.PC)) {
      text("PC", -40 - this.b / 2, this.PC - this.h / 2 - 5);
      line(-50 - this.b / 2, this.PC - this.h / 2, this.b / 2 + 50, this.PC - this.h / 2);
    }
    pop();
  }

  add(rebar) {
    this.reinfs.push(rebar);
  }


  mapX(num) { return map(num, min(this.m), max(this.m), 10, width - 80); }
  mapY(num) { return map(num, min(this.n), max(this.n), height - 10, 80); }



}
