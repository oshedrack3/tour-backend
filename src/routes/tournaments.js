import {
  getTournamentDisciplinaryActions,
  deductTournamentPlayerPoints,
  reverseTournamentPlayerDeduction,
  getTournamentRuleAcceptance,
  saveTournamentRuleAcceptance,
  getTournament,
  deleteTournament,
  getTournamentsByOwner,
  getTournamentsByPlayer,
  createTournament,
  updateTournament,
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
  getTournamentsByCompetition,
  importTournamentPlayers,
  getUserRegisteredSquad,
  getRegisteredSquad
  
} from "../storage.js";
import {
  uploadBase64Image
} from "../cloudinary.js";
import {
  sendPushToUser
} from "../pushNotifications.js";


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
  request.method === "GET" &&
  pathname === "/players/head-to-head"
) {
  return await getHeadToHeadComparisonRoute(
    env,
    url
  );
}

if (
  request.method === "GET" &&
  pathname === "/players/search"
) {
  return await searchPlayersRoute(
    env,
    url
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
    /^\/tournaments\/[^/]+\/rules\/accept$/.test(pathname)
  ) {
    const tournamentId =
      pathname.split("/")[2];
    
    return await acceptTournamentRulesRoute(
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
    request.method === "POST" &&
    /^\/tournaments\/[^/]+\/import-teams$/.test(pathname)
  ) {
    const tournamentId =
      pathname.split("/")[2];
    
    return await importTournamentPlayersRoute(
      request,
      env,
      tournamentId,
      user
    );
  }
  if (
    request.method === "PATCH" &&
    /^\/tournaments\/[^/]+$/.test(pathname)
  )
  {
    const tournamentId =
      pathname.split("/")[2];
    
    return await updateTournamentRoute(
      request,
      env,
      tournamentId,
      user
    );
  }
  
  if (
    request.method === "GET" &&
    /^\/tournaments\/[^/]+\/rules$/.test(pathname)
  ) {
    const tournamentId =
      pathname.split("/")[2];
    
    return await getTournamentRulesRoute(
      env,
      tournamentId,
      user
    );
  }
  
  if (
    request.method === "GET" &&
    pathname === "/tournaments/importable"
  ) {
    return await getImportableTournamentsRoute(
      env,
      user
    );
  }
  if (
    request.method === "DELETE" &&
    /^\/tournaments\/[^/]+\/players\/[^/]+$/.test(pathname)
  ) {
    const parts =
      pathname.split("/");
    
    const tournamentId =
      parts[2];
    
    const playerId =
      parts[4];
    
    return await removeTournamentPlayerRoute(
      env,
      tournamentId,
      playerId,
      user
    );
  }
  
  if (
    request.method === "GET" &&
    url.pathname.match(
      /^\/tournaments\/[^/]+\/teams\/[^/]+\/squad$/
    )
  ) {
    const match = url.pathname.match(
      /^\/tournaments\/([^/]+)\/teams\/([^/]+)\/squad$/
    );
    
    return getTournamentTeamSquadRoute(
      env,
      decodeURIComponent(match[1]),
      decodeURIComponent(match[2])
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
    request.method === "POST" &&
    /^\/tournaments\/[^/]+\/disciplinary-actions$/.test(pathname)
  ) {
    const tournamentId =
      pathname.split("/")[2];
    
    return await deductTournamentPlayerPointsRoute(
      request,
      env,
      tournamentId,
      user
    );
  }
  
  if (
    request.method === "POST" &&
    /^\/tournaments\/[^/]+\/disciplinary-actions\/[^/]+\/reverse$/.test(pathname)
  ) {
    const parts =
      pathname.split("/");
    
    const tournamentId =
      parts[2];
    
    const actionId =
      parts[4];
    
    return await reverseTournamentPlayerDeductionRoute(
      request,
      env,
      tournamentId,
      actionId,
      user
    );
  }
  
  if (
    request.method === "GET" &&
    /^\/tournaments\/[^/]+\/disciplinary-actions$/.test(pathname)
  ) {
    const tournamentId =
      pathname.split("/")[2];
    return await getTournamentDisciplinaryActionsRoute(
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
          tournament_image_public_id:
            
            tournamentImageData?.publicId || null,
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
    const updatePlayerStats =
      tournament.format === "league" ||
      match.match_type === "group";
    let newHomeStats = null;
    let newAwayStats = null;
    if (updatePlayerStats) {
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
          Number.isInteger(
            oldHomeScore
          ) &&
          Number.isInteger(
            oldAwayScore
          )
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
      newHomeStats =
        applyStats(
          currentHome,
          newStats.home,
          1
        );
      newAwayStats =
        applyStats(
          currentAway,
          newStats.away,
          1
        );
    }
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
        tournamentId,
        updatePlayerStats
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
      match.match_type ===
      "knockout" ||
      match.match_type ===
      "third_place"
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
    
    const registeredSquad =
      await getRegisteredSquad(
        env.DB,
        user.id
      );
    
    if (!registeredSquad) {
      return Response.json({
        success: false,
        message: "You must register your squad before joining a tournament. Go to your Profile page, find the Registered Squad section, and upload your squad image. Once registered, return here to join the tournament."
      }, {
        status: 403
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
    
    const registeredTeams =
      teams
      .map(team => team.name)
      .join(", ");
    
    if (
      tournament.admin_uid &&
      String(tournament.admin_uid) !==
      String(user.id)
    ) {
      await sendPushToUser(
        env,
        tournament.admin_uid,
        "New Tournament Player",
        `${user.username || "A player"} joined ${tournament.name || "your tournament"} with ${registeredTeams}.`,
        `/tournament/${tournamentId}`
      );
    }
    
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
    
    const registeredSquad =
      await getRegisteredSquad(
        env.DB,
        user.id
      );
    
    if (!registeredSquad) {
      return Response.json({
        success: false,
        message: "You must register your squad before submitting a match result. To register your squad, go to your Profile page, locate the Registered Squad section, and upload an image of your squad. Once your squad has been successfully registered, return to the tournament and submit your match result."
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
    
    let stats = null;
    
    if (
      body.stats !== null &&
      body.stats !== undefined
    ) {
      if (
        typeof body.stats !== "object" ||
        Array.isArray(body.stats)
      ) {
        return Response.json({
          success: false,
          message: "Invalid match statistics."
        }, {
          status: 400
        });
      }
      
      stats = body.stats;
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
          stats: stats ?
            JSON.stringify(stats) : null,
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
    
    if (
      tournament.admin_uid &&
      String(tournament.admin_uid) !==
      String(user.id)
    ) {
      await sendPushToUser(
        env,
        tournament.admin_uid,
        "Match Result Submitted",
        `A player submitted a ${homeGoals}-${awayGoals} match result for ${tournament.name}.`,
        `/tournament/${tournamentId}`
      );
    }
    
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
    Number(match.round_index);
  
  if (
    !Number.isInteger(fromRound) ||
    !Number.isInteger(toRound) ||
    !Number.isInteger(matchRound)
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
      
      await sendPushToUser(
        env,
        submission.submitted_by,
        "Match Result Rejected",
        `Your ${submission.home_goals}-${submission.away_goals} match result for ${tournament.name} was rejected${rejectionReason ? `: ${rejectionReason}` : "."}`,
        `/tournament/${tournamentId}`
      );
      
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
    
    let submittedStats =
      null;
    
    if (submission.stats) {
      try {
        submittedStats =
          typeof submission.stats === "string" ?
          JSON.parse(submission.stats) :
          submission.stats;
      } catch {
        return Response.json({
          success: false,
          message: "Submission contains invalid match statistics."
        }, {
          status: 400
        });
      }
    }
    
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
          winner_team_id: winnerTeamId,
          stats: submittedStats ?
            JSON.stringify(submittedStats) : null
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
    
    await sendPushToUser(
      env,
      submission.submitted_by,
      "Match Result Approved",
      `Your ${homeScore}-${awayScore} match result for ${tournament.name} was approved.`,
      `/tournament/${tournamentId}`
    );
    
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
        message: "Only the tournament admin can generate the tournament."
      }, {
        status: 403
      });
    }
    
    const body =
      await request.json();
    
    const settings =
      body.settings &&
      typeof body.settings === "object" ?
      body.settings :
      body;
    
    const enableGroups =
      settings.enableGroups === true;
    
    const groupingMode =
      settings.groupingMode === "manual" ?
      "manual" :
      "auto";
    
    const groupRoundMode =
      settings.groupRoundMode === "double" ?
      "double" :
      "single";
    
    const knockoutPairingMode =
      settings.knockoutPairingMode === "manual" ?
      "manual" :
      "auto";
    
    const knockoutRoundMode =
      settings.knockoutRoundMode === "double" ?
      "double" :
      "single";
    
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
        message: "At least 2 teams are required."
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
        body.groups.length ?
        body.groups.length :
        Math.ceil(
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
        message: "Invalid knockout bracket size."
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
        message: "Invalid knockout round mode."
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
        message: "A third-place match requires at least 4 teams."
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
          message: "Invalid teams per group."
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
          message: "Invalid number of qualifying teams."
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
          message: error.message
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
          message: `The groups produce ${totalQualifiers} qualifying teams, ` +
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
          message: `This direct knockout requires exactly ${knockoutSize} teams, ` +
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
          message: error.message
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
    
    await env.DB.prepare(`
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
    `).bind(
      tournamentId
    ).run();
    
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
      message: enableGroups ?
        "Cup group stage generated successfully." : "Direct knockout tournament generated successfully.",
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
      message: error.message ||
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
    
    if (teams.length % 2 !== 0) {
      teams.push(null);
    }
    
    const totalTeams = teams.length;
    const roundsPerLeg = totalTeams - 1;
    const matchesPerRound = totalTeams / 2;
    
    const firstLegFixtures = [];
    
    for (
      let roundIndex = 0; roundIndex < roundsPerLeg; roundIndex++
    ) {
      const roundFixtures = [];
      
      for (
        let slot = 0; slot < matchesPerRound; slot++
      ) {
        const home =
          teams[slot];
        
        const away =
          teams[
            totalTeams - 1 - slot
          ];
        
        if (home && away) {
          roundFixtures.push({
            home_team_id: home,
            away_team_id: away,
            slot
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
          leg: 1,
          winner_team_id: null,
          scheduled_at: null,
          created_at: Date.now(),
          updated_at: null,
          submission_status: null
        });
      }
    }
    
    if (groupRoundMode === "double") {
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
            round: `Group ${group.name} - Round ${
                roundsPerLeg +
                roundIndex +
                1
              }`,
            round_index: roundsPerLeg +
              roundIndex +
              1,
            slot,
            leg: 2,
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
    if (!Array.isArray(knockoutPairs)) {
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
        homeTeamId ===
        awayTeamId
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
  
  const finalRoundIndex =
    Math.log2(knockoutSize);
  
  while (
    currentSize >= 2
  ) {
    const round =
      getKnockoutRoundName(
        currentSize
      );
    
    const matchCount =
      currentSize / 2;
    
    const isFinal =
      roundIndex ===
      finalRoundIndex;
    
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
        "double" &&
        !isFinal
      ) {
        matches.push(
          createKnockoutMatch(
            roundIndex === 1 ?
            awayTeamId :
            null,
            roundIndex === 1 ?
            homeTeamId :
            null,
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
        finalRoundIndex,
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
    if (!team.groupId) {
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
    .sort((a, b) =>
      String(a.name)
      .localeCompare(
        String(b.name)
      )
    );
  const groupCount =
    groupList.length;
  if (
    groupCount < 2 ||
    groupCount % 2 !== 0
  ) {
    throw new Error(
      "An even number of groups is required for automatic group-based knockout pairing."
    );
  }
  for (const group of groupList) {
    group.teams.sort(
      (a, b) =>
      Number(a.pos) -
      Number(b.pos)
    );
  }
  const qualifiersPerGroup =
    groupList[0].teams.length;
  if (
    qualifiersPerGroup < 1
  ) {
    throw new Error(
      "No qualified teams were found in the groups."
    );
  }
  for (const group of groupList) {
    if (
      group.teams.length !==
      qualifiersPerGroup
    ) {
      throw new Error(
        "All groups must contain the same number of qualified teams."
      );
    }
  }
  const result = [];
  for (
    let i = 0; i < groupCount; i += 2
  ) {
    const firstGroup =
      groupList[i];
    const secondGroup =
      groupList[i + 1];
    for (
      let position = 0; position < qualifiersPerGroup; position++
    ) {
      const first =
        firstGroup.teams[
          position
        ];
      const oppositePosition =
        qualifiersPerGroup -
        1 -
        position;
      const second =
        secondGroup.teams[
          oppositePosition
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
        gd: (Number(row.gf) || 0) -
          (Number(row.ga) || 0),
        points: Number(row.points) || 0
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
  
  const finalRoundIndex =
    Math.log2(knockoutSize);
  
  const isFinal =
    roundIndex === finalRoundIndex;
  
  const isDoubleLegRound =
    isDoubleLeg &&
    !isFinal;
  
  let winnerTeamId =
    null;
  
  if (isDoubleLegRound) {
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
    
    if (
      ![
        firstLeg.home_team_id,
        firstLeg.away_team_id
      ].includes(teamA) ||
      ![
        secondLeg.home_team_id,
        secondLeg.away_team_id
      ].includes(teamA) ||
      ![
        secondLeg.home_team_id,
        secondLeg.away_team_id
      ].includes(teamB)
    ) {
      return {
        processed: false,
        reason: "The two knockout legs do not contain the same teams."
      };
    }
    
    let teamAScore = 0;
    let teamBScore = 0;
    
    if (
      firstLeg.home_team_id ===
      teamA
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
      secondLeg.home_team_id ===
      teamA
    ) {
      teamAScore +=
        Number(secondLeg.home_score) || 0;
      
      teamBScore +=
        Number(secondLeg.away_score) || 0;
    } else {
      teamAScore +=
        Number(secondLeg.away_score) || 0;
      
      teamBScore +=
        Number(secondLeg.home_score) || 0;
    }
    
    if (
      teamAScore ===
      teamBScore
    ) {
      return {
        processed: false,
        reason: "Aggregate score is tied."
      };
    }
    
    winnerTeamId =
      teamAScore >
      teamBScore ?
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
    Math.floor(
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
  
  if (
    !nextMatches.length
  ) {
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
    slot % 2 === 0;
  
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
    
    if (
      isDoubleLeg
    ) {
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
    
    if (
      isDoubleLeg
    ) {
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
    
    const players =
      await env.DB
      .prepare(`
        SELECT user_id
        FROM tournament_players
        WHERE tournament_id = ?
      `)
      .bind(tournamentId)
      .all();
    
    let pushTitle =
      "Submission Deadline Updated";
    
    let pushBody;
    
    if (
      enabled &&
      deadline !== null
    ) {
      const deadlineDate =
        new Date(deadline);
      
      pushBody =
        `Match submissions for rounds ${fromRound}-${toRound} are due by ${deadlineDate.toLocaleString()}.`;
    } else if (!enabled) {
      pushBody =
        `The submission deadline for rounds ${fromRound}-${toRound} has been disabled.`;
    } else {
      pushBody =
        `The submission deadline for rounds ${fromRound}-${toRound} has been updated.`;
    }
    
    await Promise.all(
      (players.results || [])
      .filter(
        player =>
        player.user_id &&
        String(player.user_id) !==
        String(user.id)
      )
      .map(
        player =>
        sendPushToUser(
          env,
          player.user_id,
          pushTitle,
          pushBody,
          `/tournament/${tournamentId}`
        )
      )
    );
    
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

async function importTournamentPlayersRoute(
  request,
  env,
  tournamentId,
  user
) {
  try {
    const targetTournament =
      await getTournamentForUser(
        env.DB,
        tournamentId,
        user.id
      );
    
    if (!targetTournament) {
      return Response.json({
        success: false,
        message: "Tournament not found or access denied."
      }, {
        status: 404
      });
    }
    
    if (targetTournament.admin_uid !== user.id) {
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
    
    const sourceTournamentId =
      String(
        body.source_tournament_id || ""
      ).trim();
    
    if (!sourceTournamentId) {
      return Response.json({
        success: false,
        message: "Source tournament ID is required."
      }, {
        status: 400
      });
    }
    
    if (
      sourceTournamentId ===
      tournamentId
    ) {
      return Response.json({
        success: false,
        message: "Source and target tournaments cannot be the same."
      }, {
        status: 400
      });
    }
    
    const sourceTournament =
      await getTournamentForUser(
        env.DB,
        sourceTournamentId,
        user.id
      );
    
    if (!sourceTournament) {
      return Response.json({
        success: false,
        message: "Source tournament not found or access denied."
      }, {
        status: 404
      });
    }
    
    if (sourceTournament.admin_uid !== user.id) {
      return Response.json({
        success: false,
        message: "You can only import teams from a tournament you own."
      }, {
        status: 403
      });
    }
    
    const players =
      await importTournamentPlayers(
        env.DB,
        sourceTournamentId,
        tournamentId
      );
    
    return Response.json({
      success: true,
      message: players.length ?
        `${players.length} team${players.length === 1 ? "" : "s"} imported successfully.` : "No new teams to import.",
      players
    });
    
  } catch (error) {
    console.error(
      "Import tournament players error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to import teams."
    }, {
      status: 500
    });
  }
}

async function getImportableTournamentsRoute(
  env,
  user
) {
  try {
    let tournaments = [];
    
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
      (tournaments || [])
      .map(parseTournament);
    
    return Response.json({
      success: true,
      tournaments
    });
    
  } catch (error) {
    console.error(
      "Get importable tournaments error:",
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

async function removeTournamentPlayerRoute(
  env,
  tournamentId,
  playerId,
  user
) {
  try {
    if (user.role !== "admin") {
      return Response.json({
        success: false,
        message: "Only admins can remove players."
      }, {
        status: 403
      });
    }
    
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
      tournament.admin_uid !== user.id
    ) {
      return Response.json({
        success: false,
        message: "Access denied."
      }, {
        status: 403
      });
    }
    
    const match =
      await env.DB
      .prepare(`
          SELECT id
          FROM matches
          WHERE tournament_id = ?
          LIMIT 1
        `)
      .bind(
        tournamentId
      )
      .first();
    
    if (match) {
      return Response.json({
        success: false,
        message: "Players cannot be removed after fixtures have been generated."
      }, {
        status: 400
      });
    }
    
    const player =
      await env.DB
      .prepare(`
          SELECT
            tp.id,
            tp.tournament_id,
            tp.user_id,
            tp.team_id,
            t.name AS team_name
          FROM tournament_players tp
          LEFT JOIN teams t
            ON t.id = tp.team_id
          WHERE tp.id = ?
          AND tp.tournament_id = ?
        `)
      .bind(
        playerId,
        tournamentId
      )
      .first();
    
    if (!player) {
      return Response.json({
        success: false,
        message: "Tournament player not found."
      }, {
        status: 404
      });
    }
    
    await env.DB
      .prepare(`
        DELETE FROM tournament_players
        WHERE id = ?
        AND tournament_id = ?
      `)
      .bind(
        playerId,
        tournamentId
      )
      .run();
    
    return Response.json({
      success: true,
      message: `${player.team_name || "Player"} removed from tournament.`,
      player
    });
    
  } catch (error) {
    console.error(
      "Remove tournament player error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to remove player from tournament."
    }, {
      status: 500
    });
  }
}

async function updateTournamentRoute(
  request,
  env,
  tournamentId,
  user
) {
  try {
    const body = await request.json();
    const existing =
      await getTournamentForUser(
        env.DB,
        tournamentId,
        user.id
      );
    if (!existing) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, {
        status: 404
      });
    }
    const updates = {};
    let completingTournament = false;
    if (body.name !== undefined) {
      const name =
        String(body.name || "").trim();
      if (!name) {
        return Response.json({
          success: false,
          message: "Tournament name is required."
        }, {
          status: 400
        });
      }
      updates.name = name;
    }
    if (
      body.competition_id !== undefined ||
      body.competitionId !== undefined
    ) {
      const competition_id =
        String(
          body.competition_id ??
          body.competitionId ??
          ""
        ).trim();
      if (!competition_id) {
        return Response.json({
          success: false,
          message: "Competition ID is required."
        }, {
          status: 400
        });
      }
      const competition =
        await env.DB.prepare(`
          SELECT id, owner_id
          FROM competitions
          WHERE id = ?
        `).bind(competition_id).first();
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
      updates.competition_id = competition_id;
    }
    if (body.season !== undefined) {
      const season =
        String(body.season || "").trim();
      if (!season) {
        return Response.json({
          success: false,
          message: "Season is required."
        }, {
          status: 400
        });
      }
      updates.season = season;
    }
    if (body.format !== undefined) {
      const format =
        String(body.format || "").trim();
      if (!format) {
        return Response.json({
          success: false,
          message: "Tournament format is required."
        }, {
          status: 400
        });
      }
      updates.format = format;
    }
    if (
      body.season_status !== undefined ||
      body.seasonStatus !== undefined ||
      body.status !== undefined
    ) {
      const seasonStatus =
        String(
          body.season_status ??
          body.seasonStatus ??
          body.status ??
          ""
        ).trim();
      const existingStatus =
        existing.season_status ??
        existing.seasonStatus ??
        "";
      if (
        seasonStatus === "completed" &&
        existingStatus !== "completed"
      ) {
        completingTournament = true;
      }
      updates.season_status = seasonStatus;
      if (
        seasonStatus === "completed" &&
        existingStatus !== "completed"
      ) {
        updates.completed_at = Date.now();
      }
    }
    if (
      body.start_date !== undefined ||
      body.startDate !== undefined
    ) {
      updates.start_date =
        body.start_date ??
        body.startDate;
    }
    if (
      body.end_date !== undefined ||
      body.endDate !== undefined
    ) {
      updates.end_date =
        body.end_date ??
        body.endDate;
    }
    if (
      body.match_days !== undefined ||
      body.matchDays !== undefined
    ) {
      const match_days =
        body.match_days ??
        body.matchDays;
      updates.match_days =
        typeof match_days === "string"
          ? match_days
          : JSON.stringify(match_days);
    }
    if (body.settings !== undefined) {
      updates.settings =
        typeof body.settings === "string"
          ? body.settings
          : JSON.stringify(body.settings);
    }
    if (
      body.access_type !== undefined ||
      body.accessType !== undefined
    ) {
      updates.access_type =
        body.access_type ??
        body.accessType;
    }
    if (
      body.is_public !== undefined ||
      body.isPublic !== undefined
    ) {
      const is_public =
        body.is_public ??
        body.isPublic;
      updates.is_public = is_public ? 1 : 0;
    }
    const tournamentImage =
      body.tournament_image !== undefined
        ? body.tournament_image
        : body.tournamentImage !== undefined
          ? body.tournamentImage
          : body.image !== undefined
            ? body.image
            : undefined;
    if (tournamentImage !== undefined) {
      if (
        tournamentImage === null ||
        tournamentImage === ""
      ) {
        updates.tournament_image = null;
        updates.tournament_image_public_id = null;
      } else {
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
        const tournamentImageData =
          await uploadBase64Image(
            tournamentImage,
            "tournaments",
            tournamentId,
            env
          );
        updates.tournament_image =
          tournamentImageData.url;
        updates.tournament_image_public_id =
          tournamentImageData.publicId;
      }
    }
    const format =
      String(
        updates.format ??
        existing.format ??
        ""
      ).toLowerCase();
    const competitionId =
      updates.competition_id ??
      existing.competition_id;
    if (completingTournament) {
      if (format === "league") {
        const table =
          await rebuildTable(
            env.DB,
            tournamentId
          );
        if (!table.length) {
          return Response.json({
            success: false,
            message: "Cannot complete tournament without teams."
          }, {
            status: 400
          });
        }
        updates.champion = table[0].id;
        updates.champion_name = table[0].name;
      } else if (format === "cup") {
        const tournamentData =
          await env.DB.prepare(`
            SELECT settings
            FROM tournaments
            WHERE id = ?
          `).bind(tournamentId).first();
        let settings = {};
        try {
          settings =
            typeof tournamentData?.settings === "string"
              ? JSON.parse(tournamentData.settings || "{}")
              : tournamentData?.settings || {};
        } catch {
          settings = {};
        }
        const knockoutSize =
          Number(settings.knockoutSize);
        if (
          !Number.isInteger(knockoutSize) ||
          ![2, 4, 8, 16, 32].includes(knockoutSize)
        ) {
          return Response.json({
            success: false,
            message: "Invalid knockout bracket size."
          }, {
            status: 400
          });
        }
        const finalRoundIndex =
          Math.log2(knockoutSize);
        const finalResult =
          await env.DB.prepare(`
            SELECT
              winner_team_id
            FROM matches
            WHERE tournament_id = ?
              AND match_type = 'knockout'
              AND round_index = ?
              AND slot = 0
              AND leg = 1
              AND played = 1
              AND winner_team_id IS NOT NULL
            LIMIT 1
          `).bind(
            tournamentId,
            finalRoundIndex
          ).first();
        if (!finalResult) {
          return Response.json({
            success: false,
            message: "Cannot complete cup without a resolved final."
          }, {
            status: 400
          });
        }
        const knockoutResult =
          await env.DB.prepare(`
            SELECT
              round_index,
              slot,
              leg,
              home_team_id,
              away_team_id,
              home_score,
              away_score,
              played
            FROM matches
            WHERE tournament_id = ?
              AND match_type = 'knockout'
            ORDER BY round_index, slot, leg
          `).bind(tournamentId).all();
        const matches =
          knockoutResult.results || [];
        const isDoubleLeg =
          settings.knockoutRoundMode === "double";
        const ties = new Map();
        for (const match of matches) {
          const key =
            `${match.round_index}:${match.slot}`;
          if (!ties.has(key)) {
            ties.set(key, []);
          }
          ties.get(key).push(match);
        }
        for (
          let roundIndex = 1;
          roundIndex <= finalRoundIndex;
          roundIndex++
        ) {
          const expectedSlots =
            knockoutSize /
            Math.pow(2, roundIndex);
          const expectedLegs =
            isDoubleLeg &&
            roundIndex < finalRoundIndex
              ? 2
              : 1;
          for (
            let slot = 0;
            slot < expectedSlots;
            slot++
          ) {
            const tieMatches =
              ties.get(`${roundIndex}:${slot}`) || [];
            if (!tieMatches.length) {
              return Response.json({
                success: false,
                message: "Cannot complete cup while knockout matches are missing."
              }, {
                status: 400
              });
            }
            for (
              let leg = 1;
              leg <= expectedLegs;
              leg++
            ) {
              const match =
                tieMatches.find(
                  item => Number(item.leg || 1) === leg
                );
              if (
                !match ||
                Number(match.played) !== 1 ||
                !match.home_team_id ||
                !match.away_team_id
              ) {
                return Response.json({
                  success: false,
                  message: "Cannot complete cup while knockout matches remain unfinished."
                }, {
                  status: 400
                });
              }
              const homeScore =
                Number(match.home_score);
              const awayScore =
                Number(match.away_score);
              if (
                !Number.isInteger(homeScore) ||
                !Number.isInteger(awayScore) ||
                homeScore < 0 ||
                awayScore < 0
              ) {
                return Response.json({
                  success: false,
                  message: "A knockout match has an invalid score."
                }, {
                  status: 400
                });
              }
            }
          }
        }
        const champion =
          await env.DB.prepare(`
            SELECT id, name
            FROM teams
            WHERE id = ?
          `).bind(
            finalResult.winner_team_id
          ).first();
        if (!champion) {
          return Response.json({
            success: false,
            message: "Cup champion team was not found."
          }, {
            status: 400
          });
        }
        updates.champion = champion.id;
        updates.champion_name = champion.name;
      } else {
        return Response.json({
          success: false,
          message: "Unsupported tournament format."
        }, {
          status: 400
        });
      }
      updates.completed_at = Date.now();
    }
    if (!Object.keys(updates).length) {
      let trophyAwards = null;
      if (
        (existing.season_status ??
          existing.seasonStatus) === "completed"
      ) {
        trophyAwards =
          await awardTournamentTrophyBonuses(
            env.DB,
            tournamentId
          );
      }
      return Response.json({
        success: true,
        tournament: parseTournament(existing),
        trophyAwards
      });
    }
    const tournament =
      await updateTournament(
        env.DB,
        tournamentId,
        updates,
        user.id
      );
    if (!tournament) {
      return Response.json({
        success: false,
        message: "Failed to update tournament."
      }, {
        status: 500
      });
    }
    let trophyAwards = null;
    const completedStatus =
      updates.season_status ??
      existing.season_status ??
      existing.seasonStatus;
    if (completedStatus === "completed") {
      if (
        competitionId ===
        "724ec974-f388-47f3-b288-7cdd6bdbd715" &&
        format !== "league"
      ) {
        return Response.json({
          success: false,
          message: "The GeSL league competition requires league format."
        }, {
          status: 400
        });
      }
      trophyAwards =
        await awardTournamentTrophyBonuses(
          env.DB,
          tournamentId
        );
    }
    return Response.json({
      success: true,
      tournament: parseTournament(tournament),
      trophyAwards
    });
  } catch (error) {
    console.error(
      "Update tournament error:",
      error
    );
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to update tournament."
    }, {
      status: 500
    });
  }
}

async function getTournamentRulesRoute(
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
    
    if (!tournament.competition_id) {
      return Response.json({
        success: true,
        rules: null,
        rules_version: null,
        accepted: true
      });
    }
    
    const competition =
      await env.DB
      .prepare(`
          SELECT
            id,
            rules,
            rules_version,
            rules_updated_at
          FROM competitions
          WHERE id = ?
        `)
      .bind(
        tournament.competition_id
      )
      .first();
    
    if (!competition) {
      return Response.json({
        success: true,
        rules: null,
        rules_version: null,
        accepted: true
      });
    }
    
    if (!competition.rules) {
      return Response.json({
        success: true,
        rules: null,
        rules_version: competition.rules_version,
        accepted: true
      });
    }
    
    const acceptance =
      await getTournamentRuleAcceptance(
        env.DB,
        tournamentId,
        user.id
      );
    
    const accepted = !!acceptance &&
      Number(
        acceptance.rules_version
      ) === Number(
        competition.rules_version
      );
    
    return Response.json({
      success: true,
      rules: competition.rules,
      rules_version: competition.rules_version,
      rules_updated_at: competition.rules_updated_at,
      accepted
    });
    
  } catch (error) {
    console.error(
      "Get tournament rules error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to load tournament rules."
    }, {
      status: 500
    });
  }
}

async function acceptTournamentRulesRoute(
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
    
    if (!tournament.competition_id) {
      return Response.json({
        success: false,
        message: "This tournament has no competition."
      }, {
        status: 400
      });
    }
    
    const competition =
      await env.DB
      .prepare(`
          SELECT
            id,
            rules,
            rules_version
          FROM competitions
          WHERE id = ?
        `)
      .bind(
        tournament.competition_id
      )
      .first();
    
    if (!competition) {
      return Response.json({
        success: false,
        message: "Competition not found."
      }, {
        status: 404
      });
    }
    
    if (!competition.rules) {
      return Response.json({
        success: true,
        message: "No tournament rules to accept."
      });
    }
    
    const acceptance =
      await saveTournamentRuleAcceptance(
        env.DB,
        tournamentId,
        user.id,
        competition.rules_version
      );
    
    return Response.json({
      success: true,
      message: "Tournament rules accepted.",
      acceptance
    });
    
  } catch (error) {
    console.error(
      "Accept tournament rules error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to accept tournament rules."
    }, {
      status: 500
    });
  }
}


async function getTournamentTeamSquadRoute(
  env,
  tournamentId,
  teamId
) {
  try {
    const player = await getTournamentPlayerByTeam(
      env.DB,
      tournamentId,
      teamId
    );
    
    if (!player) {
      return Response.json({
        success: false,
        message: "Player not found for this team."
      }, {
        status: 404
      });
    }
    
    const squad = await getUserRegisteredSquad(
      env.DB,
      player.user_id
    );
    
    if (!squad) {
      return Response.json({
        success: false,
        message: "This player has no registered squad."
      }, {
        status: 404
      });
    }
    
    return Response.json({
      success: true,
      squad
    });
  } catch (error) {
    return Response.json({
      success: false,
      message: "Unable to retrieve this team's registered squad."
    }, {
      status: 500
    });
  }
}



async function deductTournamentPlayerPointsRoute(
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
    
    const userId = body.user_id;
    const teamId = body.team_id;
    const points = Number(body.points);
    const reason = body.reason;
    
    if (
      !userId ||
      !teamId ||
      !Number.isSafeInteger(points) ||
      points <= 0 ||
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return Response.json({
        success: false,
        message: "Provide a valid player, team, positive points deduction, and reason."
      }, {
        status: 400
      });
    }
    
    const result = await deductTournamentPlayerPoints(
      env.DB,
      {
        tournamentId,
        userId,
        teamId,
        points,
        reason,
        adminId: user.id
      }
    );
    
    return Response.json({
      success: true,
      message: `${points} point(s) deducted successfully.`,
      action: result.action
    });
  } catch (error) {
    console.error(
      "Deduct tournament player points error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to deduct tournament points."
    }, {
      status: 500
    });
  }
}

async function reverseTournamentPlayerDeductionRoute(
  request,
  env,
  tournamentId,
  actionId,
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
    
    const action = await env.DB.prepare(`
      SELECT *
      FROM disciplinary_actions
      WHERE id = ?
        AND tournament_id = ?
    `).bind(
      actionId,
      tournamentId
    ).first();
    
    if (!action) {
      return Response.json({
        success: false,
        message: "Disciplinary action not found."
      }, {
        status: 404
      });
    }
    
    if (action.status !== "active") {
      return Response.json({
        success: false,
        message: "This disciplinary action has already been reversed."
      }, {
        status: 400
      });
    }
    
    const body = await request.json().catch(() => ({}));
    
    const reversalReason = body.reversal_reason;
    
    if (
      typeof reversalReason !== "string" ||
      !reversalReason.trim()
    ) {
      return Response.json({
        success: false,
        message: "A reason for reversing the deduction is required."
      }, {
        status: 400
      });
    }
    
    const result = await reverseTournamentPlayerDeduction(
      env.DB,
      {
        actionId,
        adminId: user.id,
        reversalReason
      }
    );
    
    return Response.json({
      success: true,
      message: `${action.points_deducted} point(s) restored successfully.`,
      action: result.action
    });
  } catch (error) {
    console.error(
      "Reverse tournament player deduction error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to reverse disciplinary action."
    }, {
      status: 500
    });
  }
}


async function getTournamentDisciplinaryActionsRoute(
  env,
  tournamentId,
  user
) {
  try {
    if (!user?.id) {
      return Response.json({
        success: false,
        message: "Authentication required."
      }, {
        status: 401
      });
    }
    
    const tournament = await getTournament(
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
    
    const actions =
      await getTournamentDisciplinaryActions(
        env.DB,
        tournamentId
      );
    
    return Response.json({
      success: true,
      actions
    });
  } catch (error) {
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to load disciplinary history."
    }, {
      status: 500
    });
  }
}

async function awardTournamentTrophyBonuses(
  db,
  tournamentId
) {
  const tournament = await db.prepare(`
    SELECT
      id,
      competition_id,
      format,
      season_status,
      settings
    FROM tournaments
    WHERE id = ?
  `).bind(tournamentId).first();

  if (!tournament) {
    throw new Error("Tournament not found.");
  }

  if (tournament.season_status !== "completed") {
    return {
      success: false,
      message: "Tournament is not completed."
    };
  }

  const competitionRules = {
    "724ec974-f388-47f3-b288-7cdd6bdbd715": {
      format: "league",
      bonuses: {
        1: 60,
        2: 35,
        3: 25
      }
    },
    "e79c881b-51bd-48ec-a747-8e4f72000853": {
      format: "cup",
      bonuses: {
        1: 30,
        2: 20,
        3: 15,
        4: 10
      }
    },
    "9e8e6c43-1b8b-48fb-863a-16cc880fbbf2": {
      format: "cup",
      bonuses: {
        1: 40,
        2: 30,
        3: 20,
        4: 10
      }
    }
  };

  const rules = competitionRules[tournament.competition_id];

  if (!rules) {
    return {
      success: false,
      message: "No trophy bonus rules configured for this competition."
    };
  }

  const tournamentFormat = String(
    tournament.format || ""
  ).toLowerCase();

  if (tournamentFormat !== rules.format) {
    return {
      success: false,
      message: "Tournament format does not match its competition rules."
    };
  }

  let settings = {};

  try {
    settings =
      typeof tournament.settings === "string"
        ? JSON.parse(tournament.settings || "{}")
        : tournament.settings || {};
  } catch {
    settings = {};
  }

  let placements = [];

  if (tournamentFormat === "league") {
    const table = await rebuildTable(db, tournamentId);

    if (!table.length) {
      throw new Error("No league standings found.");
    }

    placements = table
      .slice(0, 3)
      .map((team, index) => ({
        team_id: team.id,
        position: index + 1,
        bonus: rules.bonuses[index + 1]
      }));
  } else {
    const knockoutSize = Number(settings.knockoutSize);

    if (
      !Number.isInteger(knockoutSize) ||
      ![2, 4, 8, 16, 32].includes(knockoutSize)
    ) {
      throw new Error("Invalid knockout bracket size.");
    }

    const finalRoundIndex = Math.log2(knockoutSize);
    const isDoubleLeg =
      settings.knockoutRoundMode === "double";

    const result = await db.prepare(`
      SELECT
        id,
        round_index,
        slot,
        leg,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        played
      FROM matches
      WHERE tournament_id = ?
        AND match_type = 'knockout'
      ORDER BY round_index, slot, leg
    `).bind(tournamentId).all();

    const matches = result.results || [];

    if (!matches.length) {
      throw new Error("No knockout matches found.");
    }

    const ties = new Map();

    for (const match of matches) {
      const roundIndex = Number(match.round_index);
      const slot = Number(match.slot);

      if (
        !Number.isInteger(roundIndex) ||
        !Number.isInteger(slot) ||
        roundIndex < 1 ||
        roundIndex > finalRoundIndex
      ) {
        continue;
      }

      const key = `${roundIndex}:${slot}`;

      if (!ties.has(key)) {
        ties.set(key, []);
      }

      ties.get(key).push(match);
    }

    const completedTies = new Map();

    for (
      let roundIndex = 1;
      roundIndex <= finalRoundIndex;
      roundIndex++
    ) {
      const expectedSlots =
        knockoutSize / Math.pow(2, roundIndex);

      const expectedLegs =
        isDoubleLeg && roundIndex < finalRoundIndex
          ? 2
          : 1;

      for (
        let slot = 0;
        slot < expectedSlots;
        slot++
      ) {
        const key = `${roundIndex}:${slot}`;
        const tieMatches = ties.get(key) || [];

        if (!tieMatches.length) {
          throw new Error(
            `Knockout match is missing for round ${roundIndex}, slot ${slot}.`
          );
        }

        const legs = [];

        for (
          let legNumber = 1;
          legNumber <= expectedLegs;
          legNumber++
        ) {
          const legMatch = tieMatches.find(
            item => Number(item.leg || 1) === legNumber
          );

          if (!legMatch) {
            throw new Error(
              `Knockout leg ${legNumber} is missing for round ${roundIndex}, slot ${slot}.`
            );
          }

          if (Number(legMatch.played) !== 1) {
            throw new Error(
              "Cannot award trophy bonuses while knockout matches remain unfinished."
            );
          }

          const homeScore = Number(legMatch.home_score);
          const awayScore = Number(legMatch.away_score);

          if (
            !Number.isInteger(homeScore) ||
            !Number.isInteger(awayScore) ||
            homeScore < 0 ||
            awayScore < 0
          ) {
            throw new Error(
              "A knockout match has an invalid score."
            );
          }

          if (
            !legMatch.home_team_id ||
            !legMatch.away_team_id ||
            legMatch.home_team_id === legMatch.away_team_id
          ) {
            throw new Error(
              "A knockout match does not have two valid teams."
            );
          }

          legs.push({
            ...legMatch,
            home_score: homeScore,
            away_score: awayScore
          });
        }

        const teamA = legs[0].home_team_id;
        const teamB = legs[0].away_team_id;

        let teamAScore = 0;
        let teamBScore = 0;

        for (const legMatch of legs) {
          const validTeams = [
            legMatch.home_team_id,
            legMatch.away_team_id
          ];

          if (
            !validTeams.includes(teamA) ||
            !validTeams.includes(teamB) ||
            new Set(validTeams).size !== 2
          ) {
            throw new Error(
              "The legs of a knockout tie do not contain the same teams."
            );
          }

          if (legMatch.home_team_id === teamA) {
            teamAScore += legMatch.home_score;
            teamBScore += legMatch.away_score;
          } else {
            teamAScore += legMatch.away_score;
            teamBScore += legMatch.home_score;
          }
        }

        if (teamAScore === teamBScore) {
          throw new Error(
            `The aggregate score is tied in round ${roundIndex}, slot ${slot}. A winner must be resolved before awarding bonuses.`
          );
        }

        const winnerId =
          teamAScore > teamBScore ? teamA : teamB;

        const loserId =
          winnerId === teamA ? teamB : teamA;

        completedTies.set(key, {
          roundIndex,
          slot,
          winnerId,
          loserId
        });
      }
    }

    const finalTie = completedTies.get(
      `${finalRoundIndex}:0`
    );

    if (!finalTie) {
      throw new Error(
        "Could not determine the tournament final."
      );
    }

    placements.push({
      team_id: finalTie.winnerId,
      position: 1,
      bonus: rules.bonuses[1]
    });

    placements.push({
      team_id: finalTie.loserId,
      position: 2,
      bonus: rules.bonuses[2]
    });

    const semifinalRoundIndex = finalRoundIndex - 1;

    if (semifinalRoundIndex >= 1) {
      const semifinalSlots =
        knockoutSize / Math.pow(2, semifinalRoundIndex);

      for (
        let slot = 0;
        slot < semifinalSlots;
        slot++
      ) {
        const tie = completedTies.get(
          `${semifinalRoundIndex}:${slot}`
        );

        if (!tie) {
          throw new Error(
            "Could not determine all semi-finalists."
          );
        }

        placements.push({
          team_id: tie.loserId,
          position: 3,
          bonus: rules.bonuses[3]
        });
      }
    }

    const quarterFinalRoundIndex = finalRoundIndex - 2;

    if (quarterFinalRoundIndex >= 1) {
      const quarterFinalSlots =
        knockoutSize / Math.pow(2, quarterFinalRoundIndex);

      for (
        let slot = 0;
        slot < quarterFinalSlots;
        slot++
      ) {
        const tie = completedTies.get(
          `${quarterFinalRoundIndex}:${slot}`
        );

        if (!tie) {
          throw new Error(
            "Could not determine all quarter-finalists."
          );
        }

        placements.push({
          team_id: tie.loserId,
          position: 4,
          bonus: rules.bonuses[4]
        });
      }
    }

    const champion = await db.prepare(`
      SELECT id, name
      FROM teams
      WHERE id = ?
    `).bind(finalTie.winnerId).first();

    if (!champion) {
      throw new Error(
        "Tournament champion team was not found."
      );
    }

    await db.prepare(`
      UPDATE tournaments
      SET
        champion = ?,
        champion_name = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      champion.id,
      champion.name,
      Date.now(),
      tournamentId
    ).run();
  }

  const statements = placements.map(placement =>
    db.prepare(`
      INSERT INTO tournament_trophy_awards (
        id,
        tournament_id,
        user_id,
        team_id,
        position,
        bonus,
        awarded_at
      )
      SELECT
        lower(hex(randomblob(16))),
        tp.tournament_id,
        tp.user_id,
        tp.team_id,
        ?,
        ?,
        ?
      FROM tournament_players tp
      WHERE tp.tournament_id = ?
        AND tp.team_id = ?
        AND tp.status = 'accepted'
      ON CONFLICT (tournament_id, user_id) DO NOTHING
    `).bind(
      placement.position,
      placement.bonus,
      Date.now(),
      tournamentId,
      placement.team_id
    )
  );

  if (statements.length) {
    await db.batch(statements);
  }

  const championshipResult = await db.prepare(`
    INSERT INTO tournament_championship_trophies (
      tournament_id,
      awarded_at
    )
    SELECT ?, ?
    WHERE EXISTS (
      SELECT 1
      FROM tournament_trophy_awards
      WHERE tournament_id = ?
        AND position = 1
    )
    ON CONFLICT (tournament_id) DO NOTHING
  `).bind(
    tournamentId,
    Date.now(),
    tournamentId
  ).run();

  if (championshipResult.meta?.changes === 1) {
    await db.prepare(`
      UPDATE users
      SET trophies_won = COALESCE(trophies_won, 0) + 1
      WHERE id = (
        SELECT user_id
        FROM tournament_trophy_awards
        WHERE tournament_id = ?
          AND position = 1
        ORDER BY awarded_at ASC
        LIMIT 1
      )
    `).bind(tournamentId).run();
  }

  return {
    success: true,
    message: "Tournament trophy bonuses processed.",
    placements
  };
}


async function getHeadToHeadComparisonRoute(
  env,
  url
) {
  try {
    const player1Id = String(
      url.searchParams.get("player1_id") || ""
    ).trim();
    const player2Id = String(
      url.searchParams.get("player2_id") || ""
    ).trim();
    if (!player1Id || !player2Id) {
      return Response.json({
        success: false,
        message: "Both player IDs are required."
      }, {
        status: 400
      });
    }
    if (player1Id === player2Id) {
      return Response.json({
        success: false,
        message: "Select two different players."
      }, {
        status: 400
      });
    }
    const playersResult = await env.DB
      .prepare(`
        SELECT
          id,
          username,
          rating,
          highest_rating,
          highest_rank,
          COALESCE(trophies_won, 0) AS trophies_won
        FROM users
        WHERE id IN (?, ?)
          AND is_test_account = 0
      `)
      .bind(player1Id, player2Id)
      .all();
    const players = playersResult.results || [];
    const player1 = players.find(
      player => player.id === player1Id
    );
    const player2 = players.find(
      player => player.id === player2Id
    );
    if (!player1 || !player2) {
      return Response.json({
        success: false,
        message: "One or both players were not found."
      }, {
        status: 404
      });
    }
    const careerResult = await env.DB
      .prepare(`
        WITH all_stats AS (
          SELECT
            user_id,
            played,
            wins,
            draws,
            losses,
            gf,
            ga
          FROM tournament_players
          WHERE status = 'accepted'
            AND user_id IN (?, ?)
          UNION ALL
          SELECT
            user_id,
            played,
            wins,
            draws,
            losses,
            gf,
            ga
          FROM tournament_player_knockout
          WHERE user_id IN (?, ?)
        ),
        career AS (
          SELECT
            user_id,
            SUM(played) AS played,
            SUM(wins) AS wins,
            SUM(draws) AS draws,
            SUM(losses) AS losses,
            SUM(gf) AS goals_for,
            SUM(ga) AS goals_against
          FROM all_stats
          GROUP BY user_id
        )
        SELECT
          user_id,
          COALESCE(played, 0) AS played,
          COALESCE(wins, 0) AS wins,
          COALESCE(draws, 0) AS draws,
          COALESCE(losses, 0) AS losses,
          COALESCE(goals_for, 0) AS goals_scored,
          COALESCE(goals_against, 0) AS goals_conceded,
          COALESCE(goals_for, 0)
            - COALESCE(goals_against, 0)
            AS goal_difference,
          ROUND(
            100.0 * COALESCE(wins, 0)
            / NULLIF(played, 0),
            2
          ) AS win_percentage
        FROM career
      `)
      .bind(
        player1Id,
        player2Id,
        player1Id,
        player2Id
      )
      .all();
    const careerRows = careerResult.results || [];
    const createStats = () => ({
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_scored: 0,
      goals_conceded: 0,
      goal_difference: 0,
      win_percentage: 0
    });
    const getCareerStats = playerId => {
      const row = careerRows.find(
        item => item.user_id === playerId
      );
      if (!row) {
        return createStats();
      }
      return {
        played: Number(row.played) || 0,
        wins: Number(row.wins) || 0,
        draws: Number(row.draws) || 0,
        losses: Number(row.losses) || 0,
        goals_scored: Number(row.goals_scored) || 0,
        goals_conceded: Number(row.goals_conceded) || 0,
        goal_difference: Number(row.goal_difference) || 0,
        win_percentage: Number(row.win_percentage) || 0
      };
    };
    const matchesResult = await env.DB
      .prepare(`
        SELECT
          m.id AS match_id,
          m.tournament_id,
          t.name AS tournament_name,
          m.home_team_id,
          m.away_team_id,
          m.home_score,
          m.away_score,
          m.played_at,
          m.created_at,
          home_player.user_id AS home_player_id,
          away_player.user_id AS away_player_id,
          home_user.username AS home_player_name,
          away_user.username AS away_player_name
        FROM matches m
        INNER JOIN tournament_players home_player
          ON home_player.tournament_id = m.tournament_id
          AND home_player.team_id = m.home_team_id
        INNER JOIN tournament_players away_player
          ON away_player.tournament_id = m.tournament_id
          AND away_player.team_id = m.away_team_id
        INNER JOIN tournaments t
          ON t.id = m.tournament_id
        INNER JOIN users home_user
          ON home_user.id = home_player.user_id
        INNER JOIN users away_user
          ON away_user.id = away_player.user_id
        WHERE m.played = 1
          AND m.home_score IS NOT NULL
          AND m.away_score IS NOT NULL
          AND (
            (
              home_player.user_id = ?
              AND away_player.user_id = ?
            )
            OR
            (
              home_player.user_id = ?
              AND away_player.user_id = ?
            )
          )
        ORDER BY
          COALESCE(m.played_at, m.created_at) DESC
      `)
      .bind(
        player1Id,
        player2Id,
        player2Id,
        player1Id
      )
      .all();
    const matches = matchesResult.results || [];
    const player1Stats = createStats();
    const player2Stats = createStats();
    const recentMatches = matches.map(match => {
      const homeScore = Number(match.home_score);
      const awayScore = Number(match.away_score);
      const player1IsHome =
        match.home_player_id === player1Id;
      const player1Goals = player1IsHome
        ? homeScore
        : awayScore;
      const player2Goals = player1IsHome
        ? awayScore
        : homeScore;
      player1Stats.played++;
      player2Stats.played++;
      player1Stats.goals_scored += player1Goals;
      player1Stats.goals_conceded += player2Goals;
      player2Stats.goals_scored += player2Goals;
      player2Stats.goals_conceded += player1Goals;
      let result;
      if (player1Goals > player2Goals) {
        player1Stats.wins++;
        player2Stats.losses++;
        result = "player1_win";
      } else if (player1Goals < player2Goals) {
        player2Stats.wins++;
        player1Stats.losses++;
        result = "player2_win";
      } else {
        player1Stats.draws++;
        player2Stats.draws++;
        result = "draw";
      }
      return {
        match_id: match.match_id,
        tournament_id: match.tournament_id,
        tournament_name: match.tournament_name,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        home_player_id: match.home_player_id,
        away_player_id: match.away_player_id,
        home_player_name: match.home_player_name,
        away_player_name: match.away_player_name,
        home_score: homeScore,
        away_score: awayScore,
        played_at: match.played_at,
        result
      };
    });
    for (const stats of [
      player1Stats,
      player2Stats
    ]) {
      stats.goal_difference =
        stats.goals_scored -
        stats.goals_conceded;
      stats.win_percentage = stats.played
        ? Number(
            (
              stats.wins /
              stats.played *
              100
            ).toFixed(2)
          )
        : 0;
    }
    return Response.json({
      success: true,
      players: {
        player1: {
          id: player1.id,
          username: player1.username,
          rating: player1.rating,
          highest_rating: player1.highest_rating,
          highest_rank: player1.highest_rank,
          trophies_won: player1.trophies_won,
          career_stats: getCareerStats(player1Id),
          stats: player1Stats
        },
        player2: {
          id: player2.id,
          username: player2.username,
          rating: player2.rating,
          highest_rating: player2.highest_rating,
          highest_rank: player2.highest_rank,
          trophies_won: player2.trophies_won,
          career_stats: getCareerStats(player2Id),
          stats: player2Stats
        }
      },
      head_to_head: {
        total_matches: matches.length,
        player1_wins: player1Stats.wins,
        player2_wins: player2Stats.wins,
        draws: player1Stats.draws
      },
      recent_matches: recentMatches.slice(0, 10)
    });
  } catch (error) {
    console.error(
      "Head-to-head comparison error:",
      error
    );
    return Response.json({
      success: false,
      message: "Failed to compare player statistics."
    }, {
      status: 500
    });
  }
}

async function searchPlayersRoute(
  env,
  url
) {
  try {
    const query = String(
      url.searchParams.get("q") || ""
    ).trim();
    if (query.length < 2) {
      return Response.json({
        success: true,
        players: []
      });
    }
    const result = await env.DB
      .prepare(`
        SELECT
          id,
          username,
          rating,
          highest_rating,
          highest_rank,
          COALESCE(trophies_won, 0) AS trophies_won
        FROM users
        WHERE is_test_account = 0
          AND username LIKE ? COLLATE NOCASE
        ORDER BY
          CASE
            WHEN username = ? COLLATE NOCASE
              THEN 0
            WHEN username LIKE ? COLLATE NOCASE
              THEN 1
            ELSE 2
          END,
          username COLLATE NOCASE ASC
        LIMIT 20
      `)
      .bind(
        `%${query}%`,
        query,
        `${query}%`
      )
      .all();
    return Response.json({
      success: true,
      players: result.results || []
    });
  } catch (error) {
    console.error(
      "Player search error:",
      error
    );
    return Response.json({
      success: false,
      message: "Failed to search players."
    }, {
      status: 500
    });
  }
}