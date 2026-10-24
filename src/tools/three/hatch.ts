// 45° stripes for "unsure" (ink stripes on white, tinted by the material color) and "over" (light stripes on ink).
import * as THREE from "three";

export function hatchTexture(dark = false) {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  g.fillStyle = dark ? "#172027" : "#FFFFFF";
  g.fillRect(0, 0, 32, 32);
  g.strokeStyle = dark ? "#CBD2D5" : "#172027";
  g.lineWidth = 5;
  for (const o of [-32, 0, 32]) { g.beginPath(); g.moveTo(o, 32); g.lineTo(o + 32, 0); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
