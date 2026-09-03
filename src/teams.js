import {
  getTeam,
  getTeams,
  getTeamsByTournament,
  getTeamOwnerContact,
  createTeam,
  updateTeam,
  deleteTeam
} from "./storage.js";

import {
  uploadBase64Image,
  deleteCloudinaryImage
} from "./cloudinary.js";

export async function handleTeamRequest(
  request,
  env,
  user
) {
  const url =
    new URL(request.url);
  
  const pathname =
    url.pathname.replace(/\/+$/, "") || "/";
  
  const tournamentTeamsMatch =
    pathname.match(
      /^\/tournaments\/([^/]+)\/teams$/
    );
  
  const teamMatch =
    pathname.match(
      /^\/teams\/([^/]+)$/
    );
  
    const teamContactMatch =
    pathname.match(
      /^\/teams\/([^/]+)\/contact$/
    );

  if (
    request.method === "GET" &&
    teamContactMatch
  ) {
    try {
      const teamId =
        teamContactMatch[1];

      const contact =
        await getTeamOwnerContact(
          env.DB,
          teamId
        );

      if (!contact) {
        return Response.json({
          success: false,
          message: "Team not found."
        }, {
          status: 404
        });
      }

      return Response.json({
        success: true,
        contact
      });

    } catch (error) {
      console.error(
        "Get team owner contact error:",
        error
      );

      return Response.json({
        success: false,
        message:
          error.message ||
          "Failed to get team contact."
      }, {
        status: 500
      });
    }
  }
  
  if (
    request.method === "GET" &&
    pathname === "/teams"
  ) {
    try {
      const teams =
        await getTeams(
          env.DB,
          user.id
        );
      
      return Response.json({
        success: true,
        teams
      });
      
    } catch (error) {
      console.error(
        "Get my teams error:",
        error
      );
      
      return Response.json({
        success: false,
        message: error.message ||
          "Failed to load teams."
      }, {
        status: 500
      });
    }
  }
  
  if (
    request.method === "GET" &&
    tournamentTeamsMatch
  ) {
    try {
      const tournamentId =
        tournamentTeamsMatch[1];
      
      const teams =
        await getTeamsByTournament(
          env.DB,
          tournamentId
        );
      
      return Response.json({
        success: true,
        teams
      });
      
    } catch (error) {
      console.error(
        "Get tournament teams error:",
        error
      );
      
      return Response.json({
        success: false,
        message: error.message ||
          "Failed to load tournament teams."
      }, {
        status: 500
      });
    }
  }
  
  if (
    request.method === "GET" &&
    teamMatch
  ) {
    try {
      const teamId =
        teamMatch[1];
      
      const team =
        await getTeam(
          env.DB,
          teamId,
          user.id
        );
      
      if (!team) {
        return Response.json({
          success: false,
          message: "Team not found."
        }, {
          status: 404
        });
      }
      
      return Response.json({
        success: true,
        team
      });
      
    } catch (error) {
      console.error(
        "Get team error:",
        error
      );
      
      return Response.json({
        success: false,
        message: error.message ||
          "Failed to load team."
      }, {
        status: 500
      });
    }
  }
  
  if (
    request.method === "POST" &&
    pathname === "/teams/create"
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
      
      if (!name) {
        return Response.json({
          success: false,
          message: "Team name is required."
        }, {
          status: 400
        });
      }
      
      const logo =
        body.logo ||
        body.team_logo ||
        body.teamLogo ||
        null;
      
      if (
        logo !== null &&
        (
          typeof logo !== "string" ||
          !logo.startsWith(
            "data:image/"
          )
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
            logo: logoData?.url ||
              null,
            created_at: now,
            updated_at: now
          },
          user.id,
          user.role
        );
      
      if (!result?.success) {
        if (
          logoData?.publicId
        ) {
          await deleteCloudinaryImage(
            logoData.publicId,
            env
          );
        }
        
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
  
  if (
    request.method === "PATCH" &&
    teamMatch
  ) {
    try {
      const teamId =
        teamMatch[1];
      
      const body =
        await request
        .json()
        .catch(() => ({}));
      
      const existing =
        await getTeam(
          env.DB,
          teamId,
          user.id
        );
      
      if (!existing) {
        return Response.json({
          success: false,
          message: "Team not found or access denied."
        }, {
          status: 404
        });
      }
      
      const now =
        Date.now();
      
      const oneYear =
        365 * 24 * 60 * 60 * 1000;
      
      if (
        existing.last_edited_at &&
        now -
        Number(
          existing.last_edited_at
        ) <
        oneYear
      ) {
        const nextEditDate =
          new Date(
            Number(
              existing.last_edited_at
            ) +
            oneYear
          );
        
        return Response.json({
          success: false,
          message: `This team cannot be edited again until ${nextEditDate.toLocaleDateString(
            "en-NG",
            {
              day: "numeric",
              month: "long",
              year: "numeric"
            }
          )}.`
        }, {
          status: 403
        });
      }
      
      const updates = {};
      
      if (
        body.name !== undefined
      ) {
        const name =
          String(
            body.name || ""
          ).trim();
        
        if (!name) {
          return Response.json({
            success: false,
            message: "Team name cannot be empty."
          }, {
            status: 400
          });
        }
        
        updates.name =
          name;
      }
      
      if (
        body.logo !== undefined
      ) {
        if (
          body.logo !== null &&
          (
            typeof body.logo !== "string" ||
            !body.logo.startsWith(
              "data:image/"
            )
          )
        ) {
          return Response.json({
            success: false,
            message: "Invalid team logo."
          }, {
            status: 400
          });
        }
        
        if (
          body.logo === null
        ) {
          updates.logo = null;
        } else {
          const image =
            await uploadBase64Image(
              body.logo,
              "teams",
              teamId,
              env
            );
          
          if (!image?.url) {
            return Response.json({
              success: false,
              message: "Failed to upload team logo."
            }, {
              status: 500
            });
          }
          
          updates.logo =
            image.url;
        }
      }
      
      if (
        Object.keys(updates).length === 0
      ) {
        return Response.json({
          success: false,
          message: "No changes provided."
        }, {
          status: 400
        });
      }
      
      updates.updated_at =
        now;
      
      updates.last_edited_at =
        now;
      
      const team =
        await updateTeam(
          env.DB,
          teamId,
          updates,
          user.id
        );
      
      if (!team) {
        return Response.json({
          success: false,
          message: "Team not found or access denied."
        }, {
          status: 404
        });
      }
      
      return Response.json({
        success: true,
        team
      });
      
    } catch (error) {
      console.error(
        "Update team error:",
        error
      );
      
      return Response.json({
        success: false,
        message: error.message ||
          "Failed to update team."
      }, {
        status: 500
      });
    }
  }
  if (
    request.method === "DELETE" &&
    teamMatch
  ) {
    try {
      const teamId =
        teamMatch[1];
      
      const existing =
        await getTeam(
          env.DB,
          teamId,
          user.id
        );
      
      if (!existing) {
        return Response.json({
          success: false,
          message: "Team not found or access denied."
        }, {
          status: 404
        });
      }
      
      const result =
        await deleteTeam(
          env.DB,
          teamId,
          user.id
        );
      
      if (!result?.success) {
        return Response.json(
          result || {
            success: false,
            message: "Failed to delete team."
          },
          {
            status: 400
          }
        );
      }
      
      return Response.json({
        success: true,
        message: result.message ||
          "Team deleted successfully."
      });
      
    } catch (error) {
      console.error(
        "Delete team error:",
        error
      );
      
      return Response.json({
        success: false,
        message: error.message ||
          "Failed to delete team."
      }, {
        status: 500
      });
    }
  }
  
  return null;
}