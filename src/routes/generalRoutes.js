import {
  getNotice,
  getPublishedNotices,
  createNotice,
  updateNotice,
  deleteNotice
} from "../storage.js";

import {
  uploadBase64Image,
  deleteCloudinaryImage
} from "../cloudinary.js";

export async function handleGeneralRequest(
  request,
  env,
  pathname,
  user
) {
  if (
    request.method === "GET" &&
    pathname === "/notices"
  ) {
    return await getNoticesRoute(
      env,
      user
    );
  }
  
  if (
    request.method === "GET" &&
    /^\/notices\/[^/]+$/.test(pathname)
  ) {
    const noticeId =
      pathname.split("/")[2];
    
    return await getNoticeRoute(
      env,
      noticeId,
      user
    );
  }
  
  if (
    request.method === "POST" &&
    pathname === "/notices"
  ) {
    return await createNoticeRoute(
      request,
      env,
      user
    );
  }
  
  if (
    request.method === "PATCH" &&
    /^\/notices\/[^/]+$/.test(pathname)
  ) {
    const noticeId =
      pathname.split("/")[2];
    
    return await updateNoticeRoute(
      request,
      env,
      noticeId,
      user
    );
  }
  
  if (
    request.method === "DELETE" &&
    /^\/notices\/[^/]+$/.test(pathname)
  ) {
    const noticeId =
      pathname.split("/")[2];
    
    return await deleteNoticeRoute(
      env,
      noticeId,
      user
    );
  }
  
  return null;
}



async function getNoticesRoute(
  env,
  user
) {
  try {
    const notices =
      await getPublishedNotices(
        env.DB,
        Date.now()
      );
    
    return Response.json({
      success: true,
      notices
    });
    
  } catch (error) {
    console.error(
      "Get notices error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to load notices."
    }, {
      status: 500
    });
  }
}

async function getNoticeRoute(
  env,
  noticeId,
  user
) {
  try {
    const notice =
      await getNotice(
        env.DB,
        noticeId
      );
    
    if (!notice) {
      return Response.json({
        success: false,
        message: "Notice not found."
      }, {
        status: 404
      });
    }
    
    const now =
      Date.now();
    
    if (
      !notice.published ||
      (
        notice.expires_at !== null &&
        Number(notice.expires_at) <= now
      )
    ) {
      return Response.json({
        success: false,
        message: "Notice is no longer available."
      }, {
        status: 404
      });
    }
    
    return Response.json({
      success: true,
      notice
    });
    
  } catch (error) {
    console.error(
      "Get notice error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to load notice."
    }, {
      status: 500
    });
  }
}

