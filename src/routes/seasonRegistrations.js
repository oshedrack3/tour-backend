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
      total_amount:
        Number(tournament.registration_fee) +
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

  const registrationId = existing
    ? (await env.DB.prepare(`
        SELECT id
        FROM season_registrations
        WHERE tournament_id = ?
          AND user_id = ?
        LIMIT 1
      `).bind(tournamentId, user.id).first()).id
    : crypto.randomUUID();

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

  return null;
}

