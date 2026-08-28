export default {
  async fetch(request, env) {
    try {
      const result = await env.DB
        .prepare("SELECT 1 AS connected")
        .first();
      
      return Response.json({
        success: true,
        database: result
      });
    } catch (error) {
      return Response.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
  }
};