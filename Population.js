class Population {
  constructor() {
    this.birds = new Array(popsize);
    for (let i = 0; i < this.birds.length; i++) {
      this.birds[i] = new Bird();
    }
    this.matingPool = [];
    this.maxFit = 0;
  }

  evaluate() {
    for (let i = 0; i < this.birds.length; i++) {
      this.birds[i].fitness /= this.maxFit;
    }

    this.matingPool = [];
    for (let i = 0; i < this.birds.length; i++) {
      this.n = floor(this.birds[i].fitness);
      for (let j = 0; j < this.n; j++) {
        this.matingPool.push(this.birds[i]);
      }
    }
  }

  selection() {
    let newbirds = [];
    for (let i = 0; i < this.birds.length; i++) {
      this.birds[i].dna.mutate();
      let parentA = random(this.matingPool).dna;
      let parentB = random(this.matingPool).dna;
      let child = parentA.crossover(parentB);
      newbirds[i] = new Bird(child);
    }
    this.birds = newbirds;
  }


  run() {
    for (let i = 0; i < this.birds.length; i++) {
      if (!this.birds[i].crashed) {
        this.birds[i].calculate();
      }
      this.birds[i].update();
      this.birds[i].show();
    }
  }
}
