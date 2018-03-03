// Daniel Shiffman
// http://codingtra.in
// http://patreon.com/codingtrain
// Code for: https://youtu.be/cXgA1d_E-jY&

class Pipe {

  constructor() {
    this.top = random(50, height / 2 - a);
    this.bottom = random(50, height / 2 - a);
    this.x = width;
    this.w = 40;
    this.speed = 5;

    this.highlight = false;
  }

  hits(bird) {
    if (bird.pos.y < this.top || bird.pos.y > height - this.bottom) {
      if (bird.pos.x > this.x && bird.pos.x < this.x + this.w) {
        this.highlight = true;
        return true;
      }
    }
    this.highlight = false;
    return false;
  }

  show() {
    fill(255);
    if (this.highlight) {
      fill(255, 0, 0);
    }
    rect(this.x, 0, this.w, this.top);
    rect(this.x, height - this.bottom, this.w, this.bottom);
  }

  update() {
    this.x -= this.speed;
  }

  offscreen() {
    if (this.x < -this.w) {
      return true;
    } else {
      return false;
    }
  }


}
