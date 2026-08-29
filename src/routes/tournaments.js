import {
  getTournament,
  getTournamentsByOwner,
  getTournamentsByPlayer,
  createTournament,
  getTeamsByTournament,
  createMatchesBatch,
  getMatches,
  getMatch,
  updateMatchResultAtomic,
  getTournamentPlayerByTeam
} from "../storage.js";
import {
  uploadBase64Image
} from "../cloudinary.js";

export async function handleTournamentRequest(
  request,
  env,
  user
) {
  const url = new URL(request.url);
  const pathname =
    url.pathname.replace(/\/+$/, "") || "/";
  
  if (
    request.method === "POST" &&
    pathname === "/tournaments/create"
  ) {
    return await createTournamentRoute(
      request,
      env,
      user
    );
  }
  
  if (
  request.method === "GET" &&
  /^\/tournaments\/[^/]+\/matches$/.test(pathname)
) {
  const id = pathname.split("/")[2];
  
  return await getTournamentMatchesRoute(
    env,
    id,
    user
  );
}

if (
  request.method === "POST" &&
  /^\/tournaments\/[^/]+\/matches\/[^/]+\/result$/.test(pathname)
) {
  const parts = pathname.split("/");
  
  const tournamentId = parts[2];
  const matchId = parts[4];
  
  return await updateMatchResultRoute(
    request,
    env,
    tournamentId,
    matchId,
    user
  );
}

if (
  request.method === "GET" &&
  /^\/tournaments\/[^/]+\/table$/.test(pathname)
) {
  const id = pathname.split("/")[2];
  
  return await getTournamentTableRoute(
    env,
    id,
    user
  );
}
  
  if (
    request.method === "GET" &&
    pathname === "/tournaments/my"
  ) {
    return await getMyTournamentsRoute(
      env,
      user
    );
  }
  
  if (
    request.method === "POST" &&
    /^\/tournaments\/[^/]+\/generate-fixtures$/.test(pathname)
  ) {
    const id = pathname.split("/")[2];
    return await generateFixturesRoute(
      request,
      env,
      id,
      user
    );
  }
  if (
  request.method === "GET" &&
  /^\/tournaments\/[^/]+\/matches$/.test(pathname)
) {
  const id = pathname.split("/")[2];
  
  return await getTournamentMatchesRoute(
    env,
    id,
    user
  );
}
  
  if (
  request.method === "PUT" &&
  /^\/matches\/[^/]+$/.test(pathname)
) {
  const matchId =
    pathname.split("/")[2];
  
  return await updateMatchRoute(
    request,
    env,
    matchId,
    user
  );
}
if (
  request.method === "PUT" &&
  /^\/tournaments\/[^/]+\/players\/team$/.test(pathname)
) {
  const tournamentId =
    pathname.split("/")[2];
  
  return await assignTournamentTeamRoute(
    request,
    env,
    tournamentId,
    user
  );
}
  
  if (
    request.method === "GET" &&
    /^\/tournaments\/[^/]+\/table$/.test(pathname)
  ) {
    const id = pathname.split("/")[2];
    
    return await getTournamentTableRoute(
      env,
      id,
      user
    );
  }
  
  if (
    request.method === "GET" &&
    pathname.startsWith("/tournaments/")
  ) {
    const id = pathname.split("/")[2];
    
    if (id) {
      return await getTournamentRoute(
        env,
        id,
        user
      );
    }
  }
  
  return null;
}


