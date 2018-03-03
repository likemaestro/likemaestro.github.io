class Bird {
  constructor(dna) {
    if (dna) {
      this.brain = new NeuralNetwork(2, 6, 1, dna);
    } else {
      this.brain = new NeuralNetwork(2, 6, 1);
    }
    this.dna = this.brain.dna;
    this.pos = createVector(300, height / 2);
    this.gravity = 0.6;
    this.lift = -0.8;
    this.velocity = 0;
    this.maxSpeed = 35;
    this.output = [];
    this.up = createVector(0, -1);
    this.fitness = 0;
    this.crashed = false;
    //this.color = map(random(this.dna.genes).heading(), 0, TAU, 100, 255);
  }


  calculate() {
    this.mid = (height + pipes[0].top - pipes[0].bottom) / 2;
    this.fitness = count; /// ((this.mid - this.pos.y) * (pipes[0].x - this.pos.x));
    this.output = this.brain.predict([this.mid - this.pos.y, pipes[0].x - this.pos.x]);
    if (this.fitness > maxFit) {
      population.maxFit = this.fitness;
    }
  }

  update() {
    if (this.crashed) {
      this.pos.x -= 5;
    }
    if (this.output[0] > 0.5) {
      this.velocity += this.lift;
    }
    this.velocity += this.gravity;
    this.velocity *= 0.9;
    this.pos.y += this.velocity;

    if (this.pos.y > height - a) {
      this.pos.y = height - a;
      this.velocity = 0;
    }

    if (this.pos.y < a) {
      this.pos.y = a;
      this.velocity = 0;
    }
    //console.log(this.output[0]);
    this.output = [];
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    image(img,0,0,img.width*2*a/img.height,2*a);
    pop();
  }
}
