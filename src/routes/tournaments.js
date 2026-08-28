import {
  getTournament,
  getTournamentsByOwner,
  getTournamentsByPlayer,
  createTournament
} from "../storage.js";

export async function handleTournamentRequest(
  request,
  env,
  user
) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
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
  const body = await request.json();
  
  const {
    id,
    competition_id,
    name,
    season,
    format,
    status,
    settings
  } = body;
  
  if (!id || !name) {
    return Response.json({
      success: false,
      message: "ID and name are required."
    }, {
      status: 400
    });
  }
  
  const existing = await getTournament(
    env.DB,
    id
  );
  
  if (existing) {
    return Response.json({
      success: false,
      message: "Tournament already exists."
    }, {
      status: 409
    });
  }
  
  const tournament = await createTournament(
    env.DB,
    {
      id,
      competition_id: competition_id || null,
      owner_id: user.id,
      name,
      season: season || null,
      format: format || null,
      status: status || "upcoming",
      settings,
      created_at: Date.now(),
      updated_at: Date.now()
    }
  );
  
  return Response.json({
    success: true,
    tournament: parseTournament(tournament)
  });
}

async function getMyTournamentsRoute(
  env,
  user
) {
  let tournaments;
  
  if (user.role === "admin") {
    tournaments = await getTournamentsByOwner(
      env.DB,
      user.id
    );
  } else {
    tournaments = await getTournamentsByPlayer(
      env.DB,
      user.id
    );
  }
  
  tournaments = tournaments.map(parseTournament);
  
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
  const tournament = await getTournament(
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
        JSON.parse(tournament.settings);
    } catch {
      tournament.settings = {};
    }
  }
  
  return tournament;
}
