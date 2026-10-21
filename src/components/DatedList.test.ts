import { ordered } from "./DatedList";
import { activity, publications } from "../content/site";

test("forthcoming entries come first, then newest first", () => {
  const p = ordered(publications);
  expect(p[0].forthcoming).toBe(true);
  for (const list of [p.filter((x) => !x.forthcoming), ordered(activity)])
    for (let i = 1; i < list.length; i++) expect(list[i - 1].sort >= list[i].sort).toBe(true);
});
