import { handleAuthRequest } from "./auth.js";
import { authenticate } from "./middleware.js";
import { handleTeamRequest } from "./teams.js";
import {
  handleGeneralRequest
} from "./routes/generalRoutes.js";
import { handleTournamentRequest } from "./routes/tournaments.js";
import { handleCompetitionRequest } from "./routes/competitions.js";
import {
  getExpiredNotices,
  deleteNotice
} from "./storage.js";
import {
  deleteCloudinaryImage
} from "./cloudinary.js";

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
    const pathname = url.pathname;
    
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders
        });
      }
      
      if (pathname === "/") {
        return json({
          success: true,
          message: "Champions backend running"
        });
      }
      
      if (pathname === "/test-db") {
        const result = await env.DB
          .prepare(
            "SELECT 1 AS connected"
          )
          .first();
        
        return json({
          success: true,
          database: result
        });
      }
      
      if (pathname.startsWith("/auth/")) {
        const response =
          await handleAuthRequest(
            request,
            env
          );
        
        return addCors(response);
      }
      
      const auth =
        await authenticate(
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
        });
      }
      
      const user = auth.user;
      
      const generalResponse =
        await handleGeneralRequest(
          request,
          env,
          pathname,
          user
        );
      
      if (generalResponse) {
        return addCors(
          generalResponse
        );
      }
      
      const competitionResponse =
        await handleCompetitionRequest(
          request,
          env,
          user
        );
      
      if (competitionResponse) {
        return addCors(
          competitionResponse
        );
      }
      
      const teamResponse =
        await handleTeamRequest(
          request,
          env,
          user
        );
      
      if (teamResponse) {
        return addCors(
          teamResponse
        );
      }
      
      const tournamentResponse =
        await handleTournamentRequest(
          request,
          env,
          user
        );
      
      if (tournamentResponse) {
        return addCors(
          tournamentResponse
        );
      }
      
      return json(
      {
        success: false,
        error: "Route not found"
      },
      {
        status: 404
      });
      
    } catch (error) {
      console.error(
        "Worker error:",
        error
      );
      
      return json(
      {
        success: false,
        error: error.message ||
          "Internal server error"
      },
      {
        status: 500
      });
    }
  },
  
  async scheduled(
    event,
    env,
    ctx
  ) {
    try {
      const expiredNotices =
        await getExpiredNotices(
          env.DB,
          Date.now()
        );
      
      for (
        const notice of expiredNotices
      ) {
        const images =
          notice.images || [];
        
        let cloudinaryFailed =
          false;
        
        for (
          const image of images
        ) {
          if (!image?.publicId) {
            continue;
          }
          
          try {
            await deleteCloudinaryImage(
              image.publicId,
              env
            );
          } catch (error) {
            cloudinaryFailed = true;
            
            console.error(
              `Failed to delete Cloudinary image ${image.publicId} for notice ${notice.id}:`,
              error
            );
          }
        }
        
        if (cloudinaryFailed) {
          continue;
        }
        
        await deleteNotice(
          env.DB,
          notice.id
        );
      }
      
      console.log(
        `Expired notices found: ${expiredNotices.length}`
      );
      
    } catch (error) {
      console.error(
        "Expired notice cleanup error:",
        error
      );
    }
  }
};

function addCors(response) {
  const headers =
    new Headers(
      response.headers
    );
  
  for (
    const [key, value] of Object.entries(
      corsHeaders
    )
  ) {
    headers.set(
      key,
      value
    );
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