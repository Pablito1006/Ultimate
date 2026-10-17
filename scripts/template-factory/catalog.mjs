/**
 * MasterMotion WP3 template catalog.
 * Motion designer supplies .mogrt files; this table drives template.json + previews.
 */

const ASPECTS = ["16:9", "9:16"];

function baseParams(opts = {}) {
  const textDefault = opts.textDefault ?? "MasterMotion";
  return [
    {
      id: "title",
      label: { en: "Title", fr: "Titre" },
      type: "text",
      masterPropertyName: "MM_Title",
      defaultValue: textDefault,
    },
    {
      id: "subtitle",
      label: { en: "Subtitle", fr: "Sous-titre" },
      type: "text",
      masterPropertyName: "MM_Subtitle",
      defaultValue: opts.subtitleDefault ?? "",
    },
    {
      id: "colorPrimary",
      label: { en: "Primary color", fr: "Couleur principale" },
      type: "color",
      masterPropertyName: "MM_ColorPrimary",
      defaultValue: opts.primary ?? "#5C9CE6",
    },
    {
      id: "colorSecondary",
      label: { en: "Secondary color", fr: "Couleur secondaire" },
      type: "color",
      masterPropertyName: "MM_ColorSecondary",
      defaultValue: opts.secondary ?? "#1A1A1A",
    },
    {
      id: "intensity",
      label: { en: "Intensity", fr: "Intensité" },
      type: "slider",
      masterPropertyName: "MM_Intensity",
      defaultValue: 70,
      min: 0,
      max: 100,
      step: 1,
    },
    {
      id: "inDuration",
      label: { en: "In duration (s)", fr: "Durée entrée (s)" },
      type: "number",
      masterPropertyName: "MM_InDuration",
      defaultValue: 0.4,
      min: 0.1,
      max: 3,
      step: 0.05,
    },
  ];
}

