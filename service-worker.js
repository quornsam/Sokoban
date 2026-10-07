/* BOXXY v456: default phone Zen keypad size is LARGE while preserving saved preferences. */
/* BOXXY v449: refresh rare-character sprite/rendering release references; offline re-downloads fetch the replacement artwork. */
/* BOXXY v448: refresh rare-character selection/modal logic without changing the cached character asset set. */
/* BOXXY v447: cache KangaRuby and WhoopsaDaisy plus refreshed rare-character logic. */
/* BOXXY v446: cache six FLUFFBALLS character sheets and refreshed character-family registries. */
/* BOXXY v445: Hall of Fame data is server-managed and linked cards open player profiles. */
/* BOXXY v444: Yaron Shoham added to the BOXXY Originals Hall of Fame. */
/* BOXXY v443: cache six additional PARTYGOERS character sheets and refreshed character registries. */
/* BOXXY v442: refresh main app assets for smooth utility-tray fitting and Level Maker rotation. */
/* BOXXY v441: /beta gameplay uses direct PeerJS/WebRTC; normal offline package unchanged. */
/* BOXXY v439: keep desktop board fitting inside the live Undo/Restart boundary. */
/* BOXXY v438: restore the established desktop Full Screen/Zen layout after the desktop utility-tray restructure. */
/* BOXXY v437: square desktop actions, collapsed tray peek, Daily archive streak badge and refreshed Partygoer sprites. */
/* BOXXY v429: desktop utility rail and Style board-colour controls. */
/* BOXXY v428: Daily fastest-time gold-medal client/history assets. */
/* BOXXY v427: PARTYGOERS visibility is secret-sequence only. */
/* BOXXY v426: selected-user announcement testing and reliable character actions. */
/* BOXXY v425: refresh message-bar announcement client and admin assets. */
/* BOXXY v424: cache admin-attempt telemetry client updates. */
/* BOXXY v423: refresh client assets for phone/tablet large-board snap movement. */
/* BOXXY v422: refresh client assets for the 50-cell large-level performance threshold. */
/* BOXXY v420: refresh cached leaderboard UI assets for stable first-open loading layout. */
/* BOXXY v419: refresh cached leaderboard UI assets for stable loading layout. */
/* BOXXY v418: release refresh for search metadata/pages; offline gameplay package unchanged. */
/* BOXXY v417: refresh offline cache for immediate local Daily leaderboard score updates. */
/* BOXXY v416: cache six additional PARTYGOERS character sheets and refreshed selector assets. */
/* BOXXY v415: refreshed Player Profile identity/location layout. */
/* BOXXY v413: mobile Player Profile identity layout and refreshed app cache. */
/* BOXXY v412: cached/paged Daily leaderboard controls and refreshed app cache. */
/* BOXXY v411: Character Style typography correction and refreshed main app cache. */
/* BOXXY v410: cache six additional PARTYGOERS characters and refreshed Character Style UI assets. */
/* BOXXY v409: restore v396 leaderboard typography/alignment with additive centred full-leaderboard avatars. */
/* BOXXY v407: stable profile bio geometry, corrected leaderboard avatar spacing and refreshed Clara asset. */
/* BOXXY v405: profile avatar crop, trophy tooltips, inline bio placeholder and clean leaderboard profile links. */
/* BOXXY v404: redesigned public player profiles and profile-modal bio editing. */
/* BOXXY v403: public player profiles, safe bios and synthetic avatar administration. */
/* BOXXY v402: leaderboard avatars use existing cached character assets; release references updated. */
/* BOXXY v401: expanded PARTYGOERS character sheets are available offline. */
/* BOXXY v400: PARTYGOERS character sheets are available offline with the expanded Attire selector. */
/* BOXXY v399: spooky soundtrack uses the standard MP3 format and refreshed Samantha artwork is cached offline. */
/* BOXXY v398: spooky character sheets and Dark Quiet Death are available offline. */
/* BOXXY v375: varied synthetic score generation; gameplay unaffected. */
/* BOXXY v374: private Daily seeding/admin leaderboard tools and 250×250 Level Maker. */
/* BOXXY v372: copy and display-name updates; refresh cached HTML, levels and gameplay script. */
/* BOXXY v371: horizontal-only Zen spacing, clear action hit targets and Safari touchstart protection. */
/* BOXXY v370: phone Zen Spaced Arrows now 30–40px with matching control-pad dimensions. */
/* BOXXY v369: phone Turbo hold/repeat fix; refreshed offline version. */
/* BOXXY v368: wider phone pad option and iOS double-tap movement-control fix. */
/* BOXXY v367: Instant Move silent single-paint execution and refreshed gameplay cache. */
/* BOXXY v364: recorded Daily results can restore missing activity dates without fabricated playtime. */
/* BOXXY v363: retains v361 recording fix and original Daily share wording; persistent player sessions and Basement history. */
"use strict";

