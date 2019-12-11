
let section;

let h, b, fck, cover, n, D, fyk, y;
let button1, button2, button3;
let checkM, checkN;




function setup() {
  createCanvas(windowWidth, windowHeight);
  section = new Section();
  section.graph();

  //----------------------------------------------------------------------------------------//
  let size = 80;
  let cx = 1280 / 1536 * windowWidth, cy = 20 / 722 * windowHeight;

  b = createInput().size(size).attribute('placeholder', 'b (mm)').position(cx, cy);
  h = createInput().size(size).attribute('placeholder', 'h (mm)').position(cx, cy + 1.1 * b.height);
  fck = createInput().size(size).attribute('placeholder', 'fck (MPa)').position(cx, cy + 2 * 1.1 * b.height);
  cover = createInput().size(size).attribute('placeholder', 'cover (mm)').position(cx, cy + 3 * 1.1 * b.height);

  n = createInput().size(size + 40).attribute('placeholder', 'n').position(cx + 1.1 * b.width, cy);
  D = createInput().size(size + 40).attribute('placeholder', 'D (mm)').position(cx + 1.1 * b.width, cy + 1.1 * b.height);
  fyk = createInput().size(size + 40).attribute('placeholder', 'fyk (MPa)').position(cx + 1.1 * b.width, cy + 2 * 1.1 * b.height);
  y = createInput().size(size + 40).attribute('placeholder', 'y (mm)').position(cx + 1.1 * b.width, cy + 3 * 1.1 * b.height);

  checkM = createInput().size(size).attribute('placeholder', 'M (kNm)').position(cx - 2.2 * b.width, cy);
  checkN = createInput().size(size).attribute('placeholder', 'N (kN)').position(cx - 1.1 * b.width, cy);

  button1 = createButton('Create Section').size(size).position(h.x, cy + 4.7 * b.height);
  button2 = createButton('Add Reinforcement').size(size + 40).position(n.x, cy + 4.7 * b.height);
  button3 = createButton('Check M/N').size(2 * size + 8).position(cx - 2.2 * b.width, cy + 1.4 * b.height);
  button4 = createButton('Undo').size(2 * size + 40 + 0.1 * b.width).position(h.x, button1.y + 1.95 * b.height);
  //----------------------------------------------------------------------------------------//


  button1.mousePressed(createSection);
  button2.mousePressed(addReinf);
  button3.mousePressed(check);
  button4.mousePressed(undo);



}

function createSection() {
  section = new Section(float(b.value()), float(h.value()), float(fck.value()), float(cover.value()));
  section.PMDiag();
}
function addReinf() {
  section.add(new Reinforcement(float(n.value()), float(D.value()), float(fyk.value()), float(y.value())));
  section.PMDiag();
}
function check() {
 // section.PM.checkMN();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function undo() {
  if (section.reinfs != null) {
    section.reinfs.splice(-1, 1)
    section.PMDiag();
  }
}

function draw() {
  background(0);
  section.graph();


}