/** Base designs (one per model); factory expands to aspect variants. */
export const CATALOG_DESIGNS = [
  // Cinema Titles × 6
  { slug: "cinema-mask-reveal", name: "Mask Reveal Title", category: "Cinema Titles", tags: ["cinema", "mask"], kind: "title-reveal", seed: 101, notes: "Mask path reveals title; MM_Title, MM_ColorPrimary." },
  { slug: "cinema-stroke-draw", name: "Stroke Draw Title", category: "Cinema Titles", tags: ["cinema", "stroke"], kind: "title-reveal", seed: 102, notes: "Stroke animates letter outlines." },
  { slug: "cinema-split-vertical", name: "Vertical Split Title", category: "Cinema Titles", tags: ["cinema", "split"], kind: "title-reveal", seed: 103, notes: "Two halves slide apart then settle." },
  { slug: "cinema-blur-to-sharp", name: "Blur to Sharp", category: "Cinema Titles", tags: ["cinema", "blur"], kind: "title-reveal", seed: 104, notes: "Gaussian blur → sharp; avoid unsupported blur plugins." },
  { slug: "cinema-offset-shadow", name: "Offset Shadow Letters", category: "Cinema Titles", tags: ["cinema", "shadow"], kind: "title-reveal", seed: 105, notes: "Per-letter offset + long shadow." },
  { slug: "cinema-film-credit", name: "Film Credit Roll", category: "Cinema Titles", tags: ["cinema", "credit"], kind: "title-reveal", seed: 106, notes: "Slow credit-style title card." },

  // Lower Thirds × 8
  { slug: "lt-slide-bar", name: "Slide Bar Lower Third", category: "Lower Thirds", tags: ["lower-third"], kind: "lower-third", seed: 201, textDefault: "Alex Martin", subtitleDefault: "Director", notes: "Bar slides + name + role." },
  { slug: "lt-rounded-block", name: "Rounded Block LT", category: "Lower Thirds", tags: ["lower-third"], kind: "lower-third", seed: 202, notes: "Rounded rect with icon placeholder." },
  { slug: "lt-typewriter", name: "Typewriter Line LT", category: "Lower Thirds", tags: ["lower-third"], kind: "lower-third", seed: 203, notes: "Line writes left to right." },
  { slug: "lt-floating-tag", name: "Floating Tag LT", category: "Lower Thirds", tags: ["lower-third"], kind: "lower-third", seed: 204, notes: "Soft float + subtle bob." },
  { slug: "lt-social", name: "Social Lower Third", category: "Lower Thirds", tags: ["lower-third", "social"], kind: "lower-third", seed: 205, notes: "Handle-style lower third." },
  { slug: "lt-dual-logo", name: "Dual Line + Logo LT", category: "Lower Thirds", tags: ["lower-third"], kind: "lower-third", seed: 206, notes: "Two lines + media placeholder for logo." },
  { slug: "lt-minimal", name: "Minimal Lower Third", category: "Lower Thirds", tags: ["lower-third", "minimal"], kind: "lower-third", seed: 207, notes: "Thin line, small type." },
  { slug: "lt-multi-guest", name: "Multi-Guest Interview LT", category: "Lower Thirds", tags: ["lower-third", "interview"], kind: "lower-third", seed: 208, notes: "Name stack for multi-speaker." },

  // Kinetic Typography × 6
  { slug: "kt-word-scale", name: "Word Scale Kinetic", category: "Kinetic Typography", tags: ["kinetic"], kind: "kinetic", seed: 301, notes: "Word-by-word scale punch." },
  { slug: "kt-stack-phrase", name: "Stacking Phrase", category: "Kinetic Typography", tags: ["kinetic"], kind: "kinetic", seed: 302, notes: "Lines stack from bottom." },
  { slug: "kt-flip-words", name: "Flip Words", category: "Kinetic Typography", tags: ["kinetic"], kind: "kinetic", seed: 303, notes: "3D-safe flip (Classic 3D only)." },
  { slug: "kt-geo-text", name: "Text on Geometry", category: "Kinetic Typography", tags: ["kinetic"], kind: "kinetic", seed: 304, notes: "Text over animated shape." },
  { slug: "kt-counter", name: "Animated Counter", category: "Kinetic Typography", tags: ["kinetic", "counter"], kind: "kinetic", seed: 305, notes: "Number count-up via slider." },
  { slug: "kt-quote-big", name: "Big Quote", category: "Kinetic Typography", tags: ["kinetic", "quote"], kind: "kinetic", seed: 306, notes: "Large quotation mark + text." },

  // Transitions × 8
  { slug: "tr-shape-wipe", name: "Shape Wipe", category: "Transitions", tags: ["transition"], kind: "transition", seed: 401, notes: "Geometric wipe overlay." },
  { slug: "tr-liquid", name: "Liquid Wipe", category: "Transitions", tags: ["transition"], kind: "transition", seed: 402, notes: "Soft shape morph wipe." },
  { slug: "tr-slide-blur", name: "Slide + Blur", category: "Transitions", tags: ["transition"], kind: "transition", seed: 403, notes: "Directional slide with blur." },
  { slug: "tr-circle-mask", name: "Circle Mask", category: "Transitions", tags: ["transition"], kind: "transition", seed: 404, notes: "Circular iris." },
  { slug: "tr-stripes", name: "Stripe Bands", category: "Transitions", tags: ["transition"], kind: "transition", seed: 405, notes: "Horizontal/vertical bands." },
  { slug: "tr-flash", name: "Flash Cut", category: "Transitions", tags: ["transition"], kind: "transition", seed: 406, notes: "White flash pulse." },
  { slug: "tr-zoom-through", name: "Zoom Through", category: "Transitions", tags: ["transition"], kind: "transition", seed: 407, notes: "Scale punch transition." },
  { slug: "tr-glitch-lite", name: "Light Glitch", category: "Transitions", tags: ["transition", "glitch"], kind: "transition", seed: 408, notes: "Mild RGB offset — native only." },

  // Intro / Outro × 4
  { slug: "io-logo-shapes", name: "Logo on Shapes", category: "Intro Outro", tags: ["intro", "logo"], kind: "intro", seed: 501, notes: "Logo media placeholder + shapes." },
  { slug: "io-text-line", name: "Intro Text + Line", category: "Intro Outro", tags: ["intro"], kind: "intro", seed: 502, notes: "Title + animated underline." },
  { slug: "io-social-outro", name: "Social Buttons Outro", category: "Intro Outro", tags: ["outro", "social"], kind: "intro", seed: 503, notes: "End card with social rows." },
  { slug: "io-end-card", name: "End Card Map", category: "Intro Outro", tags: ["outro"], kind: "intro", seed: 504, notes: "Thanks + CTA end card." },

  // Social × 6
  { slug: "soc-subscribe", name: "Subscribe Callout", category: "Social Media", tags: ["social"], kind: "social", seed: 601, notes: "Subscribe/follow badge." },
  { slug: "soc-progress", name: "Progress Bar Overlay", category: "Social Media", tags: ["social", "progress"], kind: "social", seed: 602, notes: "Bottom progress bar." },
  { slug: "soc-notify", name: "Notification Toast", category: "Social Media", tags: ["social"], kind: "social", seed: 603, notes: "Toast notification style." },
  { slug: "soc-like-share", name: "Like / Share Sticker", category: "Social Media", tags: ["social"], kind: "social", seed: 604, notes: "Like + share icons." },
  { slug: "soc-quote-sticker", name: "Quote Sticker", category: "Social Media", tags: ["social", "quote"], kind: "social", seed: 605, notes: "Rounded quote sticker." },
  { slug: "soc-countdown", name: "Countdown Badge", category: "Social Media", tags: ["social", "countdown"], kind: "social", seed: 606, notes: "3-2-1 countdown." },

  // Infographics × 5
  { slug: "inf-bars", name: "Animated Bars", category: "Infographics", tags: ["infographic"], kind: "infographic", seed: 701, notes: "Bar chart grow." },
  { slug: "inf-pie", name: "Pie Reveal", category: "Infographics", tags: ["infographic"], kind: "infographic", seed: 702, notes: "Simple pie slices." },
  { slug: "inf-kpi", name: "KPI Counter", category: "Infographics", tags: ["infographic"], kind: "infographic", seed: 703, notes: "Big number + label." },
  { slug: "inf-timeline", name: "Timeline Steps", category: "Infographics", tags: ["infographic"], kind: "infographic", seed: 704, notes: "Horizontal timeline." },
  { slug: "inf-bullets", name: "Animated Bullets", category: "Infographics", tags: ["infographic"], kind: "infographic", seed: 705, notes: "Bullet list cascade." },

  // Overlays × 4
  { slug: "ov-frame", name: "Animated Frame", category: "Overlays", tags: ["overlay"], kind: "overlay", seed: 801, notes: "Border frame in/out." },
  { slug: "ov-crosshair", name: "Crosshair Corners", category: "Overlays", tags: ["overlay"], kind: "overlay", seed: 802, notes: "Corner brackets." },
  { slug: "ov-ticker", name: "Scrolling Ticker", category: "Overlays", tags: ["overlay"], kind: "overlay", seed: 803, notes: "Bottom ticker tape." },
  { slug: "ov-watermark", name: "Animated Watermark", category: "Overlays", tags: ["overlay"], kind: "overlay", seed: 804, notes: "Subtle brand watermark." },

  // Caption styles × 12 (WP2 slots — mogrt pending)
  { slug: "cap-word-highlight", name: "Caption Word Highlight", category: "Captions", tags: ["caption", "wp2"], kind: "caption", seed: 901 },
  { slug: "cap-karaoke", name: "Caption Karaoke", category: "Captions", tags: ["caption", "wp2"], kind: "caption", seed: 902 },
  { slug: "cap-pop-in", name: "Caption Pop-In", category: "Captions", tags: ["caption", "wp2"], kind: "caption", seed: 903 },
  { slug: "cap-typewriter", name: "Caption Typewriter", category: "Captions", tags: ["caption", "wp2"], kind: "caption", seed: 904 },
  { slug: "cap-mask-reveal", name: "Caption Mask Reveal", category: "Captions", tags: ["caption", "wp2"], kind: "caption", seed: 905 },
  { slug: "cap-color-box", name: "Caption Color Box", category: "Captions", tags: ["caption", "wp2"], kind: "caption", seed: 906 },
  { slug: "cap-outline", name: "Caption Outline", category: "Captions", tags: ["caption", "wp2"], kind: "caption", seed: 907 },
  { slug: "cap-bounce", name: "Caption Bounce", category: "Captions", tags: ["caption", "wp2"], kind: "caption", seed: 908 },
  { slug: "cap-smooth", name: "Caption Smooth", category: "Captions", tags: ["caption", "wp2"], kind: "caption", seed: 909 },
  { slug: "cap-minimal", name: "Caption Minimal", category: "Captions", tags: ["caption", "wp2"], kind: "caption", seed: 910 },
  { slug: "cap-shorts", name: "Caption Shorts Vertical", category: "Captions", tags: ["caption", "wp2", "vertical"], kind: "caption", seed: 911 },
  { slug: "cap-cinema", name: "Caption Cinema", category: "Captions", tags: ["caption", "wp2"], kind: "caption", seed: 912 },
];

