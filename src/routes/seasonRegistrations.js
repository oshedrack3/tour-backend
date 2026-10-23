function json(data, status = 200) {
  return Response.json(data, { status });
}

function createReference() {
  return `GALATICO-${crypto.randomUUID()}`;
}

async function getAvailableSeasons(env) {
  return env.DB.prepare(`
    SELECT
      t.id AS tournament_id,
      t.name AS tournament_name,
      t.season,
      t.season_status,
      t.registration_status,
      t.registration_deadline,
      t.registration_capacity,
      t.competition_id,
      c.name AS competition_name,
      c.registration_fee,
      c.admin_fee,
      (
        SELECT COUNT(*)
        FROM season_registrations sr
        WHERE sr.tournament_id = t.id
          AND sr.payment_status = 'paid'
      ) AS registered_count
    FROM tournaments t
    INNER JOIN competitions c
      ON c.id = t.competition_id
    WHERE t.registration_status = 'open'
      AND t.season_status IN ('upcoming', 'active')
      AND (
        t.registration_deadline IS NULL
        OR t.registration_deadline > ?
      )
    ORDER BY t.created_at DESC
  `).bind(Date.now()).all();
}

async function handleAvailableSeasons(env) {
  const result = await getAvailableSeasons(env);
  
  const seasons = (result.results || [])
    .filter(tournament =>
      Number(tournament.registered_count) <
      Number(tournament.registration_capacity)
    )
    .map(tournament => ({
      tournament_id: tournament.tournament_id,
      tournament_name: tournament.tournament_name,
      season: tournament.season,
      competition_id: tournament.competition_id,
      competition_name: tournament.competition_name,
      registration_status: tournament.registration_status,
      registration_deadline: tournament.registration_deadline,
      registration_capacity: Number(tournament.registration_capacity),
      registered_count: Number(tournament.registered_count),
      available_spaces: Math.max(
        0,
        Number(tournament.registration_capacity) -
        Number(tournament.registered_count)
      ),
      registration_fee: Number(tournament.registration_fee),
      admin_fee: Number(tournament.admin_fee),
      total_amount: Number(tournament.registration_fee) +
        Number(tournament.admin_fee)
    }));
  
  return json({
    success: true,
    seasons
  });
}

async function handleCreateCheckout(request, env, user) {
  if (!env.FLW_SECRET_KEY) {
    return json({
      success: false,
      message: "Payment service is not configured."
    }, 503);
  }
  
  if (!env.FLW_REDIRECT_URL) {
    return json({
      success: false,
      message: "Payment return URL is not configured."
    }, 503);
  }
  
  if (!user.email) {
    return json({
      success: false,
      message: "Your account needs a valid email address before payment."
    }, 400);
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
  
  const tournamentId = String(
    body.tournament_id || ""
  ).trim();
  
  if (!tournamentId) {
    return json({
      success: false,
      message: "Tournament ID is required."
    }, 400);
  }
  
  const tournament = await env.DB.prepare(`
    SELECT
      t.id,
      t.name,
      t.season,
      t.season_status,
      t.registration_status,
      t.registration_deadline,
      t.registration_capacity,
      c.registration_fee,
      c.admin_fee
    FROM tournaments t
    INNER JOIN competitions c
      ON c.id = t.competition_id
    WHERE t.id = ?
    LIMIT 1
  `).bind(tournamentId).first();
  
  if (!tournament) {
    return json({
      success: false,
      message: "Season not found."
    }, 404);
  }
  
  if (
    tournament.registration_status !== "open" ||
    !["upcoming", "active"].includes(tournament.season_status) ||
    (
      tournament.registration_deadline !== null &&
      tournament.registration_deadline !== undefined &&
      Number(tournament.registration_deadline) <= Date.now()
    )
  ) {
    return json({
      success: false,
      message: "Registration for this season is closed."
    }, 400);
  }
  
  const entryFee = Number(tournament.registration_fee);
  const adminFee = Number(tournament.admin_fee);
  const totalAmount = entryFee + adminFee;
  
  if (
    !Number.isSafeInteger(entryFee) ||
    !Number.isSafeInteger(adminFee) ||
    entryFee < 0 ||
    adminFee < 0 ||
    totalAmount <= 0
  ) {
    return json({
      success: false,
      message: "The registration fee is not configured correctly."
    }, 400);
  }
  
  const existing = await env.DB.prepare(`
    SELECT id, payment_status
    FROM season_registrations
    WHERE tournament_id = ?
      AND user_id = ?
    LIMIT 1
  `).bind(tournamentId, user.id).first();
  
  if (existing?.payment_status === "paid") {
    return json({
      success: false,
      message: "You are already registered for this season."
    }, 409);
  }
  
  const count = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM season_registrations
    WHERE tournament_id = ?
      AND payment_status = 'paid'
  `).bind(tournamentId).first();
  
  if (
    Number(count?.total || 0) >=
    Number(tournament.registration_capacity)
  ) {
    return json({
      success: false,
      message: "This season has reached its registration capacity."
    }, 409);
  }
  
  const registrationId = existing ?
    (await env.DB.prepare(`
        SELECT id
        FROM season_registrations
        WHERE tournament_id = ?
          AND user_id = ?
        LIMIT 1
      `).bind(tournamentId, user.id).first()).id :
    crypto.randomUUID();
  
  const reference = createReference();
  const now = Date.now();
  
  if (existing) {
    await env.DB.prepare(`
      UPDATE season_registrations
      SET
        league_entry_fee = ?,
        admin_fee = ?,
        total_amount = ?,
        payment_status = 'pending',
        payment_method = 'flutterwave',
        payment_reference = ?,
        payment_proof_url = NULL,
        submitted_at = NULL,
        reviewed_by = NULL,
        reviewed_at = NULL,
        rejection_reason = NULL,
        updated_at = ?
      WHERE id = ?
        AND user_id = ?
        AND payment_status != 'paid'
    `).bind(
      entryFee,
      adminFee,
      totalAmount,
      reference,
      now,
      registrationId,
      user.id
    ).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO season_registrations (
        id,
        tournament_id,
        user_id,
        league_entry_fee,
        admin_fee,
        total_amount,
        payment_status,
        payment_method,
        payment_reference,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 'flutterwave', ?, ?, ?)
    `).bind(
      registrationId,
      tournamentId,
      user.id,
      entryFee,
      adminFee,
      totalAmount,
      reference,
      now,
      now
    ).run();
  }
  
  let paymentResponse;
  
  try {
    const response = await fetch(
      "https://api.flutterwave.com/v3/payments",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.FLW_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount: totalAmount,
          currency: "NGN",
          redirect_url: env.FLW_REDIRECT_URL,
          customer: {
            email: user.email,
            name: user.username || user.email
          },
          customizations: {
            title: "Galatico eTournaments",
            description: `Season registration: ${tournament.name}`
          },
          meta: {
            registration_id: registrationId,
            tournament_id: tournamentId,
            user_id: user.id
          }
        })
      }
    );
    
    paymentResponse = await response.json();
    
    if (!response.ok || paymentResponse.status !== "success") {
      console.error(
        "Flutterwave checkout error:",
        paymentResponse.message || "Checkout creation failed."
      );
      
      return json({
        success: false,
        message: "Unable to initialize payment. Please try again."
      }, 502);
    }
  } catch (error) {
    console.error("Flutterwave request failed:", error);
    
    return json({
      success: false,
      message: "Unable to contact the payment provider."
    }, 502);
  }
  
  return json({
    success: true,
    message: "Checkout created.",
    registration_id: registrationId,
    payment_reference: reference,
    checkout_url: paymentResponse.data.link,
    amount: totalAmount,
    currency: "NGN"
  });
}

