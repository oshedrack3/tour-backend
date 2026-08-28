export async function authenticate(request, env) {
  const authHeader = request.headers.get("Authorization");
  const token =
    authHeader?.startsWith("Bearer ") ?
    authHeader.slice(7).trim() :
    new URL(request.url).searchParams.get("token");
  
  if (!token) {
    return {
      success: false,
      status: 401,
      message: "Authentication required."
    };
  }
  
  const session = await env.DB
    .prepare(`
      SELECT
        s.token,
        s.user_id,
        s.created_at,
        s.expires_at,
        s.active,
        u.id,
        u.username,
        u.email,
        u.role,
        u.created_at AS user_created_at
      FROM sessions s
      INNER JOIN users u
        ON u.id = s.user_id
      WHERE s.token = ?
      LIMIT 1
    `)
    .bind(token)
    .first();
  
  if (!session) {
    return {
      success: false,
      status: 401,
      message: "Invalid session."
    };
  }
  
  if (!session.active) {
    return {
      success: false,
      status: 401,
      message: "Session inactive."
    };
  }
  
  if (Date.now() > session.expires_at) {
    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE token = ?
      `)
      .bind(token)
      .run();
    
    return {
      success: false,
      status: 401,
      message: "Session expired."
    };
  }
  
  return {
    success: true,
    token,
    user: {
      id: session.id,
      username: session.username,
      email: session.email,
      role: session.role,
      created_at: session.user_created_at
    }
  };
}
