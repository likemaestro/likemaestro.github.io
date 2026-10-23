import { angleAt, colorAt, fraction } from "./dial";
import { placeLabels } from "../world-map/labels";

test("values map to the dial's angles, clamped at its ends", () => {
  expect(angleAt("270", fraction(50, 0, 100))).toBeCloseTo(90, 12);   // the middle of a 270° dial points up
  expect(angleAt("180", fraction(-5, 0, 100))).toBe(180);
  expect(angleAt("180", fraction(500, 0, 100))).toBe(0);
});

test("colour scales hit their end stops and reverse", () => {
  expect(colorAt("steel", 0)).toBe("#CBD2D5");
  expect(colorAt("steel", 1)).toBe("#172027");
  expect(colorAt("steel", 1, true)).toBe("#CBD2D5");
});

test("labels for crowded points don't overlap", () => {
  const pins = Array.from({ length: 8 }, (_, k) => ({ name: `Country ${k}`, x: 500 + 4 * k, y: 300 + 3 * k }));
  const L = placeLabels(pins, 11);
  for (const a of L) for (const b of L) if (a !== b) expect(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1).toBe(false);
});
