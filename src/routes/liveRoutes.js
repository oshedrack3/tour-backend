import {
  sendPushToUser
} from "../pushNotifications.js";

function json(data, status = 200) {
  return Response.json(data, { status });
}

async function getBroadcast(db, id) {
  return await db
    .prepare(`
      SELECT *
      FROM live_broadcasts
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();
}

function isParticipant(broadcast, userId) {
  return (
    broadcast.player_user_id === userId ||
    broadcast.admin_user_id === userId
  );
}

function getOtherParticipant(broadcast, userId) {
  return broadcast.player_user_id === userId ?
    broadcast.admin_user_id :
    broadcast.player_user_id;
}

export async function handleLiveRequest(
  request,
  env,
  pathname,
  user
) {
  const db = env.DB;
  const method = request.method;
  
  if (
    method === "GET" &&
    pathname === "/live/my-session"
  ) {
    const now = Date.now();
    const url = new URL(request.url);
    const broadcastId = url.searchParams.get("broadcastId");
    
    if (broadcastId) {
      if (user.role !== "admin") {
        return json({
          success: false,
          message: "Admin access required."
        }, 403);
      }
      
      const broadcast = await db
        .prepare(`
        SELECT *
        FROM live_broadcasts
        WHERE id = ?
          AND admin_user_id = ?
        LIMIT 1
      `)
        .bind(broadcastId, user.id)
        .first();
      
      if (!broadcast) {
        return json({
          success: false,
          message: "Broadcast not found or you are not authorized to access it."
        }, 404);
      }
      
      return json({
        success: true,
        broadcast
      });
    }
    
    const broadcast = await db
      .prepare(`
      SELECT *
      FROM live_broadcasts
      WHERE player_user_id = ?
        AND status IN ('waiting', 'live')
        AND expires_at > ?
      ORDER BY created_at DESC
      LIMIT 1
    `)
      .bind(user.id, now)
      .first();
    
    return json({
      success: true,
      broadcast: broadcast || null
    });
  }
  if (
    method === "POST" &&
    pathname === "/live/broadcasts"
  ) {
    if (user.role !== "admin") {
      return json({
        success: false,
        message: "Admin access required."
      }, 403);
    }
    
    let body;
    
    try {
      body = await request.json();
    } catch {
      return json({
        success: false,
        message: "Invalid request body."
      }, 400);
    }
    
    const matchId = body.matchId;
    const teamId = body.teamId;
    
    if (
      typeof matchId !== "string" ||
      typeof teamId !== "string" ||
      !matchId.trim() ||
      !teamId.trim()
    ) {
      return json({
        success: false,
        message: "Match and team are required."
      }, 400);
    }
    
    const match = await db
      .prepare(`
        SELECT
          m.id AS match_id,
          m.tournament_id,
          m.home_team_id,
          m.away_team_id,
          t.admin_uid,
          tp.user_id AS player_user_id
        FROM matches m
        INNER JOIN tournaments t
          ON t.id = m.tournament_id
        INNER JOIN tournament_players tp
          ON tp.tournament_id = m.tournament_id
         AND tp.team_id = ?
         AND tp.status = 'accepted'
        WHERE m.id = ?
          AND t.admin_uid = ?
          AND (
            m.home_team_id = ?
            OR m.away_team_id = ?
          )
        LIMIT 1
      `)
      .bind(
        teamId,
        matchId,
        user.id,
        teamId,
        teamId
      )
      .first();
    
    if (!match) {
      return json({
        success: false,
        message: "Match or selected team not found, or you are not its administrator."
      }, 404);
    }
    
    const now = Date.now();
    
    await db
      .prepare(`
        UPDATE live_broadcasts
        SET status = 'ended',
            ended_at = ?
        WHERE status IN ('waiting', 'live')
          AND expires_at <= ?
      `)
      .bind(now, now)
      .run();
    
    const existing = await db
      .prepare(`
        SELECT id
        FROM live_broadcasts
        WHERE match_id = ?
          AND status IN ('waiting', 'live')
        LIMIT 1
      `)
      .bind(matchId)
      .first();
    
    if (existing) {
      return json({
        success: false,
        message: "A live session already exists for this match."
      }, 409);
    }
    
    const id = crypto.randomUUID();
    const expiresAt = now + 6 * 60 * 60 * 1000;
    
    try {
      await db
        .prepare(`
          INSERT INTO live_broadcasts (
            id,
            tournament_id,
            match_id,
            selected_team_id,
            player_user_id,
            admin_user_id,
            status,
            created_at,
            expires_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 'waiting', ?, ?)
        `)
        .bind(
          id,
          match.tournament_id,
          match.match_id,
          teamId,
          match.player_user_id,
          user.id,
          now,
          expiresAt
        )
        .run();
    } catch (error) {
      if (error.message?.includes("UNIQUE constraint")) {
        return json({
          success: false,
          message: "A live session already exists for this match."
        }, 409);
      }
      
      throw error;
    }
    
    try {
      await sendPushToUser(
        env,
        match.player_user_id,
        "Galatico Live",
        "You're invited to stream your tournament match! Open Galatico to view your live invitation."
      );
    } catch (error) {
      console.error(
        "[Galatico Live] Push notification failed:",
        error
      );
    }
    
    return json({
      success: true,
      message: "Live session created.",
      broadcast: {
        id,
        matchId,
        teamId,
        playerUserId: match.player_user_id,
        adminUserId: user.id,
        status: "waiting",
        expiresAt
      }
    }, 201);
  }
  
  const match = pathname.match(
    /^\/live\/broadcasts\/([^/]+)(?:\/(signals|started|end))?$/
  );
  
  if (!match) {
    return null;
  }
  
  const broadcastId = match[1];
  const action = match[2] || null;
  
  const broadcast = await getBroadcast(
    db,
    broadcastId
  );
  
  if (!broadcast) {
    return json({
      success: false,
      message: "Live session not found."
    }, 404);
  }
  
  if (!isParticipant(broadcast, user.id)) {
    return json({
      success: false,
      message: "You are not authorized to access this live session."
    }, 403);
  }
  
  const now = Date.now();
  
  if (
    broadcast.status !== "ended" &&
    broadcast.expires_at <= now
  ) {
    await db
      .prepare(`
        UPDATE live_broadcasts
        SET status = 'ended',
            ended_at = ?
        WHERE id = ?
      `)
      .bind(now, broadcastId)
      .run();
    
    await db
      .prepare(`
        DELETE FROM live_signals
        WHERE broadcast_id = ?
      `)
      .bind(broadcastId)
      .run();
    
    return json({
      success: false,
      message: "Live session has expired."
    }, 410);
  }
  
  if (!action && method === "GET") {
    return json({
      success: true,
      broadcast
    });
  }
  
  if (action === "started" && method === "POST") {
    if (broadcast.status === "ended") {
      return json({
        success: false,
        message: "Live session has ended."
      }, 410);
    }
    
    await db
      .prepare(`
        UPDATE live_broadcasts
        SET status = 'live',
            started_at = COALESCE(started_at, ?)
        WHERE id = ?
      `)
      .bind(now, broadcastId)
      .run();
    
    return json({
      success: true,
      message: "Live session marked as active."
    });
  }
  
  if (action === "end" && method === "POST") {
    await db
      .prepare(`
        UPDATE live_broadcasts
        SET status = 'ended',
            ended_at = ?
        WHERE id = ?
      `)
      .bind(now, broadcastId)
      .run();
    
    await db
      .prepare(`
        DELETE FROM live_signals
        WHERE broadcast_id = ?
      `)
      .bind(broadcastId)
      .run();
    
    return json({
      success: true,
      message: "Live session ended."
    });
  }
  
  if (action === "signals" && method === "POST") {
    if (broadcast.status === "ended") {
      return json({
        success: false,
        message: "Live session has ended."
      }, 410);
    }
    
    let body;
    
    try {
      body = await request.json();
    } catch {
      return json({
        success: false,
        message: "Invalid request body."
      }, 400);
    }
    
    const signalType = body.signalType;
    const payload = body.payload;
    
    if (
      !["offer", "answer", "ice"].includes(signalType) ||
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      return json({
        success: false,
        message: "Invalid signaling message."
      }, 400);
    }
    
    const serialized = JSON.stringify(payload);
    
    if (serialized.length > 65536) {
      return json({
        success: false,
        message: "Signaling message is too large."
      }, 413);
    }
    
    const recipientId = getOtherParticipant(
      broadcast,
      user.id
    );
    
    const signalId = crypto.randomUUID();
    
    await db
      .prepare(`
        INSERT INTO live_signals (
          id,
          broadcast_id,
          sender_user_id,
          recipient_user_id,
          signal_type,
          payload,
          created_at,
          expires_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        signalId,
        broadcastId,
        user.id,
        recipientId,
        signalType,
        serialized,
        now,
        Math.min(
          broadcast.expires_at,
          now + 10 * 60 * 1000
        )
      )
      .run();
    
    return json({
      success: true,
      signalId
    }, 201);
  }
  
  if (action === "signals" && method === "GET") {
    if (broadcast.status === "ended") {
      return json({
        success: false,
        message: "Live session has ended."
      }, 410);
    }
    
    const signals = await db
      .prepare(`
        SELECT
          id,
          sender_user_id,
          signal_type,
          payload,
          created_at
        FROM live_signals
        WHERE broadcast_id = ?
          AND recipient_user_id = ?
          AND consumed_at IS NULL
          AND expires_at > ?
        ORDER BY created_at ASC
        LIMIT 100
      `)
      .bind(
        broadcastId,
        user.id,
        now
      )
      .all();
    
    const items = signals.results || [];
    
    if (items.length) {
      const placeholders = items
        .map(() => "?")
        .join(", ");
      
      await db
        .prepare(`
          UPDATE live_signals
          SET consumed_at = ?
          WHERE id IN (${placeholders})
            AND recipient_user_id = ?
            AND consumed_at IS NULL
        `)
        .bind(
          now,
          ...items.map(item => item.id),
          user.id
        )
        .run();
    }
    
    return json({
      success: true,
      signals: items.map(item => ({
        id: item.id,
        senderUserId: item.sender_user_id,
        signalType: item.signal_type,
        payload: JSON.parse(item.payload),
        createdAt: item.created_at
      }))
    });
  }
  
  return json({
    success: false,
    message: "Route not found."
  }, 404);
}