async function handleVerifyPayment(request, env, user) {
  if (!env.FLW_SECRET_KEY) {
    return json({
      success: false,
      message: "Payment service is not configured."
    }, 503);
  }
  
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  
  if (!reference) {
    return json({
      success: false,
      message: "Payment reference is required."
    }, 400);
  }
  
  const registration = await env.DB.prepare(`
    SELECT
      id,
      tournament_id,
      user_id,
      total_amount,
      payment_status,
      payment_reference
    FROM season_registrations
    WHERE payment_reference = ?
      AND user_id = ?
    LIMIT 1
  `).bind(reference, user.id).first();
  
  if (!registration) {
    return json({
      success: false,
      message: "Registration or payment reference not found."
    }, 404);
  }
  
  if (registration.payment_status === "paid") {
    return json({
      success: true,
      message: "Payment has already been verified.",
      payment_status: "paid"
    });
  }
  
  let verificationResponse;
  
  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${env.FLW_SECRET_KEY}`,
          Accept: "application/json"
        }
      }
    );
    
    verificationResponse = await response.json();
    
    if (
      !response.ok ||
      verificationResponse.status !== "success" ||
      !verificationResponse.data
    ) {
      return json({
        success: false,
        message: "Payment has not been confirmed yet."
      }, 400);
    }
  } catch (error) {
    console.error("Flutterwave verification failed:", error);
    
    return json({
      success: false,
      message: "Unable to verify payment right now."
    }, 502);
  }
  
  const payment = verificationResponse.data;
  
  if (
    payment.status !== "successful" ||
    payment.tx_ref !== registration.payment_reference ||
    payment.currency !== "NGN" ||
    Number(payment.amount) < Number(registration.total_amount)
  ) {
    return json({
      success: false,
      message: "The payment could not be verified against this registration."
    }, 400);
  }
  
  const result = await env.DB.prepare(`
    UPDATE season_registrations
    SET
      payment_status = 'paid',
      submitted_at = COALESCE(submitted_at, ?),
      updated_at = ?
    WHERE id = ?
      AND user_id = ?
      AND payment_reference = ?
      AND payment_status IN ('pending', 'submitted')
  `).bind(
    Date.now(),
    Date.now(),
    registration.id,
    user.id,
    reference
  ).run();
  
  if (!result.meta?.changes) {
    const latest = await env.DB.prepare(`
      SELECT payment_status
      FROM season_registrations
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `).bind(registration.id, user.id).first();
    
    if (latest?.payment_status !== "paid") {
      return json({
        success: false,
        message: "Registration status changed. Please check your registration."
      }, 409);
    }
  }
  
  return json({
    success: true,
    message: "Payment verified successfully.",
    payment_status: "paid",
    registration_id: registration.id,
    tournament_id: registration.tournament_id
  });
}

async function handleMyRegistrations(env, user) {
  const result = await env.DB.prepare(`
    SELECT
      sr.id,
      sr.tournament_id,
      sr.league_entry_fee,
      sr.admin_fee,
      sr.total_amount,
      sr.payment_status,
      sr.payment_method,
      sr.payment_reference,
      sr.created_at,
      sr.updated_at,
      t.name AS tournament_name,
      t.season,
      c.name AS competition_name
    FROM season_registrations sr
    INNER JOIN tournaments t
      ON t.id = sr.tournament_id
    INNER JOIN competitions c
      ON c.id = t.competition_id
    WHERE sr.user_id = ?
    ORDER BY sr.created_at DESC
  `).bind(user.id).all();
  
  return json({
    success: true,
    registrations: result.results || []
  });
}


function secureStringEqual(a, b) {
  if (
    typeof a !== "string" ||
    typeof b !== "string" ||
    !a.length ||
    a.length !== b.length
  ) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
export async function handleFlutterwaveWebhook(request, env) {
  if (!env.FLW_SECRET_KEY || !env.FLW_SECRET_HASH) {
    console.error("Flutterwave webhook secrets are not configured.");
    return json({
      success: false,
      message: "Webhook configuration error."
    }, 500);
  }
  const signature = request.headers.get("verif-hash");
  if (!secureStringEqual(signature, env.FLW_SECRET_HASH)) {
    return json({
      success: false,
      message: "Unauthorized webhook."
    }, 401);
  }
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({
      success: false,
      message: "Invalid webhook payload."
    }, 400);
  }
  if (
    payload.event !== "charge.completed" ||
    !payload.data
  ) {
    return json({
      success: true,
      message: "Webhook event ignored."
    });
  }
  const reference = String(payload.data.tx_ref || "").trim();
  if (!reference) {
    return json({
      success: true,
      message: "Webhook has no transaction reference."
    });
  }
  const registration = await env.DB.prepare(`
    SELECT
      id,
      tournament_id,
      user_id,
      total_amount,
      payment_status,
      payment_reference
    FROM season_registrations
    WHERE payment_reference = ?
    LIMIT 1
  `).bind(reference).first();
  if (!registration) {
    console.error(
      "Flutterwave webhook reference not found:",
      reference
    );
    return json({
      success: true,
      message: "No matching registration."
    });
  }
  if (registration.payment_status === "paid") {
    return json({
      success: true,
      message: "Payment already processed."
    });
  }
  if (
    !["pending", "submitted"].includes(
      registration.payment_status
    )
  ) {
    return json({
      success: true,
      message: "Registration is not awaiting payment."
    });
  }
  let verificationResponse;
  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${env.FLW_SECRET_KEY}`,
          Accept: "application/json"
        }
      }
    );
    verificationResponse = await response.json();
    if (
      !response.ok ||
      verificationResponse.status !== "success" ||
      !verificationResponse.data
    ) {
      console.error(
        "Flutterwave transaction verification failed:",
        reference,
        verificationResponse.message || response.status
      );
      return json({
        success: false,
        message: "Transaction verification failed."
      }, 500);
    }
  } catch (error) {
    console.error(
      "Flutterwave verification request failed:",
      error
    );
    return json({
      success: false,
      message: "Unable to verify transaction."
    }, 500);
  }
  const payment = verificationResponse.data;
  if (
    payment.status !== "successful" ||
    payment.tx_ref !== registration.payment_reference ||
    payment.currency !== "NGN" ||
    !Number.isFinite(Number(payment.amount)) ||
    Number(payment.amount) < Number(registration.total_amount)
  ) {
    console.error(
      "Flutterwave payment did not match registration:",
      reference
    );
    return json({
      success: false,
      message: "Transaction does not match registration."
    }, 400);
  }
  const now = Date.now();
  const result = await env.DB.prepare(`
    UPDATE season_registrations
    SET
      payment_status = 'paid',
      submitted_at = COALESCE(submitted_at, ?),
      updated_at = ?
    WHERE id = ?
      AND payment_reference = ?
      AND payment_status IN ('pending', 'submitted')
  `).bind(
    now,
    now,
    registration.id,
    reference
  ).run();
  if (!result.meta?.changes) {
    const latest = await env.DB.prepare(`
      SELECT payment_status
      FROM season_registrations
      WHERE id = ?
      LIMIT 1
    `).bind(registration.id).first();
    if (latest?.payment_status !== "paid") {
      return json({
        success: false,
        message: "Registration update failed."
      }, 500);
    }
  }
  console.log(
    "Season registration payment verified:",
    registration.id
  );
  return json({
    success: true,
    message: "Payment verified and registration updated."
  });
}


