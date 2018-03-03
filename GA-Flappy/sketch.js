let lifespan = 300;
let popsize = 200;
let population;
let pipes = [];
let maxFit = 0;
let count = 0;
let a = 25;

function setup() {
  createCanvas(windowWidth, windowHeight);
  population = new Population();

  pipes.push(new Pipe());
}

function draw() {
  background(51);
  population.run();
  if (count == lifespan) {
    population.evaluate();
    population.selection();
    count = 0;
  }
  count++;

  //---------------------------FlappyBird------------------------//
  for (let i = pipes.length - 1; i >= 0; i--) {
    for (let j = 0; j < popsize; j++) {
      if (!population.birds[j].crashed && pipes[i].hits(population.birds[j])) {
        population.birds[j].crashed = true;
      }

    }
    if (pipes[i].offscreen()) {
      pipes.splice(i, 1);
    }
    pipes[i].show();
    pipes[i].update();
  }

  if (frameCount % 40 == 0) {
    pipes.push(new Pipe());
  }
  //---------------------------FlappyBird------------------------//
}
