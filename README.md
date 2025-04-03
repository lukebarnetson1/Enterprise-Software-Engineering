# Job Matchmaker - Enterprise Software Engineering

## Introduction

Welcome to [Job Matchmaker](https://job-matchmaker-cb2021e052f9.herokuapp.com)! My platform is designed to connect job seekers with employers. Users can register, manage their profiles and skills, post job opportunities, apply for jobs, and manage the application process. Since I developed this project for the Enterprise Software Engineering module, it focuses on aspects like performance, scalability, robustness, and security suitable for an enterprise context.

## Table of Contents

- [Introduction](#introduction)
- [Solution Overview](#solution-overview)
- [Project Aim & Objectives](#project-aim--objectives)
- [Technologies Used](#technologies-used)
- [Enterprise Considerations](#enterprise-considerations)
  - [Performance](#performance)
  - [Scalability](#scalability)
  - [Robustness](#robustness)
  - [Security](#security)
  - [Deployment](#deployment)
- [Installation & Usage Instructions](#installation--usage-instructions)
  - [Prerequisites](#prerequisites)
  - [Setup Steps](#setup-steps)
  - [Running the Application](#running-the-application)
- [Feature Overview](#feature-overview)
  - [User Authentication & Account Management](#1-user-authentication--account-management)
  - [Job Posting & Management](#2-job-posting--management)
  - [Job Application Process](#3-job-application-process)
  - [Application Status Management & Offers](#4-application-status-management--offers)
  - [Skills Management & Matching](#5-skills-management--matching)
  - [Email Notifications](#6-email-notifications)
  - [User Interface Features](#7-user-interface-features)
- [Known Issues & Future Enhancements](#known-issues--future-enhancements)
  - [Issues](#issues)
  - [Future Enhancements](#future-enhancements)
- [Conclusion](#conclusion)

## Solution Overview

Job Matchmaker is a full-stack web application built using Node.js and Express.js for the backend, EJS for server-side templating, and Supabase (a Backend-as-a-Service platform leveraging PostgreSQL) for database persistence and user authentication. It features a comprehensive set of functionalities for both job applicants and employers, including skill management and matching, application tracking, and email notifications.

## Project Aim & Objectives

**Aim:** To develop a robust, scalable, and secure web application that effectively facilitates the job matching process between applicants and employers.

**Key Objectives:**

### 1. Implement Secure Authentication & Authorisation

I must implement RBAC by only letting registered and verified users can access protected features like creating jobs, applying, or managing applications, while differentiating between actions permissible by job creators versus applicants. This leverages both Supabase's built-in authentication mechanisms and my middleware checks.

### 2. Develop a Scalable Data Model and Backend Logic

To keep the platform scalable and maintainable, I must structure the database schema and backend services (using Supabase and Node.js models/routes) in a way that supports efficient data retrieval and manipulation, anticipates future growth in users and job postings, and maintains clear separation of concerns.

### 3. Facilitate Application Submission & Tracking

To keep the platform robust, I must build resilience against errors through comprehensive input validation, sanitisation, structured error handling, and reliable external service integration (such as email notifications via Nodemailer), ensuring the application performs predictably even under unexpected conditions.

### 4. Prioritise Security Throughout the Application Lifecycle

To keep the application secure against different types of threats, my application must have multiple layers of security, including protection against common web vulnerabilities (CSRF, XSS), secure handling of credentials and session management, rate limiting to prevent abuse, and secure configuration management using environment variables.

### 5. Facilitate a Smooth UX

To give users the best experience possible, I must provide clear workflows for core tasks (job searching, applying, managing skills, tracking applications), enhance usability with features like skill matching indicators and dark mode, and ensure reliable feedback through flash messages and email notifications.

## Technologies Used

- **Frontend:**
  - EJS (Embedded JavaScript Templates)
  - HTML
  - CSS
  - Bootstrap
  - Client-side JavaScript (ES6+)
- **Backend:**
  - Node.js
  - Express.js
- **Database & Auth:**
  - Supabase (PostgreSQL, Auth, Storage)
- **Middleware/Libraries:**
  - `express-session` & `connect-pg-simple` (Session Management)
  - `csurf` (CSRF Protection)
  - `express-validator` (Input Validation)
  - `sanitize-html` (Input Sanitisation / XSS Prevention)
  - `zxcvbn` (Password Strength Estimation)
  - `jsonwebtoken` (Custom Token Generation)
  - `nodemailer` (Email Notifications)
  - `express-rate-limit` (Rate Limiting)
  - `dotenv` (Environment Variables)
  - `compression` (Response Compression)
- **Deployment:** Heroku (PaaS), GitHub Actions (CI/CD)
- **Development:** Nodemon, Faker.js (Seeding)

## Enterprise Considerations

### Performance

#### Optimal Database Interactions

Queries to Supabase are structured within model functions (`backend/models/*.js`). Many queries use `select('*')`, specific lookups use `.eq()`, `.maybeSingle()`, and `.in()` for efficiency. Supabase handles indexing for primary and foreign keys. Pagination is implemented on the main job board (`services/routes/job/list.js`) using `.range()` to limit data transfer.

#### Asynchronous Operations

My application extensively uses Node.js's non-blocking I/O model, facilitated by async/await syntax. This ensures that potentially long-running operations, such as database queries or sending emails, do not block the main execution thread, allowing the server to remain responsive to other incoming requests. Almost all interactions involving external resources or databases follow this pattern:

```js
// backend/models/job.js - Example of async database operation
async function createJob(jobData) {
  // ... data preparation ...
  const { data, error } = await supabase // 'await' pauses this function, not the whole server
    .from("jobs")
    .insert([
      {
        /* ... job fields ... */
      },
    ])
    .select()
    .single();
  if (error) {
    console.error("Error creating job in DB:", error);
    throw error;
  }
  return data;
}

// backend/services/mailerService.js - Example of async email operation
async function sendNotification(to, subject, html) {
  // ... parameter validation ...
  try {
    await transporter.sendMail({
      /* ... mail options ... */
    }); // 'await' here allows other code to run
    console.log(`Notification email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Error sending notification email to ${to}:`, error);
  }
}
```

#### Rate Limiting

To protect the server from brute-force attacks (e.g., repeated login attempts) and general API abuse, I implemented rate limiting using the `express-rate-limit` middleware. This is applied early in the middleware chain to affect all incoming requests.

```js
// services/middlewares/security.js - Rate limiter configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes time window
  max: 150, // Limit each IP to 150 requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// services/middlewares/index.js - Applying the limiter
function initialiseMiddleware(app, pgPool) {
  // ... other middleware
  configureRateLimiter(app); // Applies the limiter instance
  // ... rest of middleware
}
```

This configuration limits each IP address to 150 requests per 15-minute window, helping to preserve server resources and maintain availability.

#### Static Asset Serving

I ensured static assets like CSS stylesheets, client-side JavaScript files, and images like my logo are served efficiently using Express's built-in `express.static` middleware. This bypasses unnecessary application logic for these files, allowing the underlying Node.js mechanisms to deliver them quickly.

```js
// services/middlewares/core.js - Configuring static file serving
const express = require("express");
const path = require("path");

function configureCoreMiddleware(app) {
  const staticPath = path.join(__dirname, "../../frontend/public");
  app.use(express.static(staticPath)); // Directs Express to serve files from the 'public' directory
  console.log(`Serving static files from: ${staticPath}`);
  // ... other core middleware
}
```

#### Response Compression

To reduce the bandwidth required and improve load times for users, I compressed HTTP responses using the `compression` middleware. This middleware automatically applies to responses where appropriate (typically text-based assets like HTML, CSS, JS).

```js
// app.js - Applying compression middleware globally
const compression = require("compression");
// ... other requires ...
const app = express();
// ...
app.use(compression()); // Compresses eligible responses before sending
// ... middleware, routes ...
```

### Scalability

I designed Job Matchmaker with scalability in mind, mostly by leveraging external services and stateless logic.

#### Backend-as-a-Service (BaaS)

By using Supabase for the database and authentication, I made my application offload the significant operational burden of managing, securing, and scaling these fundamental components. Supabase is designed for scalability, allowing the database and authentication layers to handle increased load independently of the application server.

```js
// backend/config/database.js - Centralised Supabase client creation
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseClient = createClient(
  // Connection configured via environment variables
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// services/routes/auth/login.js - Example: Using Supabase for authentication
const { data, error } = await supabaseClient.auth.signInWithPassword({
  email: identifier,
  password,
});
```

#### Stateless Application Logic

My application route handlers and middleware are designed to be stateless wherever feasible. This means they do not store user-specific data in the memory of the server instance between requests. User state (the user's session) is managed externally using `express-session` configured with `connect-pg-simple`, which stores session data in the Postgres database managed by Supabase.

```js
// services/middlewares/session.js - Session configuration using Postgres store
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);

function configureSessionMiddleware(app, pgPool) {
  app.use(
    session({
      store: new PgSession({
        // Using connect-pg-simple
        pool: pgPool, // PostgreSQL connection pool
        tableName: "session", // Database table for sessions
        // ... other options
      }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        /* ... cookie settings ... */
      },
    }),
  );
  // ... flash middleware ...
}
```

Storing session data externally is vital for horizontal scalability.

#### Horizontal Scaling Potential

Due to the stateless nature of the application logic and the external storage of session data (in PostgreSQL via connect-pg-simple), my app's architecture is ready for horizontal scaling. Multiple instances of the Node.js application can be run behind a load balancer. Since no user state is held in a specific server's memory, any instance can handle any user's request, allowing the system to handle increased traffic by simply adding more instances.

```js
// services/middlewares/session.js - Key enabler for horizontal scaling
app.use(
  session({
    store: new PgSession({
      // Stores session data in the shared database
      pool: pgPool,
      // ...
    }),
    // ... other config
  }),
);
```

#### Modular Architecture

I have separated my codebase into distinct modules (models, routes, services, middleware, config), promoting maintainability.

```
/backend
  /config       # Database, mailer connections
  /models       # Database interaction logic (Job, User, Application)
/frontend
  /public       # Static assets (CSS, JS, images)
  /views        # EJS templates
/scripts        # Database reset/seed scripts
/services
  /middlewares  # Request processing middleware (auth, validation, errors)
  /routes       # Application route handlers (grouped by feature)
app.js          # Main application entry point
```

This separation of concerns enhances maintainability and testability and facilitates future development.

### Robustness

I also have measures in place to make sure the application handles errors gracefully and maintains data integrity.

#### Centralised Error Handling

I made a dedicated error handling middleware (`services/middlewares/errorHandler.js`) configured to run after all route handlers. It acts as a catch-all for unhandled errors originating from synchronous code or errors passed via `next(err)` in asynchronous code. It logs the error details for debugging and presents a user-friendly error page.

```js
// services/middlewares/errorHandler.js - Global error handler signature
app.use((err, req, res, next) => { // Note the 4 arguments
  console.error(/* ... Logging details ... */);

  // Handle specific error types like CSRF token errors
  if (err.code === 'EBADCSRFTOKEN') {
    req.flash('error', 'Your form session has expired or is invalid...');
    return res.redirect(req.header('Referer') || '/');
  }

  const statusCode = err.status || 500;
  res.status(statusCode);

  // Render a generic error page
  res.render("error", {
    title: `Error ${statusCode}`,
    message: /* User-friendly message */,
    error: process.env.NODE_ENV !== "production" ? err : {}, // Show details only in dev
    // ... other necessary locals ...
  });
});

// services/middlewares/errorHandler.js - 404 handler (placed before global handler)
app.use((req, res, next) => {
  res.status(404);
  res.render("404", { title: "Page Not Found", /* ... locals ... */ });
});

// app.js - Applying the error handlers after routes
// ... routes ...
configureErrorHandlers(app);
```

#### Errors Gracefully Handled

Where appropriate, I have wrapped operations in `try...catch` blocks to prevent failures from disrupting the main functionality. For example, on the job detail page, fetching the user's application status or skill match data is secondary to displaying the job itself. If these fetches fail, an error is logged, a warning may be shown to the user via a flash message, but the page still renders.

```js
// services/routes/job/detail.js - Handling potential errors in secondary data fetching
// ... fetch main job data ...
if (currentUserId) {
  try {
    // Attempt to fetch user's application and skills
    const [appResult, skillsResult] = await Promise.all([
      /* ... fetches ... */
    ]);
    userApplication = appResult;
    userSkills = skillsResult || [];
    // ... calculate skill matches ...
  } catch (userDataError) {
    console.error(`Error fetching user data for job ${jobId}:`, userDataError);
    req.flash(
      "warning",
      "Could not load your application status or skill matches.",
    );
    // Execution continues, page will render without this optional data
  }
}
// ... render job/job view ...
```

This approach enhances the user experience by keeping core features functional even if other parts encounter issues.

#### Input Validation & Sanitisation

I strictly enforced server-side validation and sanitisation using `express-validator` and `sanitize-html` before processing user input for actions like creating/editing jobs, signing up, or submitting applications. Validation checks data formats, lengths, and rules, while sanitisation removes potentially harmful HTML/script content created by attackers.

```js
// services/middlewares/validation.js - Example validation rules for job creation
const { body, validationResult } = require("express-validator");
const sanitiseHtml = require("sanitize-html");

const sanitiseInput = (input) =>
  sanitiseHtml(input, {
    /* ... config ... */
  });

const validateJob = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 100 })
    .withMessage("Title too long")
    .customSanitizer(sanitiseInput), // Apply sanitisation
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description required")
    .customSanitizer(sanitiseInput),
  // ... other fields (salary, dates, etc.)
];

// services/middlewares/validation.js - Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errors.array().forEach((err) => req.flash("error", err.msg));
    req.flash("oldInput", req.body); // Flash input back to re-populate form
    return res.redirect(backURL); // Redirect back to the form
  }
  next(); // Proceed if no errors
};

// services/routes/job/create.js - Applying validation and error handling
router.post(
  "/create",
  isAuthenticated,
  validateJob, // Run validation rules
  processSkillsInput, // Custom middleware to process skills
  handleValidationErrors, // Check results and handle errors (redirects if invalid)
  async (req, res, next) => {
    // This code only runs if handleValidationErrors calls next()
    // ... Job creation logic ...
  },
);
```

This middleware chain ensures that data is validated and sanitised before reaching the core application logic, preventing invalid or malicious data from being processed or stored. `handleValidationErrors` redirects the user back to the form with flashed error messages and their previous input if validation fails.

#### Database Constraints

Data integrity is further enforced at the database level by Supabase (PostgreSQL). Constraints such as `NOT NULL` on essential columns (e.g., `jobs.title`, `users.email`) and foreign key constraints (e.g., `applications.job_id` referencing `jobs.id`, `applications.applicant_id` referencing `users.id`) prevent orphaned records and ensure relationships between tables are maintained correctly. While not explicitly shown in my code, these database-level rules provide a fundamental layer of data consistency. For example, attempting to insert an application with a non-existent `job_id` would be rejected by the database.

#### Database Seeding & Reset

To ensure consistent development and testing environments, I made scripts for resetting and seeding the database. `scripts/resetDb.js` clears existing data from tables (users, jobs, applications, etc.) and associated Supabase Auth users. `scripts/seedDb.js` then populates the database with mock data using the Faker library.

```js
// scripts/resetDb.js - Snippet showing table clearing
async function resetDb() {
  try {
    console.log("Resetting database...");
    // ...
    console.log("Clearing applications table...");
    await supabaseClient.from("applications").delete().neq(/* ... */); // Delete all rows
    console.log("Clearing jobs table...");
    await supabaseClient.from("jobs").delete().neq(/* ... */);
    console.log("Clearing users table...");
    await supabaseClient.from("users").delete().neq(/* ... */);
    // ... delete Supabase Auth users ...
    await seedDatabase(); // Call the seeder script
    // ...
  } catch (error) {
    /* ... */
  }
}

// scripts/seedDb.js - Snippet showing user creation
async function seedDatabase() {
  // ... setup ...
  console.log(`Creating ${NUM_USERS} mock users...`);
  for (let i = 0; i < NUM_USERS; i++) {
    // ... generate fake user data ...
    userPromises.push(
      supabaseClient.auth.admin
        .createUser({
          /* ... auth details ... */
        })
        .then(async ({ data: authData, error: authError }) => {
          // ... handle auth error ...
          await supabaseClient.from("users").insert({
            /* ... profile details ... */
          });
          // ... handle profile error ...
        }),
    );
  }
  await Promise.all(userPromises);
  // ... create jobs, skills, applications ...
}
```

#### Helper functions

I encapsulated repetitive logic in helper functions. A key example is `checkAndCloseExpiredJobs` (`services/routes/job/helpers.js`), which is run periodically (e.g., before listing jobs) to automatically update the status of jobs whose application deadline has passed.

```js
// services/routes/job/helpers.js - Function to close expired jobs
async function checkAndCloseExpiredJobs() {
  try {
    // 1. Fetch open jobs with their deadlines
    const { data: openJobs, error } = await Job.supabaseClient
      .from("jobs")
      .select("id, application_deadline")
      .eq("status", "open");
    // ... error handling ...

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const jobsToCloseIds = [];

    // 2. Compare deadline with today's date
    for (const job of openJobs) {
      if (job.application_deadline) {
        const deadline = parseISO(job.application_deadline);
        if (isValid(deadline)) {
          deadline.setHours(0, 0, 0, 0);
          if (deadline < today) {
            // If deadline is in the past
            jobsToCloseIds.push(job.id);
          }
        }
        // ... handle invalid date format ...
      }
    }

    // 3. Update status for expired jobs
    if (jobsToCloseIds.length > 0) {
      await Job.supabaseClient
        .from("jobs")
        .update({ status: "closed", updated_at: new Date() })
        .in("id", jobsToCloseIds);
      console.log(`Successfully auto-closed ${jobsToCloseIds.length} jobs.`);
    }
  } catch (err) {
    /* ... error handling ... */
  }
}

// services/routes/job/list.js - Calling the helper
router.get("/", isAuthenticated, async (req, res, next) => {
  try {
    await checkAndCloseExpiredJobs(); // Run the check before listing
    // ... rest of job listing logic ...
  } catch (err) {
    /* ... */
  }
});
```

This automated task maintains data accuracy by ensuring job statuses reflect their real-world availability based on deadlines.

### Security

As stated in my key objectives, security was one of my most important key objectives. I not only implemented user authentication and authorisation, which is necessary for the platform to function correctly, but also implemented additional "nice to haves" to defend against common web vulnerabilities.

#### Authentication

User authentication is handled via Supabase Auth, verifying credentials and issuing JWTs managed via secure cookies. My `isAuthenticated` middleware (`services/middlewares/accountAuth.js`) protects routes requiring login by checking for a valid token and fetching user details.

```js
// services/middlewares/accountAuth.js - Middleware to check authentication
module.exports = {
  isAuthenticated: async (req, res, next) => {
    const token = req.cookies.access_token; // Check for token in cookies

    if (!token) {
      req.flash("error", "You must be logged in...");
      return res.redirect("/auth/login");
    }

    try {
      // Verify token with Supabase
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (error || !data.user) {
        req.flash("error", "Session expired...");
        return res.redirect("/auth/login");
      }
      req.user = data.user; // Attach user data to the request
      next(); // Proceed if authenticated
    } catch (err) {
      // ... error handling ...
      return res.redirect("/auth/login");
    }
  },
};

// services/routes/job/create.js - Example of protecting a route
router.get("/create", isAuthenticated, async (req, res, next) => {
  /* ... */
});
router.post("/create", isAuthenticated /* ... */);
```

#### Authorisation

Authorisation (ensuring users can only access or modify their own resources) is implemented within specific route handlers by comparing the resource owner's ID (e.g., `job.user_id`) with the logged-in user's ID (`req.user.id`).

```js
// services/routes/job/edit.js - Authorisation check before allowing edit
router.get("/edit/:id", isAuthenticated, async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const currentUserId = req.user.id;
    const [job /* ... */] = await Promise.all([
      /* ... fetches ... */
    ]);

    if (!job) {
      /* ... job not found ... */
    }

    // **Authorisation Check:**
    if (job.user_id !== currentUserId) {
      req.flash("error", "You are not authorized to edit this job.");
      return res.redirect("/job"); // Or redirect to job detail page
    }
    // ... render edit form ...
  } catch (err) {
    /* ... */
  }
});
```

This prevents users from editing or deleting jobs or applications that do not belong to them.

#### CSRF Protection

Cross-Site Request Forgery (CSRF) attacks are mitigated using the `csurf` middleware. It generates a unique, secret token for each user session, which must be included in any state-changing request (typically POST requests from forms). The middleware verifies this token upon submission.

```js
// services/middlewares/security.js - CSRF middleware configuration
const csrf = require("csurf");
const csrfProtection = csrf({ cookie: false }); // Configured to use session storage, not a separate cookie

// services/middlewares/index.js - Applying CSRF protection globally
function initialiseMiddleware(app, pgPool) {
  // ... core, rate limiting, session ...
  app.use(csrfProtection); // Apply CSRF after session middleware
  // ... locals ...
}

// frontend/views/partials/header.ejs - Adding CSRF token to locals for views
// (Simplified from services/middlewares/locals.js)
app.use(async (req, res, next) => {
  res.locals.csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : '';
  // ... attach user ...
  next();
});

// frontend/views/job/create.ejs - Including the token in a form
<form id="job-form" method="POST" action="/job/create">
  <input type="hidden" name="_csrf" value="<%= csrfToken %>" />
  <!-- ... other form fields ... -->
  <button class="btn btn-primary" type="submit">Create Job</button>
</form>
```

If a POST request is received without a valid CSRF token matching the user's session, the request is rejected, preventing attackers from forcing logged-in users to perform actions unintentionally. The error handler specifically catches `EBADCSRFTOKEN` errors.

#### Input Sanitisation & XSS Prevention

To prevent Cross-Site Scripting (XSS) attacks, where attackers inject malicious scripts into content viewed by other users, I sanitised user-provided input on the server-side using `sanitize-html` within the validation middleware. This removes any dangerous HTML tags or attributes before the data is processed or stored.

```js
// services/middlewares/validation.js - Sanitisation helper and usage
const sanitiseHtml = require("sanitize-html");

const sanitiseInput = (input) => {
  return sanitiseHtml(input, {
    allowedTags: [], // No HTML tags allowed in most inputs
    allowedAttributes: {},
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
  });
};

const validateJob = [
  body("title")
    .trim()
    .notEmpty()
    // ... other validations ...
    .customSanitizer(sanitiseInput), // Apply sanitisation
  body("description").trim().notEmpty().customSanitizer(sanitiseInput), // Sanitise description
  // ... etc ...
];
```

Additionally, the EJS templating engine provides output escaping by default (<%= ... %>). This automatically converts special HTML characters (like <, >, &) into their entity equivalents when rendering data in views, preventing any potentially overlooked malicious code from being executed in the browser. Unescaped output (<%- ... %>) is used sparingly and only for trusted content or pre-sanitised HTML like flash messages.

#### Password Security

Password strength is enforced during user sign-up and password reset using the `zxcvbn` library. This library estimates the strength of a given password, and the validation middleware rejects passwords deemed too weak (score < 2).

```js
// services/middlewares/validation.js - Server-side password strength validation
const zxcvbn = require("zxcvbn");

const validatePasswordStrength = (password) => {
  const result = zxcvbn(password);
  if (result.score < 2) {
    // Enforce minimum strength score
    throw new Error("Password is too weak. Please choose a stronger password.");
  }
  return true;
};

const validateSignUp = [
  // ... email, username validation ...
  body("password").custom(validatePasswordStrength), // Apply custom validator
];
```

Client-side JavaScript (`frontend/public/js/password-strength.js`) provides immediate visual feedback to the user about their password strength as they type, improving the user experience and encouraging stronger choices.

```js
// frontend/public/js/password-strength.js - Client-side feedback
passwordInput.addEventListener("input", function () {
  const password = passwordInput.value;
  if (typeof zxcvbn === "undefined") {
    /* ... error handling ... */ return;
  }
  const result = zxcvbn(password);
  const strength = result.score; // 0-4

  // Update strength bar and text visually
  strengthBarFill.style.width = `${(strength + 1) * 20}%`;
  strengthBarFill.style.backgroundColor = colors[strength];
  strengthText.textContent = `Password Strength: ${strengthLabels[strength]}`;

  // Set custom validity message for form submission blocking if weak
  if (password.length > 0 && strength < 2) {
    passwordInput.setCustomValidity("Password is too weak...");
  } else {
    passwordInput.setCustomValidity(""); // Clear message if strong enough
  }
});
```

#### Rate Limiting

Like I mentioned under Performance, express-rate-limit also serves an important security function by mitigating brute-force login attempts and preventing general API abuse or DDoS attempts aimed at overwhelming server resources.

```js
// services/middlewares/security.js - Rate limiter configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Limit each IP
  // ... other options ...
});
// Applied globally in services/middlewares/index.js
```

#### Secure Session Management

Sessions are managed using express-session, with session data stored securely in the PostgreSQL database via connect-pg-simple. Session cookies are configured with security best practices:

- `httpOnly: true`: Prevents client-side JavaScript from accessing the session cookie, mitigating XSS attacks targeting session theft.

- `secure: process.env.NODE_ENV === 'production'`: Ensures the cookie is only sent over HTTPS connections in production environments.

- `sameSite: 'Lax'`: Provides a good balance of usability and CSRF protection by preventing the cookie from being sent on most cross-site requests.

```js
// services/middlewares/session.js - Session cookie configuration
app.use(
  session({
    store: new PgSession({ pool: pgPool /* ... */ }),
    secret: process.env.SESSION_SECRET, // Secret used to sign the session ID cookie
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // e.g., 1 day
      httpOnly: true, // Crucial for security
      secure: process.env.NODE_ENV === "production", // Use secure cookies only in production
      sameSite: "Lax", // Recommended setting
    },
  }),
);
```

#### Email Verification

New users must verify their email address before they can log in. This is enforced during the login process and managed via flags in the `users` table.

```js
// services/routes/auth/signup.js - Sending verification email after signup
// ... create user in Auth and profile table ...
if (!insertError) {
  await sendVerificationEmail({ email, username }, req); // Send email with token
  req.flash("success", "Signup successful! Check your email to verify...");
  res.redirect("/auth/login");
}

// services/routes/auth/verify.js - Handling the verification link click
router.get("/verify", async (req, res) => {
  try {
    const { token } = req.query;
    // ... verify JWT token ...
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // ... find user by decoded email ...
    if (!user.is_verified) {
      // Update verification status in both profile table and Auth metadata
      await supabaseClient
        .from("users")
        .update({ is_verified: true })
        .eq("id", user.id);
      await supabaseClient.auth.admin.updateUserById(user.id, {
        /* ... set verified flag ... */
      });
      req.flash("success", "Your email has been verified!");
    }
    res.redirect("/auth/login");
  } catch (err) {
    /* ... error handling ... */
  }
});

// services/routes/auth/login.js - Checking verification status during login
// ... sign in with password ...
if (!profileData.is_verified) {
  // Check the flag from the 'users' table
  req.flash("error", "Please verify your email before logging in.");
  await supabaseClient.auth.signOut(); // Log them out immediately
  return res.redirect("/auth/login");
}
// ... proceed with login (setting cookies) ...
```

This helps confirm the user's identity and prevents the use of fake or mistyped email addresses.

#### Secure Tokens

While Supabase handles the primary authentication JWTs, I made my app generate its own short-lived, single-purpose JWTs for actions initiated via email links (email verification, password reset, email/username change confirmations, etc). These tokens contain specific claims (like `userId` and `actio`n) and have a short expiry (1 hour) to limit their usability if intercepted.

```js
// services/routes/auth/helpers.js - Token generation function
const jwt = require("jsonwebtoken");
require("dotenv").config();

function generateToken(payload, expiresIn = "1h") {
  // Signs the payload with a secret key and sets an expiry time
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

// services/routes/auth/password.js - Generating a password reset token
const tokenPayload = { userId: user.id, action: "password_reset" };
const token = generateToken(tokenPayload, "1h"); // Token valid for 1 hour
// ... send email with link containing this token ...

// services/routes/auth/password.js - Verifying the token on GET /reset
const decoded = jwt.verify(token, process.env.JWT_SECRET);
if (!decoded.userId || decoded.action !== "password_reset") {
  // Check payload
  throw new Error("Invalid token payload.");
}
```

Using JWTs with specific claims and short expiries for these sensitive actions enhances security compared to using easily guessable or long-lived tokens.

#### Environment Variables

Sensitive configuration details, including database credentials, API keys (Supabase service role key, anonymous key), session secrets, and email service passwords, are stored securely in the `.env` file. This file is explicitly listed in `.gitignore` to prevent accidental commitment to version control. The application loads these variables at runtime using the `dotenv` package. I will show an example of the .env file in the installation instructions further down.

### Deployment

Job Matchmaker has been successfully deployed to Heroku, a Platform-as-a-Service (PaaS), which I chose for its seamless integration with Node.js applications and Git-based deployment workflow. My deployment strategy incorporates several best practices.

#### Secure Environment Configuration

All sensitive credentials (Supabase API keys, Supabase JWT secret, application JWT secret, session secret, email credentials) and environment-specific settings (`NODE_ENV=production`, `APP_HOST`) are strictly managed using Heroku Config Vars. This adheres to the best practice of separating configuration from code and prevents any secrets from being committed to the Git repository.

My `.env` file is used only for convenient local development. This file is explicitly listed in .gitignore to ensure it's never tracked by version control. I have included a `.env.example` file in the repository to provide a clear template of required environment variables for developers setting up the project locally, without exposing any sensitive production values.

#### Defined Application Execution

A `Procfile` explicitly tells Heroku how to start the web process using the standard `node app.js` command, ensuring predictable application startup.

The engines field in package.json specifies the required Node.js runtime version (in my case 20.19.0), ensuring consistency between development and production environments.

#### Infrastructure Management

Session data is stored externally in a PostgreSQL database managed by the Heroku Postgres add-on (essential-0 tier). The required `DATABASE_URL` is automatically provisioned and managed by Heroku, which is an example of abstraction.

Production dependencies are installed via `npm ci` based on the committed `package-lock.json`, which guarantees consistent dependency versions between environments and faster, more reliable builds on Heroku. `devDependencies` are correctly pruned during the build process.

#### Automated CI/CD Pipeline

I also have a CI/CD pipeline defined in `.github/workflows/ci-cd.yml`.

On pushes and PRs to the main branch, the workflow automatically installs dependencies and runs linting (`npx eslint .`). If this succeeds, the workflow automatically deploys the latest code to Heroku. The deployment step authenticates with Heroku securely using the `HEROKU_API_KEY`, which is stored as an encrypted GitHub Actions Secret, rather than exposing credentials in the codebase or logs.

#### Performance Optimisations in Deployment

My deployed application also includes two performance-enhancing middlewares:

- `compression` reduces response sizes.

- `express.static` along with `maxAge` enable browser caching for static assets (such as JS, CSS, my logo image).

#### Live Application URL

The application is live and accessible at: https://job-matchmaker-cb2021e052f9.herokuapp.com/

## Installation & Usage Instructions

This section will guide you through setting up the Job Matchmaker application for local development.

### Prerequisites

- **Node.js:** Version 20.x or later is recommended (see `package.json` `engines` field). You can check your version using `node -v`.
- **npm:** Node Package Manager, which is typically included with Node.js. Check with `npm -v`.
- **Git:** Required for cloning the project repository.
- **Supabase Account & Project:** A free Supabase project is needed to provide the database and authentication services. You can sign up at [supabase.com](https://supabase.com/).

### Setup Steps

1.  **Clone the Repository:**
    Open your terminal or command prompt, navigate to where you want to store the project, and run:

    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

    _(Replace `<your-repository-url>` with the actual URL of the Git repository and `<repository-directory>` with the folder name created by cloning)_

2.  **Install Dependencies:**
    Install the required Node.js packages listed in `package.json`:

    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**

    **a.** Create a new file named `.env` in the root directory of the cloned project.

    **b.** Copy the following structure into your `.env` file and **replace the placeholder values** with your actual credentials and generated secrets:

    ````dotenv
        # Server & Node Env
        PORT=3000
        NODE_ENV=development # Use 'production' for deployed environments

        # Security Secrets (Generate strong random secrets for these)
        # Example generation command: node -e "console.log(require('crypto').randomBytes(64).toString('base64'));"
        JWT_SECRET=YOUR_STRONG_RANDOM_JWT_SECRET_HERE
        SESSION_SECRET=YOUR_STRONG_RANDOM_SESSION_SECRET_HERE

        # Email Service (Optional, for notifications)
        # If using Gmail, create an "App Password": https://support.google.com/accounts/answer/185833
        EMAIL_HOST=smtp.gmail.com # Or your email provider's SMTP host
        EMAIL_PORT=587 # 587 for TLS, 465 for SSL
        EMAIL_SECURE=false # Use true for port 465, false for 587 (STARTTLS)
        EMAIL_USER=your-email@example.com
        EMAIL_PASS=your-email-app-password-or-provider-password

        # Supabase Configuration (Get these from your Supabase project: Settings -> API)
        DATABASE_URL=YOUR_SUPABASE_POSTGRES_CONNECTION_URI # Found under Database -> Connection string -> URI
        SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL # e.g., https://your-project-ref.supabase.co
        SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY # Keep this secret!
        SUPABASE_JWT_SECRET=YOUR_SUPABASE_JWT_SECRET # Found under Auth -> Settings -> JWT Secret

        # Application URL (Essential for links in emails)
        APP_HOST=localhost:3000 # Change if running on a different port or use your deployed app URL

        # Database Reset Flag (Use with caution!)
        RESET_DB=false # Set to true ONLY for the first run if you want to clear tables and seed data
        ```
    **c.**  **Security:** Ensure the `.env` file is listed in your `.gitignore` (it is in the provided code) and never commit it to version control.

    ````

4.  **Set up Supabase Database Tables:**

    **a.** Go to your Supabase project dashboard.

    **b.** Navigate to the **SQL Editor** section.

    **c.** Click on "+ New query".

    **d.** Paste the following SQL commands into the editor and click **RUN**. This will create the necessary tables and relationships.

        ```sql

        -- Create the skills table first as others depend on it
        CREATE TABLE skills (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL UNIQUE,
            category TEXT,
            created_at timestamptz DEFAULT now() NOT NULL
        );

        -- Create the users table (references Supabase Auth users via ID)
        CREATE TABLE users (
            id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            is_verified BOOLEAN DEFAULT false NOT NULL,
            created_at timestamptz DEFAULT now() NOT NULL,
            notify_own_status_change BOOLEAN DEFAULT true NOT NULL,
            notify_new_applicant_for_my_job BOOLEAN DEFAULT true NOT NULL
            -- password column removed as Supabase Auth handles it
        );

        -- Create the jobs table
        CREATE TABLE jobs (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            author TEXT NOT NULL, -- Stores the username of the creator
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at timestamptz DEFAULT now() NOT NULL,
            updated_at timestamptz DEFAULT now() NOT NULL,
            company_name TEXT NOT NULL,
            application_deadline DATE NOT NULL,
            start_date DATE NOT NULL,
            salary_amount NUMERIC NOT NULL,
            -- salary_type TEXT, -- Removed based on schema image and usage
            weekly_hours NUMERIC NOT NULL CHECK (weekly_hours >= 1 AND weekly_hours <= 48),
            working_location TEXT NOT NULL CHECK (working_location IN ('in_person', 'remote', 'hybrid')),
            in_person_location TEXT,
            working_hours_details JSONB, -- Store selected time slots
            status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'closed')),
            CONSTRAINT start_after_deadline CHECK (start_date > application_deadline)
        );

        -- Create the applications table
        CREATE TABLE applications (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
            applicant_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'hired', 'accepted', 'rejected', 'offer_declined')),
            created_at timestamptz DEFAULT now() NOT NULL,
            updated_at timestamptz DEFAULT now() NOT NULL,
            CONSTRAINT unique_application_per_user_job UNIQUE (job_id, applicant_id)
        );

        -- Create the user_skills junction table
        CREATE TABLE user_skills (
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
            years_experience NUMERIC NOT NULL CHECK (years_experience >= 0.5), -- Use numeric for 0.5, 1, 2... 11 (10+)
            created_at timestamptz DEFAULT now() NOT NULL,
            updated_at timestamptz DEFAULT now() NOT NULL,
            PRIMARY KEY (user_id, skill_id)
        );

        -- Create the job_skills junction table
        CREATE TABLE job_skills (
            job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
            skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
            min_years_experience NUMERIC NOT NULL CHECK (min_years_experience >= 0.5),
            created_at timestamptz DEFAULT now() NOT NULL,
            updated_at timestamptz DEFAULT now() NOT NULL,
            PRIMARY KEY (job_id, skill_id)
        );

        -- Create the session table required by connect-pg-simple
        -- From: https://github.com/voxpelli/node-connect-pg-simple/blob/master/table.sql
        CREATE TABLE "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL
        )
        WITH (OIDS=FALSE);

        ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

        CREATE INDEX "IDX_session_expire" ON "session" ("expire");

        -- Optional: Add triggers to automatically update 'updated_at' columns
        -- (Supabase might offer simpler ways via GUI or extensions)
        -- Example for 'jobs' table:
        CREATE OR REPLACE FUNCTION trigger_set_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER set_jobs_timestamp
        BEFORE UPDATE ON jobs
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();

        -- Repeat CREATE TRIGGER for applications, user_skills, job_skills if desired

        ```

    **e.** Verify that all tables (`users`, `jobs`, `skills`, `applications`, `user_skills`, `job_skills`, `session`) were created successfully in the Table Editor.

5.  Initial Database Seeding (Optional but Recommended for Development)
    - **Ensure the tables from Step 4 exist before proceeding.**
    - If you want to populate the database with sample users, jobs, and applications for testing, set `RESET_DB=true` in your `.env` file _before starting the application for the first time_. The application startup process (`app.js`) will then execute the reset (`scripts/resetDb.js`) and seeding (`scripts/seedDb.js`) scripts.
    - **Warning:** `RESET_DB=true` will **delete all data** currently in these tables and attempt to delete corresponding Supabase Auth users before seeding. **Set `RESET_DB` back to `false` after the initial seeding** to prevent data loss on subsequent restarts.

### Running the Application

Once the setup is complete, you can start the application server:

- **Development Mode (includes automatic server restarts on file changes using `nodemon`):**
  ```bash
  npm run dev
  ```
- **Production Mode (standard execution):**
  ```bash
  npm start
  ```

After starting the server, open your web browser and navigate to the `APP_HOST` URL specified in your `.env` file (e.g., `http://localhost:3000` if running locally with the default port).

## Feature Overview

### 1. User Authentication & Account Management

Handles user registration, login, email verification, password reset, email/username updates, and account deletion. Ensures secure access to application features.

#### Code Location

- Routes: `services/routes/auth/` (contains specific files like `signup.js`, `login.js`, `password.js`, `updateEmail.js`, etc.)
- Models: `backend/models/user.js` (interacts with Supabase `users` table)
- Middleware: `services/middlewares/accountAuth.js` (authentication check), `services/middlewares/validation.js` (input validation)
- Helpers: `services/routes/auth/helpers.js` (token generation, email sending logic)
- Views: `frontend/views/auth/`

#### Key Endpoints/Modules

`/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/verify`, `/auth/forgot`, `/auth/reset`, `/auth/update-email`, `/auth/update-username`, `/auth/delete-account`. Supabase Auth client methods (`signUp`, `signInWithPassword`, `getUser`, `updateUserById`, `signOut`).

### 2. Job Posting & Management

Allows authenticated users to create detailed job postings, view a filterable and paginated list of all jobs, view individual job details, edit their own postings, and delete them.

#### Code Location

- Routes: `services/routes/job/` (`create.js`, `list.js`, `detail.js`, `edit.js`, `delete.js`)
- Models: `backend/models/job.js`, `backend/models/jobSkill.js`
- Views: `frontend/views/job/` (`index.ejs`, `job.ejs`, `create.ejs`, `edit.ejs`)
- Client-side JS: `frontend/public/js/job-form.js` (for location toggle, working hours grid)

#### Key Endpoints/Modules

`/job` (GET list), `/job/create` (GET/POST), `/job/job/:id` (GET detail), `/job/edit/:id` (GET/POST), `/job/delete/:id` (POST). `Job` model functions (`getAllJobs`, `getJobById`, `createJob`, `updateJob`, `deleteJob`, `getJobWithSkillsById`). `JobSkill` model (`setJobSkills`).

### 3. Job Application Process

Enables logged-in users to apply for open jobs with a title and message. Users can view their own submitted applications and their status. Employers can view applications submitted to their jobs.

#### Code Location

- Routes: `services/routes/application/` (`apply.js`, `list.js`)
- Models: `backend/models/application.js`
- Views: `frontend/views/applications/` (`my.ejs`, `received.ejs`), `frontend/views/job/job.ejs` (Apply form)

#### Key Endpoints/Modules

`/application/apply/:jobId` (POST), `/application/my` (GET), `/application/received` (GET). `Application` model functions (`createApplication`, `getApplicationsByApplicant`, `getApplicationsByJob`, `getApplicationByJobAndApplicant`).

### 4. Application Status Management & Offers

Employers can review applications for their jobs and update the status (Make Offer/Hire, Reject). Applicants can view offer statuses and explicitly Accept or Decline a job offer ('hired' status). Accepting closes the job and notifies both parties. Declining notifies the employer.

#### Code Location

- Routes: `services/routes/application/` (`edit.js`, `offer.js`)
- Models: `backend/models/application.js`, `backend/models/job.js` (for closing job)
- Views: `frontend/views/applications/` (`edit.ejs`, `confirm-accept.ejs`, `my.ejs`)
- Services: `backend/services/mailerService.js` (notifications)

#### Key Endpoints/Modules

`/application/edit/:id` (GET/POST), `/application/confirm-accept/:id` (GET), `/application/accept/:id` (POST), `/application/decline/:id` (POST). `Application.updateApplication()`, `Job.updateJob()`, various `mailerService` functions (`notifyApplicationStatusUpdate`, `notifyOfferAccepted`, `notifyOfferDeclined`).

### 5. Skills Management & Matching

Users can manage their personal skills and experience levels via their profile. Jobs require specific skills and minimum experience. The system displays indicators of how well a logged-in user's skills match job requirements on the job list, job detail page, and received applications view.

#### Code Location

- Routes: `services/routes/profile.js` (Edit user skills), `services/routes/job/` (Define job skills in create/edit), `services/routes/application/list.js` (Received apps matching).
- Models: `backend/models/skill.js`, `backend/models/userSkill.js`, `backend/models/jobSkill.js`
- Views: `frontend/views/profile/edit-skills.ejs`, `frontend/views/job/_skill_form_partial.ejs` (Reusable skill form), `frontend/views/job/index.ejs`, `frontend/views/job/job.ejs`, `frontend/views/applications/received.ejs` (Displaying matches).
- Helpers: `services/routes/job/helpers.js` (`calculateSkillMatches`), `services/routes/application/helpers.js` (`checkOverallSkillMatch`).

#### Key Endpoints/Modules

`/profile/skills/edit` (GET/POST), `Skill.getAllSkills()`, `UserSkill.setUserSkills()`, `JobSkill.setJobSkills()`. Match calculation logic within route handlers/helpers.

### 6. Email Notifications

Automated emails are sent for key events using Nodemailer. Users can configure their notification preferences.

#### Code Location

- Service: `backend/services/mailerService.js` (Defines specific notification functions)
- Config: `backend/config/mailer.js` (Nodemailer transport setup)
- Routes: Triggered from various routes (e.g., `apply.js`, `edit.js`, `offer.js` within `services/routes/application/`; `signup.js`, `password.js`, etc. within `services/routes/auth/`)
- Settings: `services/routes/settings.js` (POST handler for updating preferences), `frontend/views/settings.ejs` (UI).

#### Key Endpoints/Modules

`mailerService.sendNotification`, `mailerService.notifyNewApplication`, `mailerService.notifyApplicationStatusUpdate`, etc. `User` model update for preferences.

### 7. User Interface Features

Provides a user-friendly interface with features like dark mode, responsive design, interactive forms, and clear feedback messages.

#### Code Location

- CSS: `frontend/public/css/styles.css`
- JS: `frontend/public/js/` (`theme-toggle.js`, `job-form.js`, `password-strength.js`)
- Views: `frontend/views/` (All EJS templates, particularly `partials/header.ejs` for layout/nav/dark mode toggle, `partials/footer.ejs`). Bootstrap 5 CDN links included.

#### Key Components

Dark mode toggle, Working hours interactive grid, Password strength indicator, Flash messages for user feedback, Bootstrap components for layout and responsiveness.

## Known Issues & Future Enhancements

### Issues

#### Limited Test Coverage

The project currently lacks automated unit and integration tests since I overrelied on user testing, reducing robustness since it's easier for me to miss an error when testing manually. While I would have liked to do system testing to mock end-to-end workflows, it would have had a high opportunity cost since it's very time-consuming compared to testing by hand, and would have likely resulted in me not being able to flesh out the web app as much. As a result, I chose to forego it in this assignment to save time and instead focus more on developing quality code that adheres to the enterprise considerations.

#### Job Filtering is Basic

Job filtering is functional but quite basic. I could improve it by adding the ability to search for titles, or perhaps looking for specific skills in demand, not just all of the skills that my user profile has.

#### Rate Limiting is Oversimplified

My rate limiting is quite simple, and weighs all API calls evenly. To make it more advanced, I could make it take into account that users will make some types of API calls more frequently than others. For example, the user will attempt to sign in much less frequently than they will get a page of jobs from the job board.

The database seeder (`seedDb.js`) might also encounter rate limits or performance issues when creating an exceptionally large number of users/jobs/skills due to sequential API calls within loops. However, with my mock data creating 2,000 jobs and many skills and users, I figured this wouldn't be worth worrying about for the purpose of this assignment.

### Future Enhancements

I have quite a lot of ideas for additional enhancements and features for my web app which I plan to eventually implement as a part of my GitHub portfolio.

#### Comprehensive Testing

One of the biggest priorities would be to develop a full suite of unit, integration, and end-to-end tests using Jest and Supertest to ensure robustness.

#### Admin Dashboard

If I had more time, I would have loved to create an admin dashboard, where admins could add and remove types of skills that are in the database. It would provide a much smoother experience than having to type code into Supabase's SQL editor.

#### Advanced Searching

Like I mentioned before, my job filtering has a lot of potential for improvement. I could implement things like keyword searching within job descriptions, location-based searching (e.g., radius from your location), and filtering by specific skill categories to name a few examples.

#### Enhanced User Profiles

I could choose to enhance user profiles by adding first names, surnames, age, descriptions for specific work history rather than just skills etc. These could also be shown automatically in applications.

#### Company Profiles

I could allow companies to create profiles associated with their job postings. This could let users view company profiles and see all jobs listed by them, which would mean a better UX for those who are interested in working at a specific company.

#### In-app Messaging

Instead of just sharing employers' and applicants' email addresses, I could create a messaging system directly in the app which could be used to organise interviews before an applicant is hired.

### Conclusion

Overall, I'm very happy with how this project turned out. I met all my key objectives, the web app is packed with useful features, has a high level of code quality, deploys successfully and I think I've done a good job of implementing all enterprise considerations. I'm especially proud of the UX - the UI aesthetically pleasing and easy to navigate and the flash messages are really helpful for providing success/error messages. I plan to continue to develop this website for my GitHub portfolio since there is still a lot I can do to work on it.
