
let section;

let h, b, fck, cover, n, D, fyk, y;
let button1, button2, button3;
let checkM, checkN;

window.onresize = function() {
  var w = window.innerWidth;
  var h = window.innerHeight;  
  canvas.size(w,h);
  width = w;
  height = h;
};

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  background(0);

  //----------------------------------------------------------------------------------------//
  let size = 80;
  let cx = 1280/1980*window.innerWidth, cy = 20/1080*window.innerHeight;

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
  //----------------------------------------------------------------------------------------//

  button1.mousePressed(createSection);
  button2.mousePressed(addReinf);
  button3.mousePressed(check);
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
  section.PM.checkMN();
}
