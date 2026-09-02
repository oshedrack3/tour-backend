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
  getTournamentPlayerByTeam,
  getTournamentPlayers,
  updateTournamentPlayer,
  createTeam,
  getMatchSubmission,
  getPlayerMatchSubmission,
  getMatchSubmissions,
  getPendingMatchSubmission,
  createMatchSubmission,
  updateMatchSubmission,
  getTournamentsByOwnerAndCompetition,
  getTournamentsByCompetition
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
    pathname === "/teams/create"
  ) {
    return await createTeamRoute(
      request,
      env,
      user
    );
  }
  
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
    request.method === "POST" &&
    /^\/tournaments\/[^/]+\/matches\/[^/]+\/submission$/.test(pathname)
  ) {
    const parts =
      pathname.split("/");
    
    const tournamentId =
      parts[2];
    
    const matchId =
      parts[4];
    
    return await createMatchSubmissionRoute(
      request,
      env,
      tournamentId,
      matchId,
      user
    );
  }
  if (
    request.method === "PATCH" &&
    /^\/tournaments\/[^/]+\/submission-deadline$/.test(pathname)
  ) {
    const tournamentId =
      pathname.split("/")[2];
    
    return await updateSubmissionDeadlineRoute(
      request,
      env,
      tournamentId,
      user
    );
  }
  if (
    request.method === "PATCH" &&
    /^\/tournaments\/[^/]+\/match-submission\/[^/]+\/review$/.test(pathname)
  ) {
    const parts =
      pathname.split("/");
    
    const tournamentId =
      parts[2];
    
    const submissionId =
      parts[4];
    
    return await reviewMatchSubmissionRoute(
      request,
      env,
      tournamentId,
      submissionId,
      user
    );
  }
  if (
    request.method === "GET" &&
    /^\/tournaments\/[^/]+\/matches\/[^/]+\/submission$/.test(pathname)
  ) {
    const parts =
      pathname.split("/");
    
    const tournamentId =
      parts[2];
    
    const matchId =
      parts[4];
    
    return await getMatchSubmissionRoute(
      env,
      tournamentId,
      matchId,
      user
    );
  }
  
  if (
    request.method === "GET" &&
    /^\/tournaments\/[^/]+\/matches\/[^/]+\/submissions$/.test(pathname)
  ) {
    const parts =
      pathname.split("/");
    
    const tournamentId =
      parts[2];
    
    const matchId =
      parts[4];
    
    return await getMatchSubmissionsRoute(
      env,
      tournamentId,
      matchId,
      user
    );
  }
  if (
  request.method === "GET" &&
  pathname === "/tournaments/my"
) {
  const competitionId =
    url.searchParams.get(
      "competition_id"
    );
  
  return await getMyTournamentsRoute(
    env,
    user,
    competitionId
  );
}  
  if (
    request.method === "GET" &&
    /^\/tournaments\/[^/]+\/matches$/.test(pathname)
  ) {
    const id =
      pathname.split("/")[2];
    
    return await getTournamentMatchesRoute(
      env,
      id,
      user
    );
  }
  
  if (
    request.method === "PATCH" &&
    /^\/tournaments\/[^/]+\/matches\/[^/]+\/result$/.test(pathname)
  ) {
    const parts =
      pathname.split("/");
    
    const tournamentId =
      parts[2];
    
    const matchId =
      parts[4];
    
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
    const id =
      pathname.split("/")[2];
    
    return await getTournamentTableRoute(
      env,
      id,
      user
    );
  }
  
  if (
    request.method === "POST" &&
    /^\/tournaments\/[^/]+\/join$/.test(pathname)
  ) {
    const tournamentId =
      pathname.split("/")[2];
    
    return await joinTournamentRoute(
      request,
      env,
      tournamentId,
      user
    );
  }
  
  if (
    request.method === "POST" &&
    /^\/tournaments\/[^/]+\/generate-fixtures$/.test(pathname)
  ) {
    const id =
      pathname.split("/")[2];
    
    return await generateFixturesRoute(
      request,
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
    pathname.startsWith("/tournaments/")
  ) {
    const id =
      pathname.split("/")[2];
    
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
            match_days : JSON.stringify(match_days),
          tournament_image: tournamentImageData?.url || null,
          settings: typeof settings === "string" ?
            settings : JSON.stringify(settings),
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
  user,
  competitionId
) {
  try {
    if (!competitionId) {
      return Response.json({
        success: false,
        message:
          "Competition ID is required."
      }, {
        status: 400
      });
    }

    let tournaments;

    if (user.role === "admin") {
      tournaments =
        await getTournamentsByOwnerAndCompetition(
          env.DB,
          user.id,
          competitionId
        );
    } else {
      tournaments =
        await getTournamentsByCompetition(
          env.DB,
          competitionId
        );
    }

    tournaments =
      (tournaments || [])
      .map(parseTournament);

    return Response.json({
      success: true,
      tournaments
    });

  } catch (error) {
    console.error(
      "Get my tournaments error:",
      error
    );

    return Response.json({
      success: false,
      message:
        error.message ||
        "Failed to load tournaments."
    }, {
      status: 500
    });
  }
}

async function getTournamentRoute(
  env,
  id,
  user
) {
  try {
    const tournament =
      await getTournament(
        env.DB,
        id
      );
    
    if (!tournament) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
      });
    }
    
    const tournamentPlayers =
      await getTournamentPlayers(
        env.DB,
        id
      );
    
    const parsedTournament =
      parseTournament(
        tournament
      );
    
    parsedTournament.tournament_players =
      tournamentPlayers || [];
    
    return Response.json({
      success: true,
      tournament: parsedTournament
    });
    
  } catch (error) {
    console.error(
      "Get tournament error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to load tournament."
    }, {
      status: 500
    });
  }
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


