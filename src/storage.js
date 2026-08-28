export async function getUserById(db, id) {
  return await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first();
}
export async function getUserByUsername(db, username) {
  return await db
    .prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)")
    .bind(username)
    .first();
}
export async function getCompetition(db, id) {
  return await db
    .prepare("SELECT * FROM competitions WHERE id = ?")
    .bind(id)
    .first();
}
export async function getCompetitionsByOwner(db, ownerId) {
  const result = await db
    .prepare(`
      SELECT *
      FROM competitions
      WHERE owner_id = ?
      ORDER BY created_at DESC
    `)
    .bind(ownerId)
    .all();
  return result.results || [];
}
export async function getTournament(db, tournamentId, userId) {
  return await db
    .prepare(`
      SELECT t.*
      FROM tournaments t
      WHERE t.id = ?
      AND (
        t.owner_id = ?
        OR EXISTS (
          SELECT 1
          FROM tournament_players tp
          WHERE tp.tournament_id = t.id
          AND tp.user_id = ?
        )
      )
    `)
    .bind(tournamentId, userId, userId)
    .first();
}
export async function getTournamentForUser(db, id, userId) {
  return await db
    .prepare(`
      SELECT t.*
      FROM tournaments t
      WHERE t.id = ?
      AND (
        t.owner_id = ?
        OR EXISTS (
          SELECT 1
          FROM tournament_players tp
          WHERE tp.tournament_id = t.id
          AND tp.user_id = ?
        )
      )
    `)
    .bind(id, userId, userId)
    .first();
}
export async function getTournamentsByOwner(db, ownerId) {
  const result = await db
    .prepare(`
      SELECT *
      FROM tournaments
      WHERE owner_id = ?
      ORDER BY created_at DESC
    `)
    .bind(ownerId)
    .all();
  return result.results || [];
}
export async function getTournamentsByPlayer(db, userId) {
  const result = await db
    .prepare(`
      SELECT t.*
      FROM tournaments t
      INNER JOIN tournament_players tp
        ON tp.tournament_id = t.id
      WHERE tp.user_id = ?
      ORDER BY t.created_at DESC
    `)
    .bind(userId)
    .all();
  return result.results || [];
}
export async function createTournament(db, tournament) {
  await db
    .prepare(`
      INSERT INTO tournaments (
        id,
        competition_id,
        owner_id,
        name,
        season,
        format,
        status,
        settings,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      tournament.id,
      tournament.competition_id || null,
      tournament.owner_id,
      tournament.name,
      tournament.season || null,
      tournament.format || null,
      tournament.status || "upcoming",
      tournament.settings
        ? JSON.stringify(tournament.settings)
        : null,
      tournament.created_at,
      tournament.updated_at || null
    )
    .run();
  return await getTournament(db, tournament.id);
}
export async function updateTournament(db, id, updates) {
  const fields = [];
  const values = [];
  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.competition_id !== undefined) {
    fields.push("competition_id = ?");
    values.push(updates.competition_id);
  }
  if (updates.season !== undefined) {
    fields.push("season = ?");
    values.push(updates.season);
  }
  if (updates.format !== undefined) {
    fields.push("format = ?");
    values.push(updates.format);
  }
  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  if (updates.settings !== undefined) {
    fields.push("settings = ?");
    values.push(JSON.stringify(updates.settings));
  }
  if (!fields.length) {
    return await getTournament(db, id);
  }
  fields.push("updated_at = ?");
  values.push(Date.now());
  values.push(id);
  await db
    .prepare(`
      UPDATE tournaments
      SET ${fields.join(", ")}
      WHERE id = ?
    `)
    .bind(...values)
    .run();
  return await getTournament(db, id);
}
export async function deleteTournament(db, id) {
  await db
    .prepare("DELETE FROM matches WHERE tournament_id = ?")
    .bind(id)
    .run();
  await db
    .prepare("DELETE FROM players WHERE tournament_id = ?")
    .bind(id)
    .run();
  await db
    .prepare("DELETE FROM tournament_players WHERE tournament_id = ?")
    .bind(id)
    .run();
  await db
    .prepare("DELETE FROM teams WHERE tournament_id = ?")
    .bind(id)
    .run();
  await db
    .prepare("DELETE FROM tournaments WHERE id = ?")
    .bind(id)
    .run();
  return true;
}
export async function getTeam(db, id, userId) {
  return await db
    .prepare(`
      SELECT tm.*
      FROM teams tm
      INNER JOIN tournaments t
        ON t.id = tm.tournament_id
      WHERE tm.id = ?
      AND (
        t.owner_id = ?
        OR EXISTS (
          SELECT 1
          FROM tournament_players tp
          WHERE tp.tournament_id = t.id
          AND tp.user_id = ?
        )
      )
    `)
    .bind(id, userId, userId)
    .first();
}


export async function getTeams(db, tournamentId, userId) {
  const result = await db
    .prepare(`
      SELECT tm.*
      FROM teams tm
      INNER JOIN tournaments t
        ON t.id = tm.tournament_id
      WHERE tm.tournament_id = ?
      AND (
        t.owner_id = ?
        OR EXISTS (
          SELECT 1
          FROM tournament_players tp
          WHERE tp.tournament_id = t.id
          AND tp.user_id = ?
        )
      )
      ORDER BY tm.created_at ASC
    `)
    .bind(tournamentId, userId, userId)
    .all();
  
  return result.results || [];
}
export async function createTeam(db, team, userId) {
  const tournament = await getTournament(
    db,
    team.tournament_id,
    userId
  );
  
  if (!tournament) {
    return null;
  }
  
  await db
    .prepare(`
      INSERT INTO teams (
        id,
        tournament_id,
        name,
        logo,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(
      team.id,
      team.tournament_id,
      team.name,
      team.logo || null,
      team.created_at
    )
    .run();
  
  return await getTeam(
    db,
    team.id,
    userId
  );
}
export async function updateTeam(db, id, updates, userId) {
  const team = await getTeam(
    db,
    id,
    userId
  );
  
  if (!team) {
    return null;
  }
  
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  
  if (updates.logo !== undefined) {
    fields.push("logo = ?");
    values.push(updates.logo);
  }
  
  if (!fields.length) {
    return team;
  }
  
  values.push(id);
  
  await db
    .prepare(`
      UPDATE teams
      SET ${fields.join(", ")}
      WHERE id = ?
    `)
    .bind(...values)
    .run();
  
  return await getTeam(
    db,
    id,
    userId
  );
}
export async function deleteTeam(db, id, userId) {
  const team = await getTeam(
    db,
    id,
    userId
  );
  
  if (!team) {
    return false;
  }
  
  await db
    .prepare(`
      DELETE FROM teams
      WHERE id = ?
    `)
    .bind(id)
    .run();
  
  return true;
}

export async function getMatch(db, id) {
  return await db
    .prepare(`
      SELECT *
      FROM matches
      WHERE id = ?
    `)
    .bind(id)
    .first();
}
export async function getMatches(db, tournamentId) {
  const result = await db
    .prepare(`
      SELECT *
      FROM matches
      WHERE tournament_id = ?
      ORDER BY created_at ASC
    `)
    .bind(tournamentId)
    .all();
  return result.results || [];
}
export async function createMatch(db, match) {
  await db
    .prepare(`
      INSERT INTO matches (
        id,
        tournament_id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        status,
        match_type,
        round,
        group_name,
        scheduled_at,
        played_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      match.id,
      match.tournament_id,
      match.home_team_id || null,
      match.away_team_id || null,
      match.home_score ?? null,
      match.away_score ?? null,
      match.status || "scheduled",
      match.match_type || null,
      match.round || null,
      match.group_name || null,
      match.scheduled_at || null,
      match.played_at || null,
      match.created_at,
      match.updated_at || null
    )
    .run();
  return await getMatch(db, match.id);
}
export async function updateMatch(db, id, updates) {
  const fields = [];
  const values = [];
  if (updates.home_team_id !== undefined) {
    fields.push("home_team_id = ?");
    values.push(updates.home_team_id);
  }
  if (updates.away_team_id !== undefined) {
    fields.push("away_team_id = ?");
    values.push(updates.away_team_id);
  }
  if (updates.home_score !== undefined) {
    fields.push("home_score = ?");
    values.push(updates.home_score);
  }
  if (updates.away_score !== undefined) {
    fields.push("away_score = ?");
    values.push(updates.away_score);
  }
  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  if (updates.match_type !== undefined) {
    fields.push("match_type = ?");
    values.push(updates.match_type);
  }
  if (updates.round !== undefined) {
    fields.push("round = ?");
    values.push(updates.round);
  }
  if (updates.group_name !== undefined) {
    fields.push("group_name = ?");
    values.push(updates.group_name);
  }
  if (updates.scheduled_at !== undefined) {
    fields.push("scheduled_at = ?");
    values.push(updates.scheduled_at);
  }
  if (updates.played_at !== undefined) {
    fields.push("played_at = ?");
    values.push(updates.played_at);
  }
  if (!fields.length) {
    return await getMatch(db, id);
  }
  fields.push("updated_at = ?");
  values.push(Date.now());
  values.push(id);
  await db
    .prepare(`
      UPDATE matches
      SET ${fields.join(", ")}
      WHERE id = ?
    `)
    .bind(...values)
    .run();
  return await getMatch(db, id);
}
export async function deleteMatch(db, id) {
  await db
    .prepare(`
      DELETE FROM matches
      WHERE id = ?
    `)
    .bind(id)
    .run();
  return true;
}