const CACHE_NAME = "boxxy-offline-v2";
const RELEASE_VERSION = "456";
const META_URL = "/__boxxy_offline_meta__";
const OFFLINE_ENTRY = "/index.html";
const ASSETS = [
  "/account.js",
  "/attempt-history.js",
  "/attempt-history-ui.js",
  "/attempt-history.css",
  "/alphabet-soup.js",
  "/assets/audio/Fading-into-Gold-296KB.mp3",
  "/assets/audio/Starry-Night-Lullaby-281KB.mp3",
  "/assets/audio/Tetris-Piano-293KB.mp3",
  "/assets/audio/Velvet-Static-296KB.mp3",
  "/assets/audio/cracked-ivory-drift.mp3",
  "/assets/audio/Dark-Quiet-Death-280KB.mp3",
  "/assets/audio/tetris-piano.m4a",
  "/assets/data/profile-locations-v1.json",
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
  "/assets/characters/lincoln/base.png",
  "/assets/characters/beverley/base.png",
  "/assets/characters/harry/base.png",
  "/assets/characters/stuart/base.png",
  "/assets/characters/davido/base.png",
  "/assets/characters/samantha/base.png",
  "/assets/characters/optimus/base.png",
  "/assets/characters/pixella/base.png",
  "/assets/characters/bolderdash/base.png",
  "/assets/characters/sputnik/base.png",
  "/assets/characters/vasquez/base.png",
  "/assets/characters/bacterium/base.png",
  "/assets/characters/clara/base.png",
  "/assets/characters/jamil/base.png",
  "/assets/characters/clickers/base.png",
  "/assets/characters/bertrand/base.png",
  "/assets/characters/angie/base.png",
  "/assets/characters/the-haining/base.png",
  "/assets/characters/eric/base.png",
  "/assets/characters/marshall/base.png",
  "/assets/characters/catherine/base.png",
  "/assets/characters/mr-pjkuylasg/base.png",
  "/assets/characters/slippy/base.png",
  "/assets/characters/gobble/base.png",
  "/assets/characters/sandra/base.png",
  "/assets/characters/blaze/base.png",
  "/assets/characters/frederick/base.png",
  "/assets/characters/charlize/base.png",
  "/assets/characters/amy-annie/base.png",
  "/assets/characters/bobbyburp/base.png",
  "/assets/characters/mr-whack/base.png",
  "/assets/characters/elrick/base.png",
  "/assets/characters/ms-thompson/base.png",
  "/assets/characters/sid-the-big/base.png",
  "/assets/characters/quock/base.png",
  "/assets/characters/bernard/base.png",
  "/assets/characters/binky/base.png",
  "/assets/characters/hermit/base.png",
  "/assets/characters/gusto/base.png",
  "/assets/characters/polly/base.png",
  "/assets/characters/trisha/base.png",
  "/assets/characters/wendy/base.png",
  "/assets/characters/kangaruby/base.png",
  "/assets/characters/whoopsadaisy/base.png",
  "/assets/characters/roger/base.png",
  "/assets/characters/bobby/base.png",
  "/assets/characters/carmen/base.png",
  "/assets/characters/titchmarsh/base.png",
  "/assets/characters/bubbs/base.png",
  "/assets/characters/porridge/base.png",
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
  "/daily-puzzles/boxxy-daily-puzzles-2026-10.js",
  "/daily-puzzles/boxxy-daily-puzzles.js",
  "/how-to-play.css",
  "/how-to-play.js",
  OFFLINE_ENTRY,
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
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith("boxxy-offline-") && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

async function tellClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach(client => client.postMessage(message));
}

/*
 * Safari rejects a navigation response carrying redirect history when that
 * response is returned by a service worker. Rebuilding a fetched response
 * from its body creates an ordinary response with no redirected state.
 */
async function redirectSafeCopy(response) {
  const source = response.clone();
  const headers = new Headers(source.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return new Response(await source.arrayBuffer(), {
    status: source.status,
    statusText: source.statusText,
    headers
  });
}

async function cacheEverything(requestedVersion) {
  await caches.delete(CACHE_NAME);
  const cache = await caches.open(CACHE_NAME);
  let done = 0;
  const failures = [];

  for (const path of ASSETS) {
    try {
      const response = await fetch(new Request(path, {
        cache: "reload",
        credentials: "same-origin",
        redirect: "follow"
      }));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await cache.put(path, await redirectSafeCopy(response));
    } catch (error) {
      failures.push(`${path}: ${error?.message || "failed"}`);
    }

    done++;
    if (done === 1 || done === ASSETS.length || done % 4 === 0) {
      await tellClients({ type: "BOXXY_OFFLINE_PROGRESS", done, total: ASSETS.length });
    }
  }

  if (failures.length) {
    await caches.delete(CACHE_NAME);
    throw new Error(`Could not save ${failures.length} game file${failures.length === 1 ? "" : "s"}. Please stay online and try again.`);
  }

  const meta = {
    version: String(requestedVersion || RELEASE_VERSION),
    savedAt: Date.now(),
    files: ASSETS.length
  };
  await cache.put(META_URL, new Response(JSON.stringify(meta), {
    headers: { "content-type": "application/json" }
  }));
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
    try {
      // Online use remains network-first. Ordinary browsing does not rewrite
      // the deliberately downloaded offline package.
      return await fetch(request);
    } catch (_) {
      const cache = await caches.open(CACHE_NAME);

      if (request.mode === "navigate") {
        const cachedEntry = await cache.match(OFFLINE_ENTRY);
        return cachedEntry || Response.error();
      }

      return (await cache.match(url.pathname)) || Response.error();
    }
  })());
});