export function expandCatalog() {
  const out = [];
  for (const design of CATALOG_DESIGNS) {
    for (const aspect of ASPECTS) {
      const aspectKey = aspect.replace(":", "x");
      const id = `mm-${design.slug}-${aspectKey}`;
      const primary = design.kind === "cinema" || design.kind === "title-reveal" ? "#F5F0E8" : "#5C9CE6";
      out.push({
        id,
        name: `${design.name} (${aspect})`,
        category: design.category,
        version: "1.0.0",
        tags: [...design.tags, aspect],
        description: design.notes || `${design.name} motion template.`,
        minPremiere: "25.6.0",
        mogrt: `${id}.mogrt`,
        durationDefault: design.kind === "transition" ? 1.2 : 4,
        aspect,
        fps: 30,
        parameters: baseParams({
          textDefault: design.textDefault,
          subtitleDefault: design.subtitleDefault,
          primary: design.primary,
          secondary: design.secondary,
        }),
        animation: {
          inDuration: 0.4,
          outDuration: 0.35,
          loop: design.kind === "overlay" || design.kind === "social",
        },
        previewSpec: {
          kind: design.kind,
          seed: design.seed + (aspect === "9:16" ? 50 : 0),
          primaryColor: primary,
          secondaryColor: "#1A1A1A",
          sampleText: design.textDefault || design.name,
        },
        license: "MasterMotion internal — replace with asset license when mogrt delivered",
        author: "MasterMotion (to fabricate)",
        status: "missing-mogrt",
        fabNotes: design.notes || "",
        previewStatic: `../../previews/${id}.svg`,
        previewAnim: `../../previews/${id}-anim.svg`,
      });
    }
  }
  return out;
}

export function designCount() {
  return CATALOG_DESIGNS.length;
}
