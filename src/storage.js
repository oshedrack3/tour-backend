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

export async function getMyTeams(
  db,
  userId
) {
  const result =
    await db
    .prepare(`
        SELECT
          id,
          owner_uid,
          name,
          logo,
          created_at,
          updated_at
        FROM teams
        WHERE owner_uid = ?
        ORDER BY created_at ASC
      `)
    .bind(userId)
    .all();
  
  return result.results || [];
}
export async function getTeam(
  db,
  id,
  userId
) {
  return await db
    .prepare(`
      SELECT *
      FROM teams
      WHERE id = ?
      AND owner_uid = ?
    `)
    .bind(
      id,
      userId
    )
    .first();
}
export async function getTeams(
  db,
  userId
) {
  const result =
    await db
    .prepare(`
        SELECT *
        FROM teams
        WHERE owner_uid = ?
        ORDER BY created_at ASC
      `)
    .bind(userId)
    .all();
  
  return result.results || [];
}
export async function createTeam(
  db,
  team,
  userId,
  userRole
) {
  const countResult =
    await db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM teams
        WHERE owner_uid = ?
      `)
      .bind(userId)
      .first();

  const teamCount =
    Number(countResult?.count) || 0;

  const maxTeams =
    userRole === "admin"
      ? 20
      : 1;

  if (teamCount >= maxTeams) {
    return {
      success: false,
      message:
        userRole === "admin"
          ? "You can create a maximum of 20 teams."
          : "You can create only one team."
    };
  }

  await db
    .prepare(`
      INSERT INTO teams (
        id,
        owner_uid,
        name,
        logo,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(
      team.id,
      userId,
      team.name,
      team.logo || null,
      team.created_at,
      team.updated_at ||
        team.created_at
    )
    .run();

  const createdTeam =
    await db
      .prepare(`
        SELECT *
        FROM teams
        WHERE id = ?
        AND owner_uid = ?
      `)
      .bind(
        team.id,
        userId
      )
      .first();

  return {
    success: true,
    team: createdTeam
  };
}
export async function updateTeam(
  db,
  id,
  updates,
  userId
) {
  const team =
    await db
    .prepare(`
        SELECT *
        FROM teams
        WHERE id = ?
        AND owner_uid = ?
      `)
    .bind(
      id,
      userId
    )
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
  
  if (updates.updated_at !== undefined) {
    fields.push("updated_at = ?");
    values.push(updates.updated_at);
  }
  
  if (!fields.length) {
    return team;
  }
  
  values.push(id);
  values.push(userId);
  
  await db
    .prepare(`
      UPDATE teams
      SET ${fields.join(", ")}
      WHERE id = ?
      AND owner_uid = ?
    `)
    .bind(...values)
    .run();
  
  return await getTeam(
    db,
    id,
    userId
  );
}
export async function deleteTeam(
  db,
  id,
  userId
) {
  const team =
    await db
      .prepare(`
        SELECT id
        FROM teams
        WHERE id = ?
        AND owner_uid = ?
      `)
      .bind(
        id,
        userId
      )
      .first();

  if (!team) {
    return {
      success: false,
      message:
        "Team not found or access denied."
    };
  }

  const participation =
    await db
      .prepare(`
        SELECT 1
        FROM tournament_players
        WHERE team_id = ?
        LIMIT 1
      `)
      .bind(id)
      .first();

  if (participation) {
    return {
      success: false,
      message:
        "This team cannot be deleted because it has participated in a tournament."
    };
  }

  await db
    .prepare(`
      DELETE FROM teams
      WHERE id = ?
      AND owner_uid = ?
    `)
    .bind(
      id,
      userId
    )
    .run();

  return {
    success: true,
    message:
      "Team deleted successfully."
  };
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
        played,
        played_at,
        match_type,
        group_id,
        round,
        round_index,
        slot,
        winner_team_id,
        scheduled_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      match.id,
      match.tournament_id,
      match.home_team_id || null,
      match.away_team_id || null,
      match.home_score ?? null,
      match.away_score ?? null,
      match.played ?? 0,
      match.played_at || null,
      match.match_type,
      match.group_id || null,
      match.round || null,
      match.round_index ?? null,
      match.slot ?? null,
      match.winner_team_id || null,
      match.scheduled_at || null,
      match.created_at,
      match.updated_at || null
    )
    .run();
  return match;
}
export async function createMatchesBatch(db, matches) {
  if (!matches.length) return;
  const statements = matches.map(match =>
    db
    .prepare(`
        INSERT INTO matches (
          id,
          tournament_id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          played,
          played_at,
          match_type,
          group_id,
          round,
          round_index,
          slot,
          winner_team_id,
          scheduled_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
    .bind(
      match.id,
      match.tournament_id,
      match.home_team_id || null,
      match.away_team_id || null,
      match.home_score ?? null,
      match.away_score ?? null,
      match.played ?? 0,
      match.played_at || null,
      match.match_type,
      match.group_id || null,
      match.round || null,
      match.round_index ?? null,
      match.slot ?? null,
      match.winner_team_id || null,
      match.scheduled_at || null,
      match.created_at,
      match.updated_at || null
    )
  );
  await db.batch(statements);
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
  if (updates.played !== undefined) {
    fields.push("played = ?");
    values.push(updates.played);
  }
  if (updates.played_at !== undefined) {
    fields.push("played_at = ?");
    values.push(updates.played_at);
  }
  if (updates.match_type !== undefined) {
    fields.push("match_type = ?");
    values.push(updates.match_type);
  }
  if (updates.group_id !== undefined) {
    fields.push("group_id = ?");
    values.push(updates.group_id);
  }
  if (updates.round !== undefined) {
    fields.push("round = ?");
    values.push(updates.round);
  }
  if (updates.round_index !== undefined) {
    fields.push("round_index = ?");
    values.push(updates.round_index);
  }
  if (updates.slot !== undefined) {
    fields.push("slot = ?");
    values.push(updates.slot);
  }
  if (updates.winner_team_id !== undefined) {
    fields.push("winner_team_id = ?");
    values.push(updates.winner_team_id);
  }
  if (updates.scheduled_at !== undefined) {
    fields.push("scheduled_at = ?");
    values.push(updates.scheduled_at);
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
export async function getTeamsByTournament(
  db,
  tournamentId
) {
  const result =
    await db
    .prepare(`
        SELECT DISTINCT
          t.id,
          t.name,
          t.logo
        FROM teams t
        INNER JOIN tournament_players tp
          ON tp.team_id = t.id
        WHERE tp.tournament_id = ?
        ORDER BY t.created_at ASC
      `)
    .bind(tournamentId)
    .all();
  
  return result.results || [];
}


export async function getTournamentPlayer(
  db,
  tournamentId,
  userId,
  teamId
) {
  return await db
    .prepare(`
      SELECT
        tp.*,
        t.name AS team_name,
        t.logo AS team_logo
      FROM tournament_players tp
      LEFT JOIN teams t
        ON t.id = tp.team_id
      WHERE tp.tournament_id = ?
      AND tp.user_id = ?
      AND tp.team_id = ?
    `)
    .bind(
      tournamentId,
      userId,
      teamId
    )
    .first();
}
export async function getTournamentPlayers(
  db,
  tournamentId
) {
  const result =
    await db
    .prepare(`
        SELECT
          tp.*,
          t.name AS team_name,
          t.logo AS team_logo
        FROM tournament_players tp
        LEFT JOIN teams t
          ON t.id = tp.team_id
        WHERE tp.tournament_id = ?
        ORDER BY tp.joined_at ASC
      `)
    .bind(
      tournamentId
    )
    .all();
  
  return result.results || [];
}
export async function getTournamentPlayersByUser(
  db,
  tournamentId,
  userId
) {
  const result =
    await db
    .prepare(`
        SELECT
          tp.*,
          t.name AS team_name,
          t.logo AS team_logo
        FROM tournament_players tp
        LEFT JOIN teams t
          ON t.id = tp.team_id
        WHERE tp.tournament_id = ?
        AND tp.user_id = ?
        ORDER BY tp.joined_at ASC
      `)
    .bind(
      tournamentId,
      userId
    )
    .all();
  
  return result.results || [];
}
export async function updateTournamentPlayer(
  db,
  tournamentId,
  userId,
  updates
) {
  const fields = [];
  const values = [];
  
  if (updates.team_id !== undefined) {
    fields.push("team_id = ?");
    values.push(updates.team_id);
  }
  
  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  
  if (updates.joined_at !== undefined) {
    fields.push("joined_at = ?");
    values.push(updates.joined_at);
  }
  
  if (updates.responded_at !== undefined) {
    fields.push("responded_at = ?");
    values.push(updates.responded_at);
  }
  
  if (
    updates.has_new_invitation !== undefined
  ) {
    fields.push(
      "has_new_invitation = ?"
    );
    values.push(
      updates.has_new_invitation
    );
  }
  
  if (
    updates.invitation_count !== undefined
  ) {
    fields.push(
      "invitation_count = ?"
    );
    values.push(
      updates.invitation_count
    );
  }
  
  if (!fields.length) {
    return await getTournamentPlayer(
      db,
      tournamentId,
      userId
    );
  }
  
  values.push(tournamentId);
  values.push(userId);
  
  await db
    .prepare(`
      UPDATE tournament_players
      SET ${fields.join(", ")}
      WHERE tournament_id = ?
      AND user_id = ?
    `)
    .bind(...values)
    .run();
  
  return await getTournamentPlayer(
    db,
    tournamentId,
    userId
  );
}

export async function updateTournamentPlayerStats(
  db,
  tournamentId,
  teamId,
  stats
) {
  const fields = [];
  const values = [];
  
  if (stats.played !== undefined) {
    fields.push("played = ?");
    values.push(stats.played);
  }
  
  if (stats.wins !== undefined) {
    fields.push("wins = ?");
    values.push(stats.wins);
  }
  
  if (stats.draws !== undefined) {
    fields.push("draws = ?");
    values.push(stats.draws);
  }
  
  if (stats.losses !== undefined) {
    fields.push("losses = ?");
    values.push(stats.losses);
  }
  
  if (stats.gf !== undefined) {
    fields.push("gf = ?");
    values.push(stats.gf);
  }
  
  if (stats.ga !== undefined) {
    fields.push("ga = ?");
    values.push(stats.ga);
  }
  
  if (stats.points !== undefined) {
    fields.push("points = ?");
    values.push(stats.points);
  }
  
  if (!fields.length) {
    return null;
  }
  
  fields.push("updated_at = ?");
  values.push(Date.now());
  
  values.push(tournamentId);
  values.push(teamId);
  
  await db
    .prepare(`
      UPDATE tournament_players
      SET ${fields.join(", ")}
      WHERE tournament_id = ?
      AND team_id = ?
    `)
    .bind(...values)
    .run();
  
  return await db
    .prepare(`
      SELECT *
      FROM tournament_players
      WHERE tournament_id = ?
      AND team_id = ?
    `)
    .bind(
      tournamentId,
      teamId
    )
    .first();
}

export async function getTournamentPlayerByTeam(
  db,
  tournamentId,
  teamId
) {
  return await db
    .prepare(`
      SELECT *
      FROM tournament_players
      WHERE tournament_id = ?
      AND team_id = ?
    `)
    .bind(
      tournamentId,
      teamId
    )
    .first();
}

export async function updateMatchResultAtomic(
  db,
  matchId,
  matchUpdates,
  homeTeamId,
  awayTeamId,
  homeStats,
  awayStats,
  tournamentId
) {
  const now = Date.now();
  
  const statements = [
    db
    .prepare(`
        UPDATE matches
        SET
          home_score = ?,
          away_score = ?,
          played = ?,
          played_at = ?,
          winner_team_id = ?,
          updated_at = ?
        WHERE id = ?
        AND tournament_id = ?
      `)
    .bind(
      matchUpdates.home_score,
      matchUpdates.away_score,
      matchUpdates.played,
      matchUpdates.played_at,
      matchUpdates.winner_team_id,
      now,
      matchId,
      tournamentId
    ),
    
    db
    .prepare(`
        UPDATE tournament_players
        SET
          played = ?,
          wins = ?,
          draws = ?,
          losses = ?,
          gf = ?,
          ga = ?,
          points = ?
        WHERE tournament_id = ?
        AND team_id = ?
      `)
    .bind(
      homeStats.played,
      homeStats.wins,
      homeStats.draws,
      homeStats.losses,
      homeStats.gf,
      homeStats.ga,
      homeStats.points,
      tournamentId,
      homeTeamId
    ),
    
    db
    .prepare(`
        UPDATE tournament_players
        SET
          played = ?,
          wins = ?,
          draws = ?,
          losses = ?,
          gf = ?,
          ga = ?,
          points = ?
        WHERE tournament_id = ?
        AND team_id = ?
      `)
    .bind(
      awayStats.played,
      awayStats.wins,
      awayStats.draws,
      awayStats.losses,
      awayStats.gf,
      awayStats.ga,
      awayStats.points,
      tournamentId,
      awayTeamId
    )
  ];
  
  await db.batch(statements);
  
  const [
    updatedMatch,
    updatedHomePlayer,
    updatedAwayPlayer
  ] = await Promise.all([
    db
    .prepare(`
        SELECT *
        FROM matches
        WHERE id = ?
        AND tournament_id = ?
      `)
    .bind(
      matchId,
      tournamentId
    )
    .first(),
    
    db
    .prepare(`
        SELECT
          tp.*,
          tm.name AS team_name,
          tm.logo AS team_logo
        FROM tournament_players tp
        INNER JOIN teams tm
          ON tm.id = tp.team_id
        WHERE tp.tournament_id = ?
        AND tp.team_id = ?
      `)
    .bind(
      tournamentId,
      homeTeamId
    )
    .first(),
    
    db
    .prepare(`
        SELECT
          tp.*,
          tm.name AS team_name,
          tm.logo AS team_logo
        FROM tournament_players tp
        INNER JOIN teams tm
          ON tm.id = tp.team_id
        WHERE tp.tournament_id = ?
        AND tp.team_id = ?
      `)
    .bind(
      tournamentId,
      awayTeamId
    )
    .first()
  ]);
  
  return {
    match: updatedMatch,
    players: [
      updatedHomePlayer,
      updatedAwayPlayer
    ]
  };
}