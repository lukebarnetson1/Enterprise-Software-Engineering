const { supabaseClient } = require("../../backend/config/database");
const path = require('path');

/**
 * Middleware to attach user information and CSRF token to res.locals for easy access in views. Runs after session and CSRF middleware.
 * @param {express.Application} app
 */
function attachLocals(app) {
  app.use(async (req, res, next) => {
    // 1. Attach CSRF token (available after csrfProtection middleware runs)
    // Ensure req.csrfToken exists before calling it
    res.locals.csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : '';

    // 2. Attach User Information if logged in
    const token = req.cookies.access_token; // Get token from cookie
    res.locals.user = null;

    if (token) {
      try {
        // Verify token with Supabase and get user data
        const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token);

        if (!authError && authUser) {
          // Successfully authenticated with Supabase Auth
          const { data: userProfile, error: profileError } = await supabaseClient
            .from("users")
            .select("username")
            .eq("id", authUser.id)
            .single(); // Expecting one user profile

          // Populate res.locals.user with combined info
          res.locals.user = {
            id: authUser.id,
            email: authUser.email,
            // Provide a fallback if profile fetch fails or username is missing
            username: (profileError || !userProfile || !userProfile.username)
                      ? "Error/Missing Username"
                      : userProfile.username,
          };
        } else if (authError && authError.message !== 'invalid token') {
           // Log auth errors other than expected "invalid token"
           console.warn("Supabase getUser error during locals attachment:", authError.message);
        }
      } catch (err) {
        // Catch unexpected errors during the auth check or profile fetch
        console.error("Error attaching user locals:", err);
      }
    }
    next(); // Proceed to the next middleware
  });
   console.log("User and CSRF token attachment middleware configured.");
}

module.exports = {
  attachLocals,
};