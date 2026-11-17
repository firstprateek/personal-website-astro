-- One row per page view. `visitor` is a hash of IP and user agent salted with
-- a random value that is replaced every UTC day and then deleted, so the key
-- does not link a person across days. The IP itself is never stored. (D1 keeps
-- 30 days of point-in-time restores, so a deleted salt is recoverable for that
-- long by someone with access to the account.)
CREATE TABLE views (
  id TEXT PRIMARY KEY,      -- random, made by the page; the leave and click beacons name it
  ts INTEGER NOT NULL,      -- unix ms
  visitor TEXT NOT NULL,
  path TEXT NOT NULL,
  ref TEXT,                 -- NULL: direct entry, '': from another page of the site, else the source
  country TEXT,
  region TEXT,
  city TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  seconds INTEGER,          -- visible time on the page, from the leave beacon
  depth INTEGER             -- furthest point scrolled, percent of the page
);
CREATE INDEX views_ts ON views (ts);

-- Links off the site that were clicked, by page view.
CREATE TABLE clicks (
  view TEXT NOT NULL,
  ts INTEGER NOT NULL,
  href TEXT NOT NULL
);
CREATE INDEX clicks_ts ON clicks (ts);

-- Today's salt only; older ones are deleted as soon as a new day starts.
CREATE TABLE salts (
  day TEXT PRIMARY KEY,
  salt TEXT NOT NULL
);

-- Sign-in links and sessions, stored as SHA-256 hashes, never in the clear.
CREATE TABLE tokens (
  hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL,       -- 'link' | 'session'
  expires INTEGER NOT NULL
);

CREATE TABLE meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