export async function rebuildTable(
  db,
  tournamentId
) {
  const result = await db
    .prepare(`
      SELECT
        tp.team_id AS id,
        t.name,
        t.logo,

        COALESCE(tp.played, 0) AS played,
        COALESCE(tp.wins, 0) AS wins,
        COALESCE(tp.draws, 0) AS draws,
        COALESCE(tp.losses, 0) AS losses,
        COALESCE(tp.gf, 0) AS gf,
        COALESCE(tp.ga, 0) AS ga,
        COALESCE(tp.points, 0) AS points

      FROM tournament_players tp

      LEFT JOIN teams t
        ON t.id = tp.team_id

      WHERE tp.tournament_id = ?
      AND tp.team_id IS NOT NULL

      ORDER BY t.created_at ASC
    `)
    .bind(tournamentId)
    .all();
  
  const table =
    (result.results || []).map(team => {
      const gf =
        Number(team.gf) || 0;
      
      const ga =
        Number(team.ga) || 0;
      
      return {
        id: team.id,
        name: team.name || "",
        logo: team.logo || null,
        
        played: Number(team.played) || 0,
        
        wins: Number(team.wins) || 0,
        
        draws: Number(team.draws) || 0,
        
        losses: Number(team.losses) || 0,
        
        gf,
        ga,
        
        gd: gf - ga,
        
        pts: Number(team.points) || 0
      };
    });
  
  table.sort((a, b) => {
    if (b.pts !== a.pts) {
      return b.pts - a.pts;
    }
    
    if (b.gd !== a.gd) {
      return b.gd - a.gd;
    }
    
    if (b.gf !== a.gf) {
      return b.gf - a.gf;
    }
    
    return a.name.localeCompare(
      b.name
    );
  });
  
  table.forEach(
    (team, index) => {
      team.pos = index + 1;
    }
  );
  
  return table;
}

