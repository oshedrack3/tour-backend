import {
  getTeam,
  getTeams,
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
  const url = new URL(request.url);
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
  if (
    request.method === "GET" &&
    tournamentTeamsMatch
  ) {
    const tournamentId =
      tournamentTeamsMatch[1];
    const teams =
      await getTeams(
        env.DB,
        tournamentId,
        user.id
      );
    return Response.json({
      success: true,
      teams
    });
  }
  if (
    request.method === "GET" &&
    teamMatch
  ) {
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
  }
  if (
    request.method === "POST" &&
    tournamentTeamsMatch
  ) {
    const tournamentId =
      tournamentTeamsMatch[1];
    const body =
      await request.json();
    const name =
      String(body.name || "").trim();
    if (!name) {
      return Response.json({
        success: false,
        message: "Team name is required."
      }, {
        status: 400
      });
    }
    const id =
      crypto.randomUUID();
    const now =
      Date.now();
    let ownerUid = null;
    if (user.role === "admin") {
      ownerUid =
        body.owner_uid ||
        body.ownerUid ||
        null;
      if (ownerUid !== null) {
        ownerUid =
          String(ownerUid).trim() || null;
      }
    }
    let logoUrl = null;
    let logoPublicId = null;
    const logo =
      body.logo || null;
    if (logo) {
      if (
        typeof logo !== "string" ||
        !logo.startsWith("data:image/")
      ) {
        return Response.json({
          success: false,
          message: "Invalid team logo."
        }, {
          status: 400
        });
      }
      const image =
        await uploadBase64Image(
          logo,
          "teams",
          id,
          env
        );
      logoUrl =
        image?.url || null;
      logoPublicId =
        image?.publicId || null;
    }
    const team =
      await createTeam(
        env.DB,
        {
          id,
          tournament_id:
            tournamentId,
          owner_uid:
            ownerUid,
          name,
          logo:
            logoUrl,
          created_at:
            now,
          updated_at:
            now
        },
        user.id
      );
    if (!team) {
      if (logoPublicId) {
        await deleteCloudinaryImage(
          logoPublicId,
          env
        );
      }
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
      team
    }, {
      status: 201
    });
  }
  if (
    request.method === "PATCH" &&
    teamMatch
  ) {
    const teamId =
      teamMatch[1];
    const body =
      await request.json();
    const existing =
      await getTeam(
        env.DB,
        teamId,
        user.id
      );
    if (!existing) {
      return Response.json({
        success: false,
        message:
          "Team not found or access denied."
      }, {
        status: 404
      });
    }
    const updates = {};
    if (body.name !== undefined) {
      const name =
        String(body.name || "").trim();
      if (!name) {
        return Response.json({
          success: false,
          message:
            "Team name cannot be empty."
        }, {
          status: 400
        });
      }
      updates.name =
        name;
    }
    if (
      body.owner_uid !== undefined ||
      body.ownerUid !== undefined
    ) {
      if (user.role !== "admin") {
        return Response.json({
          success: false,
          message:
            "Only the tournament admin can assign team ownership."
        }, {
          status: 403
        });
      }
      const ownerUid =
        body.owner_uid !== undefined
          ? body.owner_uid
          : body.ownerUid;
      updates.owner_uid =
        ownerUid
          ? String(ownerUid).trim()
          : null;
    }
    let oldLogoPublicId = null;
    let newLogoPublicId = null;
    if (body.logo !== undefined) {
      if (
        body.logo !== null &&
        (
          typeof body.logo !== "string" ||
          !body.logo.startsWith("data:image/")
        )
      ) {
        return Response.json({
          success: false,
          message: "Invalid team logo."
        }, {
          status: 400
        });
      }
      if (body.logo === null) {
        updates.logo = null;
      } else {
        const image =
          await uploadBase64Image(
            body.logo,
            "teams",
            teamId,
            env
          );
        updates.logo =
          image?.url || null;
        newLogoPublicId =
          image?.publicId || null;
      }
    }
    updates.updated_at =
      Date.now();
    const team =
      await updateTeam(
        env.DB,
        teamId,
        updates,
        user.id
      );
    if (!team) {
      if (newLogoPublicId) {
        await deleteCloudinaryImage(
          newLogoPublicId,
          env
        );
      }
      return Response.json({
        success: false,
        message:
          "Team not found or access denied."
      }, {
        status: 404
      });
    }
    if (
      newLogoPublicId &&
      existing.logo
    ) {
      const oldUrl =
        existing.logo;
      const match =
        oldUrl.match(
          /\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/
        );
      if (match) {
        oldLogoPublicId =
          match[1];
      }
    }
    if (oldLogoPublicId) {
      try {
        await deleteCloudinaryImage(
          oldLogoPublicId,
          env
        );
      } catch (error) {
        console.error(
          "Failed to delete old team logo:",
          error
        );
      }
    }
    return Response.json({
      success: true,
      team
    });
  }
  if (
    request.method === "DELETE" &&
    teamMatch
  ) {
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
        message:
          "Team not found or access denied."
      }, {
        status: 404
      });
    }
    const deleted =
      await deleteTeam(
        env.DB,
        teamId,
        user.id
      );
    if (!deleted) {
      return Response.json({
        success: false,
        message:
          "Team not found or access denied."
      }, {
        status: 404
      });
    }
    return Response.json({
      success: true,
      message:
        "Team deleted successfully."
    });
  }
  return null;
}