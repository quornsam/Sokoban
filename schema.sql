-- BOXXY v334 account database (Cloudflare D1)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER NOT NULL DEFAULT 0,
  signup_ip TEXT NOT NULL DEFAULT '',
  last_ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  total_active_seconds INTEGER NOT NULL DEFAULT 0,
  progress_json TEXT NOT NULL DEFAULT '{}',
  progress_updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

-- BOXXY v329 — additive authentication identities. Existing users remain password accounts.
CREATE TABLE IF NOT EXISTS auth_identities (
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  user_id TEXT NOT NULL,
  provider_email TEXT NOT NULL COLLATE NOCASE,
  linked_at INTEGER NOT NULL,
  last_verified_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (provider, provider_subject),
  UNIQUE (user_id, provider),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS auth_identities_user_id_idx ON auth_identities(user_id);

CREATE TABLE IF NOT EXISTS user_auth_state (
  user_id TEXT PRIMARY KEY,
  password_enabled INTEGER NOT NULL DEFAULT 1 CHECK (password_enabled IN (0, 1)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- v334: first recorded pack completions, independent of mutable best scores.
-- Existing rows and authentication/session tables are not changed.
CREATE TABLE IF NOT EXISTS pack_completions (
  user_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  pack_name TEXT NOT NULL,
  level_count INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  recorded_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, pack_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS pack_completions_order_idx ON pack_completions(pack_id, completed_at, recorded_at);

-- v363: persistent login/session history; token hashes are not bearer cookies.
-- Pre-v363 deleted sessions cannot be reconstructed.
CREATE TABLE IF NOT EXISTS session_history (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ended_at INTEGER,
  end_reason TEXT,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  legacy INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_history_user_started_idx
  ON session_history(user_id, started_at DESC);


-- v365: admin-controlled account feature flags.
CREATE TABLE IF NOT EXISTS user_feature_flags (
  user_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  updated_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, feature_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS user_feature_flags_feature_idx
  ON user_feature_flags(feature_key, enabled, updated_at DESC);


-- v374: private Basement artificial Daily leaderboard players and generated scores.
CREATE TABLE IF NOT EXISTS synthetic_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_norm TEXT NOT NULL UNIQUE,
  default_device TEXT NOT NULL DEFAULT 'computer',
  avatar_json TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS synthetic_daily_scores (
  user_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  seconds REAL NOT NULL,
  moves INTEGER NOT NULL,
  device TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date_key),
  FOREIGN KEY (user_id) REFERENCES synthetic_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS synthetic_daily_scores_date_idx
  ON synthetic_daily_scores(date_key);

-- v376: independent per-run histories; starts at v376 (prior aggregate counts retained).
CREATE TABLE IF NOT EXISTS level_attempt_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  pack_name TEXT NOT NULL,
  level_token TEXT NOT NULL,
  level_number INTEGER NOT NULL DEFAULT 0,
  level_name TEXT NOT NULL DEFAULT '',
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
  seconds REAL,
  moves INTEGER,
  pushes INTEGER,
  assisted INTEGER NOT NULL DEFAULT 0 CHECK(assisted IN (0,1)),
  mouse_or_click_push INTEGER NOT NULL DEFAULT 0 CHECK(mouse_or_click_push IN (0,1)),
  instant_move INTEGER NOT NULL DEFAULT 0 CHECK(instant_move IN (0,1)),
  webdriver_detected INTEGER NOT NULL DEFAULT 0 CHECK(webdriver_detected IN (0,1)),
  end_reason TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS level_attempt_history_user_level_idx
  ON level_attempt_history(user_id, pack_id, level_token, started_at DESC);
CREATE INDEX IF NOT EXISTS level_attempt_history_user_recent_idx
  ON level_attempt_history(user_id, started_at DESC);

-- v392: server-authoritative visibility for individual Daily leaderboard scores.
-- Absence of a row means public. This table is not part of player progress sync.
CREATE TABLE IF NOT EXISTS daily_leaderboard_visibility (
  date_key TEXT NOT NULL,
  player_kind TEXT NOT NULL CHECK (player_kind IN ('real','synthetic')),
  player_id TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('owner','hidden')),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(date_key, player_kind, player_id)
);
CREATE INDEX IF NOT EXISTS daily_leaderboard_visibility_date_idx
  ON daily_leaderboard_visibility(date_key, visibility);


-- v403: public player profile message. Statistics remain derived from canonical progress.
CREATE TABLE IF NOT EXISTS user_public_profiles (
  user_id TEXT PRIMARY KEY,
  bio TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL DEFAULT '',
  region_code TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- v425: date-specific public message-bar announcements controlled from Basement.
CREATE TABLE IF NOT EXISTS site_announcements (
  message_date TEXT PRIMARY KEY,
  message_text TEXT NOT NULL,
  background_color TEXT NOT NULL DEFAULT '#f2b51d',
  text_color TEXT NOT NULL DEFAULT '#171719',
  button_label TEXT NOT NULL DEFAULT '',
  action_key TEXT NOT NULL DEFAULT '',
  action_value TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  updated_at INTEGER NOT NULL DEFAULT 0
);
