/* BOXXY v290 — opt-in offline cache with Android install handoff support. */
"use strict";

const CACHE_NAME = "boxxy-offline-v1";
const RELEASE_VERSION = "290";
const META_URL = "/__boxxy_offline_meta__";
const ASSETS = [
  "/",
  "/account.js",
  "/alphabet-soup.js",
  "/assets/audio/Fading-into-Gold-296KB.mp3",
  "/assets/audio/Starry-Night-Lullaby-281KB.mp3",
  "/assets/audio/Tetris-Piano-293KB.mp3",
  "/assets/audio/Velvet-Static-296KB.mp3",
  "/assets/audio/cracked-ivory-drift.mp3",
  "/assets/audio/tetris-piano.m4a",
  "/assets/board/board-atlas.png",
  "/assets/board/boxes/box-black.png",
  "/assets/board/boxes/box-blue.png",
  "/assets/board/boxes/box-brown.png",
  "/assets/board/boxes/box-burgundy.png",
  "/assets/board/boxes/box-cream.png",
  "/assets/board/boxes/box-default-yellow.png",
  "/assets/board/boxes/box-green.png",
  "/assets/board/boxes/box-grey.png",
  "/assets/board/boxes/box-light-blue.png",
  "/assets/board/boxes/box-lime.png",
  "/assets/board/boxes/box-orange.png",
  "/assets/board/boxes/box-pink.png",
  "/assets/board/boxes/box-purple.png",
  "/assets/board/boxes/box-red.png",
  "/assets/board/boxes/box-teal.png",
  "/assets/board/boxes/box-yellow.png",
  "/assets/board/goals/goal-black.png",
  "/assets/board/goals/goal-blue.png",
  "/assets/board/goals/goal-brown.png",
  "/assets/board/goals/goal-burgundy.png",
  "/assets/board/goals/goal-cream.png",
  "/assets/board/goals/goal-green.png",
  "/assets/board/goals/goal-grey.png",
  "/assets/board/goals/goal-light-blue.png",
  "/assets/board/goals/goal-lime.png",
  "/assets/board/goals/goal-orange.png",
  "/assets/board/goals/goal-pink.png",
  "/assets/board/goals/goal-purple.png",
  "/assets/board/goals/goal-red.png",
  "/assets/board/goals/goal-teal.png",
  "/assets/board/goals/goal-yellow.png",
  "/assets/characters/boy/base.png",
  "/assets/characters/boy/hair.png",
  "/assets/characters/boy/shoes.png",
  "/assets/characters/boy/skin.png",
  "/assets/characters/boy/trousers.png",
  "/assets/characters/boy/tshirt.png",
  "/assets/characters/girl/base.png",
  "/assets/characters/girl/hair.png",
  "/assets/characters/girl/shoes.png",
  "/assets/characters/girl/skin.png",
  "/assets/characters/girl/trousers.png",
  "/assets/characters/girl/tshirt.png",
  "/assets/characters-fallback/boy/player-back.png",
  "/assets/characters-fallback/boy/player-front.png",
  "/assets/characters-fallback/boy/player-left.png",
  "/assets/characters-fallback/boy/player-right.png",
  "/assets/characters-fallback/boy/push-back.png",
  "/assets/characters-fallback/boy/push-front.png",
  "/assets/characters-fallback/boy/push-left.png",
  "/assets/characters-fallback/boy/push-right.png",
  "/assets/characters-fallback/boy/walk-back.png",
  "/assets/characters-fallback/boy/walk-front.png",
  "/assets/characters-fallback/boy/walk-left.png",
  "/assets/characters-fallback/boy/walk-right.png",
  "/assets/characters-fallback/girl/player-back.png",
  "/assets/characters-fallback/girl/player-front.png",
  "/assets/characters-fallback/girl/player-left.png",
  "/assets/characters-fallback/girl/player-right.png",
  "/assets/characters-fallback/girl/push-back.png",
  "/assets/characters-fallback/girl/push-front.png",
  "/assets/characters-fallback/girl/push-left.png",
  "/assets/characters-fallback/girl/push-right.png",
  "/assets/characters-fallback/girl/walk-back.png",
  "/assets/characters-fallback/girl/walk-front.png",
  "/assets/characters-fallback/girl/walk-left.png",
  "/assets/characters-fallback/girl/walk-right.png",
  "/assets/pack-art/alphabet-soup-banner.webp",
  "/assets/pack-art/alphabet-soup-mobile.webp",
  "/assets/pack-art/alphabet-soup-pack-art.png",
  "/assets/pack-art/boxxy-originals-banner.webp",
  "/assets/pack-art/boxxy-originals-mobile.webp",
  "/assets/pack-art/boxxy-originals-pack-art.png",
  "/assets/pack-art/exponentially-mobile.webp",
  "/assets/pack-art/exponentially-pack-art.png",
  "/assets/pack-art/exponentially-source.webp",
  "/assets/pack-art/microban-banner.webp",
  "/assets/pack-art/microban-mobile.webp",
  "/assets/pack-art/microban-pack-art.png",
  "/assets/pack-art/the-jigsaw-banner.webp",
  "/assets/pack-art/the-jigsaw-mobile.webp",
  "/assets/pack-art/the-jigsaw-pack-art.png",
  "/assets/ui/alphabet-soup-badge.png",
  "/assets/ui/boxxy-prize-poster-lowres.jpg",
  "/assets/ui/boxxy-splash.png",
  "/assets/ui/completion/happy-boxxy-sprites-1.png",
  "/assets/ui/completion/happy-boxxy-sprites-2.png",
  "/assets/ui/completion/happy-sprites-350-grid.png",
  "/assets/ui/icons/apple-touch-icon.png",
  "/assets/ui/icons/boxxy-yellow-crate-touch-v150.png",
  "/assets/ui/icons/boxxy-yellow-crate-v150-16.png",
  "/assets/ui/icons/boxxy-yellow-crate-v150-192.png",
  "/assets/ui/icons/boxxy-yellow-crate-v150-32.png",
  "/assets/ui/icons/boxxy-yellow-crate-v150-512.png",
  "/assets/ui/icons/boxxy-yellow-crate-v150.ico",
  "/assets/ui/icons/boxxy-yellow-crate-v150.svg",
  "/assets/ui/icons/favicon-16x16.png",
  "/assets/ui/icons/favicon-32x32.png",
  "/assets/ui/icons/favicon.ico",
  "/assets/ui/icons/favicon.svg",
  "/assets/ui/icons/icon-192.png",
  "/assets/ui/icons/icon-512.png",
  "/assets/ui/streak-flames/streak-blue.png",
  "/assets/ui/streak-flames/streak-fire.png",
  "/assets/ui/streak-flames/streak-green.png",
  "/assets/ui/streak-flames/streak-purple.png",
  "/assets/ui/streak-flames/streak-red.png",
  "/assets/ui/streak-flames/streak-silver.png",
  "/assets/ui/streak-flames/streak-zero.png",
  "/boxxy.js",
  "/boxxy.webmanifest",
  "/daily-puzzles/boxxy-daily-loader.js",
  "/daily-puzzles/boxxy-daily-puzzles-2026-08.js",
  "/daily-puzzles/boxxy-daily-puzzles-2026-09.js",
  "/daily-puzzles/boxxy-daily-puzzles.js",
  "/how-to-play.css",
  "/how-to-play.js",
  "/index.html",
  "/legal.html",
  "/levels.js",
  "/pack-builder.js",
  "/solver-worker.js",
  "/styles-v147-fixes.css",
  "/styles.css"
];

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

