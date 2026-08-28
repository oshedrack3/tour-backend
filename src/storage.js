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
    .prepare(`
      SELECT *
      FROM competitions
      WHERE id = ?
    `)
    .bind(id)
    .first();
}

export async function getCompetitionsByOwner(
  db,
  ownerId
) {
  const result = await db
    .prepare(`
      SELECT
        id,
        name,
        owner_id,
        logo_url,
        logo_public_id,
        tournament_count,
        active_seasons,
        created_at,
        updated_at
      FROM competitions
      WHERE owner_id = ?
      ORDER BY created_at DESC
    `)
    .bind(ownerId)
    .all();
  
  return result.results || [];
}

export async function createCompetition(
  db,
  competition
) {
  await db
    .prepare(`
      INSERT INTO competitions (
        id,
        name,
        owner_id,
        logo_url,
        logo_public_id,
        tournament_count,
        active_seasons,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      competition.id,
      competition.name,
      competition.owner_id,
      competition.logo_url || null,
      competition.logo_public_id || null,
      competition.tournament_count ?? 0,
      competition.active_seasons ?? 0,
      competition.created_at,
      competition.updated_at || null
    )
    .run();
  
  return await getCompetition(
    db,
    competition.id
  );
}

export async function getTournament(db, tournamentId, userId) {
  if (userId) {
    return await db
      .prepare(`
        SELECT t.*
        FROM tournaments t
        WHERE t.id = ?
        AND (
          t.admin_uid = ?
          OR EXISTS (
            SELECT 1
            FROM tournament_players tp
            WHERE tp.tournament_id = t.id
            AND tp.user_id = ?
          )
        )
      `)
      .bind(
        tournamentId,
        userId,
        userId
      )
      .first();
  }
  
  return await db
    .prepare(`
      SELECT *
      FROM tournaments
      WHERE id = ?
    `)
    .bind(tournamentId)
    .first();
}

export async function getTournamentForUser(
  db,
  id,
  userId
) {
  return await db
    .prepare(`
      SELECT t.*
      FROM tournaments t
      WHERE t.id = ?
      AND (
        t.admin_uid = ?
        OR EXISTS (
          SELECT 1
          FROM tournament_players tp
          WHERE tp.tournament_id = t.id
          AND tp.user_id = ?
        )
      )
    `)
    .bind(
      id,
      userId,
      userId
    )
    .first();
}

export async function getTournamentsByOwner(
  db,
  adminUid
) {
  const result = await db
    .prepare(`
      SELECT *
      FROM tournaments
      WHERE admin_uid = ?
      ORDER BY created_at DESC
    `)
    .bind(adminUid)
    .all();
  
  return result.results || [];
}

export async function getTournamentsByPlayer(
  db,
  userId
) {
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

export async function createTournament(
  db,
  tournament
) {
  await db
    .prepare(`
      INSERT INTO tournaments (
        id,
        competition_id,
        admin_uid,
        name,
        season,
        format,
        season_status,
        champion,
        champion_name,
        start_date,
        end_date,
        match_days,
        tournament_image,
        settings,
        access_type,
        is_public,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?
      )
    `)
    .bind(
      tournament.id,
      tournament.competition_id,
      tournament.admin_uid,
      tournament.name,
      tournament.season,
      tournament.format,
      tournament.season_status || "upcoming",
      tournament.champion || null,
      tournament.champion_name || null,
      tournament.start_date || null,
      tournament.end_date || null,
      tournament.match_days || "[]",
      tournament.tournament_image || null,
      tournament.settings || "{}",
      tournament.access_type || null,
      tournament.is_public ?? null,
      tournament.created_at,
      tournament.updated_at || null
    )
    .run();
  
  return await getTournament(
    db,
    tournament.id,
    tournament.admin_uid
  );
}

export async function updateTournament(
  db,
  id,
  updates,
  userId
) {
  const existing =
    await getTournament(
      db,
      id,
      userId
    );
  
  if (!existing) {
    return null;
  }
  
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  
  if (
    updates.competition_id !== undefined
  ) {
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
  
  if (
    updates.season_status !== undefined
  ) {
    fields.push("season_status = ?");
    values.push(updates.season_status);
  }
  
  if (updates.champion !== undefined) {
    fields.push("champion = ?");
    values.push(updates.champion);
  }
  
  if (
    updates.champion_name !== undefined
  ) {
    fields.push("champion_name = ?");
    values.push(updates.champion_name);
  }
  
  if (updates.start_date !== undefined) {
    fields.push("start_date = ?");
    values.push(updates.start_date);
  }
  
  if (updates.end_date !== undefined) {
    fields.push("end_date = ?");
    values.push(updates.end_date);
  }
  
  if (updates.match_days !== undefined) {
    fields.push("match_days = ?");
    values.push(
      typeof updates.match_days === "string" ?
      updates.match_days :
      JSON.stringify(
        updates.match_days
      )
    );
  }
  
  if (
    updates.tournament_image !== undefined
  ) {
    fields.push("tournament_image = ?");
    values.push(
      updates.tournament_image
    );
  }
  
  if (updates.settings !== undefined) {
    fields.push("settings = ?");
    values.push(
      typeof updates.settings === "string" ?
      updates.settings :
      JSON.stringify(
        updates.settings
      )
    );
  }
  
  if (
    updates.access_type !== undefined
  ) {
    fields.push("access_type = ?");
    values.push(updates.access_type);
  }
  
  if (updates.is_public !== undefined) {
    fields.push("is_public = ?");
    values.push(
      updates.is_public ? 1 : 0
    );
  }
  
  if (!fields.length) {
    return existing;
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
  
  return await getTournament(
    db,
    id,
    userId
  );
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
        t.admin_uid = ?
        OR tm.owner_uid = ?
        OR EXISTS (
          SELECT 1
          FROM tournament_players tp
          WHERE tp.tournament_id = t.id
          AND tp.user_id = ?
        )
      )
    `)
    .bind(id, userId, userId, userId)
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
        t.admin_uid = ?
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
  const tournament = await db
    .prepare(`
      SELECT id, admin_uid
      FROM tournaments
      WHERE id = ?
      AND admin_uid = ?
    `)
    .bind(
      team.tournament_id,
      userId
    )
    .first();
  if (!tournament) {
    return null;
  }
  await db
    .prepare(`
      INSERT INTO teams (
        id,
        tournament_id,
        owner_uid,
        name,
        logo,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      team.id,
      team.tournament_id,
      team.owner_uid || null,
      team.name,
      team.logo || null,
      team.created_at,
      team.updated_at || team.created_at
    )
    .run();
  return await db
    .prepare(`
      SELECT *
      FROM teams
      WHERE id = ?
    `)
    .bind(team.id)
    .first();
}
export async function updateTeam(db, id, updates, userId) {
  const team = await db
    .prepare(`
      SELECT
        tm.*,
        t.admin_uid
      FROM teams tm
      INNER JOIN tournaments t
        ON t.id = tm.tournament_id
      WHERE tm.id = ?
      AND (
        t.admin_uid = ?
        OR tm.owner_uid = ?
      )
    `)
    .bind(id, userId, userId)
    .first();
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
  if (updates.owner_uid !== undefined) {
    fields.push("owner_uid = ?");
    values.push(updates.owner_uid || null);
  }
  if (updates.updated_at !== undefined) {
    fields.push("updated_at = ?");
    values.push(updates.updated_at);
  }
  if (!fields.length) {
    return await getTeam(db, id, userId);
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
  return await getTeam(db, id, userId);
}
export async function deleteTeam(db, id, userId) {
  const team = await db
    .prepare(`
      SELECT
        tm.id,
        t.admin_uid,
        tm.owner_uid
      FROM teams tm
      INNER JOIN tournaments t
        ON t.id = tm.tournament_id
      WHERE tm.id = ?
      AND (
        t.admin_uid = ?
        OR tm.owner_uid = ?
      )
    `)
    .bind(id, userId, userId)
    .first();
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
