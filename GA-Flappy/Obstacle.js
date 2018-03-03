class Obstacle {
  constructor(x, y, h, a) {
    this.x = x;
    this.y = y;
    this.h = h;
    this.a = a;
    this.w = 15;
  }

  show() {
    push();
    fill(255);
    noStroke();
    rectMode(CENTER);
    translate(this.x, this.y);
    rotate(this.a * PI / 180);
    rect(0, 0, this.w, this.h);
    pop();
  }
  isCrashed() {
    for (let i = 0; i < population.samples.length; i++) {
      let sample = population.samples[i];
      if (sample.pos.x < this.x + this.h / 2 && sample.pos.x > this.x - this.h / 2) {
        if (this.y - this.w / 2 < sample.pos.y && this.y + this.w / 2 > sample.pos.y) {
          sample.crashed = true;
        }
      }
    }
  }
}
