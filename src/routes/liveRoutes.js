import {
  sendPushToUser
} from "../pushNotifications.js";
import {
  getTournament,
  getMatch,
  getTeamsByTournament
} from "../storage.js";


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

async function getLiveBroadcastDetails(db, broadcast) {
  const [tournament, match, teams] = await Promise.all([
    getTournament(db, broadcast.tournament_id),
    getMatch(db, broadcast.match_id),
    getTeamsByTournament(db, broadcast.tournament_id)
  ]);
  
  if (!tournament || !match) {
    throw new Error("Unable to retrieve live match details.");
  }
  
  const getTeamName = (teamId, fallback) =>
    teams.find(team => team.id === teamId)?.name || fallback;
  
  const homeTeamName = getTeamName(
    match.home_team_id,
    "Home Team"
  );
  
  const awayTeamName = getTeamName(
    match.away_team_id,
    "Away Team"
  );
  
  const selectedTeamName =
    broadcast.selected_team_id === match.home_team_id ?
    homeTeamName :
    broadcast.selected_team_id === match.away_team_id ?
    awayTeamName :
    "Your Team";
  
  return {
    tournamentName: tournament.name,
    roundName: match.round || "Round not specified",
    homeTeamName,
    awayTeamName,
    selectedTeamName
  };
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
      
      const details = await getLiveBroadcastDetails(
        db,
        broadcast
      );
      
      return json({
        success: true,
        broadcast: {
          ...broadcast,
          ...details
        }
      });
    }
    
    const broadcast = await db
      .prepare(`
        SELECT *
        FROM live_broadcasts
        WHERE player_user_id = ?
          AND status IN ('waiting', 'live')
          AND invitation_status IN ('pending', 'accepted')
          AND expires_at > ?
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .bind(user.id, now)
      .first();
    
    if (!broadcast) {
      return json({
        success: true,
        broadcast: null
      });
    }
    
    const details = await getLiveBroadcastDetails(
      db,
      broadcast
    );
    
    return json({
      success: true,
      broadcast: {
        ...broadcast,
        ...details
      }
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
    
    const broadcast = {
      id,
      tournament_id: match.tournament_id,
      match_id: match.match_id,
      selected_team_id: teamId,
      player_user_id: match.player_user_id,
      admin_user_id: user.id,
      status: "waiting",
      invitation_status: "pending",
      expires_at: expiresAt
    };
    
    const details = await getLiveBroadcastDetails(
      db,
      broadcast
    );
    
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
        invitationStatus: "pending",
        expiresAt,
        ...details
      }
    }, 201);
  }
  
  const routeMatch = pathname.match(
    /^\/live\/broadcasts\/([^/]+)(?:\/(signals|started|end|respond))?$/
  );
  
  if (!routeMatch) {
    return null;
  }
  
  const broadcastId = routeMatch[1];
  const action = routeMatch[2] || null;
  
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
  
  if (action === "respond" && method === "POST") {
    if (user.id !== broadcast.player_user_id) {
      return json({
        success: false,
        message: "Only the invited player can respond."
      }, 403);
    }
    
    if (broadcast.status !== "waiting") {
      return json({
        success: false,
        message: "This invitation is no longer active."
      }, 410);
    }
    
    if (broadcast.invitation_status !== "pending") {
      return json({
        success: false,
        message: "You have already responded to this invitation."
      }, 409);
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
    
    const response = body.action;
    
    if (!["accepted", "declined"].includes(response)) {
      return json({
        success: false,
        message: "Invalid invitation response."
      }, 400);
    }
    
    const result = await db
      .prepare(`
        UPDATE live_broadcasts
        SET invitation_status = ?
        WHERE id = ?
          AND player_user_id = ?
          AND invitation_status = 'pending'
          AND status = 'waiting'
          AND expires_at > ?
      `)
      .bind(
        response,
        broadcastId,
        user.id,
        now
      )
      .run();
    
    if (!result.meta.changes) {
      return json({
        success: false,
        message: "Unable to update this invitation. Please check its status."
      }, 409);
    }
    
    return json({
      success: true,
      message: response === "accepted" ?
        "Invitation accepted." :
        "Invitation declined.",
      invitationStatus: response
    });
  }
  
  if (
    (action === "started" || action === "signals") &&
    broadcast.invitation_status !== "accepted"
  ) {
    return json({
      success: false,
      message: "The player must accept the invitation before streaming."
    }, 403);
  }
  
  if (
    action === "started" &&
    user.id !== broadcast.player_user_id
  ) {
    return json({
      success: false,
      message: "Only the invited player can start streaming."
    }, 403);
  }
  
  if (!action && method === "GET") {
    const details = await getLiveBroadcastDetails(
      db,
      broadcast
    );
    
    return json({
      success: true,
      broadcast: {
        ...broadcast,
        ...details
      }
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