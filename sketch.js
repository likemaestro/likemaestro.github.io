let scl = 20;
let x = 0;
let y = 0;

function setup() {
  createCanvas(600, 600);
  background(51);
  strokeWeight(1.8);
}

function draw() {
  while (y < height) {
  //if (y < height) {
    let c = map(y, 0, height, 100, 255);
    stroke(180, 0, c);
    if (random(1) < 0.5) {
      line(x, scl + y, scl + x, y);
      //line(x, y, x, y + scl);
    } else {
      line(x, y, scl + x, scl + y);
      //line(x, y, x + scl, y);
    }

    if (x > width) {
      y += scl;
      x = 0;
    } else {
      x += scl;
    }
  }
}
