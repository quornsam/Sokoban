/* BOXXY v484 — canonical published content catalogue shared by the game, Basement and Pages Functions. */
(() => {
  "use strict";

  const freeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  };

  const packs = [
    {
      id: "boxxy-original-puzzle-pack-of-50-levels", name: "BOXXY Originals", levels: 50,
      collectionLabel: "Boxxy Originals", headerHtml: "BOXXY<br>ORIGINALS", accent: "red",
      artwork: { desktop: "assets/pack-art/boxxy-originals-banner.webp", mobile: "assets/pack-art/boxxy-originals-mobile.webp", alt: "Indi sitting on a crate and scratching his head" },
      reward: { kind: "star", colour: "#db3b27" }
    },
    {
      id: "microban", name: "Microban", levels: 50,
      collectionLabel: "Microban", headerHtml: "MICROBAN", accent: "black",
      artwork: { desktop: "assets/pack-art/microban-banner.webp", mobile: "assets/pack-art/microban-mobile.webp", alt: "Indi studying a compact Microban puzzle with three wooden crates" },
      reward: { kind: "star", colour: "#171719" }
    },
    {
      id: "jigsaw", name: "The Jigsaw", levels: 25,
      collectionLabel: "The Jigsaw", headerHtml: "THE JIGSAW", accent: "teal",
      artwork: { desktop: "assets/pack-art/the-jigsaw-banner.webp", mobile: "assets/pack-art/the-jigsaw-mobile.webp", alt: "Indi studying The Jigsaw map" },
      reward: { kind: "jigsaw", colour: "#00a6b2" }
    },
    {
      id: "exponentially", name: "Exponentially", levels: 11,
      collectionLabel: "Exponentially", headerHtml: "EXPONENTIALLY", accent: "purple",
      artwork: { desktop: "assets/pack-art/exponentially-source.webp", mobile: "assets/pack-art/exponentially-mobile.webp", alt: "Indi screaming among a huge number of boxes" },
      reward: { kind: "star", colour: "#8e44ad" }
    },
    {
      id: "alphabet-soup", name: "Alphabet Soup", levels: 27,
      collectionLabel: "Alphabet Soup", headerHtml: "ALPHABET<br>SOUP", accent: "yellow",
      artwork: { desktop: "assets/pack-art/alphabet-soup-banner.webp", mobile: "assets/pack-art/alphabet-soup-mobile.webp", alt: "Indi studying wooden crates arranged as the letters A, B and C" },
      reward: { kind: "alphabet", src: "assets/ui/alphabet-soup-badge.png" }
    },
    {
      id: "starry-night", name: "Starry Night", levels: 25,
      collectionLabel: "Starry Night", headerHtml: "STARRY<br>NIGHT", accent: "yellow",
      artwork: { desktop: "assets/pack-art/starry-night-banner.webp", mobile: "assets/pack-art/starry-night-mobile.webp", alt: "Boxxy doing a star jump in a sea of glowing stars" },
      reward: { kind: "moon", src: "assets/ui/starry-night-badge.png" }
    },
    {
      id: "static-noise", name: "Static Noise", levels: 11,
      collectionLabel: "Static Noise", headerHtml: "STATIC<br>NOISE", accent: "black",
      artwork: { desktop: "assets/pack-art/static-noise-banner.webp", mobile: "assets/pack-art/static-noise-mobile.webp", alt: "BOXXY character watching static on an analogue television" },
      reward: { kind: "television", src: "assets/medals/static-noise-tv.png" }
    },
    {
      id: "four-leaf-clover", name: "Four Leaf Clover", levels: 10,
      collectionLabel: "Four Leaf Clover", headerHtml: "FOUR LEAF<br>CLOVER", accent: "black",
      artwork: { desktop: "assets/pack-art/four-leaf-clover-banner.webp", mobile: "assets/pack-art/four-leaf-clover-mobile.webp", alt: "BOXXY character holding a four-leaf clover in a field of clovers" },
      reward: { kind: "clover", src: "assets/medals/four-leaf-clover.png" }
    }
  ];

  // Daily months are administrative history groups only. They do not create
  // gameplay packs or duplicate Daily completion data.
  const dailyMonths = [
    { id: "daily-month-2026-08", month: "2026-08", name: "Daily BOXXY · August 2026", firstDate: "2026-08-30", lastDate: "2026-08-31", levels: 2 },
    { id: "daily-month-2026-09", month: "2026-09", name: "Daily BOXXY · September 2026", firstDate: "2026-09-01", lastDate: "2026-09-30", levels: 30 },
    { id: "daily-month-2026-10", month: "2026-10", name: "Daily BOXXY · October 2026", firstDate: "2026-10-01", lastDate: "2026-10-31", levels: 31 },
    { id: "daily-month-2026-11", month: "2026-11", name: "Daily BOXXY · November 2026", firstDate: "2026-11-01", lastDate: "2026-11-30", levels: 30 }
  ];

  const catalog = freeze({ version: 1, packs, dailyMonths });
  globalThis.BOXXY_CONTENT_CATALOG = catalog;
})();
