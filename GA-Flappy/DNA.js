class DNA {
  constructor(genes) {
    if (genes) {
      this.genes = genes;
    } else {
      this.genes = [];
    }
  }

  combine(a, b) {
    let aMat = a.data;
    let bMat = b.data;
    let newMat = new Matrix(a.rows, a.cols);
    let s1 = floor(random(a.rows));
    let s2 = floor(random(a.cols));
    for (let i = 0; i < a.rows; i++) {
      for (let j = 0; j < a.cols; j++) {
        if (i <= s1 && j <= s2) {
          newMat.data[i][j] = aMat[i][j];
        } else {
          newMat.data[i][j] = bMat[i][j];
        }
      }
    }
    //console.log(newMat);
    return newMat;
  }

  crossover(partner) {

    let newgenes = []
    for (let i = 0; i < this.genes.length; i++) {
      newgenes[i] = this.combine(this.genes[i], partner.genes[i]);
    }
    return new DNA(newgenes);
  }

  mutate() {
    if (random(1) < 0.01) {
      for (let i = 0; i < this.genes.length; i++) {
        //this.genes[i].randomize();
      }
      console.log("mutation");
    }
  }
}
