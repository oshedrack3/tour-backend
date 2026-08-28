CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'player',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS competitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,

    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    competition_id TEXT,
    owner_id TEXT NOT NULL,

    name TEXT NOT NULL,
    season TEXT,
    format TEXT,
    status TEXT,

    settings TEXT,

    created_at INTEGER NOT NULL,
    updated_at INTEGER,

    FOREIGN KEY (competition_id) REFERENCES competitions(id),
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,

    name TEXT NOT NULL,
    logo TEXT,

    created_at INTEGER NOT NULL,

    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);

CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,

    name TEXT NOT NULL,
    team_id TEXT,

    created_at INTEGER NOT NULL,

    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,

    home_team_id TEXT,
    away_team_id TEXT,

    home_score INTEGER,
    away_score INTEGER,

    status TEXT,

    match_type TEXT,
    round TEXT,
    group_name TEXT,

    scheduled_at INTEGER,
    played_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,

    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
    FOREIGN KEY (away_team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,

    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
