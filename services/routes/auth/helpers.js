const jwt = require("jsonwebtoken");
const transporter = require("../../../backend/config/mailer");
const mailerService = require("../../../backend/services/mailerService");
require("dotenv").config();

// Generates a JWT with a payload and expiry
function generateToken(payload, expiresIn = "1h") {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

// Sends a verification email to user
async function sendVerificationEmail(user, req) {
  const token = generateToken({ email: user.email });
  const host = process.env.APP_HOST || req.get("host");
  const verificationURL = `${req.protocol}://${host}/auth/verify?token=${token}`;

  const username =
    user.username ||
    user.user_metadata?.username ||
    user.email.split("@")[0] ||
    "User";

  const subject = "Please verify your email";
  const html = `
      <p>Hi ${username},</p>
      <p>Welcome to Job Matchmaker!</p>
      <p>Click below to verify your email address (valid for 1 hour):</p>
      <a href="${verificationURL}">${verificationURL}</a>
    `;

  await mailerService.sendNotification(user.email, subject, html);
}

module.exports = {
  generateToken,
  sendVerificationEmail,
};
