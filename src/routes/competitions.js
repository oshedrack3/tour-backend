import {
  getCompetition,
  getCompetitionsByOwner,
  getAllCompetitions,
  createCompetition
} from "../storage.js";
import {
  uploadBase64Image,
  deleteCloudinaryImage
} from "../cloudinary.js";
export async function handleCompetitionRequest(
  request,
  env,
  user
) {
  const url = new URL(request.url);
  const pathname =
    url.pathname.replace(/\/+$/, "") || "/";
  if (
    request.method === "POST" &&
    pathname === "/competitions/create"
  ) {
    return await createCompetitionRoute(
      request,
      env,
      user
    );
  }
  if (
    request.method === "GET" &&
    pathname === "/competitions/my"
  ) {
    return await getMyCompetitionsRoute(
      env,
      user
    );
  }
  if (
    request.method === "GET" &&
    pathname.startsWith("/competitions/")
  ) {
    const id = pathname.split("/")[2];
    if (id) {
      return await getCompetitionRoute(
        env,
        id,
        user
      );
    }
  }
  if (
    request.method === "PATCH" &&
    pathname.startsWith("/competitions/")
  ) {
    const id = pathname.split("/")[2];
    if (id) {
      return await updateCompetitionRoute(
        request,
        env,
        id,
        user
      );
    }
  }
  if (
    request.method === "DELETE" &&
    pathname.startsWith("/competitions/")
  ) {
    const id = pathname.split("/")[2];
    if (id) {
      return await deleteCompetitionRoute(
        env,
        id,
        user
      );
    }
  }
  return null;
}
async function createCompetitionRoute(
  request,
  env,
  user
) {
  try {
    if (user.role !== "admin") {
      return Response.json({
        success: false,
        message:
          "Only admins can create competitions."
      }, {
        status: 403
      });
    }
    const body = await request.json();
    const name =
      String(body.name || "").trim();
    const logo =
      body.logo ||
      body.logo_url ||
      null;
    if (!name) {
      return Response.json({
        success: false,
        message:
          "Competition name is required."
      }, {
        status: 400
      });
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    let logoData = null;
    if (logo) {
      if (
        typeof logo !== "string" ||
        !logo.startsWith("data:image/")
      ) {
        return Response.json({
          success: false,
          message:
            "Invalid competition logo."
        }, {
          status: 400
        });
      }
      logoData =
        await uploadBase64Image(
          logo,
          "competitions",
          id,
          env
        );
    }
    const competition =
      await createCompetition(
        env.DB,
        {
          id,
          name,
          owner_id: user.id,
          logo_url:
            logoData?.url || null,
          logo_public_id:
            logoData?.publicId || null,
          tournament_count: 0,
          active_seasons: 0,
          created_at: now,
          updated_at: now
        }
      );
    return Response.json({
      success: true,
      competition
    }, {
      status: 201
    });
  } catch (error) {
    console.error(
      "Create competition error:",
      error
    );
    return Response.json({
      success: false,
      message:
        error.message ||
        "Failed to create competition."
    }, {
      status: 500
    });
  }
}
async function getMyCompetitionsRoute(
  env,
  user
) {
  try {
    let competitions;

    if (user.role === "admin") {
      competitions =
        await getCompetitionsByOwner(
          env.DB,
          user.id
        );
    } else {
      competitions =
        await getAllCompetitions(
          env.DB
        );
    }

    return Response.json({
      success: true,
      competitions
    });

  } catch (error) {
    console.error(
      "Get competitions error:",
      error
    );

    return Response.json({
      success: false,
      message:
        error.message ||
        "Failed to load competitions."
    }, {
      status: 500
    });
  }
}

async function getCompetitionRoute(
  env,
  id,
  user
) {
  try {
    const competition =
      await getCompetition(
        env.DB,
        id
      );

    if (!competition) {
      return Response.json({
        success: false,
        message:
          "Competition not found."
      }, {
        status: 404
      });
    }

    if (
      user.role === "admin" &&
      competition.owner_id !== user.id
    ) {
      return Response.json({
        success: false,
        message:
          "Competition not found."
      }, {
        status: 404
      });
    }

    return Response.json({
      success: true,
      competition
    });

  } catch (error) {
    console.error(
      "Get competition error:",
      error
    );

    return Response.json({
      success: false,
      message:
        "Failed to load competition."
    }, {
      status: 500
    });
  }
}
async function updateCompetitionRoute(
  request,
  env,
  id,
  user
) {
  try {
    if (user.role !== "admin") {
      return Response.json({
        success: false,
        message:
          "Only admins can edit competitions."
      }, {
        status: 403
      });
    }
    const competition =
      await getCompetition(
        env.DB,
        id
      );
    if (!competition) {
      return Response.json({
        success: false,
        message:
          "Competition not found."
      }, {
        status: 404
      });
    }
    if (
      competition.owner_id !== user.id
    ) {
      return Response.json({
        success: false,
        message:
          "Access denied."
      }, {
        status: 403
      });
    }
    const body = await request.json();
    const updates = {};
    if (body.name !== undefined) {
      const name =
        String(body.name || "").trim();
      if (!name) {
        return Response.json({
          success: false,
          message:
            "Competition name cannot be empty."
        }, {
          status: 400
        });
      }
      updates.name = name;
    }
    if (body.logo !== undefined) {
      const logo = body.logo;
      if (
        logo === null ||
        logo === ""
      ) {
        if (competition.logo_public_id) {
          try {
            await deleteCloudinaryImage(
              competition.logo_public_id,
              env
            );
          } catch (error) {
            console.error(
              "Failed to delete old competition logo:",
              error
            );
          }
        }
        updates.logo_url = null;
        updates.logo_public_id = null;
      } else {
        if (
          typeof logo !== "string" ||
          !logo.startsWith("data:image/")
        ) {
          return Response.json({
            success: false,
            message:
              "Invalid competition logo."
          }, {
            status: 400
          });
        }
        const newLogo =
          await uploadBase64Image(
            logo,
            "competitions",
            id,
            env
          );
        if (!newLogo) {
          return Response.json({
            success: false,
            message:
              "Failed to upload competition logo."
          }, {
            status: 500
          });
        }
        if (competition.logo_public_id) {
          try {
            await deleteCloudinaryImage(
              competition.logo_public_id,
              env
            );
          } catch (error) {
            console.error(
              "Failed to delete old competition logo:",
              error
            );
          }
        }
        updates.logo_url =
          newLogo.url;
        updates.logo_public_id =
          newLogo.publicId;
      }
    }
    if (
      Object.keys(updates).length === 0
    ) {
      return Response.json({
        success: false,
        message:
          "No competition changes provided."
      }, {
        status: 400
      });
    }
    updates.updated_at =
      Date.now();
    const fields = [];
    const values = [];
    for (
      const [field, value]
      of Object.entries(updates)
    ) {
      fields.push(`${field} = ?`);
      values.push(value);
    }
    values.push(id);
    await env.DB
      .prepare(`
        UPDATE competitions
        SET ${fields.join(", ")}
        WHERE id = ?
      `)
      .bind(...values)
      .run();
    const updatedCompetition =
      await getCompetition(
        env.DB,
        id
      );
    return Response.json({
      success: true,
      message:
        "Competition updated successfully.",
      competition:
        updatedCompetition
    });
  } catch (error) {
    console.error(
      "Update competition error:",
      error
    );
    return Response.json({
      success: false,
      message:
        error.message ||
        "Failed to update competition."
    }, {
      status: 500
    });
  }
}
async function deleteCompetitionRoute(
  env,
  id,
  user
) {
  try {
    const competition =
      await getCompetition(
        env.DB,
        id
      );
    if (!competition) {
      return Response.json({
        success: false,
        message:
          "Competition not found."
      }, {
        status: 404
      });
    }
    if (
      competition.owner_id !== user.id
    ) {
      return Response.json({
        success: false,
        message:
          "Access denied."
      }, {
        status: 403
      });
    }
    if (competition.logo_public_id) {
      try {
        await deleteCloudinaryImage(
          competition.logo_public_id,
          env
        );
      } catch (error) {
        console.error(
          "Failed to delete competition logo:",
          error
        );
      }
    }
    await env.DB
      .prepare(`
        DELETE FROM competitions
        WHERE id = ?
      `)
      .bind(id)
      .run();
    return Response.json({
      success: true,
      message:
        "Competition deleted."
    });
  } catch (error) {
    console.error(
      "Delete competition error:",
      error
    );
    return Response.json({
      success: false,
      message:
        error.message ||
        "Failed to delete competition."
    }, {
      status: 500
    });
  }
}
