
let section;

let h, b, fck, cover;
let n, D, fyk, y;
let button1, button2;
let greeting;

let cx = 480, cy = 10;

function setup() {
  createCanvas(700, 700);
  background(0);

  b = createInput().size(80).attribute('placeholder', 'b');
  h = createInput().size(80).attribute('placeholder', 'h');
  fck = createInput().size(80).attribute('placeholder', 'fck');
  cover = createInput().size(80).attribute('placeholder', 'cover');

  b.position(cx, cy);
  h.position(cx, cy + b.height);
  fck.position(cx, cy + 2 * b.height);
  cover.position(cx, cy + 3 * b.height);

  n = createInput().size(100).attribute('placeholder', 'n');
  D = createInput().size(100).attribute('placeholder', 'D');
  fyk = createInput().size(100).attribute('placeholder', 'fyk');
  y = createInput().size(100).attribute('placeholder', 'y');

  n.position(n.width + cx, cy);
  D.position(n.width + cx, cy + b.height);
  fyk.position(n.width + cx, cy + 2 * b.height);
  y.position(n.width + cx, cy + 3 * b.height);


  button1 = createButton('Create Section').size(80);
  button1.position(h.x + 2, cy + 4 * b.height + 2);

  button2 = createButton('Add Reinforcement').size(100);
  button2.position(n.x + 2, cy + 4 * b.height + 2);


  button1.mousePressed(createSection);
  button2.mousePressed(addReinf);

}

function createSection() {
  background(0);
  section = new Section(float(b.value()), float(h.value()), float(fck.value()), float(cover.value()));
  section.PMDiag();
  section.drawSection(width / 2, 350);

}
function addReinf() {
  background(0);
  section.add(new Reinforcement(float(n.value()), float(D.value()), float(fyk.value()), float(y.value())));
  section.PMDiag();
  section.drawSection(width / 2, 350);
}

function draw() {


}