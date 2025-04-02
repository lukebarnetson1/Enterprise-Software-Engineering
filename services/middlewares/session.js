const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const flash = require("connect-flash");
require("dotenv").config(); // To access SESSION_SECRET

/**
 * Configures session management using Postgres store and flash messages
 * @param {express.Application} app
 * @param {pg.Pool} pgPool
 */
function configureSessionMiddleware(app, pgPool) {
  // Session Configuration using PostgreSQL
  app.use(
    session({
      store: new PgSession({
        pool: pgPool, // Use the provided pool
        tableName: "session",
        createTableIfMissing: false,
      }),
      secret: process.env.SESSION_SECRET || "a_very_weak_default_secret_change_me", // Use env var or strong default
      resave: false, // Don't save session if unmodified
      saveUninitialized: false, // Don't create session until something stored
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day validity
        httpOnly: true, // Prevent client-side JS access
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
        sameSite: "lax", // Good default for CSRF protection
      },
    }),
  );
  console.log("Session middleware configured (using pg-connect-simple).");

  // Flash Messages Middleware (depends on session)
  app.use(flash());
  console.log("Flash message middleware configured.");

  // Custom Middleware to Attach Flash Messages to res.locals
  // Must run after flash()
  app.use((req, res, next) => {
    try {
      res.locals.flashSuccess = req.flash("success");
      res.locals.flashError = req.flash("error");
      res.locals.flashWarning = req.flash("warning"); // Added warning type
      // Get old input flashed data if any (useful for re-populating forms on error)
      res.locals.oldInput = req.flash("oldInput")[0] || {};
    } catch (flashErr) {
      console.error("Error processing flash messages:", flashErr);
      // Ensure locals are always arrays even if flash() fails unexpectedly
      res.locals.flashSuccess = [];
      res.locals.flashError = [];
      res.locals.flashWarning = [];
      res.locals.oldInput = {};
    }
    next(); // Proceed to next middleware
  });
  console.log("Custom flash-to-locals middleware configured.");
}

module.exports = {
  configureSessionMiddleware,
};