export async function handlePaymentHistory(
  request,
  env,
  user
) {
  if (!user) {
    return Response.json({
      success: false,
      message: "Please log in to continue."
    }, { status: 401 });
  }
  
  const url = new URL(request.url);
  const tournamentId = url.searchParams
    .get("tournament_id")
    ?.trim();
  
  if (tournamentId) {
    const tournament = await env.DB.prepare(`
      SELECT id, name, season, admin_uid
      FROM tournaments
      WHERE id = ?
      LIMIT 1
    `).bind(tournamentId).first();
    
    if (!tournament) {
      return Response.json({
        success: false,
        message: "Tournament not found."
      }, { status: 404 });
    }
    
    if (user.role === "admin") {
      if (tournament.admin_uid !== user.id) {
        return Response.json({
          success: false,
          message: "You do not manage this tournament."
        }, { status: 403 });
      }
    } else if (user.role === "player") {
      const isParticipant = await env.DB.prepare(`
        SELECT 1
        FROM tournament_players
        WHERE tournament_id = ?
          AND user_id = ?
        LIMIT 1
      `).bind(
        tournamentId,
        user.id
      ).first();
      
      if (!isParticipant) {
        return Response.json({
          success: false,
          message: "You are not a player in this tournament."
        }, { status: 403 });
      }
    } else {
      return Response.json({
        success: false,
        message: "You do not have permission to view payment history."
      }, { status: 403 });
    }
    
    const result = await env.DB.prepare(`
      SELECT
        sr.id AS registration_id,
        sr.tournament_id,
        sr.user_id,
        u.username,
        sr.league_entry_fee,
        sr.admin_fee,
        sr.total_amount,
        sr.payment_status,
        sr.payment_method,
        sr.payment_reference,
        sr.created_at,
        sr.submitted_at,
        sr.updated_at,
        t.name AS tournament_name,
        t.season
      FROM season_registrations sr
      INNER JOIN users u
        ON u.id = sr.user_id
      INNER JOIN tournaments t
        ON t.id = sr.tournament_id
      WHERE sr.tournament_id = ?
      ORDER BY sr.created_at DESC
    `).bind(tournamentId).all();
    
    const registrations = result.results || [];
    
    const summary = registrations.reduce(
      (acc, registration) => {
        const amount =
          Number(registration.total_amount) || 0;
        
        acc.total_registrations++;
        
        if (registration.payment_status === "paid") {
          acc.paid_registrations++;
          acc.total_amount_paid += amount;
        }
        
        if (
          registration.payment_status === "pending" ||
          registration.payment_status === "submitted"
        ) {
          acc.pending_registrations++;
          acc.pending_amount += amount;
        }
        
        if (registration.payment_status === "refunded") {
          acc.refunded_registrations++;
          acc.total_amount_refunded += amount;
        }
        
        return acc;
      },
      {
        total_registrations: 0,
        paid_registrations: 0,
        total_amount_paid: 0,
        pending_registrations: 0,
        pending_amount: 0,
        refunded_registrations: 0,
        total_amount_refunded: 0
      }
    );
    
    return Response.json({
      success: true,
      data: {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          season: tournament.season
        },
        registrations,
        summary
      }
    });
  }
  
  if (user.role !== "admin") {
    return Response.json({
      success: false,
      message: "Please open a tournament first to view payment history."
    }, { status: 403 });
  }
  
  const denied = await requireFinancialAdmin(env, user);
  
  if (denied) {
    return denied;
  }
  
  const result = await env.DB.prepare(`
    SELECT
      sr.id AS registration_id,
      sr.tournament_id,
      sr.user_id,
      u.username,
      sr.league_entry_fee,
      sr.admin_fee,
      sr.total_amount,
      sr.payment_status,
      sr.payment_method,
      sr.payment_reference,
      sr.created_at,
      sr.submitted_at,
      sr.updated_at,
      t.name AS tournament_name,
      t.season
    FROM season_registrations sr
    INNER JOIN tournaments t
      ON t.id = sr.tournament_id
    INNER JOIN users u
      ON u.id = sr.user_id
    WHERE t.admin_uid = ?
    ORDER BY
      t.created_at DESC,
      sr.created_at DESC
  `).bind(user.id).all();
  
  const registrations = result.results || [];
  const tournamentsMap = new Map();
  
  for (const registration of registrations) {
    let tournament = tournamentsMap.get(
      registration.tournament_id
    );
    
    if (!tournament) {
      tournament = {
        tournament_id: registration.tournament_id,
        tournament_name: registration.tournament_name,
        season: registration.season,
        registrations: [],
        summary: {
          total_registrations: 0,
          paid_registrations: 0,
          total_amount_paid: 0,
          pending_registrations: 0,
          pending_amount: 0,
          refunded_registrations: 0,
          total_amount_refunded: 0
        }
      };
      
      tournamentsMap.set(
        registration.tournament_id,
        tournament
      );
    }
    
    tournament.registrations.push(registration);
    
    const summary = tournament.summary;
    const amount =
      Number(registration.total_amount) || 0;
    
    summary.total_registrations++;
    
    if (registration.payment_status === "paid") {
      summary.paid_registrations++;
      summary.total_amount_paid += amount;
    }
    
    if (
      registration.payment_status === "pending" ||
      registration.payment_status === "submitted"
    ) {
      summary.pending_registrations++;
      summary.pending_amount += amount;
    }
    
    if (registration.payment_status === "refunded") {
      summary.refunded_registrations++;
      summary.total_amount_refunded += amount;
    }
  }
  
  return Response.json({
    success: true,
    data: Array.from(tournamentsMap.values())
  });
}