async function tellClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach(client => client.postMessage(message));
}

async function cacheEverything(requestedVersion) {
  const cache = await caches.open(CACHE_NAME);
  let done = 0;
  const failures = [];
  for (const path of ASSETS) {
    try {
      const response = await fetch(new Request(path, { cache: "reload", credentials: "same-origin" }));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await cache.put(path, response.clone());
    } catch (error) {
      failures.push(`${path}: ${error?.message || "failed"}`);
    }
    done++;
    if (done === 1 || done === ASSETS.length || done % 4 === 0) {
      await tellClients({ type: "BOXXY_OFFLINE_PROGRESS", done, total: ASSETS.length });
    }
  }
  if (failures.length) {
    throw new Error(`Could not save ${failures.length} game file${failures.length === 1 ? "" : "s"}. Please stay online and try again.`);
  }
  const meta = { version: String(requestedVersion || RELEASE_VERSION), savedAt: Date.now(), files: ASSETS.length };
  await cache.put(META_URL, new Response(JSON.stringify(meta), { headers: { "content-type": "application/json" } }));
  return meta;
}

self.addEventListener("message", event => {
  if (event.data?.type !== "CACHE_ALL_BOXXY") return;
  event.waitUntil((async () => {
    try {
      const meta = await cacheEverything(event.data?.version);
      await tellClients({ type: "BOXXY_OFFLINE_COMPLETE", ...meta });
    } catch (error) {
      await tellClients({ type: "BOXXY_OFFLINE_ERROR", message: error?.message || "Offline download failed." });
    }
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/basement/")) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cacheKey = request.mode === "navigate" ? "/index.html" : url.pathname;
        if (ASSETS.includes(cacheKey) || cacheKey === "/index.html") {
          cache.put(cacheKey, response.clone()).catch(() => {});
        }
      }
      return response;
    } catch (_) {
      if (request.mode === "navigate") {
        return (await cache.match("/index.html")) || (await cache.match("/")) || Response.error();
      }
      return (await cache.match(request)) || (await cache.match(url.pathname)) || Response.error();
    }
  })());
});
