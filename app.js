const express = require("express");
const pg = require("pg");
const { URL } = require("url");

// Initialise middleware
const {
  initialiseMiddleware,
  configureErrorHandlers,
} = require("./services/middlewares"); // Points to root services/middlewares

// Route handlers
const jobRoutes = require("./services/routes/job");
const applicationRoutes = require("./services/routes/application");
const authRoutes = require("./services/routes/auth");
const landingRoutes = require("./services/routes/landing");
const settingsRoutes = require("./services/routes/settings");
const profileRoutes = require("./services/routes/profile");

require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// Database pool for sessions
let pgPool;
try {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }
  const dbUrl = new URL(process.env.DATABASE_URL);
  pgPool = new pg.Pool({
    user: dbUrl.username,
    password: dbUrl.password,
    host: dbUrl.hostname,
    port: dbUrl.port,
    database: dbUrl.pathname.slice(1),
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorised: false }
        : false, // Basic SSL for production DBs like Heroku
  });
  pgPool.on("connect", () =>
    console.log("PostgreSQL Pool connected successfully."),
  );
  pgPool.on("error", (err) => console.error("PostgreSQL Pool Error:", err));
  console.log("PostgreSQL Pool configured for sessions.");
} catch (err) {
  console.error("FATAL: Failed to configure PostgreSQL Pool:", err.message);
  process.exit(1); // Exit if DB pool fails
}

// Initialise core middleware
// This single call sets up view engine, core, security, session, flash, csrf, locals
initialiseMiddleware(app, pgPool);

//  Mount routes
console.log("Mounting application routes...");
app.use("/", landingRoutes);
app.use("/auth", authRoutes);
app.use("/job", jobRoutes);
app.use("/application", applicationRoutes);
app.use("/", settingsRoutes);
app.use("/profile", profileRoutes);
console.log("Application routes mounted.");

configureErrorHandlers(app);

if (require.main === module) {
  (async () => {
    // Start the server
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      // Log accessible URL based on environment for convenience
      const host = process.env.APP_HOST || `localhost:${port}`;
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      console.log(`Access application at: ${protocol}://${host}`);
    });
  })();
}

module.exports = app;