async function getTournamentTableRoute(
  env,
  tournamentId,
  user
) {
  const tournament =
    await getTournament(
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
      await getTournamentForUser(
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
        message: "Rounds must be 1 or 2."
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
        message: "Add at least 2 teams first."
      }, {
        status: 400
      });
    }
    
    await deleteTournamentLeagueMatches(
      env.DB,
      tournamentId
    );
    
    await env.DB
      .prepare(`
        UPDATE tournament_players
        SET
          played = 0,
          wins = 0,
          draws = 0,
          losses = 0,
          gf = 0,
          ga = 0,
          points = 0
        WHERE tournament_id = ?
      `)
      .bind(tournamentId)
      .run();
    
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
      let round = 0; round < numRounds; round++
    ) {
      for (
        let i = 0; i < halfSize; i++
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
          round: String(roundNumber),
          round_index: roundNumber,
          slot: null,
          winner_team_id: null,
          scheduled_at: null,
          created_at: Date.now(),
          updated_at: null
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
      const firstLegs = [...fixtures];
      
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
              id: crypto.randomUUID(),
              home_team_id: match.away_team_id,
              away_team_id: match.home_team_id,
              round: String(secondRound),
              round_index: secondRound,
              created_at: Date.now(),
              updated_at: null
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
      message: error.message ||
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
    const tournament =
      await getTournament(
        env.DB,
        tournamentId
      );
    
    if (!tournament) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
      });
    }
    
    const isAdmin =
      user.role === "admin" &&
      String(tournament.admin_uid) ===
      String(user.id);
    
    if (
      user.role === "admin" &&
      !isAdmin
    ) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
      });
    }
    
    const matches =
      await getMatches(
        env.DB,
        tournamentId,
        user.id,
        isAdmin
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
      message: error.message ||
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
    
    const homeTeam =
      await env.DB
      .prepare(`
          SELECT
            t.id,
            t.name,
            t.logo
          FROM teams t
          INNER JOIN tournament_players tp
            ON tp.team_id = t.id
          WHERE t.id = ?
          AND tp.tournament_id = ?
          LIMIT 1
        `)
      .bind(
        match.home_team_id,
        tournamentId
      )
      .first();
    
    const awayTeam =
      await env.DB
      .prepare(`
          SELECT
            t.id,
            t.name,
            t.logo
          FROM teams t
          INNER JOIN tournament_players tp
            ON tp.team_id = t.id
          WHERE t.id = ?
          AND tp.tournament_id = ?
          LIMIT 1
        `)
      .bind(
        match.away_team_id,
        tournamentId
      )
      .first();
    
    if (
      !homeTeam ||
      !awayTeam
    ) {
      return Response.json({
        success: false,
        message: "One or both teams are not registered in this tournament."
      }, {
        status: 400
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
    
    if (
      !homePlayer ||
      !awayPlayer
    ) {
      return Response.json({
        success: false,
        message: "One or both teams do not have tournament player records."
      }, {
        status: 400
      });
    }
    
    let currentHome = {
      played: Number(homePlayer.played) || 0,
      wins: Number(homePlayer.wins) || 0,
      draws: Number(homePlayer.draws) || 0,
      losses: Number(homePlayer.losses) || 0,
      gf: Number(homePlayer.gf) || 0,
      ga: Number(homePlayer.ga) || 0,
      points: Number(homePlayer.points) || 0
    };
    
    let currentAway = {
      played: Number(awayPlayer.played) || 0,
      wins: Number(awayPlayer.wins) || 0,
      draws: Number(awayPlayer.draws) || 0,
      losses: Number(awayPlayer.losses) || 0,
      gf: Number(awayPlayer.gf) || 0,
      ga: Number(awayPlayer.ga) || 0,
      points: Number(awayPlayer.points) || 0
    };
    
    if (
      Number(match.played) === 1
    ) {
      const oldHomeScore =
        Number(match.home_score);
      
      const oldAwayScore =
        Number(match.away_score);
      
      if (
        Number.isInteger(oldHomeScore) &&
        Number.isInteger(oldAwayScore)
      ) {
        const oldStats =
          getResultStats(
            oldHomeScore,
            oldAwayScore
          );
        
        currentHome =
          applyStats(
            currentHome,
            oldStats.home,
            -1
          );
        
        currentAway =
          applyStats(
            currentAway,
            oldStats.away,
            -1
          );
      }
    }
    
    const newStats =
      getResultStats(
        homeScore,
        awayScore
      );
    
    const newHomeStats =
      applyStats(
        currentHome,
        newStats.home,
        1
      );
    
    const newAwayStats =
      applyStats(
        currentAway,
        newStats.away,
        1
      );
    
    let winnerTeamId =
      null;
    
    if (
      homeScore > awayScore
    ) {
      winnerTeamId =
        match.home_team_id;
    } else if (
      awayScore > homeScore
    ) {
      winnerTeamId =
        match.away_team_id;
    }
    
    const playedAt =
      Number(match.played) === 1 &&
      match.played_at ?
      match.played_at :
      Date.now();
    
    const result =
      await updateMatchResultAtomic(
        env.DB,
        matchId,
        {
          home_score: homeScore,
          away_score: awayScore,
          played: 1,
          played_at: playedAt,
          winner_team_id: winnerTeamId
        },
        match.home_team_id,
        match.away_team_id,
        newHomeStats,
        newAwayStats,
        tournamentId
      );
    
    return Response.json({
      success: true,
      match: result.match,
      players: result.players
    });
    
  } catch (error) {
    console.error(
      "Update match result error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
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
        message: "Tournament not found or access denied."
      }, {
        status: 404
      });
    }
    
    const body =
      await request
      .json()
      .catch(() => ({}));
    
    const teamId =
      String(
        body.team_id || ""
      ).trim();
    
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
          SELECT
            id,
            owner_uid,
            name,
            logo,
            created_at,
            updated_at
          FROM teams
          WHERE id = ?
          AND owner_uid = ?
        `)
      .bind(
        teamId,
        user.id
      )
      .first();
    
    if (!team) {
      return Response.json({
        success: false,
        message: "Team not found or you do not own this team."
      }, {
        status: 404
      });
    }
    
    const existing =
      await env.DB
      .prepare(`
          SELECT id
          FROM tournament_players
          WHERE tournament_id = ?
          AND team_id = ?
          LIMIT 1
        `)
      .bind(
        tournamentId,
        teamId
      )
      .first();
    
    if (existing) {
      return Response.json({
        success: false,
        message: "This team is already registered in this tournament."
      }, {
        status: 409
      });
    }
    
    const playerId =
      crypto.randomUUID();
    
    const now =
      Date.now();
    
    await env.DB
      .prepare(`
        INSERT INTO tournament_players (
          id,
          tournament_id,
          user_id,
          team_id,
          played,
          wins,
          draws,
          losses,
          gf,
          ga,
          points,
          joined_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?,
          0, 0, 0, 0, 0, 0, 0,
          ?, ?
        )
      `)
      .bind(
        playerId,
        tournamentId,
        user.id,
        teamId,
        now,
        now
      )
      .run();
    
    const player =
      await env.DB
      .prepare(`
          SELECT
            tp.*,
            t.name AS team_name,
            t.logo AS team_logo
          FROM tournament_players tp
          LEFT JOIN teams t
            ON t.id = tp.team_id
          WHERE tp.id = ?
        `)
      .bind(playerId)
      .first();
    
    return Response.json({
      success: true,
      player
    }, {
      status: 201
    });
    
  } catch (error) {
    console.error(
      "Assign tournament team error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to register team in tournament."
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
    played: current.played +
      change.played * multiplier,
    
    wins: current.wins +
      change.wins * multiplier,
    
    draws: current.draws +
      change.draws * multiplier,
    
    losses: current.losses +
      change.losses * multiplier,
    
    gf: current.gf +
      change.gf * multiplier,
    
    ga: current.ga +
      change.ga * multiplier,
    
    points: current.points +
      change.points * multiplier
  };
}


async function createTeamRoute(
  request,
  env,
  user
) {
  try {
    const body =
      await request
      .json()
      .catch(() => ({}));
    
    const name =
      String(
        body.name || ""
      ).trim();
    
    const logo =
      body.logo ||
      body.team_logo ||
      body.teamLogo ||
      null;
    
    if (!name) {
      return Response.json({
        success: false,
        message: "Team name is required."
      }, {
        status: 400
      });
    }
    
    if (
      logo !== null &&
      (
        typeof logo !== "string" ||
        !logo.startsWith("data:image/")
      )
    ) {
      return Response.json({
        success: false,
        message: "Invalid team logo."
      }, {
        status: 400
      });
    }
    
    const id =
      crypto.randomUUID();
    
    let logoData = null;
    
    if (logo) {
      logoData =
        await uploadBase64Image(
          logo,
          "teams",
          id,
          env
        );
    }
    
    const now =
      Date.now();
    
    const result =
      await createTeam(
        env.DB,
        {
          id,
          name,
          logo: logoData?.url || null,
          created_at: now,
          updated_at: now
        },
        user.id,
        user.role
      );
    
    if (!result?.success) {
      return Response.json(
        result || {
          success: false,
          message: "Failed to create team."
        },
        {
          status: 400
        }
      );
    }
    
    return Response.json({
      success: true,
      team: result.team
    }, {
      status: 201
    });
    
  } catch (error) {
    console.error(
      "Create team error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to create team."
    }, {
      status: 500
    });
  }
}


async function joinTournamentRoute(
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
        message: "Tournament not found."
      }, {
        status: 404
      });
    }
    
    if (
      tournament.is_public === false ||
      tournament.is_public === 0
    ) {
      return Response.json({
        success: false,
        message: "This tournament is private."
      }, {
        status: 403
      });
    }
    
    const body =
      await request
      .json()
      .catch(() => ({}));
    
    let teamIds =
      Array.isArray(body.team_ids) ?
      body.team_ids : [];
    
    teamIds = [
      ...new Set(
        teamIds
        .map(id =>
          String(id).trim()
        )
        .filter(Boolean)
      )
    ];
    
    if (!teamIds.length) {
      return Response.json({
        success: false,
        message: "Select at least one team."
      }, {
        status: 400
      });
    }
    
    const maxTeams =
      user.role === "admin" ?
      20 :
      1;
    
    if (teamIds.length > maxTeams) {
      return Response.json({
        success: false,
        message: user.role === "admin" ?
          "You can register a maximum of 20 teams." : "You can register only one team."
      }, {
        status: 400
      });
    }
    
    const placeholders =
      teamIds
      .map(() => "?")
      .join(",");
    
    const ownedTeams =
      await env.DB
      .prepare(`
          SELECT
            id,
            name,
            logo
          FROM teams
          WHERE owner_uid = ?
          AND id IN (${placeholders})
        `)
      .bind(
        user.id,
        ...teamIds
      )
      .all();
    
    const teams =
      ownedTeams.results || [];
    
    if (
      teams.length !==
      teamIds.length
    ) {
      return Response.json({
        success: false,
        message: "One or more selected teams were not found or you do not own them."
      }, {
        status: 403
      });
    }
    
    const existing =
      await env.DB
      .prepare(`
          SELECT team_id
          FROM tournament_players
          WHERE tournament_id = ?
          AND team_id IN (${placeholders})
        `)
      .bind(
        tournamentId,
        ...teamIds
      )
      .all();
    
    const existingTeamIds =
      new Set(
        (existing.results || [])
        .map(row =>
          String(row.team_id)
        )
      );
    
    const alreadyRegistered =
      teamIds.filter(id =>
        existingTeamIds.has(
          String(id)
        )
      );
    
    if (
      alreadyRegistered.length
    ) {
      return Response.json({
        success: false,
        message: "One or more selected teams are already registered in this tournament."
      }, {
        status: 409
      });
    }
    
    const now =
      Date.now();
    
    const statements =
      teamIds.map(teamId =>
        env.DB
        .prepare(`
            INSERT INTO tournament_players (
              id,
              tournament_id,
              user_id,
              team_id,
              status,
              joined_at,
              responded_at,
              has_new_invitation,
              invitation_count,
              played,
              wins,
              draws,
              losses,
              gf,
              ga,
              points
            )
            VALUES (
              ?, ?, ?, ?,
              'accepted',
              ?, ?,
              0,
              1,
              0, 0, 0, 0, 0, 0, 0
            )
          `)
        .bind(
          crypto.randomUUID(),
          tournamentId,
          user.id,
          teamId,
          now,
          now
        )
      );
    
    await env.DB.batch(
      statements
    );
    
    const registered =
      await env.DB
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
          AND tp.team_id IN (${placeholders})
          ORDER BY tp.joined_at ASC
        `)
      .bind(
        tournamentId,
        user.id,
        ...teamIds
      )
      .all();
    
    return Response.json({
      success: true,
      message: "Successfully joined the tournament!",
      players: registered.results || []
    });
    
  } catch (error) {
    console.error(
      "Join tournament error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to join tournament."
    }, {
      status: 500
    });
  }
}