async function createNoticeRoute(
  request,
  env,
  user
) {
  try {
    if (user.role !== "admin") {
      return Response.json({
        success: false,
        message: "Only admins can create notices."
      }, {
        status: 403
      });
    }
    
    const body =
      await request
      .json()
      .catch(() => ({}));
    
    const {
      title,
      content,
      category,
      images,
      published,
      expiresAt
    } = body;
    
    if (
      !title ||
      !String(title).trim()
    ) {
      return Response.json({
        success: false,
        message: "Notice title is required."
      }, {
        status: 400
      });
    }
    
    if (
      !content ||
      !String(content).trim()
    ) {
      return Response.json({
        success: false,
        message: "Notice content is required."
      }, {
        status: 400
      });
    }
    
    if (
      expiresAt !== null &&
      expiresAt !== undefined &&
      (
        !Number.isFinite(
          Number(expiresAt)
        ) ||
        Number(expiresAt) <= Date.now()
      )
    ) {
      return Response.json({
        success: false,
        message: "Expiry date must be in the future."
      }, {
        status: 400
      });
    }
    
    if (
      images !== undefined &&
      !Array.isArray(images)
    ) {
      return Response.json({
        success: false,
        message: "Images must be an array."
      }, {
        status: 400
      });
    }
    
    const noticeId =
      crypto.randomUUID();
    
    const now =
      Date.now();
    
    const uploadedImages = [];
    
    if (Array.isArray(images)) {
      for (
        let i = 0; i < images.length; i++
      ) {
        const image =
          images[i];
        
        if (!image) continue;
        
        const uploaded =
          await uploadBase64Image(
            image,
            "notice-images",
            `${noticeId}_${i + 1}`,
            env
          );
        
        uploadedImages.push({
          url: uploaded.url,
          publicId: uploaded.public_id ||
            uploaded.publicId
        });
      }
    }
    
    const notice = {
      id: noticeId,
      title: String(title).trim(),
      content: String(content).trim(),
      category: category || "general",
      images: uploadedImages,
      published: published !== false,
      expires_at: expiresAt === null ||
        expiresAt === undefined ?
        null : Number(expiresAt),
      created_at: now,
      updated_at: now,
      created_by: user.id
    };
    
    await createNotice(
      env.DB,
      notice
    );
    
    return Response.json({
      success: true,
      message: "Notice created successfully.",
      notice
    }, {
      status: 201
    });
    
  } catch (error) {
    console.error(
      "Create notice error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to create notice."
    }, {
      status: 500
    });
  }
}
async function updateNoticeRoute(
  request,
  env,
  noticeId,
  user
) {
  try {
    if (user.role !== "admin") {
      return Response.json({
        success: false,
        message: "Only admins can update notices."
      }, {
        status: 403
      });
    }
    
    const existing =
      await getNotice(
        env.DB,
        noticeId
      );
    
    if (!existing) {
      return Response.json({
        success: false,
        message: "Notice not found."
      }, {
        status: 404
      });
    }
    
    const body =
      await request
      .json()
      .catch(() => ({}));
    
    const title =
      body.title !== undefined ?
      String(body.title).trim() :
      existing.title;
    
    const content =
      body.content !== undefined ?
      String(body.content).trim() :
      existing.content;
    
    const category =
      body.category !== undefined ?
      String(body.category).trim() :
      existing.category;
    
    if (!title) {
      return Response.json({
        success: false,
        message: "Notice title is required."
      }, {
        status: 400
      });
    }
    
    if (!content) {
      return Response.json({
        success: false,
        message: "Notice content is required."
      }, {
        status: 400
      });
    }
    
    let expiresAt =
      existing.expires_at;
    
    if (
      body.expiresAt !== undefined
    ) {
      if (
        body.expiresAt !== null &&
        (
          !Number.isFinite(
            Number(body.expiresAt)
          ) ||
          Number(body.expiresAt) <=
          Date.now()
        )
      ) {
        return Response.json({
          success: false,
          message: "Expiry date must be in the future."
        }, {
          status: 400
        });
      }
      
      expiresAt =
        body.expiresAt === null ?
        null :
        Number(body.expiresAt);
    }
    
    let uploadedImages =
      existing.images || [];
    
    if (
      body.images !== undefined
    ) {
      if (
        !Array.isArray(body.images)
      ) {
        return Response.json({
          success: false,
          message: "Images must be an array."
        }, {
          status: 400
        });
      }
      
      uploadedImages = [];
      
      for (
        let i = 0; i < body.images.length; i++
      ) {
        const image =
          body.images[i];
        
        if (!image) continue;
        
        const uploaded =
          await uploadBase64Image(
            image,
            "notice-images",
            `${noticeId}_${Date.now()}_${i + 1}`,
            env
          );
        
        uploadedImages.push({
          url: uploaded.url,
          publicId: uploaded.public_id ||
            uploaded.publicId
        });
      }
    }
    
    const notice =
      await updateNotice(
        env.DB,
        noticeId,
        {
          title,
          content,
          category,
          images: uploadedImages,
          published: body.published !== undefined ?
            body.published === true :
            existing.published,
          expires_at: expiresAt,
          updated_at: Date.now()
        }
      );
    
    return Response.json({
      success: true,
      message: "Notice updated successfully.",
      notice
    });
    
  } catch (error) {
    console.error(
      "Update notice error:",
      error
    );
    
    return Response.json({
      success: false,
      message: error.message ||
        "Failed to update notice."
    }, {
      status: 500
    });
  }
}
async function deleteNoticeRoute(
  env,
  noticeId,
  user
) {
  try {
    if (user.role !== "admin") {
      return Response.json({
        success: false,
        message:
          "Only admins can delete notices."
      }, {
        status: 403
      });
    }

    const existing =
      await getNotice(
        env.DB,
        noticeId
      );

    if (!existing) {
      return Response.json({
        success: false,
        message:
          "Notice not found."
      }, {
        status: 404
      });
    }

    const images =
      existing.images || [];

    for (const image of images) {
      if (!image?.publicId) {
        continue;
      }

      await deleteCloudinaryImage(
        image.publicId,
        env
      );
    }

    await deleteNotice(
      env.DB,
      noticeId
    );

    return Response.json({
      success: true,
      message:
        "Notice and its images deleted successfully."
    });

  } catch (error) {
    console.error(
      "Delete notice error:",
      error
    );

    return Response.json({
      success: false,
      message:
        error.message ||
        "Failed to delete notice."
    }, {
      status: 500
    });
  }
}