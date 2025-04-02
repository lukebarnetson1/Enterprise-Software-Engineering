document.addEventListener("DOMContentLoaded", function () {
  const passwordInput = document.getElementById("password");
  const strengthBarFill = document.getElementById("password-strength-fill");
  const strengthText = document.getElementById("password-strength-text");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const form = passwordInput ? passwordInput.closest("form") : null;

  if (passwordInput && strengthBarFill && strengthText) {
    passwordInput.addEventListener("input", function () {
      const password = passwordInput.value;
      // Ensure zxcvbn is loaded
      if (typeof zxcvbn === "undefined") {
        console.error("zxcvbn library not loaded.");
        strengthText.textContent = "Password Strength: (Error)";
        return;
      }

      const result = zxcvbn(password);
      const strength = result.score; // Score from 0 to 4

      const colors = ["#dc3545", "#fd7e14", "#ffc107", "#0d6efd", "#198754"]; // Red, Orange, Yellow, Blue, Green
      const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

      strengthBarFill.style.width = `${(strength + 1) * 20}%`;
      strengthBarFill.style.backgroundColor = colors[strength];
      strengthText.textContent = `Password Strength: ${strengthLabels[strength]}`;

      // Custom validation message for weak passwords
      if (password.length > 0 && strength < 2) {
        // Check length to avoid msg on empty field
        passwordInput.setCustomValidity(
          "Password is too weak. Please choose a stronger one.",
        );
      } else {
        passwordInput.setCustomValidity(""); // Clear validation message if strong enough or empty
      }
    });
  }

  if (confirmPasswordInput && passwordInput) {
    confirmPasswordInput.addEventListener("input", function () {
      if (confirmPasswordInput.value !== passwordInput.value) {
        confirmPasswordInput.setCustomValidity("Passwords do not match.");
      } else {
        confirmPasswordInput.setCustomValidity("");
      }
    });
  }

  if (form && passwordInput && confirmPasswordInput) {
    form.addEventListener("submit", function (event) {
      // Re-check password strength on submit in case user somehow bypassed input validation
      if (
        typeof zxcvbn !== "undefined" &&
        passwordInput.value.length > 0 &&
        zxcvbn(passwordInput.value).score < 2
      ) {
        passwordInput.setCustomValidity(
          "Password is too weak. Please choose a stronger one.",
        );
      } else {
        passwordInput.setCustomValidity(""); // Clear if ok
      }

      // Check validity of inputs before submitting
      if (!passwordInput.checkValidity()) {
        passwordInput.reportValidity();
        event.preventDefault();
      } else if (!confirmPasswordInput.checkValidity()) {
        confirmPasswordInput.reportValidity();
        event.preventDefault();
      }
      const emailInput = form.querySelector("#email");
      const usernameInput = form.querySelector("#username");
      if (emailInput && !emailInput.checkValidity()) {
        emailInput.reportValidity();
        event.preventDefault();
      }
      if (usernameInput && !usernameInput.checkValidity()) {
        usernameInput.reportValidity();
        event.preventDefault();
      }
    });
  }

  // Add validation listeners for signup form
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    const emailInput = signupForm.querySelector("#email");
    const usernameInput = signupForm.querySelector("#username");

    if (emailInput) {
      emailInput.addEventListener("input", function () {
        if (emailInput.validity.typeMismatch) {
          emailInput.setCustomValidity("Please enter a valid email address.");
        } else {
          emailInput.setCustomValidity("");
        }
      });
    }

    if (usernameInput) {
      usernameInput.addEventListener("input", function () {
        if (usernameInput.validity.patternMismatch) {
          usernameInput.setCustomValidity(
            "Username must be 3-30 characters and contain only letters, numbers, and underscores.",
          );
        } else if (
          usernameInput.validity.tooShort ||
          usernameInput.validity.tooLong
        ) {
          usernameInput.setCustomValidity(
            "Username must be between 3 and 30 characters.",
          );
        } else {
          usernameInput.setCustomValidity("");
        }
      });
    }
  }
});