async function getMatchSubmissionRoute(
  env,
  tournamentId,
  matchId,
  user
) {
  try {
    const tournament =
      await getTournament(
        env.DB,
        tournamentId
      );
    
    if (!tournament) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
      });
    }
    
    const isAdmin =
      user.role === "admin" &&
      String(tournament.admin_uid) ===
      String(user.id);
    
    if (
      user.role === "admin" &&
      !isAdmin
    ) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
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
    
    if (isAdmin) {
      const submissions =
        await getMatchSubmissions(
          env.DB,
          tournamentId,
          matchId
        );
      
      return Response.json({
        success: true,
        submissions
      });
    }
    
    const player =
      await env.DB
      .prepare(`
          SELECT id
          FROM tournament_players
          WHERE tournament_id = ?
          AND user_id = ?
          AND status = 'accepted'
          LIMIT 1
        `)
      .bind(
        tournamentId,
        user.id
      )
      .first();
    
    if (!player) {
      return Response.json({
        success: false,
        message: "You are not registered in this tournament."
      }, {
        status: 403
      });
    }
    
    const submission =
      await getPlayerMatchSubmission(
        env.DB,
        tournamentId,
        matchId,
        user.id
      );
    
    return Response.json({
      success: true,
      submission: submission || null
    });
    
  } catch (error) {
    console.error(
      "Get match submission error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to load match submission."
    }, {
      status: 500
    });
  }
}

