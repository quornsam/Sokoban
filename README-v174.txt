BOXXY v174 — POSTHOG ANALYTICS UPDATE ONLY

COPY THESE FILES INTO THE BOXXY ROOT FOLDER
- index.html
- boxxy.js
- legal.html

WHAT CHANGED
- Added PostHog EU analytics using the supplied public project token.
- Uses cookieless_mode: always.
- Autocapture, session recording, heatmaps, performance capture, error capture, surveys, feature flags and rage-click capture are disabled.
- Only page views/page leaves and these custom events are allowed:
  game_opened, pack_selected, level_started, level_restarted, level_completed, next_level_pressed.
- Shared/custom puzzle layouts, names, links, query strings, URL fragments and entered text are not sent.
- Analytics failures are ignored so they cannot interrupt BOXXY.
- Updated legal.html to describe PostHog analytics.

POSTHOG DASHBOARD REQUIREMENT
Project Settings > Web analytics > Cookieless server hash mode must be ON.
If that dashboard switch is off, PostHog will ignore cookieless events.

AUTHORIZED URL
https://boxxy.io

VERSION
BOXXY v174
