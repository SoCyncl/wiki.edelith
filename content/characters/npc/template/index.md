---
title: A guide to Andrew Shenanigans Template
image: placeholder.jpg
imagecaption: This value comes from the frontmatter "imagecaption" field and is injected wherever {{imagecaption}} appears in the html, got that, Andrew?.
tagline: This value comes from a custom frontmatter field ("tagline") and is injected wherever {{tagline}} appears in the html, any field works this way, not just image/imagecaption.
infobox:
  Section One:
    Field A: "This infobox row comes from frontmatter. Lorem ipsum dolor sit amet, consectetur adipiscing elit."
    Field B: "Infobox values can contain wiki links too, like [[Fuck-you-andrew]]."
  Section Two:
    Field C: "500 Dmg"
    Field D: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris."
categories: [Andrew, Like the screw]
---
:::hatnote
This is a hatnote. It renders as the small italic note, MediaWiki puts directly under the page title. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
:::
This is the lead paragraph, plain markdown rendered as is. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. This sentence has a working wiki link to [[Fuck-you-andrew]] (an existing page, so it resolves to a real link) and a wiki-link to [[Some Nonexistent Page]] (renders as a redlink, since no page by that name exists). This sentence also has a footnote reference attached to demonstrate the citation system[^one].

[[File:placeholder-left.jpg|left|thumb|This is a left-aligned thumbnail image with a caption, produced by the [[File:...]] syntax.]]

This paragraph exists to demonstrate text wrapping around the left floated image above. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

## First Heading, Andrew
This is a level 2 heading. Headings at this level are numbered "1", "2", "3"... in the auto generated table of contents. The TOC only appears once a page has four or more headings, mirroring actual wiki's behavior. this page has five, so it will show. Lorem ipsum dolor sit amet, consectetur adipiscing elit.

:::source[Lorem Ipsum, An Imaginary Text]
This is a source block. It's meant for quoting a story or book excerpt verbatim into the page, set off like a Wiki blockquote, with an optional line. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

Source blocks can hold multiple paragraphs, each one still gets rendered as its own paragraph.
:::

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

### First Subheading
This is a level 3 heading, nested under the level 2 heading above it. In the table of contents this numbers as "1.1", and a second level-3 heading here would number "1.2". Lorem ipsum dolor sit amet, consectetur adipiscing elit.

:::quote[Lorem Ipsum, Speaking to No One in Particular]
This is a pull-quote a short, emphasized excerpt that floats beside the body text rather than sitting inline with it. Got it, andrew?
:::

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, ut enim ad minim veniam. Here's a second footnote reference, independent of the first[^two].

[[File:placeholder-right.jpg|right|A right-aligned image with a caption but no "thumb" keyword accepted for Wiki, but cosmetically a no-op either way.]]

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat Genuinely, fuck you philips.

## Second Heading
This is another level 2 heading. Its arrival resets any deeper (level-3+) counters, so if this had a subheading it would number "2.1", not "1.3". Lorem ipsum dolor sit amet, consectetur adipiscing elit.

[[File:placeholder-center.jpg|center|thumb|A center-aligned thumbnail image, the third and final alignment option.]]

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, Nothing man.

## Third Heading
This heading exists mainly to push the page's total heading count to four, the minimum required for the table of contents to appear at all. Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Fourth Heading and References
This final heading also hosts the references list below it. Footnote definitions are stripped out of the body wherever they're written and collected here automatically, numbered in citation order, each with a back-link to where it was cited[^one].

[^one]: This is the first footnote's definition text. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
[^two]: This is the second footnote's definition text, also if you're reading this, resolving independently of the first. Lorem ipsum dolor sit amet.