async function getMatchSubmissionsRoute(
  env,
  tournamentId,
  matchId,
  user
) {
  try {
    const tournament =
      await getTournament(
        env.DB,
        tournamentId
      );
    
    if (!tournament) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
      });
    }
    
    if (
      user.role !== "admin" ||
      String(tournament.admin_uid) !==
      String(user.id)
    ) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
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
    
    const submissions =
      await getMatchSubmissions(
        env.DB,
        tournamentId,
        matchId
      );
    
    return Response.json({
      success: true,
      submissions
    });
    
  } catch (error) {
    console.error(
      "Get match submissions error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to load match submissions."
    }, {
      status: 500
    });
  }
}

async function createMatchSubmissionRoute(
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
        tournamentId
      );
    
    if (!tournament) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
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
    
    if (Number(match.played) === 1) {
      return Response.json({
        success: false,
        message: "This match has already been played."
      }, {
        status: 400
      });
    }
    
    const deadlineCheck =
      checkMatchSubmissionDeadline(
        tournament,
        match
      );
    
    if (!deadlineCheck.allowed) {
      return Response.json({
        success: false,
        message: deadlineCheck.message
      }, {
        status: 400
      });
    }
    
    const players =
      await getTournamentPlayers(
        env.DB,
        tournamentId
      );
    
    const acceptedPlayers =
      (players || []).filter(
        player =>
        player.status === "accepted" &&
        String(player.user_id) ===
        String(user.id)
      );
    
    if (!acceptedPlayers.length) {
      return Response.json({
        success: false,
        message: "You are not registered in this tournament."
      }, {
        status: 403
      });
    }
    
    const playerTeamIds =
      acceptedPlayers.map(
        player =>
        String(player.team_id)
      );
    
    let submittingTeamId =
      null;
    
    if (
      playerTeamIds.includes(
        String(match.home_team_id)
      )
    ) {
      submittingTeamId =
        String(match.home_team_id);
    } else if (
      playerTeamIds.includes(
        String(match.away_team_id)
      )
    ) {
      submittingTeamId =
        String(match.away_team_id);
    }
    
    if (!submittingTeamId) {
      return Response.json({
        success: false,
        message: "You are not a participant in this match."
      }, {
        status: 403
      });
    }
    
    const existingPending =
      await getPendingMatchSubmission(
        env.DB,
        tournamentId,
        matchId,
        user.id
      );
    
    if (existingPending) {
      return Response.json({
        success: false,
        message: "You already have a pending submission for this match."
      }, {
        status: 409
      });
    }
    
    const body =
      await request
      .json()
      .catch(() => ({}));
    
    const homeGoals =
      Number(body.home_goals);
    
    const awayGoals =
      Number(body.away_goals);
    
    if (
      !Number.isInteger(homeGoals) ||
      !Number.isInteger(awayGoals) ||
      homeGoals < 0 ||
      awayGoals < 0
    ) {
      return Response.json({
        success: false,
        message: "Invalid score."
      }, {
        status: 400
      });
    }
    
    const screenshot =
      body.screenshot ||
      body.image ||
      null;
    
    if (
      screenshot !== null &&
      (
        typeof screenshot !== "string" ||
        !screenshot.startsWith("data:image/")
      )
    ) {
      return Response.json({
        success: false,
        message: "Invalid screenshot."
      }, {
        status: 400
      });
    }
    
    const submissionId =
      crypto.randomUUID();
    
    let screenshotUrl =
      null;
    
    let screenshotPublicId =
      null;
    
    if (screenshot) {
      const uploaded =
        await uploadBase64Image(
          screenshot,
          "match-screenshots",
          `${tournamentId}_${submissionId}`,
          env
        );
      
      screenshotUrl =
        uploaded?.url || null;
      
      screenshotPublicId =
        uploaded?.public_id ||
        uploaded?.publicId ||
        null;
    }
    
    const now =
      Date.now();
    
    const submission =
      await createMatchSubmission(
        env.DB,
        {
          id: submissionId,
          
          tournament_id: tournamentId,
          
          match_id: matchId,
          
          submitted_by: user.id,
          
          team_id: submittingTeamId,
          
          home_goals: homeGoals,
          
          away_goals: awayGoals,
          
          screenshot: screenshotUrl,
          
          screenshot_public_id: screenshotPublicId,
          
          created_at: now
        }
      );
    
    await env.DB
      .prepare(`
        UPDATE tournaments
        SET updated_at = ?
        WHERE id = ?
      `)
      .bind(
        now,
        tournamentId
      )
      .run();
    
    return Response.json({
      success: true,
      submission
    }, {
      status: 201
    });
    
  } catch (error) {
    console.error(
      "Create match submission error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to submit match result."
    }, {
      status: 500
    });
  }
}

