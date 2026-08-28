import {
  handleTournamentRequest
} from "./routes/tournaments.js";

import { handleTeamRequest } from "./teams.js";
import { handleAuthRequest } from "./auth.js";
import { authenticate } from "./middleware.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    try {
      if (url.pathname === "/") {
        return Response.json({
          success: true,
          message: "Champions backend running"
        });
      }
      
      if (url.pathname === "/test-db") {
        const result = await env.DB
          .prepare("SELECT 1 AS connected")
          .first();
        
        return Response.json({
          success: true,
          database: result
        });
      }
      
      if (url.pathname.startsWith("/auth/")) {
        return await handleAuthRequest(
          request,
          env
        );
      }
      
      const auth = await authenticate(
        request,
        env
      );
      
      if (!auth.success) {
        return Response.json({
          success: false,
          message: auth.message
        }, {
          status: auth.status || 401
        });
      }
      
      const user = auth.user;
      
      const tournamentResponse =
        await handleTournamentRequest(
          request,
          env,
          user
        );
      
      if (tournamentResponse) {
        return tournamentResponse;
      }
      
      const teamResponse =
        await handleTeamRequest(
          request,
          env,
          user
        );
      
      if (teamResponse) {
        return teamResponse;
      }
      
      return Response.json({
        success: false,
        error: "Route not found"
      }, {
        status: 404
      });
      
    } catch (error) {
      return Response.json({
        success: false,
        error: error.message
      }, {
        status: 500
      });
    }
  }
};
