// services/middlewares/index.js
const path = require('path'); // Needed for view path adjustment
const { configureCoreMiddleware } = require("./core");
const { configureRateLimiter, csrfProtection } = require("./security"); // Import both
const { configureSessionMiddleware } = require("./session");
const { attachLocals } = require("./locals");
const { configureErrorHandlers } = require("./errorHandler"); // Import error handlers

/**
 * Initialises and applies all core middleware to the Express app instance in the right order
 * @param {express.Application} app
 * @param {pg.Pool} pgPool - The Postgres connection pool for session storage
 */
function initialiseMiddleware(app, pgPool) {
  console.log("Initialising middleware sequence...");

  const viewsPath = path.join(__dirname, "../../frontend/views");
  app.set("views", viewsPath);
  app.set("view engine", "ejs");
  console.log(`View engine configured. Views path: ${viewsPath}`);

  // Trust proxy headers (important for rate limiting, secure cookies if behind proxy)
  app.set("trust proxy", 1);

  // 1. Core middleware (static files, body parsing, cookies)
  configureCoreMiddleware(app);

  // 2. Rate Limiting (apply early)
  configureRateLimiter(app);

  // 3. Session and Flash (depends on cookies, needed before CSRF)
  configureSessionMiddleware(app, pgPool);

  // 4. CSRF Protection (depends on session/cookies)
  app.use(csrfProtection);
  console.log("CSRF protection middleware configured.");

  // 5. Attach User and CSRF Token to res.locals (depends on session, cookies, csrf)
  attachLocals(app);

  console.log("Base middleware initialisation complete (excluding routes and error handlers).");
}

// Export the main initialiser and the error handler config function separately
module.exports = {
  initialiseMiddleware,
  configureErrorHandlers, // Export so app.js can call it after routes
};