function checkMatchSubmissionDeadline(
  tournament,
  match
) {
  const deadline =
    tournament.settings?.submissionDeadline || null;
  
  if (!deadline) {
    return {
      allowed: true
    };
  }
  
  const fromRound =
    Number(deadline.fromRound);
  
  const toRound =
    Number(deadline.toRound);
  
  const matchRound =
    Number(
      match.round ??
      match.round_index
    );
  
  if (
    !Number.isFinite(fromRound) ||
    !Number.isFinite(toRound) ||
    !Number.isFinite(matchRound)
  ) {
    return {
      allowed: false,
      message: "This match does not have a valid round."
    };
  }
  
  if (matchRound < fromRound) {
    return {
      allowed: false,
      message: "This round has not started."
    };
  }
  
  if (matchRound > toRound) {
    return {
      allowed: false,
      message: "This round has not started."
    };
  }
  
  if (
    deadline.enabled === true &&
    deadline.deadline &&
    Date.now() >
    Number(deadline.deadline)
  ) {
    return {
      allowed: false,
      message: "This round deadline has passed."
    };
  }
  
  return {
    allowed: true
  };
}

async function reviewMatchSubmissionRoute(
  request,
  env,
  tournamentId,
  submissionId,
  user
) {
  try {
    const tournament =
      await getTournament(
        env.DB,
        tournamentId
      );
    
    if (!tournament) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
      });
    }
    
    if (
      user.role !== "admin" ||
      String(tournament.admin_uid) !==
      String(user.id)
    ) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
      });
    }
    
    const submission =
      await getMatchSubmission(
        env.DB,
        tournamentId,
        submissionId
      );
    
    if (!submission) {
      return Response.json({
        success: false,
        message: "Submission not found."
      }, {
        status: 404
      });
    }
    
    if (
      submission.status !== "pending"
    ) {
      return Response.json({
        success: false,
        message: "This submission has already been reviewed."
      }, {
        status: 409
      });
    }
    
    const body =
      await request
      .json()
      .catch(() => ({}));
    
    const approved =
      body.approved === true ||
      body.status === "approved";
    
    const rejected =
      body.approved === false ||
      body.status === "rejected";
    
    if (
      !approved &&
      !rejected
    ) {
      return Response.json({
        success: false,
        message: "Specify whether the submission is approved or rejected."
      }, {
        status: 400
      });
    }
    
    const now =
      Date.now();
    
    if (rejected) {
      const rejectionReason =
        String(
          body.rejection_reason ||
          body.reason ||
          ""
        ).trim();
      
      const updatedSubmission =
        await updateMatchSubmission(
          env.DB,
          tournamentId,
          submissionId,
          {
            status: "rejected",
            reviewed_at: now,
            reviewed_by: user.id,
            rejection_reason: rejectionReason || null
          }
        );
      
      await env.DB
        .prepare(`
          UPDATE tournaments
          SET updated_at = ?
          WHERE id = ?
        `)
        .bind(
          now,
          tournamentId
        )
        .run();
      
      return Response.json({
        success: true,
        message: "Submission rejected.",
        submission: updatedSubmission
      });
    }
    
    const match =
      await getMatch(
        env.DB,
        submission.match_id
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
    
    if (
      Number(match.played) === 1
    ) {
      return Response.json({
        success: false,
        message: "This match has already been played."
      }, {
        status: 409
      });
    }
    
    const homeScore =
      Number(
        submission.home_goals
      );
    
    const awayScore =
      Number(
        submission.away_goals
      );
    
    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      return Response.json({
        success: false,
        message: "Submission contains an invalid score."
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
    
    if (
      !homePlayer ||
      !awayPlayer
    ) {
      return Response.json({
        success: false,
        message: "One or both teams do not have tournament player records."
      }, {
        status: 400
      });
    }
    
    const currentHome = {
      played: Number(homePlayer.played) || 0,
      wins: Number(homePlayer.wins) || 0,
      draws: Number(homePlayer.draws) || 0,
      losses: Number(homePlayer.losses) || 0,
      gf: Number(homePlayer.gf) || 0,
      ga: Number(homePlayer.ga) || 0,
      points: Number(homePlayer.points) || 0
    };
    
    const currentAway = {
      played: Number(awayPlayer.played) || 0,
      wins: Number(awayPlayer.wins) || 0,
      draws: Number(awayPlayer.draws) || 0,
      losses: Number(awayPlayer.losses) || 0,
      gf: Number(awayPlayer.gf) || 0,
      ga: Number(awayPlayer.ga) || 0,
      points: Number(awayPlayer.points) || 0
    };
    
    const newStats =
      getResultStats(
        homeScore,
        awayScore
      );
    
    const newHomeStats =
      applyStats(
        currentHome,
        newStats.home,
        1
      );
    
    const newAwayStats =
      applyStats(
        currentAway,
        newStats.away,
        1
      );
    
    let winnerTeamId =
      null;
    
    if (
      homeScore > awayScore
    ) {
      winnerTeamId =
        match.home_team_id;
    } else if (
      awayScore > homeScore
    ) {
      winnerTeamId =
        match.away_team_id;
    }
    
    const result =
      await updateMatchResultAtomic(
        env.DB,
        match.id,
        {
          home_score: homeScore,
          away_score: awayScore,
          played: 1,
          played_at: now,
          winner_team_id: winnerTeamId
        },
        match.home_team_id,
        match.away_team_id,
        newHomeStats,
        newAwayStats,
        tournamentId
      );
    
    const updatedSubmission =
      await updateMatchSubmission(
        env.DB,
        tournamentId,
        submissionId,
        {
          status: "approved",
          reviewed_at: now,
          reviewed_by: user.id,
          rejection_reason: null
        }
      );
    
    await env.DB
      .prepare(`
        UPDATE tournaments
        SET updated_at = ?
        WHERE id = ?
      `)
      .bind(
        now,
        tournamentId
      )
      .run();
    
    return Response.json({
      success: true,
      message: "Submission approved.",
      submission: updatedSubmission,
      match: result.match,
      players: result.players
    });
    
  } catch (error) {
    console.error(
      "Review match submission error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to review match submission."
    }, {
      status: 500
    });
  }
}
async function updateSubmissionDeadlineRoute(
  request,
  env,
  tournamentId,
  user
) {
  try {
    const tournament =
      await getTournament(
        env.DB,
        tournamentId
      );
    
    if (!tournament) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
      });
    }
    
    if (
      user.role !== "admin" ||
      String(tournament.admin_uid) !==
      String(user.id)
    ) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
      });
    }
    
    const body =
      await request
      .json()
      .catch(() => ({}));
    
    const fromRound =
      Number(body.fromRound);
    
    const toRound =
      Number(body.toRound);
    
    const enabled =
      body.enabled === true;
    
    const deadline =
      body.deadline === null ||
      body.deadline === undefined ||
      body.deadline === "" ?
      null :
      Number(body.deadline);
    
    if (
      !Number.isInteger(fromRound) ||
      fromRound < 1
    ) {
      return Response.json({
        success: false,
        message: "Invalid starting round."
      }, {
        status: 400
      });
    }
    
    if (
      !Number.isInteger(toRound) ||
      toRound < fromRound
    ) {
      return Response.json({
        success: false,
        message: "Invalid ending round."
      }, {
        status: 400
      });
    }
    
    if (
      deadline !== null &&
      (
        !Number.isFinite(deadline) ||
        deadline <= 0
      )
    ) {
      return Response.json({
        success: false,
        message: "Invalid deadline."
      }, {
        status: 400
      });
    }
    
    let settings = {};
    
    if (tournament.settings) {
      try {
        settings =
          typeof tournament.settings === "string" ?
          JSON.parse(tournament.settings) :
          tournament.settings;
      } catch {
        settings = {};
      }
    }
    
    settings.submissionDeadline = {
      fromRound,
      toRound,
      deadline,
      enabled
    };
    
    const now =
      Date.now();
    
    await env.DB
      .prepare(`
        UPDATE tournaments
        SET
          settings = ?,
          updated_at = ?
        WHERE id = ?
      `)
      .bind(
        JSON.stringify(settings),
        now,
        tournamentId
      )
      .run();
    
    return Response.json({
      success: true,
      submissionDeadline: settings.submissionDeadline
    });
    
  } catch (error) {
    console.error(
      "Update submission deadline error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to update submission deadline."
    }, {
      status: 500
    });
  }
}