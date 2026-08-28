import {
  getTournament,
  getTournamentsByOwner,
  getTournamentsByPlayer,
  createTournament
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
    const id =
      String(body.id || "").trim();
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
      body.is_public === undefined
        ? null
        : body.is_public
          ? 1
          : 0;
    const settings =
      body.settings || {};
    const tournamentImage =
      body.tournament_image ||
      body.tournamentImage ||
      body.image ||
      null;
    if (!id) {
      return Response.json({
        success: false,
        message: "Tournament ID is required."
      }, {
        status: 400
      });
    }
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
    const existing =
      await getTournament(
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
    let tournamentImageData = null;
    if (tournamentImage) {
  tournamentImageData =
  await uploadBase64Image(
    tournamentImage,
    "tournaments",
    id,
    env
  );    }
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
          match_days:
            typeof match_days === "string"
              ? match_days
              : JSON.stringify(match_days),
          tournament_image:
            tournamentImageData?.url || null,
          settings:
            typeof settings === "string"
              ? settings
              : JSON.stringify(settings),
          access_type,
          is_public,
          created_at: now,
          updated_at: now
        }
      );
    return Response.json({
      success: true,
      tournament:
        parseTournament(tournament)
    });
  } catch (error) {
    console.error(
      "Create tournament error:",
      error
    );
    return Response.json({
      success: false,
      message:
        error.message ||
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
      message:
        "Tournament not found or access denied."
    }, {
      status: 404
    });
  }

  return Response.json({
    success: true,
    tournament:
      parseTournament(tournament)
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
