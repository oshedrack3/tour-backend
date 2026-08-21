const express = require("express");
const router = express.Router();

const db = require("./firebase");
const authenticate = require("./middleware");

const {
  sendNoticeEvent
} = require("./noticeService");
const {
  uploadBase64Image,
  deleteCloudinaryImage
} = require("./cloudinary");

router.post("/", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can create notices."
      });
    }

    const {
      title,
      content,
      category,
      images,
      published,
      expiresAt
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice title is required."
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice content is required."
      });
    }

    if (
      expiresAt !== null &&
      expiresAt !== undefined &&
      (
        !Number.isFinite(Number(expiresAt)) ||
        Number(expiresAt) <= Date.now()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be in the future."
      });
    }

    if (images !== undefined && !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        message: "Images must be an array."
      });
    }

    const noticeRef = db.ref("notices").push();
    const now = Date.now();

    const uploadedImages = [];

    if (Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        if (!image) continue;

        const uploaded = await uploadBase64Image(
          image,
          "notice-images",
          `${noticeRef.key}_${i + 1}`
        );

        uploadedImages.push({
          url: uploaded.url,
          publicId: uploaded.publicId
        });
      }
    }

    const notice = {
      id: noticeRef.key,
      title: title.trim(),
      content: content.trim(),
      category: category || "general",

      images: uploadedImages,

      published: published !== false,

      expiresAt:
        expiresAt === null ||
        expiresAt === undefined
          ? null
          : Number(expiresAt),

      createdAt: now,
      updatedAt: now,
      createdBy: req.user.uid
    };

    await noticeRef.set(notice);

    if (notice.published) {
      sendNoticeEvent({
        type: "created",
        notice
      });
    }

    res.status(201).json({
      success: true,
      message: "Notice created successfully.",
      notice
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create notice."
    });
  }
});
router.get("/", authenticate, async (req, res) => {
  try {
    const snapshot = await db
      .ref("notices")
      .once("value");

    const data = snapshot.val() || {};
    const now = Date.now();

    const notices = Object.values(data)
      .filter(notice =>
        notice.published === true &&
        (
          !notice.expiresAt ||
          Number(notice.expiresAt) > now
        )
      )
      .sort((a, b) =>
        Number(b.createdAt) - Number(a.createdAt)
      );

    res.json({
      success: true,
      notices
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to load notices."
    });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const snapshot = await db
      .ref(`notices/${req.params.id}`)
      .once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Notice not found."
      });
    }

    const notice = snapshot.val();
    const now = Date.now();

    if (
      notice.published !== true ||
      (
        notice.expiresAt &&
        Number(notice.expiresAt) <= now
      )
    ) {
      return res.status(404).json({
        success: false,
        message: "Notice is no longer available."
      });
    }

    res.json({
      success: true,
      notice
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to load notice."
    });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can create notices."
      });
    }

    const {
      title,
      content,
      category,
      images,
      published,
      expiresAt
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice title is required."
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice content is required."
      });
    }

    if (
      expiresAt !== null &&
      expiresAt !== undefined &&
      (
        !Number.isFinite(Number(expiresAt)) ||
        Number(expiresAt) <= Date.now()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be in the future."
      });
    }

    const noticeRef = db.ref("notices").push();

    const now = Date.now();

    const notice = {
      id: noticeRef.key,
      title: title.trim(),
      content: content.trim(),
      category: category || "general",
      images: Array.isArray(images) ? images : [],
      published: published !== false,
      expiresAt:
        expiresAt === null ||
        expiresAt === undefined
          ? null
          : Number(expiresAt),
      createdAt: now,
      updatedAt: now,
      createdBy: req.user.uid
    };

    await noticeRef.set(notice);

    if (notice.published) {
      sendNoticeEvent({
        type: "created",
        notice
      });
    }

    res.status(201).json({
      success: true,
      message: "Notice created successfully.",
      notice
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create notice."
    });
  }
});

router.patch("/:id", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update notices."
      });
    }

    const noticeRef =
      db.ref(`notices/${req.params.id}`);

    const snapshot =
      await noticeRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Notice not found."
      });
    }

    const currentNotice = snapshot.val();

    const {
      title,
      content,
      category,
      images,
      published,
      expiresAt
    } = req.body;

    const updates = {
      updatedAt: Date.now()
    };

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({
          success: false,
          message: "Notice title cannot be empty."
        });
      }

      updates.title = String(title).trim();
    }

    if (content !== undefined) {
      if (!String(content).trim()) {
        return res.status(400).json({
          success: false,
          message: "Notice content cannot be empty."
        });
      }

      updates.content = String(content).trim();
    }

    if (category !== undefined) {
      updates.category = category;
    }

    if (images !== undefined) {
      updates.images =
        Array.isArray(images) ? images : [];
    }

    if (published !== undefined) {
      updates.published = published === true;
    }

    if (expiresAt !== undefined) {
      if (
        expiresAt !== null &&
        (
          !Number.isFinite(Number(expiresAt)) ||
          Number(expiresAt) <= Date.now()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Expiry date must be in the future."
        });
      }

      updates.expiresAt =
        expiresAt === null
          ? null
          : Number(expiresAt);
    }

    await noticeRef.update(updates);

    const updatedSnapshot =
      await noticeRef.once("value");

    const notice = updatedSnapshot.val();

    sendNoticeEvent({
      type: "updated",
      notice
    });

    res.json({
      success: true,
      message: "Notice updated successfully.",
      notice
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update notice."
    });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete notices."
      });
    }

    const noticeRef =
      db.ref(`notices/${req.params.id}`);

    const snapshot =
      await noticeRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Notice not found."
      });
    }

    await noticeRef.remove();

    sendNoticeEvent({
      type: "deleted",
      noticeId: req.params.id
    });

    res.json({
      success: true,
      message: "Notice deleted successfully."
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete notice."
    });
  }
});

module.exports = router;