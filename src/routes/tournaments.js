import {
  getTournament,
  deleteTournament,
  getTournamentsByOwner,
  getTournamentsByPlayer,
  createTournament,
  getTeamsByTournament,
  createMatchesBatch,
  getMatches,
  getMatch,
  createGroupsBatch,
  deleteTournamentCupData,
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
  getTournamentForUser,
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
    request.method === "DELETE" &&
    /^\/tournaments\/[^/]+$/.test(pathname)
  ) {
    const tournamentId =
      pathname.split("/")[2];
    
    return await deleteTournamentRoute(
      env,
      tournamentId,
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
    request.method === "POST" &&
    /^\/tournaments\/[^/]+\/generate-cup$/.test(pathname)
  ) {
    const id = pathname.split("/")[2];
    
    return await generateCupRoute(
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
      body.start_date ??
      body.startDate ??
      null;
    
    const end_date =
      body.end_date ??
      body.endDate ??
      null;
    
    const match_days =
      body.match_days ??
      body.matchDays ??
      "[]";
    
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
        message: "Competition ID is required."
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
      message: error.message ||
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
    
    let groupStageResult =
      null;
    
    let knockoutResult =
      null;
    
    if (
      match.match_type ===
      "group"
    ) {
      groupStageResult =
        await checkGroupStageCompletion(
          env.DB,
          tournamentId,
          tournament
        );
    }
    
    if (
      match.match_type === "knockout" ||
      match.match_type === "third_place"
    ) {
      knockoutResult =
        await processKnockoutResult(
          env.DB,
          tournamentId,
          matchId
        );
    }
    
    return Response.json({
      success: true,
      match: result.match,
      players: result.players,
      groupStage: groupStageResult,
      knockout: knockoutResult
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
    
    const playedMatch =
      await env.DB
      .prepare(`
    SELECT 1
    FROM matches
    WHERE tournament_id = ?
    AND played = 1
    LIMIT 1
  `)
      .bind(tournamentId)
      .first();
    
    if (playedMatch) {
      return Response.json({
        success: false,
        message: "You cannot join this tournament because it has already started."
      }, {
        status: 409
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
      parseTournament(
        await getTournament(
          env.DB,
          tournamentId
        )
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
    tournament.settings?.submissionDeadline;
  
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
      message: "Submission no longer available for this round."
    };
  }
  
  if (matchRound > toRound) {
    return {
      allowed: false,
      message: "Submission is not yet available for this round."
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
      message: "Submission deadline has passed."
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
    
    let groupStageResult =
      null;
    
    let knockoutResult =
      null;
    
    if (
      match.match_type ===
      "group"
    ) {
      groupStageResult =
        await checkGroupStageCompletion(
          env.DB,
          tournamentId,
          tournament
        );
    }
    
    if (
      match.match_type === "knockout" ||
      match.match_type === "third_place"
    ) {
      knockoutResult =
        await processKnockoutResult(
          env.DB,
          tournamentId,
          match.id
        );
    }
    
    return Response.json({
      success: true,
      message: "Submission approved.",
      submission: updatedSubmission,
      match: result.match,
      players: result.players,
      groupStage: groupStageResult,
      knockout: knockoutResult
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
async function deleteTournamentRoute(
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
      return Response.json(
      {
        success: false,
        message: "Tournament not found."
      },
      {
        status: 404
      });
    }
    
    if (
      user.role !== "admin" ||
      String(tournament.admin_uid) !==
      String(user.id)
    ) {
      return Response.json(
      {
        success: false,
        message: "Access denied."
      },
      {
        status: 403
      });
    }
    
    await deleteTournament(
      env.DB,
      tournamentId
    );
    
    if (tournament.competition_id) {
      await env.DB
        .prepare(`
          UPDATE competitions
          SET
            tournament_count =
              CASE
                WHEN tournament_count > 0
                THEN tournament_count - 1
                ELSE 0
              END,
            updated_at = ?
          WHERE id = ?
        `)
        .bind(
          Date.now(),
          tournament.competition_id
        )
        .run();
    }
    
    return Response.json({
      success: true,
      message: "Tournament deleted successfully."
    });
    
  } catch (error) {
    console.error(
      "Delete tournament error:",
      error
    );
    
    return Response.json(
    {
      success: false,
      message: error.message ||
        "Failed to delete tournament."
    },
    {
      status: 500
    });
  }
}


async function generateCupRoute(
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
        message: "Tournament not found."
      }, {
        status: 404
      });
    }

    if (
      tournament.admin_uid !==
      user.id
    ) {
      return Response.json({
        success: false,
        message:
          "Only the tournament admin can generate the tournament."
      }, {
        status: 403
      });
    }

    const body =
      await request.json();

    const settings =
      body.settings &&
      typeof body.settings === "object"
        ? body.settings
        : body;

    const enableGroups =
      settings.enableGroups === true;

    const groupingMode =
      settings.groupingMode === "manual"
        ? "manual"
        : "auto";

    const groupRoundMode =
      settings.groupRoundMode === "double"
        ? "double"
        : "single";

    const knockoutPairingMode =
      settings.knockoutPairingMode === "manual"
        ? "manual"
        : "auto";

    const knockoutRoundMode =
      settings.knockoutRoundMode === "double"
        ? "double"
        : "single";

    const thirdPlaceMatch =
      settings.thirdPlaceMatch === true;

    const teamsPerGroup =
      Number(settings.teamsPerGroup);

    const teamsQualify =
      Number(settings.teamsQualify);

    const teams =
      await getTeamsByTournament(
        env.DB,
        tournamentId
      );

    if (
      !teams ||
      teams.length < 2
    ) {
      return Response.json({
        success: false,
        message:
          "At least 2 teams are required."
      }, {
        status: 400
      });
    }

    let knockoutSize =
      Number(settings.knockoutSize);

    if (
      enableGroups &&
      settings.startFrom === "group"
    ) {
      const groupCount =
        groupingMode === "manual" &&
        Array.isArray(body.groups) &&
        body.groups.length
          ? body.groups.length
          : Math.ceil(
              teams.length /
              teamsPerGroup
            );

      knockoutSize =
        groupCount *
        teamsQualify;
    }

    if (
      enableGroups &&
      !Number.isInteger(knockoutSize)
    ) {
      if (
        Number.isInteger(
          teamsPerGroup
        ) &&
        Number.isInteger(
          teamsQualify
        )
      ) {
        const groupCount =
          Math.ceil(
            teams.length /
            teamsPerGroup
          );

        knockoutSize =
          groupCount *
          teamsQualify;
      }
    }

    if (
      !Number.isInteger(knockoutSize) ||
      ![2, 4, 8, 16, 32].includes(
        knockoutSize
      )
    ) {
      return Response.json({
        success: false,
        message:
          "Invalid knockout bracket size."
      }, {
        status: 400
      });
    }

    if (
      !["single", "double"].includes(
        knockoutRoundMode
      )
    ) {
      return Response.json({
        success: false,
        message:
          "Invalid knockout round mode."
      }, {
        status: 400
      });
    }

    if (
      thirdPlaceMatch &&
      knockoutSize < 4
    ) {
      return Response.json({
        success: false,
        message:
          "A third-place match requires at least 4 teams."
      }, {
        status: 400
      });
    }

    let groups = [];
    let groupMatches = [];
    let knockoutMatches = [];

    if (enableGroups) {
      if (
        !Number.isInteger(
          teamsPerGroup
        ) ||
        teamsPerGroup < 2
      ) {
        return Response.json({
          success: false,
          message:
            "Invalid teams per group."
        }, {
          status: 400
        });
      }

      if (
        !Number.isInteger(
          teamsQualify
        ) ||
        teamsQualify < 1 ||
        teamsQualify >
          teamsPerGroup
      ) {
        return Response.json({
          success: false,
          message:
            "Invalid number of qualifying teams."
        }, {
          status: 400
        });
      }

      try {
        if (
          groupingMode === "auto"
        ) {
          groups =
            generateAutoGroups(
              teams,
              teamsPerGroup,
              teamsQualify
            );
        } else {
          groups =
            validateManualGroups(
              teams,
              body.groups,
              teamsPerGroup,
              teamsQualify
            );
        }
      } catch (error) {
        return Response.json({
          success: false,
          message:
            error.message
        }, {
          status: 400
        });
      }

      const totalQualifiers =
        groups.length *
        teamsQualify;

      if (
        totalQualifiers !==
        knockoutSize
      ) {
        return Response.json({
          success: false,
          message:
            `The groups produce ${totalQualifiers} qualifying teams, ` +
            `but the knockout bracket requires ${knockoutSize}.`
        }, {
          status: 400
        });
      }

      groupMatches =
        generateCupGroupMatches(
          groups,
          groupRoundMode
        );

      const now =
        Date.now();

      for (
        const group of groups
      ) {
        group.tournament_id =
          tournamentId;

        group.created_at =
          now;
      }

      for (
        const match of groupMatches
      ) {
        match.tournament_id =
          tournamentId;

        match.created_at =
          now;
      }
    } else {
      if (
        teams.length !==
        knockoutSize
      ) {
        return Response.json({
          success: false,
          message:
            `This direct knockout requires exactly ${knockoutSize} teams, ` +
            `but ${teams.length} teams are registered.`
        }, {
          status: 400
        });
      }

      try {
        knockoutMatches =
          generateDirectKnockoutMatches(
            teams,
            knockoutSize,
            knockoutPairingMode,
            knockoutRoundMode,
            thirdPlaceMatch,
            body.manualKnockoutPairs
          );
      } catch (error) {
        return Response.json({
          success: false,
          message:
            error.message
        }, {
          status: 400
        });
      }

      const now =
        Date.now();

      for (
        const match of knockoutMatches
      ) {
        match.tournament_id =
          tournamentId;

        match.created_at =
          now;
      }
    }

    const existingSettings =
      (() => {
        try {
          if (
            typeof tournament.settings ===
            "string"
          ) {
            return JSON.parse(
              tournament.settings
            ) || {};
          }

          if (
            tournament.settings &&
            typeof tournament.settings ===
            "object"
          ) {
            return {
              ...tournament.settings
            };
          }

          return {};
        } catch {
          return {};
        }
      })();

    const updatedSettings = {
      ...existingSettings,
      enableGroups,
      groupingMode,
      groupRoundMode,
      knockoutPairingMode,
      knockoutRoundMode,
      thirdPlaceMatch,
      teamsPerGroup,
      teamsQualify,
      knockoutSize,
      groupStageComplete: false,
      knockoutGenerated:
        !enableGroups
    };

    await deleteTournamentCupData(
      env.DB,
      tournamentId
    );

    if (enableGroups) {
      await createGroupsBatch(
        env.DB,
        groups
      );

      await createMatchesBatch(
        env.DB,
        groupMatches
      );
    } else {
      await createMatchesBatch(
        env.DB,
        knockoutMatches
      );
    }

    await env.DB.prepare(`
      UPDATE tournaments
      SET
        settings = ?,
        champion = NULL,
        champion_name = NULL,
        updated_at = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(
        updatedSettings
      ),
      Date.now(),
      tournamentId
    ).run();

    return Response.json({
      success: true,
      message:
        enableGroups
          ? "Cup group stage generated successfully."
          : "Direct knockout tournament generated successfully.",
      tournamentId,
      settings: updatedSettings,
      groups,
      groupMatches,
      knockoutMatches
    });

  } catch (error) {
    console.error(
      "generateCupRoute error:",
      error
    );

    return Response.json({
      success: false,
      message:
        error.message ||
        "Failed to generate cup tournament."
    }, {
      status: 500
    });
  }
}

function createGroupName(index) {
  return `Group ${String.fromCharCode(65 + index)}`;
}

function generateAutoGroups(
  teams,
  teamsPerGroup,
  teamsQualify
) {
  const totalGroups =
    Math.ceil(teams.length / teamsPerGroup);
  
  const groups = [];
  
  for (let i = 0; i < totalGroups; i++) {
    const start =
      i * teamsPerGroup;
    
    const groupTeams =
      teams.slice(
        start,
        start + teamsPerGroup
      );
    
    if (groupTeams.length < teamsQualify) {
      throw new Error(
        `${createGroupName(i)} does not have enough teams for ${teamsQualify} qualifiers.`
      );
    }
    
    groups.push({
      id: crypto.randomUUID(),
      name: createGroupName(i),
      teamIds: groupTeams.map(
        team => team.id
      )
    });
  }
  
  return groups;
}

function validateManualGroups(
  teams,
  groups,
  teamsPerGroup,
  teamsQualify
) {
  if (!Array.isArray(groups) || !groups.length) {
    throw new Error(
      "Manual groups are required."
    );
  }
  
  const registeredTeamIds =
    new Set(
      teams.map(team => team.id)
    );
  
  const assignedTeamIds =
    new Set();
  
  for (const group of groups) {
    if (
      !group ||
      !Array.isArray(group.teamIds)
    ) {
      throw new Error(
        "Invalid manual group data."
      );
    }
    
    if (
      group.teamIds.length > teamsPerGroup
    ) {
      throw new Error(
        `${group.name || "A group"} has more than ${teamsPerGroup} teams.`
      );
    }
    
    if (
      group.teamIds.length < teamsQualify
    ) {
      throw new Error(
        `${group.name || "A group"} does not have enough teams for ${teamsQualify} qualifiers.`
      );
    }
    
    for (const teamId of group.teamIds) {
      if (!registeredTeamIds.has(teamId)) {
        throw new Error(
          "A manual group contains a team that is not registered in this tournament."
        );
      }
      
      if (assignedTeamIds.has(teamId)) {
        throw new Error(
          "A team cannot belong to more than one group."
        );
      }
      
      assignedTeamIds.add(teamId);
    }
  }
  
  if (
    assignedTeamIds.size !==
    registeredTeamIds.size
  ) {
    throw new Error(
      "Every registered team must be assigned to exactly one group."
    );
  }
  
  return groups.map(
    (group, index) => ({
      id: group.id ||
        crypto.randomUUID(),
      
      name: group.name ||
        createGroupName(index),
      
      teamIds: [...group.teamIds]
    })
  );
}

function generateCupGroupMatches(
  groups,
  groupRoundMode
) {
  const matches = [];
  
  for (const group of groups) {
    let teams = [...group.teamIds];
    
    if (teams.length < 2) {
      continue;
    }
    
    const hasBye =
      teams.length % 2 !== 0;
    
    if (hasBye) {
      teams.push(null);
    }
    
    const totalTeams = teams.length;
    const rounds = totalTeams - 1;
    const matchesPerRound = totalTeams / 2;
    
    const firstLegFixtures = [];
    
    for (let round = 0; round < rounds; round++) {
      const roundFixtures = [];
      
      for (
        let i = 0; i < matchesPerRound; i++
      ) {
        const home =
          teams[i];
        
        const away =
          teams[totalTeams - 1 - i];
        
        if (home && away) {
          roundFixtures.push({
            home_team_id: home,
            away_team_id: away
          });
        }
      }
      
      firstLegFixtures.push(
        roundFixtures
      );
      
      const fixedTeam =
        teams[0];
      
      const rotatingTeams =
        teams.slice(1);
      
      rotatingTeams.unshift(
        rotatingTeams.pop()
      );
      
      teams = [
        fixedTeam,
        ...rotatingTeams
      ];
    }
    
    for (
      let roundIndex = 0; roundIndex < firstLegFixtures.length; roundIndex++
    ) {
      const fixtures =
        firstLegFixtures[roundIndex];
      
      for (
        let slot = 0; slot < fixtures.length; slot++
      ) {
        const fixture =
          fixtures[slot];
        
        matches.push({
          id: crypto.randomUUID(),
          tournament_id: null,
          home_team_id: fixture.home_team_id,
          away_team_id: fixture.away_team_id,
          home_score: null,
          away_score: null,
          played: 0,
          played_at: null,
          match_type: "group",
          group_id: group.id,
          round: `Group ${group.name} - Round ${roundIndex + 1}`,
          round_index: roundIndex + 1,
          slot,
          winner_team_id: null,
          scheduled_at: null,
          created_at: Date.now(),
          updated_at: null,
          submission_status: null
        });
      }
    }
    
    if (groupRoundMode === "double") {
      const firstLegRoundCount =
        firstLegFixtures.length;
      
      for (
        let roundIndex = 0; roundIndex < firstLegFixtures.length; roundIndex++
      ) {
        const fixtures =
          firstLegFixtures[roundIndex];
        
        for (
          let slot = 0; slot < fixtures.length; slot++
        ) {
          const fixture =
            fixtures[slot];
          
          matches.push({
            id: crypto.randomUUID(),
            tournament_id: null,
            home_team_id: fixture.away_team_id,
            away_team_id: fixture.home_team_id,
            home_score: null,
            away_score: null,
            played: 0,
            played_at: null,
            match_type: "group",
            group_id: group.id,
            round: `Group ${group.name} - Round ${firstLegRoundCount + roundIndex + 1}`,
            round_index: firstLegRoundCount +
              roundIndex +
              1,
            slot,
            winner_team_id: null,
            scheduled_at: null,
            created_at: Date.now(),
            updated_at: null,
            submission_status: null
          });
        }
      }
    }
  }
  
  return matches;
}


function getKnockoutRoundName(size) {
  if (size === 32) return "Round of 32";
  if (size === 16) return "Round of 16";
  if (size === 8) return "Quarter Final";
  if (size === 4) return "Semi Final";
  if (size === 2) return "Final";
  
  return "Knockout";
}

function createKnockoutMatch(
  homeTeamId,
  awayTeamId,
  round,
  roundIndex,
  slot,
  leg,
  matchType = "knockout"
) {
  return {
    id: crypto.randomUUID(),
    tournament_id: null,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    home_score: null,
    away_score: null,
    played: 0,
    played_at: null,
    match_type: matchType,
    group_id: null,
    round,
    round_index: roundIndex,
    slot,
    leg,
    winner_team_id: null,
    scheduled_at: null,
    created_at: Date.now(),
    updated_at: null,
    submission_status: null
  };
}

function generateDirectKnockoutMatches(
  teams,
  knockoutSize,
  knockoutPairingMode,
  knockoutRoundMode,
  thirdPlaceMatch,
  knockoutPairs = null
) {
  if (!Array.isArray(teams)) {
    throw new Error(
      "Invalid team data."
    );
  }
  
  if (
    ![2, 4, 8, 16, 32].includes(
      knockoutSize
    )
  ) {
    throw new Error(
      "Invalid knockout bracket size."
    );
  }
  
  if (teams.length !== knockoutSize) {
    throw new Error(
      `This knockout requires exactly ${knockoutSize} teams, but ${teams.length} teams are registered.`
    );
  }
  
  if (
    !["auto", "manual"].includes(
      knockoutPairingMode
    )
  ) {
    throw new Error(
      "Invalid knockout pairing mode."
    );
  }
  
  if (
    !["single", "double"].includes(
      knockoutRoundMode
    )
  ) {
    throw new Error(
      "Invalid knockout round mode."
    );
  }
  
  if (
    thirdPlaceMatch &&
    knockoutSize < 4
  ) {
    throw new Error(
      "A third-place match requires at least 4 teams."
    );
  }
  
  const registeredTeamIds =
    new Set(
      teams.map(team => team.id)
    );
  
  let pairs = [];
  
  if (
    knockoutPairingMode === "manual"
  ) {
    if (
      !Array.isArray(knockoutPairs)
    ) {
      throw new Error(
        "Manual knockout pairings are required."
      );
    }
    
    const expectedPairs =
      knockoutSize / 2;
    
    if (
      knockoutPairs.length !==
      expectedPairs
    ) {
      throw new Error(
        `Exactly ${expectedPairs} knockout pairings are required.`
      );
    }
    
    const pairedTeams =
      new Set();
    
    for (
      const pair of knockoutPairs
    ) {
      if (
        !Array.isArray(pair) ||
        pair.length !== 2
      ) {
        throw new Error(
          "Each knockout pairing must contain exactly two teams."
        );
      }
      
      const homeTeamId =
        pair[0];
      
      const awayTeamId =
        pair[1];
      
      if (
        !registeredTeamIds.has(
          homeTeamId
        ) ||
        !registeredTeamIds.has(
          awayTeamId
        )
      ) {
        throw new Error(
          "A knockout pairing contains a team that is not registered in this tournament."
        );
      }
      
      if (
        homeTeamId === awayTeamId
      ) {
        throw new Error(
          "A team cannot play against itself."
        );
      }
      
      if (
        pairedTeams.has(
          homeTeamId
        ) ||
        pairedTeams.has(
          awayTeamId
        )
      ) {
        throw new Error(
          "A team cannot appear in more than one knockout pairing."
        );
      }
      
      pairedTeams.add(
        homeTeamId
      );
      
      pairedTeams.add(
        awayTeamId
      );
      
      pairs.push([
        homeTeamId,
        awayTeamId
      ]);
    }
    
    if (
      pairedTeams.size !==
      registeredTeamIds.size
    ) {
      throw new Error(
        "Every registered team must be included in exactly one knockout pairing."
      );
    }
  } else {
    const shuffledTeams = [...teams];
    
    for (
      let i =
        shuffledTeams.length - 1; i > 0; i--
    ) {
      const j =
        Math.floor(
          Math.random() *
          (i + 1)
        );
      
      [
        shuffledTeams[i],
        shuffledTeams[j]
      ] = [
        shuffledTeams[j],
        shuffledTeams[i]
      ];
    }
    
    for (
      let i = 0; i < shuffledTeams.length; i += 2
    ) {
      pairs.push([
        shuffledTeams[i].id,
        shuffledTeams[i + 1].id
      ]);
    }
  }
  
  const matches = [];
  
  let currentSize =
    knockoutSize;
  
  let roundIndex = 1;
  
  while (
    currentSize >= 2
  ) {
    const round =
      getKnockoutRoundName(
        currentSize
      );
    
    const matchCount =
      currentSize / 2;
    
    for (
      let slot = 0; slot < matchCount; slot++
    ) {
      let homeTeamId = null;
      let awayTeamId = null;
      
      if (
        roundIndex === 1
      ) {
        homeTeamId =
          pairs[slot][0];
        
        awayTeamId =
          pairs[slot][1];
      }
      
      matches.push(
        createKnockoutMatch(
          homeTeamId,
          awayTeamId,
          round,
          roundIndex,
          slot,
          1
        )
      );
      
      if (
        knockoutRoundMode ===
        "double"
      ) {
        matches.push(
          createKnockoutMatch(
            awayTeamId,
            homeTeamId,
            round,
            roundIndex,
            slot,
            2
          )
        );
      }
    }
    
    currentSize =
      currentSize / 2;
    
    roundIndex++;
  }
  
  if (thirdPlaceMatch) {
    matches.push(
      createKnockoutMatch(
        null,
        null,
        "Third Place",
        Math.log2(knockoutSize),
        0,
        1,
        "third_place"
      )
    );
  }
  
  return matches;
}






function pairByGroupRules(
  teams,
  knockoutSize
) {
  if (
    !Array.isArray(teams) ||
    teams.length !== knockoutSize
  ) {
    throw new Error(
      `Invalid number of qualified teams. Expected ${knockoutSize}.`
    );
  }
  
  const groupedTeams =
    new Map();
  
  for (const team of teams) {
    if (
      !team.groupId
    ) {
      throw new Error(
        "Qualified team is missing group information."
      );
    }
    
    if (
      !groupedTeams.has(
        team.groupId
      )
    ) {
      groupedTeams.set(
        team.groupId,
        {
          id: team.groupId,
          name: team.group,
          teams: []
        }
      );
    }
    
    groupedTeams
      .get(team.groupId)
      .teams.push(team);
  }
  
  const groupList = [...groupedTeams.values()]
    .sort(
      (a, b) =>
      String(a.name).localeCompare(
        String(b.name)
      )
    );
  
  const groupCount =
    groupList.length;
  
  if (
    groupCount < 2
  ) {
    throw new Error(
      "At least two groups are required for automatic group-based knockout pairing."
    );
  }
  
  if (
    groupCount % 2 !== 0
  ) {
    throw new Error(
      "The number of groups must be even for automatic group-based knockout pairing."
    );
  }
  
  for (const group of groupList) {
    group.teams.sort(
      (a, b) =>
      Number(a.pos) -
      Number(b.pos)
    );
  }
  
  const result = [];
  
  const offset =
    groupCount / 2;
  
  const maxQualifiers =
    Math.max(
      ...groupList.map(
        group =>
        group.teams.length
      )
    );
  
  for (
    let position = 0; position < maxQualifiers; position++
  ) {
    const positionTeams =
      groupList
      .map(
        group =>
        group.teams[position]
      )
      .filter(Boolean);
    
    if (
      positionTeams.length !==
      groupCount
    ) {
      throw new Error(
        "All groups must contain the same number of qualified teams."
      );
    }
    
    for (
      let i = 0; i < groupCount / 2; i++
    ) {
      const first =
        positionTeams[i];
      
      const second =
        positionTeams[
          (i + offset) %
          groupCount
        ];
      
      if (
        !first ||
        !second ||
        first.groupId ===
        second.groupId
      ) {
        throw new Error(
          "Unable to create valid knockout pairings using the group pairing rules."
        );
      }
      
      result.push(first);
      result.push(second);
    }
  }
  
  if (
    result.length !==
    knockoutSize
  ) {
    throw new Error(
      `Invalid knockout pairing count. Expected ${knockoutSize}, got ${result.length}.`
    );
  }
  
  return result;
}
async function getCupQualifiedTeams(
  db,
  tournamentId,
  teamsQualify
) {
  if (
    !Number.isInteger(teamsQualify) ||
    teamsQualify < 1
  ) {
    throw new Error(
      "Invalid number of qualifying teams."
    );
  }

  const result =
    await db.prepare(`
      WITH group_members AS (
        SELECT
          group_id,
          home_team_id AS team_id
        FROM matches
        WHERE tournament_id = ?
          AND match_type = 'group'
          AND group_id IS NOT NULL
          AND home_team_id IS NOT NULL

        UNION

        SELECT
          group_id,
          away_team_id AS team_id
        FROM matches
        WHERE tournament_id = ?
          AND match_type = 'group'
          AND group_id IS NOT NULL
          AND away_team_id IS NOT NULL
      )

      SELECT
        g.id AS group_id,
        g.name AS group_name,
        gm.team_id,
        t.name AS team_name,
        COALESCE(tp.played, 0) AS played,
        COALESCE(tp.wins, 0) AS wins,
        COALESCE(tp.draws, 0) AS draws,
        COALESCE(tp.losses, 0) AS losses,
        COALESCE(tp.gf, 0) AS gf,
        COALESCE(tp.ga, 0) AS ga,
        COALESCE(tp.points, 0) AS points
      FROM groups g
      INNER JOIN group_members gm
        ON gm.group_id = g.id
      INNER JOIN teams t
        ON t.id = gm.team_id
      INNER JOIN tournament_players tp
        ON tp.tournament_id = ?
        AND tp.team_id = gm.team_id
      WHERE g.tournament_id = ?
      ORDER BY
        g.id,
        tp.points DESC,
        (tp.gf - tp.ga) DESC,
        tp.gf DESC,
        t.name ASC
    `)
    .bind(
      tournamentId,
      tournamentId,
      tournamentId,
      tournamentId
    )
    .all();

  const rows =
    result.results || [];

  const groups =
    new Map();

  for (const row of rows) {
    if (!groups.has(row.group_id)) {
      groups.set(
        row.group_id,
        {
          id: row.group_id,
          name: row.group_name,
          teams: []
        }
      );
    }

    groups
      .get(row.group_id)
      .teams.push({
        id: row.team_id,
        name: row.team_name,
        played: Number(row.played) || 0,
        wins: Number(row.wins) || 0,
        draws: Number(row.draws) || 0,
        losses: Number(row.losses) || 0,
        gf: Number(row.gf) || 0,
        ga: Number(row.ga) || 0,
        gd:
          (Number(row.gf) || 0) -
          (Number(row.ga) || 0),
        points:
          Number(row.points) || 0
      });
  }

  const qualifiedTeams = [];

  for (const group of groups.values()) {
    if (
      group.teams.length <
      teamsQualify
    ) {
      throw new Error(
        `${group.name} does not have enough teams for ${teamsQualify} qualifiers.`
      );
    }

    group.teams.sort(
      (a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
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
      }
    );

    group.teams.forEach(
      (team, index) => {
        team.pos = index + 1;
      }
    );

    const qualifiers =
      group.teams.slice(
        0,
        teamsQualify
      );

    for (const team of qualifiers) {
      qualifiedTeams.push({
        id: team.id,
        name: team.name,
        group: group.name,
        groupId: group.id,
        pos: team.pos
      });
    }
  }

  return {
    groups: [...groups.values()],
    qualifiedTeams
  };
}
async function checkGroupStageCompletion(
  db,
  tournamentId,
  tournament
) {
  try {
    if (!tournament) {
      return {
        complete: false
      };
    }
    
    let settings = {};
    
    try {
      if (
        typeof tournament.settings ===
        "string"
      ) {
        settings =
          JSON.parse(
            tournament.settings
          ) || {};
      } else if (
        tournament.settings &&
        typeof tournament.settings ===
        "object"
      ) {
        settings = {
          ...tournament.settings
        };
      }
    } catch {
      settings = {};
    }
    
    if (
      settings.enableGroups !== true
    ) {
      return {
        complete: false
      };
    }
    
    if (
      settings.groupStageComplete ===
      true
    ) {
      return {
        complete: true,
        alreadyComplete: true
      };
    }
    
    const remainingResult =
      await db.prepare(`
        SELECT COUNT(*) AS remaining
        FROM matches
        WHERE tournament_id = ?
        AND match_type = 'group'
        AND played = 0
      `).bind(
        tournamentId
      ).first();
    
    const remaining =
      Number(
        remainingResult?.remaining
      ) || 0;
    
    if (
      remaining > 0
    ) {
      return {
        complete: false,
        remaining
      };
    }
    
    const teamsQualify =
      Number(
        settings.teamsQualify
      );
    
    const knockoutSize =
      Number(
        settings.knockoutSize
      );
    
    if (
      !Number.isInteger(
        teamsQualify
      ) ||
      teamsQualify < 1
    ) {
      throw new Error(
        "Invalid number of qualifying teams."
      );
    }
    
    if (
      !Number.isInteger(
        knockoutSize
      ) ||
      ![2, 4, 8, 16, 32].includes(
        knockoutSize
      )
    ) {
      throw new Error(
        "Invalid knockout bracket size."
      );
    }
    
    const qualification =
      await getCupQualifiedTeams(
        db,
        tournamentId,
        teamsQualify
      );
    
    const qualifiedTeams =
      qualification.qualifiedTeams;
    
    if (
      qualifiedTeams.length !==
      knockoutSize
    ) {
      throw new Error(
        `The group stage produced ${qualifiedTeams.length} qualified teams, but the knockout requires ${knockoutSize}.`
      );
    }
    
    if (
      settings.knockoutPairingMode ===
      "manual"
    ) {
      await db.prepare(`
        UPDATE tournaments
        SET
          settings = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        JSON.stringify({
          ...settings,
          groupStageComplete: true
        }),
        Date.now(),
        tournamentId
      ).run();
      
      return {
        complete: true,
        knockoutGenerated: false,
        manualPairingRequired: true
      };
    }
    
    const pairedTeams =
      pairByGroupRules(
        qualifiedTeams,
        knockoutSize
      );
    
    const knockoutPairs = [];
    
    for (
      let i = 0; i < pairedTeams.length; i += 2
    ) {
      knockoutPairs.push([
        pairedTeams[i].id,
        pairedTeams[i + 1].id
      ]);
    }
    
    const knockoutRoundMode =
      settings.knockoutRoundMode ===
      "double" ?
      "double" :
      "single";
    
    const thirdPlaceMatch =
      settings.thirdPlaceMatch ===
      true;
    
    const knockoutMatches =
      generateDirectKnockoutMatches(
        pairedTeams.map(
          team => ({
            id: team.id,
            name: team.name
          })
        ),
        knockoutSize,
        "manual",
        knockoutRoundMode,
        thirdPlaceMatch,
        knockoutPairs
      );
    
    const now =
      Date.now();
    
    for (
      const match of knockoutMatches
    ) {
      match.tournament_id =
        tournamentId;
      
      match.created_at =
        now;
    }
    
    await createMatchesBatch(
      db,
      knockoutMatches
    );
    
    await db.prepare(`
      UPDATE tournaments
      SET
        settings = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      JSON.stringify({
        ...settings,
        groupStageComplete: true,
        knockoutGenerated: true
      }),
      now,
      tournamentId
    ).run();
    
    return {
      complete: true,
      knockoutGenerated: true,
      knockoutMatches
    };
    
  } catch (error) {
    console.error(
      "checkGroupStageCompletion error:",
      error
    );
    
    throw error;
  }
}

async function processKnockoutResult(
  db,
  tournamentId,
  matchId
) {
  const match =
    await getMatch(
      db,
      matchId
    );
  
  if (!match) {
    throw new Error(
      "Match not found."
    );
  }
  
  if (
    String(match.tournament_id) !==
    String(tournamentId)
  ) {
    throw new Error(
      "Match does not belong to this tournament."
    );
  }
  
  if (
    match.match_type !== "knockout" &&
    match.match_type !== "third_place"
  ) {
    return {
      processed: false,
      reason: "Not a knockout match."
    };
  }
  
  if (
    Number(match.played) !== 1
  ) {
    return {
      processed: false,
      reason: "Match has not been played."
    };
  }
  
  if (
    match.match_type ===
    "third_place"
  ) {
    const homeScore =
      Number(match.home_score);
    
    const awayScore =
      Number(match.away_score);
    
    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore)
    ) {
      return {
        processed: false,
        reason: "Invalid third-place score."
      };
    }
    
    if (
      homeScore === awayScore
    ) {
      return {
        processed: false,
        reason: "Third-place match is tied."
      };
    }
    
    const winnerTeamId =
      homeScore > awayScore ?
      match.home_team_id :
      match.away_team_id;
    
    await db.prepare(`
      UPDATE matches
      SET
        winner_team_id = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      winnerTeamId,
      Date.now(),
      matchId
    ).run();
    
    return {
      processed: true,
      winnerTeamId,
      thirdPlace: true
    };
  }
  
  const tournament =
    await db.prepare(`
      SELECT settings
      FROM tournaments
      WHERE id = ?
    `).bind(
      tournamentId
    ).first();
  
  let settings = {};
  
  try {
    if (
      typeof tournament?.settings ===
      "string"
    ) {
      settings =
        JSON.parse(
          tournament.settings
        ) || {};
    } else if (
      tournament?.settings &&
      typeof tournament.settings ===
      "object"
    ) {
      settings =
        tournament.settings;
    }
  } catch {
    settings = {};
  }
  
  const isDoubleLeg =
    settings.knockoutRoundMode ===
    "double";
  
  const knockoutSize =
    Number(
      settings.knockoutSize
    );
  
  if (
    !Number.isInteger(knockoutSize) ||
    ![2, 4, 8, 16, 32].includes(
      knockoutSize
    )
  ) {
    throw new Error(
      "Invalid knockout bracket size."
    );
  }
  
  const roundIndex =
    Number(match.round_index);
  
  const slot =
    Number(match.slot);
  
  let winnerTeamId =
    null;
  
  if (isDoubleLeg) {
    const legsResult =
      await db.prepare(`
        SELECT
          id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          played,
          winner_team_id,
          leg
        FROM matches
        WHERE tournament_id = ?
        AND match_type = 'knockout'
        AND round_index = ?
        AND slot = ?
        ORDER BY leg ASC
      `).bind(
        tournamentId,
        roundIndex,
        slot
      ).all();
    
    const legs =
      legsResult.results || [];
    
    const firstLeg =
      legs.find(
        item =>
        Number(item.leg) === 1
      );
    
    const secondLeg =
      legs.find(
        item =>
        Number(item.leg) === 2
      );
    
    if (
      !firstLeg ||
      !secondLeg
    ) {
      return {
        processed: false,
        reason: "Both knockout legs have not been generated."
      };
    }
    
    if (
      Number(firstLeg.played) !== 1 ||
      Number(secondLeg.played) !== 1
    ) {
      return {
        processed: false,
        reason: "Waiting for both knockout legs."
      };
    }
    
    if (
      !firstLeg.home_team_id ||
      !firstLeg.away_team_id ||
      !secondLeg.home_team_id ||
      !secondLeg.away_team_id
    ) {
      return {
        processed: false,
        reason: "Knockout teams are not fully assigned."
      };
    }
    
    const teamA =
      firstLeg.home_team_id;
    
    const teamB =
      firstLeg.away_team_id;
    
    let teamAScore = 0;
    let teamBScore = 0;
    
    if (
      firstLeg.home_team_id === teamA
    ) {
      teamAScore +=
        Number(firstLeg.home_score) || 0;
      
      teamBScore +=
        Number(firstLeg.away_score) || 0;
    } else {
      teamAScore +=
        Number(firstLeg.away_score) || 0;
      
      teamBScore +=
        Number(firstLeg.home_score) || 0;
    }
    
    if (
      secondLeg.home_team_id === teamA
    ) {
      teamAScore +=
        Number(secondLeg.home_score) || 0;
      
      teamBScore +=
        Number(secondLeg.away_score) || 0;
    } else if (
      secondLeg.away_team_id === teamA
    ) {
      teamAScore +=
        Number(secondLeg.away_score) || 0;
      
      teamBScore +=
        Number(secondLeg.home_score) || 0;
    } else {
      return {
        processed: false,
        reason: "Second leg does not contain the correct teams."
      };
    }
    
    if (
      teamAScore === teamBScore
    ) {
      return {
        processed: false,
        reason: "Aggregate score is tied."
      };
    }
    
    winnerTeamId =
      teamAScore > teamBScore ?
      teamA :
      teamB;
    
  } else {
    const homeScore =
      Number(match.home_score);
    
    const awayScore =
      Number(match.away_score);
    
    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore)
    ) {
      return {
        processed: false,
        reason: "Invalid knockout score."
      };
    }
    
    if (
      homeScore === awayScore
    ) {
      return {
        processed: false,
        reason: "Knockout match is tied."
      };
    }
    
    winnerTeamId =
      homeScore > awayScore ?
      match.home_team_id :
      match.away_team_id;
  }
  
  await db.prepare(`
    UPDATE matches
    SET
      winner_team_id = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(
    winnerTeamId,
    Date.now(),
    matchId
  ).run();
  
  const finalRoundIndex =
    Math.log2(
      knockoutSize
    );
  
  if (
    roundIndex ===
    finalRoundIndex
  ) {
    const team =
      await db.prepare(`
        SELECT name
        FROM teams
        WHERE id = ?
      `).bind(
        winnerTeamId
      ).first();
    
    await db.prepare(`
      UPDATE tournaments
      SET
        champion = ?,
        champion_name = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      winnerTeamId,
      team?.name || null,
      Date.now(),
      tournamentId
    ).run();
    
    return {
      processed: true,
      winnerTeamId,
      champion: true
    };
  }
  
  const semifinalRoundIndex =
    finalRoundIndex - 1;
  
  if (
    roundIndex ===
    semifinalRoundIndex
  ) {
    await prepareThirdPlaceMatch(
      db,
      tournamentId,
      roundIndex
    );
  }
  
  const nextRoundIndex =
    roundIndex + 1;
  
  const nextSlot =
    Math.ceil(
      slot / 2
    );
  
  const nextRound =
    getKnockoutRoundName(
      knockoutSize /
      Math.pow(
        2,
        nextRoundIndex
      )
    );
  
  const nextMatchesResult =
    await db.prepare(`
      SELECT *
      FROM matches
      WHERE tournament_id = ?
      AND match_type = 'knockout'
      AND round_index = ?
      AND slot = ?
      ORDER BY leg ASC
    `).bind(
      tournamentId,
      nextRoundIndex,
      nextSlot
    ).all();
  
  const nextMatches =
    nextMatchesResult.results || [];
  
  if (!nextMatches.length) {
    return {
      processed: true,
      winnerTeamId,
      advanced: false,
      reason: "Winner determined, but next-round match does not exist yet."
    };
  }
  
  const now =
    Date.now();
  
  const isFirstSlot =
    slot % 2 === 1;
  
  if (isFirstSlot) {
    await db.prepare(`
      UPDATE matches
      SET
        home_team_id = ?,
        updated_at = ?
      WHERE tournament_id = ?
      AND match_type = 'knockout'
      AND round_index = ?
      AND slot = ?
      AND leg = 1
    `).bind(
      winnerTeamId,
      now,
      tournamentId,
      nextRoundIndex,
      nextSlot
    ).run();
    
    if (isDoubleLeg) {
      await db.prepare(`
        UPDATE matches
        SET
          away_team_id = ?,
          updated_at = ?
        WHERE tournament_id = ?
        AND match_type = 'knockout'
        AND round_index = ?
        AND slot = ?
        AND leg = 2
      `).bind(
        winnerTeamId,
        now,
        tournamentId,
        nextRoundIndex,
        nextSlot
      ).run();
    }
    
  } else {
    await db.prepare(`
      UPDATE matches
      SET
        away_team_id = ?,
        updated_at = ?
      WHERE tournament_id = ?
      AND match_type = 'knockout'
      AND round_index = ?
      AND slot = ?
      AND leg = 1
    `).bind(
      winnerTeamId,
      now,
      tournamentId,
      nextRoundIndex,
      nextSlot
    ).run();
    
    if (isDoubleLeg) {
      await db.prepare(`
        UPDATE matches
        SET
          home_team_id = ?,
          updated_at = ?
        WHERE tournament_id = ?
        AND match_type = 'knockout'
        AND round_index = ?
        AND slot = ?
        AND leg = 2
      `).bind(
        winnerTeamId,
        now,
        tournamentId,
        nextRoundIndex,
        nextSlot
      ).run();
    }
  }
  
  return {
    processed: true,
    winnerTeamId,
    advanced: true,
    nextRound,
    nextRoundIndex,
    nextSlot
  };
}


async function prepareThirdPlaceMatch(
  db,
  tournamentId,
  completedRound
) {
  const semifinalResult =
    await db.prepare(`
      SELECT
        id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        played,
        winner_team_id,
        slot,
        leg
      FROM matches
      WHERE tournament_id = ?
      AND match_type = 'knockout'
      AND round = 'Semi Final'
      AND round_index = ?
      ORDER BY slot ASC, leg ASC
    `).bind(
      tournamentId,
      completedRound
    ).all();
  
  const semifinalMatches =
    semifinalResult.results || [];
  
  if (
    semifinalMatches.length !== 2 &&
    semifinalMatches.length !== 4
  ) {
    return {
      prepared: false,
      reason: "Invalid semifinal match count."
    };
  }
  
  const slots = [
    ...new Set(
      semifinalMatches.map(
        item =>
        Number(item.slot)
      )
    )
  ];
  
  if (
    slots.length !== 2
  ) {
    return {
      prepared: false,
      reason: "Both semifinal ties are not available."
    };
  }
  
  const losers = [];
  
  for (
    const slot of slots
  ) {
    const tie =
      semifinalMatches.filter(
        item =>
        Number(item.slot) ===
        slot
      );
    
    if (
      tie.length !== 1 &&
      tie.length !== 2
    ) {
      return {
        prepared: false,
        reason: "Invalid semifinal tie."
      };
    }
    
    if (
      tie.some(
        item =>
        Number(item.played) !== 1
      )
    ) {
      return {
        prepared: false,
        reason: "Both semifinal ties are not completed."
      };
    }
    
    let winnerTeamId =
      null;
    
    if (tie.length === 2) {
      const leg1 =
        tie.find(
          item =>
          Number(item.leg) === 1
        );
      
      const leg2 =
        tie.find(
          item =>
          Number(item.leg) === 2
        );
      
      if (
        !leg1 ||
        !leg2
      ) {
        return {
          prepared: false,
          reason: "Invalid semifinal legs."
        };
      }
      
      const teamA =
        leg1.home_team_id;
      
      const teamB =
        leg1.away_team_id;
      
      let teamAScore = 0;
      let teamBScore = 0;
      
      if (
        leg1.home_team_id === teamA
      ) {
        teamAScore +=
          Number(leg1.home_score) || 0;
        
        teamBScore +=
          Number(leg1.away_score) || 0;
      }
      
      if (
        leg2.home_team_id === teamA
      ) {
        teamAScore +=
          Number(leg2.home_score) || 0;
        
        teamBScore +=
          Number(leg2.away_score) || 0;
      } else if (
        leg2.away_team_id === teamA
      ) {
        teamAScore +=
          Number(leg2.away_score) || 0;
        
        teamBScore +=
          Number(leg2.home_score) || 0;
      } else {
        return {
          prepared: false,
          reason: "Semifinal second leg has incorrect teams."
        };
      }
      
      if (
        teamAScore === teamBScore
      ) {
        return {
          prepared: false,
          reason: "A semifinal aggregate score is tied."
        };
      }
      
      winnerTeamId =
        teamAScore > teamBScore ?
        teamA :
        teamB;
      
    } else {
      const semifinal =
        tie[0];
      
      if (
        Number(semifinal.home_score) ===
        Number(semifinal.away_score)
      ) {
        return {
          prepared: false,
          reason: "A semifinal is tied."
        };
      }
      
      winnerTeamId =
        Number(semifinal.home_score) >
        Number(semifinal.away_score) ?
        semifinal.home_team_id :
        semifinal.away_team_id;
    }
    
    const teams =
      new Set();
    
    for (const item of tie) {
      if (item.home_team_id) {
        teams.add(
          item.home_team_id
        );
      }
      
      if (item.away_team_id) {
        teams.add(
          item.away_team_id
        );
      }
    }
    
    const loserTeamId = [...teams].find(
      teamId =>
      teamId !== winnerTeamId
    );
    
    if (!loserTeamId) {
      return {
        prepared: false,
        reason: "Unable to determine semifinal loser."
      };
    }
    
    losers.push(
      loserTeamId
    );
  }
  
  if (
    losers.length !== 2
  ) {
    return {
      prepared: false,
      reason: "Both semifinal losers are required."
    };
  }
  
  const thirdPlace =
    await db.prepare(`
      SELECT *
      FROM matches
      WHERE tournament_id = ?
      AND match_type = 'third_place'
      LIMIT 1
    `).bind(
      tournamentId
    ).first();
  
  if (!thirdPlace) {
    return {
      prepared: false,
      reason: "Third-place match was not generated."
    };
  }
  
  if (
    thirdPlace.home_team_id &&
    thirdPlace.away_team_id
  ) {
    return {
      prepared: false,
      alreadyPrepared: true
    };
  }
  
  await db.prepare(`
    UPDATE matches
    SET
      home_team_id = ?,
      away_team_id = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(
    losers[0],
    losers[1],
    Date.now(),
    thirdPlace.id
  ).run();
  
  return {
    prepared: true,
    thirdPlaceMatchId: thirdPlace.id,
    homeTeamId: losers[0],
    awayTeamId: losers[1]
  };
}