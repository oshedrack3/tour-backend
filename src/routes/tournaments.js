import {
  getTournament,
  getTournamentsByOwner,
  getTournamentsByPlayer,
  createTournament,
  getTeamsByTournament,
  createMatchesBatch
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

async function generateFixturesRoute(
  request,
  env,
  tournamentId,
  user
) {
  try {
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
    if (user.role !== "admin") {
      return Response.json({
        success: false,
        message: "Access denied."
      }, {
        status: 403
      });
    }
    const body = await request.json().catch(() => ({}));
    const rounds = Number(body.rounds || 1);
    if (rounds !== 1 && rounds !== 2) {
      return Response.json({
        success: false,
        message: "Rounds must be 1 or 2."
      }, {
        status: 400
      });
    }
    const teams = await getTeamsByTournament(
      env.DB,
      tournamentId
    );
    if (teams.length < 2) {
      return Response.json({
        success: false,
        message: "Add at least 2 teams first."
      }, {
        status: 400
      });
    }
    let teamList = teams.map(team => ({
      id: team.id
    }));
    if (teamList.length % 2 !== 0) {
      teamList.push({
        id: "__BYE__"
      });
    }
    const numTeams = teamList.length;
    const numRounds = numTeams - 1;
    const halfSize = numTeams / 2;
    let fixtures = [];
    for (let round = 0; round < numRounds; round++) {
      for (let i = 0; i < halfSize; i++) {
        const home = teamList[i];
        const away = teamList[numTeams - 1 - i];
        if (
          home.id !== "__BYE__" &&
          away.id !== "__BYE__"
        ) {
          fixtures.push({
            id: crypto.randomUUID(),
            tournament_id: tournamentId,
            home_team_id: home.id,
            away_team_id: away.id,
            home_score: null,
            away_score: null,
            played: 0,
            played_at: null,
            match_type: "league",
            group_id: null,
            round: String(round + 1),
            round_index: round + 1,
            slot: null,
            winner_team_id: null,
            scheduled_at: null,
            created_at: Date.now(),
            updated_at: null
          });
        }
      }
      const fixed = teamList[0];
      const rest = teamList.slice(1);
      rest.unshift(rest.pop());
      teamList = [
        fixed,
        ...rest
      ];
    }
    if (rounds === 2) {
      const firstLegs = [...fixtures];
      const returnLegs = firstLegs.map(match => ({
        ...match,
        id: crypto.randomUUID(),
        home_team_id: match.away_team_id,
        away_team_id: match.home_team_id,
        round: String(
          Number(match.round) + numRounds
        ),
        round_index:
          Number(match.round_index) + numRounds,
        created_at: Date.now()
      }));
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