async function createTournamentRoute(
  request,
  env,
  user
) {
  try {
    const body = await request.json();
    
    const competition_id =
      String(body.competition_id || "").trim();
    
    const name =
      String(body.name || "").trim();
    
    const season =
      String(body.season || "").trim();
    
    const format =
      String(body.format || "").trim();
    
    const season_status =
      String(
        body.season_status ||
        body.status ||
        "upcoming"
      ).trim();
    
    const champion =
      body.champion || null;
    
    const champion_name =
      body.champion_name || null;
    
    const start_date =
      body.start_date || null;
    
    const end_date =
      body.end_date || null;
    
    const match_days =
      body.match_days ?? "[]";
    
    const access_type =
      body.access_type || null;
    
    const is_public =
      body.is_public === undefined ?
      null :
      body.is_public ?
      1 :
      0;
    
    const settings =
      body.settings || {};
    
    const tournamentImage =
      body.tournament_image ||
      body.tournamentImage ||
      body.image ||
      null;
    
    if (!competition_id) {
      return Response.json({
        success: false,
        message: "Competition ID is required."
      }, {
        status: 400
      });
    }
    
    if (!name) {
      return Response.json({
        success: false,
        message: "Tournament name is required."
      }, {
        status: 400
      });
    }
    
    if (!season) {
      return Response.json({
        success: false,
        message: "Season is required."
      }, {
        status: 400
      });
    }
    
    if (!format) {
      return Response.json({
        success: false,
        message: "Tournament format is required."
      }, {
        status: 400
      });
    }
    
    const id = crypto.randomUUID();
    
    const competition =
      await env.DB
      .prepare(`
          SELECT id, owner_id
          FROM competitions
          WHERE id = ?
        `)
      .bind(competition_id)
      .first();
    
    if (!competition) {
      return Response.json({
        success: false,
        message: "Competition not found."
      }, {
        status: 404
      });
    }
    
    if (competition.owner_id !== user.id) {
      return Response.json({
        success: false,
        message: "Access denied."
      }, {
        status: 403
      });
    }
    
    let tournamentImageData = null;
    
    if (tournamentImage) {
      if (
        typeof tournamentImage !== "string" ||
        !tournamentImage.startsWith("data:image/")
      ) {
        return Response.json({
          success: false,
          message: "Invalid tournament image."
        }, {
          status: 400
        });
      }
      
      tournamentImageData =
        await uploadBase64Image(
          tournamentImage,
          "tournaments",
          id,
          env
        );
    }
    
    const now = Date.now();
    
    const tournament =
      await createTournament(
        env.DB,
        {
          id,
          competition_id,
          admin_uid: user.id,
          name,
          season,
          format,
          season_status,
          champion,
          champion_name,
          start_date,
          end_date,
          match_days: typeof match_days === "string" ?
            match_days :
            JSON.stringify(match_days),
          tournament_image: tournamentImageData?.url || null,
          settings: typeof settings === "string" ?
            settings :
            JSON.stringify(settings),
          access_type,
          is_public,
          created_at: now,
          updated_at: now
        }
      );
    
    await env.DB
      .prepare(`
        UPDATE competitions
        SET tournament_count = tournament_count + 1,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(
        now,
        competition_id
      )
      .run();
    
    return Response.json({
      success: true,
      tournament: parseTournament(tournament)
    }, {
      status: 201
    });
    
  } catch (error) {
    console.error(
      "Create tournament error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to create tournament."
    }, {
      status: 500
    });
  }
}

async function getMyTournamentsRoute(
  env,
  user
) {
  let tournaments;
  
  if (user.role === "admin") {
    tournaments =
      await getTournamentsByOwner(
        env.DB,
        user.id
      );
  } else {
    tournaments =
      await getTournamentsByPlayer(
        env.DB,
        user.id
      );
  }
  
  tournaments =
    tournaments.map(parseTournament);
  
  return Response.json({
    success: true,
    tournaments
  });
}

async function getTournamentRoute(
  env,
  id,
  user
) {
  const tournament =
    await getTournament(
      env.DB,
      id,
      user.id
    );
  
  if (!tournament) {
    return Response.json({
      success: false,
      message: "Tournament not found or access denied."
    }, {
      status: 404
    });
  }
  
  return Response.json({
    success: true,
    tournament: parseTournament(tournament)
  });
}

function parseTournament(tournament) {
  if (!tournament) {
    return tournament;
  }
  
  if (tournament.settings) {
    try {
      tournament.settings =
        JSON.parse(
          tournament.settings
        );
    } catch {
      tournament.settings = {};
    }
  }
  
  if (tournament.match_days) {
    try {
      tournament.match_days =
        JSON.parse(
          tournament.match_days
        );
    } catch {
      tournament.match_days = [];
    }
  }
  
  return tournament;
}


export async function rebuildTable(db, tournamentId) {
  const [teamsResult, matchesResult] = await Promise.all([
    db
    .prepare(`
        SELECT
          id,
          name,
          logo
        FROM teams
        WHERE tournament_id = ?
      `)
    .bind(tournamentId)
    .all(),
    db
    .prepare(`
        SELECT
          home_team_id,
          away_team_id,
          home_score,
          away_score
        FROM matches
        WHERE tournament_id = ?
          AND match_type = 'league'
          AND played = 1
      `)
    .bind(tournamentId)
    .all()
  ]);
  const table = {};
  for (const team of teamsResult.results || []) {
    table[team.id] = {
      id: team.id,
      name: team.name,
      logo: team.logo || null,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0
    };
  }
  for (const match of matchesResult.results || []) {
    const home = table[match.home_team_id];
    const away = table[match.away_team_id];
    if (!home || !away) continue;
    const homeScore = Number(match.home_score);
    const awayScore = Number(match.away_score);
    if (
      !Number.isFinite(homeScore) ||
      !Number.isFinite(awayScore)
    ) {
      continue;
    }
    home.played++;
    away.played++;
    home.gf += homeScore;
    home.ga += awayScore;
    away.gf += awayScore;
    away.ga += homeScore;
    if (homeScore > awayScore) {
      home.wins++;
      home.pts += 3;
      away.losses++;
    } else if (awayScore > homeScore) {
      away.wins++;
      away.pts += 3;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
      home.pts++;
      away.pts++;
    }
  }
  for (const team of Object.values(table)) {
    team.gd = team.gf - team.ga;
  }
  const sortedTable =
    Object.values(table).sort((a, b) => {
      if (b.pts !== a.pts) {
        return b.pts - a.pts;
      }
      if (b.gd !== a.gd) {
        return b.gd - a.gd;
      }
      if (b.gf !== a.gf) {
        return b.gf - a.gf;
      }
      return a.name.localeCompare(b.name);
    });
  sortedTable.forEach((team, index) => {
    team.pos = index + 1;
  });
  return sortedTable;
}
async function getTournamentTableRoute(
  env,
  tournamentId,
  user
) {
  const table =
    await rebuildTable(
      env.DB,
      tournamentId
    );
  return Response.json({
    success: true,
    table
  });
}

async function deleteTournamentLeagueMatches(
  db,
  tournamentId
) {
  await db
    .prepare(`
      DELETE FROM matches
      WHERE tournament_id = ?
      AND match_type = 'league'
    `)
    .bind(tournamentId)
    .run();
}

async function generateFixturesRoute(
  request,
  env,
  tournamentId,
  user
) {
  try {
    const tournament =
      await getTournament(
        env.DB,
        tournamentId,
        user.id
      );

    if (!tournament) {
      return Response.json({
        success: false,
        message:
          "Tournament not found or access denied."
      }, {
        status: 404
      });
    }

    if (user.role !== "admin") {
      return Response.json({
        success: false,
        message: "Access denied."
      }, {
        status: 403
      });
    }

    const body =
      await request
        .json()
        .catch(() => ({}));

    const rounds =
      Number(body.rounds || 1);

    if (
      rounds !== 1 &&
      rounds !== 2
    ) {
      return Response.json({
        success: false,
        message:
          "Rounds must be 1 or 2."
      }, {
        status: 400
      });
    }

    const teams =
      await getTeamsByTournament(
        env.DB,
        tournamentId
      );

    if (teams.length < 2) {
      return Response.json({
        success: false,
        message:
          "Add at least 2 teams first."
      }, {
        status: 400
      });
    }

    await deleteTournamentLeagueMatches(
      env.DB,
      tournamentId
    );

    let teamList =
      teams.map(team => ({
        id: team.id
      }));

    if (
      teamList.length % 2 !== 0
    ) {
      teamList.push({
        id: "__BYE__"
      });
    }

    const numTeams =
      teamList.length;

    const numRounds =
      numTeams - 1;

    const halfSize =
      numTeams / 2;

    let fixtures = [];

    for (
      let round = 0;
      round < numRounds;
      round++
    ) {
      for (
        let i = 0;
        i < halfSize;
        i++
      ) {
        const home =
          teamList[i];

        const away =
          teamList[
            numTeams - 1 - i
          ];

        if (
          home.id === "__BYE__" ||
          away.id === "__BYE__"
        ) {
          continue;
        }

        const roundNumber =
          round + 1;

        fixtures.push({
          id:
            crypto.randomUUID(),
          tournament_id:
            tournamentId,
          home_team_id:
            home.id,
          away_team_id:
            away.id,
          home_score:
            null,
          away_score:
            null,
          played: 0,
          played_at:
            null,
          match_type:
            "league",
          group_id:
            null,
          round:
            String(roundNumber),
          round_index:
            roundNumber,
          slot:
            null,
          winner_team_id:
            null,
          scheduled_at:
            null,
          created_at:
            Date.now(),
          updated_at:
            null
        });
      }

      const fixed =
        teamList[0];

      const rest =
        teamList.slice(1);

      rest.unshift(
        rest.pop()
      );

      teamList = [
        fixed,
        ...rest
      ];
    }

    if (rounds === 2) {
      const firstLegs =
        [...fixtures];

      const returnLegs =
        firstLegs.map(
          match => {
            const firstRound =
              Number(
                match.round
              );

            const secondRound =
              firstRound +
              numRounds;

            return {
              ...match,
              id:
                crypto.randomUUID(),
              home_team_id:
                match.away_team_id,
              away_team_id:
                match.home_team_id,
              round:
                String(
                  secondRound
                ),
              round_index:
                secondRound,
              created_at:
                Date.now(),
              updated_at:
                null
            };
          }
        );

      fixtures = [
        ...fixtures,
        ...returnLegs
      ];
    }

    await createMatchesBatch(
      env.DB,
      fixtures
    );

    return Response.json({
      success: true,
      matches: fixtures
    });

  } catch (error) {
    console.error(
      "Generate fixtures error:",
      error
    );

    return Response.json({
      success: false,
      message:
        error.message ||
        "Failed to generate fixtures."
    }, {
      status: 500
    });
  }
}
async function getTournamentMatchesRoute(
  env,
  tournamentId,
  user
) {
  try {
    // Verify the user can access this tournament
    const tournament = await getTournament(
      env.DB,
      tournamentId,
      user.id
    );

    if (!tournament) {
      return Response.json({
        success: false,
        message: "Tournament not found or access denied."
      }, {
        status: 404
      });
    }

    // Fetch matches from D1
    const matches = await getMatches(
      env.DB,
      tournamentId
    );

    return Response.json({
      success: true,
      matches
    });

  } catch (error) {
    console.error(
      "Get tournament matches error:",
      error
    );

    return Response.json({
      success: false,
      message:
        error.message ||
        "Failed to load fixtures."
    }, {
      status: 500
    });
  }
}

async function updateMatchResultRoute(
  request,
  env,
  tournamentId,
  matchId,
  user
) {
  try {
    const tournament =
      await getTournament(
        env.DB,
        tournamentId,
        user.id
      );

    if (!tournament) {
      return Response.json({
        success: false,
        message:
          "Tournament not found or access denied."
      }, {
        status: 404
      });
    }

    if (user.role !== "admin") {
      return Response.json({
        success: false,
        message: "Access denied."
      }, {
        status: 403
      });
    }

    const match =
      await getMatch(
        env.DB,
        matchId
      );

    if (
      !match ||
      String(match.tournament_id) !==
      String(tournamentId)
    ) {
      return Response.json({
        success: false,
        message: "Match not found."
      }, {
        status: 404
      });
    }

    const body =
      await request
        .json()
        .catch(() => ({}));

    const homeScore =
      Number(body.home_score);

    const awayScore =
      Number(body.away_score);

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      return Response.json({
        success: false,
        message: "Invalid score."
      }, {
        status: 400
      });
    }

    const homePlayer =
      await getTournamentPlayerByTeam(
        env.DB,
        tournamentId,
        match.home_team_id
      );

    const awayPlayer =
      await getTournamentPlayerByTeam(
        env.DB,
        tournamentId,
        match.away_team_id
      );

    if (!homePlayer || !awayPlayer) {
      return Response.json({
        success: false,
        message:
          "One or both teams are not assigned to tournament players."
      }, {
        status: 400
      });
    }

    const oldPlayed =
      Number(match.played) === 1;

    const oldHomeScore =
      Number(match.home_score);

    const oldAwayScore =
      Number(match.away_score);

    let homeStats = {
      played: Number(homePlayer.played) || 0,
      wins: Number(homePlayer.wins) || 0,
      draws: Number(homePlayer.draws) || 0,
      losses: Number(homePlayer.losses) || 0,
      gf: Number(homePlayer.gf) || 0,
      ga: Number(homePlayer.ga) || 0,
      points: Number(homePlayer.points) || 0
    };

    let awayStats = {
      played: Number(awayPlayer.played) || 0,
      wins: Number(awayPlayer.wins) || 0,
      draws: Number(awayPlayer.draws) || 0,
      losses: Number(awayPlayer.losses) || 0,
      gf: Number(awayPlayer.gf) || 0,
      ga: Number(awayPlayer.ga) || 0,
      points: Number(awayPlayer.points) || 0
    };

    if (
      oldPlayed &&
      Number.isFinite(oldHomeScore) &&
      Number.isFinite(oldAwayScore)
    ) {
      const oldStats =
        getResultStats(
          oldHomeScore,
          oldAwayScore
        );

      homeStats =
        applyStats(
          homeStats,
          oldStats.home,
          -1
        );

      awayStats =
        applyStats(
          awayStats,
          oldStats.away,
          -1
        );
    }

    const newStats =
      getResultStats(
        homeScore,
        awayScore
      );

    homeStats =
      applyStats(
        homeStats,
        newStats.home,
        1
      );

    awayStats =
      applyStats(
        awayStats,
        newStats.away,
        1
      );

    let winnerTeamId = null;

    if (homeScore > awayScore) {
      winnerTeamId =
        match.home_team_id;
    } else if (awayScore > homeScore) {
      winnerTeamId =
        match.away_team_id;
    }

    await updateMatchResultAtomic(
      env.DB,
      matchId,
      {
        home_score: homeScore,
        away_score: awayScore,
        played: 1,
        played_at:
          match.played_at ||
          Date.now(),
        winner_team_id:
          winnerTeamId
      },
      match.home_team_id,
      match.away_team_id,
      homeStats,
      awayStats,
      tournamentId
    );

    const updatedMatch =
      await getMatch(
        env.DB,
        matchId
      );

    const updatedHomePlayer =
      await getTournamentPlayerByTeam(
        env.DB,
        tournamentId,
        match.home_team_id
      );

    const updatedAwayPlayer =
      await getTournamentPlayerByTeam(
        env.DB,
        tournamentId,
        match.away_team_id
      );

    return Response.json({
      success: true,
      match: updatedMatch,
      teams: [
        updatedHomePlayer,
        updatedAwayPlayer
      ]
    });

  } catch (error) {
    console.error(
      "Update match result error:",
      error
    );

    return Response.json({
      success: false,
      message:
        error.message ||
        "Failed to save match result."
    }, {
      status: 500
    });
  }
}
async function assignTournamentTeamRoute(
  request,
  env,
  tournamentId,
  user
) {
  try {
    const tournament =
      await getTournament(
        env.DB,
        tournamentId,
        user.id
      );

    if (!tournament) {
      return Response.json({
        success: false,
        message:
          "Tournament not found or access denied."
      }, {
        status: 404
      });
    }

    const body =
      await request
        .json()
        .catch(() => ({}));

    const teamId =
      String(body.team_id || "").trim();

    if (!teamId) {
      return Response.json({
        success: false,
        message: "Team ID is required."
      }, {
        status: 400
      });
    }

    const team =
      await env.DB
      .prepare(`
        SELECT *
        FROM teams
        WHERE id = ?
      `)
      .bind(teamId)
      .first();

    if (!team) {
      return Response.json({
        success: false,
        message: "Team not found."
      }, {
        status: 404
      });
    }

    const player =
      await env.DB
      .prepare(`
        SELECT *
        FROM tournament_players
        WHERE tournament_id = ?
        AND user_id = ?
      `)
      .bind(
        tournamentId,
        user.id
      )
      .first();

    if (!player) {
      return Response.json({
        success: false,
        message:
          "You are not registered for this tournament."
      }, {
        status: 403
      });
    }

    const existingTeam =
      await env.DB
      .prepare(`
        SELECT id
        FROM tournament_players
        WHERE tournament_id = ?
        AND team_id = ?
        AND user_id != ?
      `)
      .bind(
        tournamentId,
        teamId,
        user.id
      )
      .first();

    if (existingTeam) {
      return Response.json({
        success: false,
        message:
          "This team is already assigned in this tournament."
      }, {
        status: 409
      });
    }

    const updated =
      await updateTournamentPlayer(
        env.DB,
        tournamentId,
        user.id,
        {
          team_id: teamId
        }
      );

    return Response.json({
      success: true,
      player: updated
    });

  } catch (error) {
    console.error(
      "Assign tournament team error:",
      error
    );

    return Response.json({
      success: false,
      message:
        error.message ||
        "Failed to assign team."
    }, {
      status: 500
    });
  }
}


function getResultStats(
  homeScore,
  awayScore
) {
  const home = {
    played: 1,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: homeScore,
    ga: awayScore,
    points: 0
  };
  
  const away = {
    played: 1,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: awayScore,
    ga: homeScore,
    points: 0
  };
  
  if (homeScore > awayScore) {
    home.wins = 1;
    home.points = 3;
    away.losses = 1;
  } else if (awayScore > homeScore) {
    away.wins = 1;
    away.points = 3;
    home.losses = 1;
  } else {
    home.draws = 1;
    away.draws = 1;
    home.points = 1;
    away.points = 1;
  }
  
  return {
    home,
    away
  };
}

function applyStats(
  current,
  change,
  multiplier
) {
  return {
    played:
      current.played +
      change.played * multiplier,

    wins:
      current.wins +
      change.wins * multiplier,

    draws:
      current.draws +
      change.draws * multiplier,

    losses:
      current.losses +
      change.losses * multiplier,

    gf:
      current.gf +
      change.gf * multiplier,

    ga:
      current.ga +
      change.ga * multiplier,

    points:
      current.points +
      change.points * multiplier
  };
}
