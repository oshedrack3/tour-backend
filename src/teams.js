import {
  getTeam,
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam
} from "./storage.js";

export async function handleTeamRequest(
  request,
  env,
  userId
) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // GET /tournaments/:tournamentId/teams
  const tournamentTeamsMatch =
    pathname.match(
      /^\/tournaments\/([^/]+)\/teams$/
    );
  
  if (
    request.method === "GET" &&
    tournamentTeamsMatch
  ) {
    const tournamentId =
      tournamentTeamsMatch[1];
    
    const teams = await getTeams(
      env.DB,
      tournamentId,
      userId
    );
    
    return Response.json({
      success: true,
      teams
    });
  }
  
  // GET /teams/:teamId
  const teamMatch =
    pathname.match(
      /^\/teams\/([^/]+)$/
    );
  
  if (
    request.method === "GET" &&
    teamMatch
  ) {
    const teamId =
      teamMatch[1];
    
    const team = await getTeam(
      env.DB,
      teamId,
      userId
    );
    
    if (!team) {
      return Response.json({
        success: false,
        message: "Team not found."
      }, { status: 404 });
    }
    
    return Response.json({
      success: true,
      team
    });
  }
  
  // POST /tournaments/:tournamentId/teams
  if (
    request.method === "POST" &&
    tournamentTeamsMatch
  ) {
    const tournamentId =
      tournamentTeamsMatch[1];
    
    const body = await request.json();
    
    if (!body.id || !body.name) {
      return Response.json({
        success: false,
        message: "Team ID and name are required."
      }, { status: 400 });
    }
    
    const team =
      await createTeam(
        env.DB,
        {
          id: body.id,
          tournament_id: tournamentId,
          name: body.name,
          logo: body.logo,
          created_at: Date.now()
        },
        userId
      );
    
    if (!team) {
      return Response.json({
        success: false,
        message: "Tournament not found or access denied."
      }, { status: 404 });
    }
    
    return Response.json({
      success: true,
      team
    }, { status: 201 });
  }
  
  // PATCH /teams/:teamId
  if (
    request.method === "PATCH" &&
    teamMatch
  ) {
    const teamId =
      teamMatch[1];
    
    const updates =
      await request.json();
    
    const team =
      await updateTeam(
        env.DB,
        teamId,
        updates,
        userId
      );
    
    if (!team) {
      return Response.json({
        success: false,
        message: "Team not found or access denied."
      }, { status: 404 });
    }
    
    return Response.json({
      success: true,
      team
    });
  }
  
  // DELETE /teams/:teamId
  if (
    request.method === "DELETE" &&
    teamMatch
  ) {
    const teamId =
      teamMatch[1];
    
    const deleted =
      await deleteTeam(
        env.DB,
        teamId,
        userId
      );
    
    if (!deleted) {
      return Response.json({
        success: false,
        message: "Team not found or access denied."
      }, { status: 404 });
    }
    
    return Response.json({
      success: true,
      message: "Team deleted successfully."
    });
  }
  
  return null;
}
