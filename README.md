# Software-Quality-Assurance

Welcome to my tech-based blog, Byte-Sized Bits!

## Team Contributions

Since I worked as an individual, everything committed to this repo was implemented by me.

## Setup Instructions

### 1. Clone the repository

Clone the repo to your local machine using Git:

```
git clone https://github.com/lukebarnetson1/Software-Quality-Assurance.git
```

```
cd your-repo-name
```

### 2. Install dependencies

Install all required packages using [npm](https://www.npmjs.com) (or [yarn](https://yarnpkg.com) if you prefer):

### 3. Configure environment variables

Create a `.env` file in the root of the project. Make sure to set the required environment variables:

`PORT` e.g. 3000 (the port the server runs on)

`JWT_SECRET` – Secret key for JWT operations (512 bit string)

`EMAIL_HOST` e.g. smtp.gmail.com (the host of the email address you want to use for sending emails)

`EMAIL_PORT` e.g. 587 for Gmail

`EMAIL_SECURE` e.g. false (since Gmail's connection starts unencrypted and is upgraded to TLS)

`EMAIL_USER` e.g. your.email@example.com

`EMAIL_PASS` e.g. "abcd efgh ijkl mnop" (email app password, not your real email address password)

`SESSION_SECRET` – Secret used for signing and validating session cookies. 64 character hexadecimal string

`DATABASE_STORAGE` – Path to your SQLite database file.

`APP_HOST` – The public URL of your web app.

### 4. Initialise the database

The application uses Sequelize with SQLite. When you start the app, Sequelize will automatically synchronise the models with the database. If you need to reset the database (for development or testing), set the environment variable `RESET_DB` to `true` in your `.env` file:

```
RESET_DB=true
```

### 5. Run the app

Start the application in the terminal with:

```
npm start
```

The server will start on the port specified in your `.env` file. Open your browser and navigate to:

`http://localhost:YOUR_PORT_HERE` (I used Codespaces so had to replace `localhost` with my `APP_HOST` from my `.env` file.

### 6. Running tests

The project includes tests for routes, models, security etc.

To run the test suite, simply use:

```
npm test
```

Enjoy :)

## Features

I have enhanced my blog with user authentication, account management, and multiple security measures. These measures enable users to create, edit and delete their own blog posts while ensuring data integrity and security through input validation, CSRF protection and session handling.

### 1. User Authentication & Account Management

**Sign-up & Email Verification**

- New users can register an account with an email, username, and password.
- Passwords are hashed before being stored in the database.
- A verification email is sent upon registration, requiring users to confirm their email before logging in.

**Login & Session Handling**

- Users can log in using either their email address or username.
- The application supports session-based authentication, storing the logged-in user's details securely.
- "Remember Me" functionality allows users to stay logged in for 7 days.

**Logout**

- Users can log out, which destroys their session and clears their cookies.

**Account Settings**

- A logged-in user can access their account settings to:

  - Update their username or email.
  - Change their password.
  - Delete their account.

**Username & Email Updates**

- Users can update their email address or username.
- Both require email confirmation, again using a secure token.
- Changing a username updates the author of all associated blog posts to reflect the new username.

**Password Reset & Update**

- If a user has forgotten their password, they can request a password reset via email.
- A secure token is generated, allowing the user to reset their password.
- Users can also update their password while logged in via the account settings.

**Account Deletion**

- Users can request to delete their account.
- A confirmation email is sent to prevent accidental/malicious deletion.
- Upon confirmation, the account is deleted, and associated blog posts are anonymised (author name replaced with [Deleted-User]).

### 2. Blog Management

**Creating Blog Posts**

- Logged-in users can create blog posts with:

  - A title (max 100 characters)
  - Content (text input)
  - All posts are stored in the database and displayed on the home page.

**Editing Blog Posts**

- Users can edit/delete their own posts.
- If they are not the author, they are prevented from editing/deleting a post.

**Deleting Blog Posts**

- Users can delete their own posts.
- If a user deletes their account, their posts remain but are anonymised.

### 3. Security Features

**CSRF Protection**

- CSRF tokens are used for all forms and POST requests, ensuring only legitimate users can submit data.

**Input Validation & Sanitisation**

- User inputs are sanitised to prevent XSS attacks.
- Password strength is enforced using zxcvbn to prevent weak passwords.
- Blog posts are stripped of HTML and JavaScript to prevent injection attacks.

**Session Management & Secure Cookies**

- Sessions are securely stored using SQLite-based session storage.
- Session cookies are set with httpOnly to prevent JavaScript access.

**JWT-Based Authentication**

- The application uses JWT tokens to verify all email confirmations and email/username/password changes.
- Tokens are securely signed using a 512-bit secret key.

**Protection against SQL Injection**

- Sequelize natively provides built-in protection against SQL Injection e.g. by not using direct string concatenation:
  - Unsafe: `db.query(SELECT * FROM users WHERE email = '${userInput}');`
  - Safe: `await User.findOne({ where: { email: userInput } });`

## Challenges and Solutions

### Testing Challenges

One of the first hurdles when developing the account system was setting up a testing environment that faithfully mimicked real-world behaviour. For example, I needed to create an agent that could simulate the creation of users within my tests. This was essential for ensuring that authentication flows, session management, and protected routes behaved as expected. I resolved this by utilising Supertest’s agent functionality to maintain session state across multiple requests, helping me to replicate a user's journey through the application.

Another challenge arose when it came to testing email functionality. I didn’t want to send out real emails during the test runs, as this would not only be inefficient but would clog up my inbox. To handle this, I mocked the emailing process by intercepting calls to the mailer module (nodemailer in my case). This allowed me to verify that the correct parameters were being passed (such as the recipient address, subject, and HTML content) without actually sending any real emails.

A further deployment challenge emerged with Heroku. Although my CI job passed successfully - demonstrating that the app was robust and all tests were green - I encountered issues when attempting to deploy. I applied for the GitHub Student Developer Pack (required for Heroku's student offer) to avoid incurring charges. Unfortunately, the process took much longer than expected, and Heroku still has not approved my access despite me now being a classed as a student on GitHub. As a result, while my CI pipeline confirmed that the application was production-ready, I had to skip deployment to Heroku to avoid unwanted charges.

### Development Challenges

Using session management with CSRF protection was another difficult area. I needed to ensure that sessions were securely handled, especially with features like "remember me" in the login process. When synchronising the CSRF tokens across different routes, especially when having asynchronous form submissions, meant that I had to carefully configure middleware to pass these tokens into my views.

Implementing JWT-based authentication and email verification was also difficult, especially because by this point, the project was becoming quite complex. For all emails, I had to generate tokens with appropriate expiry times, handle edge cases where tokens might be expired or invalid, and ensure that the process of validating tokens was completely secure. This meant not only integrating JWT into my authentication flows but also writing comprehensive tests to simulate scenarios where tokens failed or succeeded in verifying user accounts. I had to separate the token generation and verification processes so that they could be easily maintained and updated as the application got more complicated.

Another challenge I encountered was with the handling of flash messages. Initially, I noticed that when I tried to display multiple flash messages, one message would often override another. This was especially hard when, for example, a user would receive both a success message and an error message at the same time when being routes (e.g. successfully deleting an account, but that message being overridden with the fact that you needed to be logged in to view the page). This resulted in loss of information for the user. To try to fix this, I modified my middleware so that instead of storing a single string, it aggregated messages into an array. This way, each time a flash message was set, it was appended to the existing list rather than replacing it. I also ensured that my views were updated to iterate over this array and display all messages, rather than just one. Sadly, in the end it still didn't work and I had to abandon fixing it due to time constraints.

## Evidence Requirements

### Feature Implementation Evidence

Video link: https://drive.google.com/file/d/1ehJR7iLTYVItxebY0fmOLDanrJVclYr0/view

#### Notable Sections of Code

**Email Functionality**

`./config/mailer.js` sets up Nodemailer with the credentials defined in the environment variables. It configures the SMTP settings (host, port, secure flag, authentication) so that emails (verification, password resets, etc.) can be sent reliably.

`./routes/auth/helpers.js` sets up helper functions. They include `generateToken` (which creates a JWT for secure operations) and `sendVerificationEmail`, which constructs and sends a verification email to new users. This module is reused across various account routes for email confirmations.

**Authentication Routes**

`./routes/auth/login.js` implements the login process, including password comparison using `bcrypt` and session creation.

`./routes/auth/signup.js` handles user registration with server-side validation, password hashing, and sending a verification email via the helper functions.

`./routes/auth/logout.js` destroys the session and logs the user out.

**Account Updates**

`./routes/auth/update-email.js` and `./routes/auth/update-username.js` handle updating the user’s email or username. They generate JWT tokens for secure confirmation and send a confirmation email to the user.

`./routes/auth/deleteAccount.js` manages account deletion, including sending a confirmation email and anonymising associated blog posts.

### Testing Evidence

![test coverage report](https://github.com/user-attachments/assets/80c8a07a-289b-4492-8c78-c57c54a96e38)

As you can see, I had a high level of test coverage.

**Unit vs Integration Tests**

For unit tests, I wrote files such as `tests/models/blogPost.test.js` and `tests/accounts/helpers.test.js` to ensure that individual components like model validations and helper functions (for JWT generation and email verification) behaved as expected. These tests were for isolating specific functionalities and ensuring that edge cases - such as missing required fields or invalid input - were properly handled.

On the integration testing side, I focused on end-to-end scenarios. For instance, the `tests/accounts/` folder extensively covers the authentication flows, including login, logout, and flash message handling. I used Supertest's agent functionality to simulate a persistent user session, which was needed for testing protected routes and ensuring that the CSRF tokens were correctly generated and validated. Similarly, files in my `tests/coreApp/` folder were used to verify that blog post creation, editing, deletion, and associated error conditions were handled gracefully.

**Edge Cases and Error Conditions**

I also tested my security features, For instance, in `tests/security/csrf.test.js` I thoroughly tested scenarios where the CSRF token was missing or invalid, ensuring that the system responded with appropriate error messages. Similarly, in `tests/security/inputSanitisation.test.js`, I tested against malicious inputs, verifying that any attempts to inject scripts or other unwanted content were effectively sanitised. On top of helping to validate the security of the application, these tests improved its robustness by making me consider scenarios that might otherwise have been overlooked.

**Advanced Techniques**

One of the strategies I implemented was the creation of a Supertest agent that could effectively mock a user’s session and persist state across multiple requests. This was necessary given that many routes are protected by authentication and CSRF middleware. By instantiating a Supertest agent, I was able to simulate a user signing up, logging etc, which then allowed me to extract and utilise valid CSRF tokens for subsequent requests. I even went as far as writing helper functions in my test setup (in files like `tests/setup/testSetup.js`) that not only fetch a CSRF token from unauthenticated routes (such as `/auth/login`) but also manage the session cookie. This ensured that every POST or PUT request made during tests was accompanied by a valid CSRF token, replicating a real user session reliably.

Mocking emails was another more advanced technique that came into play. Since the application sends emails for tasks like verification and password resets, I didn't want to dispatch real emails. I accomplished this by using Jest’s mocking capabilities. I mocked the mailer module (which is built on top of `nodemailer`) to intercept calls to the `sendMail` function. This way, instead of sending an actual email, the mock would simulate it. This approach allowed me to verify that the correct parameters, such as the recipient’s address, subject, and HTML content, were being passed without triggering any side effects.

One of the more nuanced aspects of my testing approach was ensuring that CSRF protection was integrated seamlessly throughout the test suite. I made extensive use of Supertest’s agent functionality to simulate persistent user sessions. This was important, as many routes in the application rely on CSRF tokens for security, and these tokens must be correctly generated, maintained, and validated across multiple requests.

For example, in my tests, I developed helper functions - such as those in `tests/setup/testSetup.js` - which extract a valid CSRF token from an unauthenticated route (like `/auth/login`) and then pass that token along with the session cookie for subsequent authenticated requests. This strategy ensured that each POST request in tests, whether it was for signing in, creating a blog post, or updating a user profile, had a valid CSRF token attached. By doing so, I could reliably simulate the behaviour of a real user and ensure that my CSRF middleware was functioning as expected.

In practice, whenever I wrote integration tests (as seen in files like `tests/accounts/auth.test.js` or `tests/security/csrf.test.js`), I would first initiate a session using the Supertest agent, retrieve the CSRF token from the rendered form, and then include this token in the body of my POST requests. This approach helped me test that my CSRF protection was robust against missing or invalid tokens, and also allowed me to verify that valid tokens were accepted and that session management was handled correctly across a series of dependent actions.

Overall, by building CSRF token management into my test helpers and leveraging the Supertest agent to simulate real user sessions, I was able to create a testing environment that closely mimicked production behaviour. This ensured that all routes remained secure and that the application correctly enforced CSRF protection under various scenarios.

**Strategies**

At first, I tried to stick with TDD, however, eventually, this became impractical as the app got more complex. Many of my tests I had written beforehand would fail after implementing the feature - not because the feature was badly implemented, but because of all the moving parts, from the CSRF protection to simulating a real user like I mentioned above. The iterative approach I adopted eventually led to a form of behaviour-driven development (BDD). I wrote tests that specified the expected behaviour of each feature and then wrote the code to meet those specifications, followed by fixing my incorrectly failing tests. This meant that, although tests were partly written after feature implementation, they were still a useful tool in mapping out how my features should behave.

### Security Evidence

**1. Authentication and Session Security**

**Session Management**

I used the express-session middleware in conjunction with the SQLite-backed session store (via `connect-sqlite3`) to manage user sessions. This setup is defined in app.js, where I configured sessions with a strong secret (.env.SESSION_SECRET) and set cookies to be HTTP-only.

```
app.use(
  session({
    store: new SQLiteStore({ db: "sessions.sqlite", dir: "./" }),
    secret: process.env.SESSION_SECRET || "fallbacksecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Should be true in production with HTTPS
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  }),
);
```

This config helps mitigate session hijacking and XSS risks by ensuring that the session cookie is not accessible via client-side scripts.

**User Authentication**

Passwords are hashed using `bcrypt` before they are stored in the database. This process is clearly demonstrated in both the signup route (`routes/auth/signup.js`) and during login (`routes/auth/login.js`). By hashing passwords, I ensured that even if the database was compromised, the actual passwords would not be easily retrievable.

**JWT for Secure Actions**

For sensitive operations like email verification, account deletion, and username/email/updates, I used JSON Web Tokens (JWTs). Tokens are generated with a short expiration time (typically 1 hour) to minimise risk, and their generation is abstracted into helper functions (`routes/auth/helpers.js`). This means that even if a token was intercepted, it would be invalid an hour after creation.

**2. CSRF Protection**

To protect against Cross-Site Request Forgery (CSRF) attacks, I integrated the `csurf` middleware in app.js. The CSRF tokens are stored in cookies using `cookie-parser` and then made available in all views:

```
app.use(cookieParser());
app.use(csrf({ cookie: true }));
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
```

This setup ensures that any POST, PUT, or DELETE request must include a valid CSRF token, thereby protecting the application from unauthorised cross-site requests.

**3. Input Validation and Sanitisation**

I employed the `express-validator` package (as seen in `middlewares/validation.js`) to enforce strict validation rules on incoming data for routes such as signup, login, blog post creation, and account info updates. These validations check for proper formatting, length constraints, and valid content (e.g., email formats and username character restrictions).

In addition to validation, I used the `sanitize-html` package to strip any potentially malicious HTML or script content from user inputs. This is especially important for blog posts and user inputs that might be rendered later on the frontend. Custom sanitisation functions were integrated into the validation middleware, ensuring that any disallowed tags or attributes were removed before storing the data.

To encourage strong passwords, I integrated the `zxcvbn` library to assess password strength in real-time. This is used both in client-side validations i.e. the password strength meter (via JavaScript in the signup and reset password views) and on the server side to reject weak passwords.

**4. Email Verification and Mocking**

Upon signup or when updating sensitive account information, users receive an email containing a verification link with a JWT token. The logic for generating these tokens is encapsulated in `routes/auth/helpers.js`, and the actual email is sent using Nodemailer (configured in `config/mailer.js`). This adds an extra layer of security by ensuring that only the owner of the email can verify or update their account.

**5. Additional Tools and Configs**

Security-sensitive information (such as the JWT secret, email credentials, and session secrets) is stored in a `.env` file and accessed using the `dotenv` package. This ensures that no sensitive information is hard-coded into the codebase.

Robust error handling is implemented across the application. For example, if CSRF validation fails, a specific error message is returned, and errors in database synchronisation are logged to the console without exposing details to the end user. This is especially evident in the error-handling middleware in app.js:

```
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).send("Invalid CSRF token or session expired.");
  }
  next(err);
});
```

### Code Quality & Refactoring Evidence

#### Modularisation & Separation of Concerns

**1. Database Config and Models**
Originally, the database connection was defined in a single file (`config/database.js`), and a basic model was included in `models/index.js`. I maintained this separation by keeping the database configuration isolated in `config/database.js` while moving each model into its own file where appropriate. For example, I created dedicated files for models like `User`, `BlogPost` as the application grew. This approach ensures that each model is self-contained and easier to maintain.

_Reference:_

- `config/database.js` contains the Sequelize setup using SQLite.
- `models/index.js` now serves as an aggregator where I initialise and sync the models (e.g. importing both `User` and `BlogPost` models).

**2. Routing and Middleware:**

The original skeleton had a single `routes/blog.js` file for all blog functionality. I broke my additional routes into multiple files and grouped them by functionality. For instance, authentication-related routes reside in the `routes/auth/` directory, while blog operations remain in `routes/blog.js`. This helped to improve readability and simplify testing.

Furthermore, I introduced middleware for authentication, validation, and error handling. For example, the CSRF protection and flash message middleware are configured in `app.js`, ensuring that all routes benefit from these security measures without redundant code.

_Reference:_

- `app.js` shows the integration of middleware for parsing request bodies, static file serving, CSRF protection, and session management.
- Custom middleware for validation resides in `middlewares/validation.js`, which uses `express-validator` and `sanitize-html` for robust input sanitisation.

**3. Helper Functions & Config Files**

To keep the code DRY (Don’t Repeat Yourself) and improve maintainability, I put common functionality into helper modules. For instance, JWT token generation and email verification functionality are encapsulated in `routes/auth/helpers.js`. This modularisation means that if I need to change the token expiry or update the email template, I only need to update it in one place.

#### Coding Standards & Best Practices

**1. Use of Environment Variables**

Security-sensitive and config-specific values (like the session secret, JWT secret, and email credentials) are now loaded via `dotenv` from the `.env` file. This ensures that no sensitive data is hard-coded and makes it easier to switch configurations between development, testing, and production environments.

**2. Consistent Naming Conventions and Code Style**

I adopted consistent naming conventions for variables, functions, and files throughout the codebase. For instance, routes and middleware are clearly named (e.g., `isAuthenticated` for authentication checks, `validateSignUp` for signup validations), making the code more self-documenting and easier to navigate. I also used Husky, integrated ESLint (with Prettier configurations) as part of my development process to enforce a 100% consistent formatting style and catch common errors before each commit can be completed.

**3. Robust Error Handling**

I improved the error handling from the original skeleton by adding try-catch blocks in asynchronous route handlers and centralised error-handling middleware in `app.js`. This ensures that errors (whether from database operations, CSRF token mismatches, or other issues) are logged appropriately and communicated to the user in a controlled manner.

For example, in several authentication and blog routes, when an error occurred, such as a validation failure or a missing resource, I used `req.flash` to store error messages that were then passed to the view layer. This allowed for clearer communication with the user (e.g. informing them that a form field was missing or that their session had expired). It also ensured that errors were handled gracefully rather than causing an abrupt application crash.

For example, if a user attempted to log in with invalid credentials, I would set a flash message like so:

```
req.flash("error", "Invalid email/username or password");
return res.redirect("/auth/login");
```

This meant that even if an error occurred during a complex operation, the user was always redirected to a safe route with a clear, contextual error message.

**4. Aesthetic pages**

In addition to backend improvements, I enhanced the frontend by using Bootstrap. By updating the Pug templates (such as `views/layouts/layout.pug`, `views/blog/index.pug`, and `views/auth/*`), I replaced basic HTML layouts with Bootstrap containers, navigation bars, and responsive components. This improved the visual appeal of all pages. Commits like "feat: use Bootstrap containers for all pages" clearly document this improvement.

### CI/CD & Git Practices

**CI/CD Pipeline**

My CI/CD pipeline is configured to run a series of automated steps every time I push changes to the main branch or open a pull request. The process begins with checking out the repository and caching Node.js modules to speed up subsequent builds. Then, the pipeline sets up Node.js (version 18 in our case), installs all the dependencies, and prepares the SQLite database by creating the database file and running the necessary migrations using Sequelize.

Once the environment is ready, the pipeline proceeds to run ESLint (integrated with Prettier for consistent formatting) to ensure that my code adheres to high coding standards and best practices. After linting, it runs the test suite with npm test, which executes all my unit and integration tests. Since the CI job passed successfully, it confirms that my app’s code is robust, error-free, and behaves as expected under the test conditions.

The subsequent stages in the pipeline were designed to deploy the app to Heroku. However, despite applying for the GitHub Student Developer pack (which took them nearly a week to give me access to the pack) and then using that to apply for the Heroku student pack, Heroku never gave me access to the student pack, so I deliberately chose not to deploy the application to Heroku to avoid incurring any charges. Essentially, while the CI job passing demonstrates that my app is fully functional and ready for production, the deployment part was halted due to the constraints around Heroku access. I was told in college that deploying locally was suitable for this assignment, so I left it at that.

![image](https://github.com/user-attachments/assets/b8238d34-409b-46a3-b8ce-aef83ebf1ef2)

![image](https://github.com/user-attachments/assets/2be0feea-75e0-4c6b-9edc-715d71508c47)

**Commits**

Throughout development, I frequently committed my code. By using Husky, I was prevented from committing any code if I had any syntax errors, formatting issues or failing tests. This reduced my need to use GHA directly since Husky would effectively run the CI job and deploy locally every time I tried to make a commit, hence the relatively low number of workflow runs on GHA.

My commit messages were concise yet descriptive, such as "feat: add password strength meter to ensure strong passwords" or "refactor: separate large auth route file into smaller files." These messages document the changes clearly and help me easily track progress and understand the evolution of the codebase over time. They served as a useful reference when reviewing code and debugging issues later in the process.

**Branches & Pull Requests**

I ensured that each new feature or significant change was developed on its own branch. For example, features such as CSRF protection, input sanitisation, and the account system were all implemented on separate branches (e.g., `feat/csrf-protection`, `feat/account-system`). This modular approach allowed me to work on different aspects of the application without introducing conflicts if I was ever going to work on more than one branch at a time.

For each pull request, I provided detailed descriptions of the changes made, the rationale behind them, and any issues or blockers that had been encountered. For instance, my PR titled "feat: implement account system" included a comprehensive list of new features (e.g., new user model, authentication routes, password reset flows) as well as improvements to existing code. These detailed descriptions made it easier to verify that all changes met the intended requirements and were aligned with the project’s overall architecture.

Working as an individual meant that I had to be extra diligent in reviewing my own pull requests. I took the time to read through my changes, run tests locally, and verify that the new code adhered to the best practices possible. This process helped maintain high code quality and minimised potential regressions.

**Evidence of Good Practice**

The commit history shows a steady progression of improvements—from initial setup and base code improvements (e.g., "chore: set up Prettier") to more advanced features like CSRF protection, input sanitisation, and account management. I continuously refactored and reorganised the code (e.g., "refactor: move BlogPost model into separate file" and "refactor: add more comments to files and improve readability"), ensuring that the codebase remained clean and maintainable.

Several commits and PRs reference the addition of tests and enhancements in the CI/CD pipeline. For example, commits like "test: add tests for error cases and stats" and "test: add integration and unit tests for core app functionality" reflect my commitment to ensuring that new features were covered by automated tests. This ensured that every merge into the main branch maintained the stability of the application.

## Conclusion

In conclusion, I'm really proud of this project. Despite the many hours and challenges along the way, every feature, from robust authentication and comprehensive error handling to advanced testing and security measures, has come together to form a high quality app. The process has been both demanding and rewarding, especially since I worked as an individual, and I'd like to think I went above and beyond for the entire marking rubric.
