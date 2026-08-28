import { handleAuthRequest } from "./auth.js";
import { authenticate } from "./middleware.js";
import { handleTeamRequest } from "./teams.js";
import { handleTournamentRequest } from "./routes/tournaments.js";
import { handleCompetitionRequest } from "./routes/competitions.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

function json(data, options = {}) {
  return Response.json(data, {
    ...options,
    headers: {
      ...corsHeaders,
      ...(options.headers || {})
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders
        });
      }

      if (url.pathname === "/") {
        return json({
          success: true,
          message: "Champions backend running"
        });
      }

      if (url.pathname === "/test-db") {
        const result = await env.DB
          .prepare("SELECT 1 AS connected")
          .first();

        return json({
          success: true,
          database: result
        });
      }

      if (url.pathname.startsWith("/auth/")) {
        const response = await handleAuthRequest(
          request,
          env
        );

        return addCors(response);
      }

      const auth = await authenticate(
        request,
        env
      );

      if (!auth.success) {
        return json(
          {
            success: false,
            message: auth.message
          },
          {
            status: auth.status || 401
          }
        );
      }

  const user = auth.user;

const competitionResponse =
  await handleCompetitionRequest(
    request,
    env,
    user
  );

if (competitionResponse) {
  return addCors(competitionResponse);
}

const tournamentResponse =
  await handleTournamentRequest(
    request,
    env,
    user
  );

if (tournamentResponse) {
  return addCors(tournamentResponse);
}

const teamResponse =
  await handleTeamRequest(
    request,
    env,
    user
  );

if (teamResponse) {
  return addCors(teamResponse);
}  

return json(
        {
          success: false,
          error: "Route not found"
        },
        {
          status: 404
        }
      );

    } catch (error) {
      console.error(
        "Worker error:",
        error
      );

      return json(
        {
          success: false,
          error:
            error.message ||
            "Internal server error"
        },
        {
          status: 500
        }
      );
    }
  }
};

function addCors(response) {
  const headers = new Headers(
    response.headers
  );

  for (
    const [key, value]
    of Object.entries(corsHeaders)
  ) {
    headers.set(key, value);
  }

  return new Response(
    response.body,
    {
      status: response.status,
      statusText: response.statusText,
      headers
    }
  );
}