function financialError(message, status = 400) {
  return json({
    success: false,
    message
  }, status);
}

async function requireFinancialAdmin(env, user) {
  if (!user || user.role !== "admin") {
    return financialError(
      "Only administrators can manage financial records.",
      403
    );
  }
  
  const admin = await env.DB.prepare(`
    SELECT id
    FROM users
    WHERE id = ?
      AND role = 'admin'
    LIMIT 1
  `).bind(user.id).first();
  
  if (!admin) {
    return financialError(
      "Administrator account not found.",
      403
    );
  }
  
  return null;
}

async function readFinancialBody(request) {
  try {
    const body = await request.json();
    
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return null;
    }
    
    return body;
  } catch {
    return null;
  }
}

function isPositiveAmount(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export async function handleCreatePrize(request, env, user) {
  const denied = await requireFinancialAdmin(env, user);
  
  if (denied) {
    return denied;
  }
  
  const body = await readFinancialBody(request);
  
  if (!body) {
    return financialError("Invalid request body.");
  }
  
  const tournamentId = String(
    body.tournament_id || ""
  ).trim();
  
  const userId = String(
    body.user_id || ""
  ).trim();
  
  const prizeName = String(
    body.prize_name || ""
  ).trim();
  
  const amount = body.amount;
  
  const position =
    body.position === null ||
    body.position === undefined ||
    body.position === "" ?
    null :
    Number(body.position);
  
  if (!tournamentId || !userId || !prizeName) {
    return financialError(
      "Tournament, player, and prize name are required."
    );
  }
  
  if (
    typeof amount !== "number" ||
    !isPositiveAmount(amount)
  ) {
    return financialError(
      "Prize amount must be a positive whole number in naira."
    );
  }
  
  if (
    position !== null &&
    (!Number.isSafeInteger(position) || position < 1)
  ) {
    return financialError(
      "Prize position must be a positive whole number."
    );
  }
  
  const tournament = await env.DB.prepare(`
    SELECT id, name
    FROM tournaments
    WHERE id = ?
      AND admin_uid = ?
    LIMIT 1
  `).bind(tournamentId, user.id).first();
  
  if (!tournament) {
    return financialError(
      "Tournament not found or you do not manage it.",
      404
    );
  }
  
  const player = await env.DB.prepare(`
    SELECT id
    FROM users
    WHERE id = ?
    LIMIT 1
  `).bind(userId).first();
  
  if (!player) {
    return financialError("Player not found.", 404);
  }
  
  const participant = await env.DB.prepare(`
    SELECT 1
    FROM tournament_players
    WHERE tournament_id = ?
      AND user_id = ?
    LIMIT 1
  `).bind(tournamentId, userId).first();
  
  if (!participant) {
    return financialError(
      "The selected player is not registered in this tournament.",
      400
    );
  }
  
  const id = crypto.randomUUID();
  const now = Date.now();
  
  await env.DB.prepare(`
    INSERT INTO tournament_prize_payouts (
      id,
      tournament_id,
      user_id,
      prize_name,
      position,
      amount,
      status,
      awarded_at,
      created_by,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
  `).bind(
    id,
    tournamentId,
    userId,
    prizeName,
    position,
    amount,
    now,
    user.id,
    now,
    now
  ).run();
  
  return json({
    success: true,
    message: "Prize award recorded.",
    data: {
      id,
      tournament_id: tournamentId,
      user_id: userId,
      prize_name: prizeName,
      position,
      amount,
      status: "pending",
      awarded_at: now
    }
  }, 201);
}

export async function handleApprovePrize(
  request,
  env,
  user,
  payoutId
) {
  const denied = await requireFinancialAdmin(env, user);
  
  if (denied) {
    return denied;
  }
  
  const payout = await env.DB.prepare(`
    SELECT p.id, p.status
    FROM tournament_prize_payouts p
    INNER JOIN tournaments t
      ON t.id = p.tournament_id
    WHERE p.id = ?
      AND t.admin_uid = ?
    LIMIT 1
  `).bind(payoutId, user.id).first();
  
  if (!payout) {
    return financialError("Prize award not found.", 404);
  }
  
  if (payout.status !== "pending") {
    return financialError(
      "Only pending prizes can be approved.",
      409
    );
  }
  
  const now = Date.now();
  
  const result = await env.DB.prepare(`
    UPDATE tournament_prize_payouts
    SET
      status = 'approved',
      approved_by = ?,
      approved_at = ?,
      updated_at = ?
    WHERE id = ?
      AND status = 'pending'
      AND EXISTS (
        SELECT 1
        FROM tournaments t
        WHERE t.id = tournament_prize_payouts.tournament_id
          AND t.admin_uid = ?
      )
  `).bind(
    user.id,
    now,
    now,
    payoutId,
    user.id
  ).run();
  
  if (!result.meta?.changes) {
    return financialError(
      "Prize status changed. Refresh and try again.",
      409
    );
  }
  
  return json({
    success: true,
    message: "Prize approved."
  });
}

export async function handlePayPrize(
  request,
  env,
  user,
  payoutId
) {
  const denied = await requireFinancialAdmin(env, user);
  
  if (denied) {
    return denied;
  }
  
  const body = await readFinancialBody(request);
  
  if (!body) {
    return financialError("Invalid request body.");
  }
  
  const reference = String(
    body.payout_reference || ""
  ).trim();
  
  const paymentMethod = String(
    body.payment_method || ""
  ).trim();
  
  if (!reference || !paymentMethod) {
    return financialError(
      "Payout reference and payment method are required."
    );
  }
  
  const payout = await env.DB.prepare(`
    SELECT p.id, p.status
    FROM tournament_prize_payouts p
    INNER JOIN tournaments t
      ON t.id = p.tournament_id
    WHERE p.id = ?
      AND t.admin_uid = ?
    LIMIT 1
  `).bind(payoutId, user.id).first();
  
  if (!payout) {
    return financialError("Prize award not found.", 404);
  }
  
  if (payout.status !== "approved") {
    return financialError(
      "Only approved prizes can be marked as paid.",
      409
    );
  }
  
  const now = Date.now();
  
  const result = await env.DB.prepare(`
    UPDATE tournament_prize_payouts
    SET
      status = 'paid',
      payout_reference = ?,
      payment_method = ?,
      paid_at = ?,
      updated_at = ?
    WHERE id = ?
      AND status = 'approved'
      AND EXISTS (
        SELECT 1
        FROM tournaments t
        WHERE t.id = tournament_prize_payouts.tournament_id
          AND t.admin_uid = ?
      )
  `).bind(
    reference,
    paymentMethod,
    now,
    now,
    payoutId,
    user.id
  ).run();
  
  if (!result.meta?.changes) {
    return financialError(
      "Prize status changed. Refresh and try again.",
      409
    );
  }
  
  return json({
    success: true,
    message: "Prize payout recorded."
  });
}
export async function handleCreateExpense(
  request,
  env,
  user
) {
  const denied = await requireFinancialAdmin(env, user);
  
  if (denied) {
    return denied;
  }
  
  const body = await readFinancialBody(request);
  
  if (!body) {
    return financialError("Invalid request body.");
  }
  
  const description = String(
    body.description || ""
  ).trim();
  
  const category = String(
    body.category || ""
  ).trim();
  
  const amount = body.amount;
  
  const recipient = String(
    body.recipient || ""
  ).trim() || null;
  
  const tournamentId = String(
    body.tournament_id || ""
  ).trim() || null;
  
  const notes = String(
    body.notes || ""
  ).trim() || null;
  
  if (!description || !category) {
    return financialError(
      "Expense description and category are required."
    );
  }
  
  if (
    typeof amount !== "number" ||
    !isPositiveAmount(amount)
  ) {
    return financialError(
      "Expense amount must be a positive whole number in naira."
    );
  }
  
  if (tournamentId) {
    const tournament = await env.DB.prepare(`
      SELECT id
      FROM tournaments
      WHERE id = ?
        AND admin_uid = ?
      LIMIT 1
    `).bind(tournamentId, user.id).first();
    
    if (!tournament) {
      return financialError(
        "Tournament not found or you do not manage it.",
        404
      );
    }
  }
  
  const id = crypto.randomUUID();
  const now = Date.now();
  
  await env.DB.prepare(`
    INSERT INTO financial_expenses (
      id,
      description,
      category,
      amount,
      status,
      recipient,
      tournament_id,
      expense_date,
      notes,
      created_by,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    description,
    category,
    amount,
    recipient,
    tournamentId,
    now,
    notes,
    user.id,
    now,
    now
  ).run();
  
  return json({
    success: true,
    message: "Expense recorded.",
    data: {
      id,
      description,
      category,
      amount,
      status: "pending",
      tournament_id: tournamentId
    }
  }, 201);
}
export async function handleApproveExpense(
  request,
  env,
  user,
  expenseId
) {
  const denied = await requireFinancialAdmin(env, user);
  
  if (denied) {
    return denied;
  }
  
  const expense = await env.DB.prepare(`
    SELECT id, status
    FROM financial_expenses
    WHERE id = ?
      AND created_by = ?
    LIMIT 1
  `).bind(expenseId, user.id).first();
  
  if (!expense) {
    return financialError("Expense not found.", 404);
  }
  
  if (expense.status !== "pending") {
    return financialError(
      "Only pending expenses can be approved.",
      409
    );
  }
  
  const now = Date.now();
  
  const result = await env.DB.prepare(`
    UPDATE financial_expenses
    SET
      status = 'approved',
      approved_by = ?,
      approved_at = ?,
      updated_at = ?
    WHERE id = ?
      AND created_by = ?
      AND status = 'pending'
  `).bind(
    user.id,
    now,
    now,
    expenseId,
    user.id
  ).run();
  
  if (!result.meta?.changes) {
    return financialError(
      "Expense status changed. Refresh and try again.",
      409
    );
  }
  
  return json({
    success: true,
    message: "Expense approved."
  });
}
export async function handlePayExpense(
  request,
  env,
  user,
  expenseId
) {
  const denied = await requireFinancialAdmin(env, user);
  
  if (denied) {
    return denied;
  }
  
  const body = await readFinancialBody(request);
  
  if (!body) {
    return financialError("Invalid request body.");
  }
  
  const reference = String(
    body.payment_reference || ""
  ).trim();
  
  const paymentMethod = String(
    body.payment_method || ""
  ).trim();
  
  if (!reference || !paymentMethod) {
    return financialError(
      "Payment reference and method are required."
    );
  }
  
  const expense = await env.DB.prepare(`
    SELECT id, status
    FROM financial_expenses
    WHERE id = ?
      AND created_by = ?
    LIMIT 1
  `).bind(expenseId, user.id).first();
  
  if (!expense) {
    return financialError("Expense not found.", 404);
  }
  
  if (expense.status !== "approved") {
    return financialError(
      "Only approved expenses can be marked as paid.",
      409
    );
  }
  
  const now = Date.now();
  
  const result = await env.DB.prepare(`
    UPDATE financial_expenses
    SET
      status = 'paid',
      payment_reference = ?,
      payment_method = ?,
      paid_at = ?,
      updated_at = ?
    WHERE id = ?
      AND created_by = ?
      AND status = 'approved'
  `).bind(
    reference,
    paymentMethod,
    now,
    now,
    expenseId,
    user.id
  ).run();
  
  if (!result.meta?.changes) {
    return financialError(
      "Expense status changed. Refresh and try again.",
      409
    );
  }
  
  return json({
    success: true,
    message: "Expense payment recorded."
  });
}

async function handleFinancialSummary(request, env, user) {
  const denied = await requireFinancialAdmin(env, user);
  
  if (denied) {
    return denied;
  }
  
  try {
    const url = new URL(request.url);
    const tournamentId = String(
      url.searchParams.get("tournament_id") || ""
    ).trim();
    
    if (tournamentId) {
      const tournament = await env.DB.prepare(`
        SELECT id
        FROM tournaments
        WHERE id = ?
          AND admin_uid = ?
        LIMIT 1
      `).bind(tournamentId, user.id).first();
      
      if (!tournament) {
        return financialError(
          "Tournament not found or you do not manage it.",
          404
        );
      }
    }
    
    const registrationFilter = tournamentId ?
      "WHERE sr.tournament_id = ? AND t.admin_uid = ?" :
      "WHERE t.admin_uid = ?";
    
    const prizeFilter = tournamentId ?
      "WHERE p.tournament_id = ? AND t.admin_uid = ?" :
      "WHERE t.admin_uid = ?";
    
    const expenseFilter = tournamentId ?
      "WHERE e.created_by = ? AND e.tournament_id = ?" :
      "WHERE e.created_by = ? AND (e.tournament_id IS NULL OR EXISTS (SELECT 1 FROM tournaments t WHERE t.id = e.tournament_id AND t.admin_uid = ?))";
    
    const registrationBindings = tournamentId ?
      [tournamentId, user.id] :
      [user.id];
    
    const prizeBindings = tournamentId ?
      [tournamentId, user.id] :
      [user.id];
    
    const expenseBindings = tournamentId ?
      [user.id, tournamentId] :
      [user.id, user.id];
    
    const [
      registrations,
      prizes,
      expenses
    ] = await Promise.all([
      env.DB.prepare(`
        SELECT
          COUNT(*) AS total_registrations,
          SUM(CASE WHEN sr.payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_registrations,
          SUM(CASE WHEN sr.payment_status IN ('pending', 'submitted') THEN 1 ELSE 0 END) AS pending_registrations,
          SUM(CASE WHEN sr.payment_status = 'refunded' THEN 1 ELSE 0 END) AS refunded_registrations,
          SUM(CASE WHEN sr.payment_status = 'paid' THEN sr.total_amount ELSE 0 END) AS total_amount_received,
          SUM(CASE WHEN sr.payment_status IN ('pending', 'submitted') THEN sr.total_amount ELSE 0 END) AS pending_registration_amount,
          SUM(CASE WHEN sr.payment_status = 'refunded' THEN sr.total_amount ELSE 0 END) AS total_amount_refunded
        FROM season_registrations sr
        INNER JOIN tournaments t
          ON t.id = sr.tournament_id
        ${registrationFilter}
      `).bind(...registrationBindings).first(),
      
      env.DB.prepare(`
        SELECT
          COUNT(*) AS total_prizes,
          SUM(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END) AS pending_prizes,
          SUM(CASE WHEN p.status = 'approved' THEN 1 ELSE 0 END) AS approved_prizes,
          SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END) AS paid_prizes,
          SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END) AS pending_prize_amount,
          SUM(CASE WHEN p.status = 'approved' THEN p.amount ELSE 0 END) AS approved_prize_amount,
          SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END) AS total_prize_amount_paid
        FROM tournament_prize_payouts p
        INNER JOIN tournaments t
          ON t.id = p.tournament_id
        ${prizeFilter}
      `).bind(...prizeBindings).first(),
      
      env.DB.prepare(`
        SELECT
          COUNT(*) AS total_expenses,
          SUM(CASE WHEN e.status = 'pending' THEN 1 ELSE 0 END) AS pending_expenses,
          SUM(CASE WHEN e.status = 'approved' THEN 1 ELSE 0 END) AS approved_expenses,
          SUM(CASE WHEN e.status = 'paid' THEN 1 ELSE 0 END) AS paid_expenses,
          SUM(CASE WHEN e.status = 'pending' THEN e.amount ELSE 0 END) AS pending_expense_amount,
          SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END) AS approved_expense_amount,
          SUM(CASE WHEN e.status = 'paid' THEN e.amount ELSE 0 END) AS total_expenses_paid
        FROM financial_expenses e
        ${expenseFilter}
      `).bind(...expenseBindings).first()
    ]);
    
    const registrationRevenue = Number(
      registrations?.total_amount_received || 0
    );
    
    const refundedAmount = Number(
      registrations?.total_amount_refunded || 0
    );
    
    const prizeAmountPaid = Number(
      prizes?.total_prize_amount_paid || 0
    );
    
    const expensesPaid = Number(
      expenses?.total_expenses_paid || 0
    );
    
    return json({
      success: true,
      tournament_id: tournamentId || null,
      summary: {
        registrations: {
          total: Number(registrations?.total_registrations || 0),
          paid: Number(registrations?.paid_registrations || 0),
          pending: Number(registrations?.pending_registrations || 0),
          refunded: Number(registrations?.refunded_registrations || 0),
          amount_received: registrationRevenue,
          pending_amount: Number(
            registrations?.pending_registration_amount || 0
          ),
          amount_refunded: refundedAmount
        },
        prizes: {
          total: Number(prizes?.total_prizes || 0),
          pending: Number(prizes?.pending_prizes || 0),
          approved: Number(prizes?.approved_prizes || 0),
          paid: Number(prizes?.paid_prizes || 0),
          pending_amount: Number(
            prizes?.pending_prize_amount || 0
          ),
          approved_amount: Number(
            prizes?.approved_prize_amount || 0
          ),
          amount_paid: prizeAmountPaid
        },
        expenses: {
          total: Number(expenses?.total_expenses || 0),
          pending: Number(expenses?.pending_expenses || 0),
          approved: Number(expenses?.approved_expenses || 0),
          paid: Number(expenses?.paid_expenses || 0),
          pending_amount: Number(
            expenses?.pending_expense_amount || 0
          ),
          approved_amount: Number(
            expenses?.approved_expense_amount || 0
          ),
          amount_paid: expensesPaid
        },
        net_balance: registrationRevenue - prizeAmountPaid - expensesPaid
      }
    });
  } catch (error) {
    console.error("Financial summary error:", error);
    
    return financialError(
      "Unable to load financial summary.",
      500
    );
  }
}
async function handleGetFinancialPrizes(request, env, user) {
  if (!user) {
    return financialError("Please log in to continue.", 401);
  }
  
  try {
    const url = new URL(request.url);
    const tournamentId = String(
      url.searchParams.get("tournament_id") || ""
    ).trim();
    
    let result;
    
    if (user.role === "admin") {
      const denied = await requireFinancialAdmin(env, user);
      
      if (denied) {
        return denied;
      }
      
      if (tournamentId) {
        result = await env.DB.prepare(`
          SELECT
            p.id,
            p.tournament_id,
            p.user_id,
            p.prize_name,
            p.position,
            p.amount,
            p.status,
            p.payout_reference,
            p.payment_method,
            p.notes,
            p.awarded_at,
            p.approved_at,
            p.paid_at,
            p.created_at,
            u.username,
            t.name AS tournament_name
          FROM tournament_prize_payouts p
          INNER JOIN tournaments t
            ON t.id = p.tournament_id
          INNER JOIN users u
            ON u.id = p.user_id
          WHERE t.admin_uid = ?
            AND p.tournament_id = ?
          ORDER BY p.created_at DESC
        `)
          .bind(user.id, tournamentId)
          .all();
      } else {
        result = await env.DB.prepare(`
          SELECT
            p.id,
            p.tournament_id,
            p.user_id,
            p.prize_name,
            p.position,
            p.amount,
            p.status,
            p.payout_reference,
            p.payment_method,
            p.notes,
            p.awarded_at,
            p.approved_at,
            p.paid_at,
            p.created_at,
            u.username,
            t.name AS tournament_name
          FROM tournament_prize_payouts p
          INNER JOIN tournaments t
            ON t.id = p.tournament_id
          INNER JOIN users u
            ON u.id = p.user_id
          WHERE t.admin_uid = ?
          ORDER BY p.created_at DESC
        `)
          .bind(user.id)
          .all();
      }
    } else if (user.role === "player") {
      if (!tournamentId) {
        return financialError(
          "Tournament ID is required.",
          400
        );
      }
      
      const participant = await env.DB.prepare(`
        SELECT 1
        FROM tournament_players
        WHERE tournament_id = ?
          AND user_id = ?
        LIMIT 1
      `)
        .bind(tournamentId, user.id)
        .first();
      
      if (!participant) {
        return financialError(
          "You are not a participant in this tournament.",
          403
        );
      }
      
      result = await env.DB.prepare(`
        SELECT
          p.id,
          p.tournament_id,
          p.user_id,
          p.prize_name,
          p.position,
          p.amount,
          p.status,
          p.awarded_at,
          p.paid_at,
          u.username,
          t.name AS tournament_name
        FROM tournament_prize_payouts p
        INNER JOIN tournaments t
          ON t.id = p.tournament_id
        INNER JOIN users u
          ON u.id = p.user_id
        WHERE p.tournament_id = ?
          AND p.status = 'paid'
        ORDER BY p.paid_at DESC
      `)
        .bind(tournamentId)
        .all();
    } else {
      return financialError(
        "You do not have permission to view prize payouts.",
        403
      );
    }
    
    return json({
      success: true,
      data: result.results || []
    });
  } catch (error) {
    console.error("Get financial prizes error:", error);
    
    return financialError(
      "Unable to load prize payouts.",
      500
    );
  }
}

async function handleGetFinancialExpenses(request, env, user) {
  const denied = await requireFinancialAdmin(env, user);
  if (denied) {
    return denied;
  }
  try {
    const url = new URL(request.url);
    const status = String(
      url.searchParams.get("status") || ""
    ).trim().toLowerCase();
    const scope = String(
      url.searchParams.get("scope") || ""
    ).trim().toLowerCase();
    const tournamentId = String(
      url.searchParams.get("tournament_id") || ""
    ).trim();
    const allowedStatuses = [
      "pending",
      "approved",
      "paid",
      "rejected",
      "cancelled"
    ];
    if (status && !allowedStatuses.includes(status)) {
      return financialError("Invalid expense status.");
    }
    if (scope && !["general", "tournament"].includes(scope)) {
      return financialError("Invalid expense scope.");
    }
    if (scope === "general" && tournamentId) {
      return financialError(
        "General expenses cannot have a tournament ID."
      );
    }
    if (scope === "tournament" && !tournamentId) {
      return financialError(
        "Tournament ID is required for tournament expenses."
      );
    }
    let query = `
      SELECT
        e.id,
        e.description,
        e.category,
        e.amount,
        e.status,
        e.payment_method,
        e.payment_reference,
        e.recipient,
        e.tournament_id,
        e.expense_date,
        e.approved_at,
        e.paid_at,
        e.notes,
        e.created_at,
        e.updated_at,
        t.name AS tournament_name
      FROM financial_expenses e
      LEFT JOIN tournaments t
        ON t.id = e.tournament_id
      WHERE e.created_by = ?
    `;
    const bindings = [user.id];
    if (scope === "general") {
      query += ` AND e.tournament_id IS NULL`;
    } else if (scope === "tournament") {
      query += ` AND e.tournament_id = ?`;
      bindings.push(tournamentId);
    } else if (tournamentId) {
      query += ` AND e.tournament_id = ?`;
      bindings.push(tournamentId);
    }
    if (status) {
      query += ` AND e.status = ?`;
      bindings.push(status);
    }
    query += ` ORDER BY e.created_at DESC`;
    const result = await env.DB.prepare(query)
      .bind(...bindings)
      .all();
    return json({
      success: true,
      data: result.results || []
    });
  } catch (error) {
    console.error("Get financial expenses error:", error);
    return financialError(
      "Unable to load financial expenses.",
      500
    );
  }
}


export async function handleSeasonRegistrationRequest(
  request,
  env,
  pathname,
  user
) {
  if (
    request.method === "GET" &&
    pathname === "/season-registrations/available"
  ) {
    return handleAvailableSeasons(env);
  }
  if (
    request.method === "GET" &&
    pathname === "/financial/summary"
  ) {
    return handleFinancialSummary(request, env, user);
  }
  if (
    request.method === "GET" &&
    pathname === "/financial/prizes"
  ) {
    return handleGetFinancialPrizes(request, env, user);
  }
  
  if (
    request.method === "POST" &&
    pathname === "/financial/prizes"
  ) {
    return handleCreatePrize(request, env, user);
  }
  
  const prizeApprovalMatch = pathname.match(
    /^\/financial\/prizes\/([^/]+)\/approve$/
  );
  
  if (
    request.method === "PATCH" &&
    prizeApprovalMatch
  ) {
    return handleApprovePrize(
      request,
      env,
      user,
      prizeApprovalMatch[1]
    );
  }
  
  const prizePaymentMatch = pathname.match(
    /^\/financial\/prizes\/([^/]+)\/pay$/
  );
  
  if (
    request.method === "PATCH" &&
    prizePaymentMatch
  ) {
    return handlePayPrize(
      request,
      env,
      user,
      prizePaymentMatch[1]
    );
  }
  
  if (
    request.method === "POST" &&
    pathname === "/financial/expenses"
  ) {
    return handleCreateExpense(request, env, user);
  }
  
  const expenseApprovalMatch = pathname.match(
    /^\/financial\/expenses\/([^/]+)\/approve$/
  );
  
  if (
    request.method === "PATCH" &&
    expenseApprovalMatch
  ) {
    return handleApproveExpense(
      request,
      env,
      user,
      expenseApprovalMatch[1]
    );
  }
  
  const expensePaymentMatch = pathname.match(
    /^\/financial\/expenses\/([^/]+)\/pay$/
  );
  
  if (
    request.method === "PATCH" &&
    expensePaymentMatch
  ) {
    return handlePayExpense(
      request,
      env,
      user,
      expensePaymentMatch[1]
    );
  }
  if (
    request.method === "GET" &&
    pathname === "/financial/expenses"
  ) {
    return handleGetFinancialExpenses(request, env, user);
  }
  
  if (
    request.method === "GET" &&
    pathname === "/season-registrations/my"
  ) {
    return handleMyRegistrations(env, user);
  }
  if (
    request.method === "POST" &&
    pathname === "/season-registrations/pay"
  ) {
    return handleCreateCheckout(request, env, user);
  }
  if (
    request.method === "GET" &&
    pathname === "/season-registrations/verify"
  ) {
    return handleVerifyPayment(request, env, user);
  }
  if (
    request.method === "GET" &&
    pathname === "/season-registrations/history"
  ) {
    return handlePaymentHistory(request, env, user);
  }
  return null;
}