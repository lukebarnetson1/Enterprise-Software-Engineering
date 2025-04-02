document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("theme-toggle");
  const body = document.body;
  const htmlElement = document.documentElement;

  // Apply initial state based on localStorage
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme === "dark") {
    htmlElement.classList.add("dark-mode");
    body.classList.add("dark-mode");
    if (toggle) {
      toggle.checked = true;
    }
  } else {
    // Ensure classes are removed if theme is light or not set
    htmlElement.classList.remove("dark-mode");
    body.classList.remove("dark-mode");
    if (toggle) {
      toggle.checked = false;
    }
  }

  // Add event listener if toggle exists
  if (toggle) {
    toggle.addEventListener("change", () => {
      const isDark = toggle.checked;
      body.classList.toggle("dark-mode", isDark);
      htmlElement.classList.toggle("dark-mode", isDark);
      try {
        localStorage.setItem("theme", isDark ? "dark" : "light");
      } catch (e) {
        console.error("Error saving theme", e);
      }
    });
  }
});
