const cookie = require("cookie");

function getUserFromToken(supabase) {
  return async (req, res, next) => {
    try {
      const { access_token } = cookie.parse(req.headers.cookie || "");
      if (!access_token) {
        req.user = null;
        return next();
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(access_token);
      if (error) {
        req.user = null;
        return next();
      }

      req.user = user;
      next();
    } catch (err) {
      console.error("Auth Middleware Error:", err);
      req.user = null;
      next();
    }
  };
}

module.exports = {
  getUserFromToken,
};
