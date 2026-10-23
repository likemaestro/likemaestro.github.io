# Back arrow on tool pages: design (2026-10-23)

Murat found it awkward to get back from a tool to /tools: he had to go up to the header. Agreed in a brainstorm on
2026-10-23.

## What it is

- **Where it leads:** always /tools, the parent page, also for visitors who arrive from a search or a shared link.
- **Form:** a 44 px square button with a "‹", like the site's other buttons, in the empty left margin and centred on
  the title's first line. It scrolls away with the title. (Built first as a thin chevron pinned while scrolling;
  Murat found a lone pinned glyph in the margin looked bad, so pinning was dropped and the square chosen.)
- **Narrow windows:** the same button in front of the title. Phones already have a back gesture.
- **Breadcrumb:** stays above the title; it says where you are, the arrow is the quick way back.
- **Scope:** every page built on `ToolShell.tsx`. The /tools index has no arrow.

## Where it appears

The page is 96rem wide (1536 px at the base size). The margin left of the content is 24 px up to 1536 px and grows
beyond it, so a 44 px target with breathing room fits from 1600 px: the arrow sits in the margin from there and in
front of the title below it.

## Look and behaviour

- The `btn` style: 1 px ink border, 2 px radius, wash on hover; the chevron 18 px tall with a 1.75 px stroke. No orange.
- In the margin it sits 1.5rem from the content's edge.
- Hover and keyboard focus: the chevron nudges 2 px left (none under reduced motion). No visible word; screen readers
  hear "Back to Tools".
- Keyboard: after the breadcrumb, before the tool.

## Checks

At 390, 1440, 1700 and 1920 px: where the button is, centred on the title's first line, 44 px, no horizontal scroll,
and a click lands on /tools at the top.
