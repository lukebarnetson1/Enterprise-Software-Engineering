const express = require("express");
const pg = require("pg");
const { URL } = require("url");
const path = require("path");
const compression = require("compression");
const {
  initialiseMiddleware,
  configureErrorHandlers,
} = require("./services/middlewares");

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

// Compress browser responses
app.use(compression());

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
        ? { rejectUnauthorized: false }
        : false,
  });
  pgPool.on("connect", () =>
    console.log("PostgreSQL Pool connected successfully."),
  );
  pgPool.on("error", (err) => console.error("PostgreSQL Pool Error:", err));
  console.log("PostgreSQL Pool configured for sessions.");
} catch (err) {
  console.error("FATAL: Failed to configure PostgreSQL Pool:", err.message);
  process.exit(1);
}

// Initialise other core middleware (static, body-parser, cookies, session, flash, csrf, locals)
initialiseMiddleware(app, pgPool);

// Mount routes
console.log("Mounting application routes...");
app.use("/", landingRoutes);
app.use("/auth", authRoutes);
app.use("/job", jobRoutes);
app.use("/application", applicationRoutes);
app.use("/", settingsRoutes);
app.use("/profile", profileRoutes);
console.log("Application routes mounted.");

// Configure 404 and global error handlers
configureErrorHandlers(app);

// Server startup
if (require.main === module) {
  (async () => {
    // Check RESET_DB environment variable *before* potentially requiring resetDb
    if (process.env.RESET_DB === "true") {
      console.log(
        "RESET_DB flag is set to true. Initializing database reset...",
      );
      try {
        const resetDb = require("./scripts/resetDb");
        await resetDb(); // Ensure DB reset completes before starting server
        console.log("Database reset complete. Starting server...");
      } catch (resetError) {
        console.error(
          "FATAL: Database reset failed. Server not starting.",
          resetError,
        );
        process.exit(1); // Exit if reset fails
      }
    } else {
      console.log("RESET_DB flag not set or false. Skipping database reset.");
    }

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
