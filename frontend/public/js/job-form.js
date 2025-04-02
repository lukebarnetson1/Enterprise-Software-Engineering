document.addEventListener("DOMContentLoaded", function () {
  const workingLocationSelect = document.getElementById("working_location");
  const inPersonLocationGroup = document.getElementById(
    "in-person-location-group",
  );
  const inPersonLocationInput = document.getElementById("in_person_location");

  function toggleInPersonLocation() {
    if (
      !workingLocationSelect ||
      !inPersonLocationGroup ||
      !inPersonLocationInput
    ) {
      return;
    }
    const selectedType = workingLocationSelect.value;
    const requiresLocation =
      selectedType === "in_person" || selectedType === "hybrid";
    inPersonLocationGroup.style.display = requiresLocation ? "" : "none";
    inPersonLocationInput.required = requiresLocation;
    if (!requiresLocation) {
      inPersonLocationInput.value = ""; // Clear value if remote
    }
  }

  if (workingLocationSelect) {
    workingLocationSelect.addEventListener("change", toggleInPersonLocation);
    toggleInPersonLocation();
  }

  // Working Hours Grid Logic
  const grid = document.getElementById("working-hours-grid");
  const weeklyHoursInput = document.getElementById("weekly_hours");
  const weeklyHoursDisplay = document.getElementById("weekly-hours-display");
  const detailsInput = document.getElementById("working_hours_details");
  let isMouseDown = false; // Flag for drag state
  let dragAction = null; // 'select' or 'deselect' - determined where we left click

  function updateWorkingHoursState() {
    if (!grid || !weeklyHoursInput || !weeklyHoursDisplay || !detailsInput)
      return;

    const selectedCells = grid.querySelectorAll(".time-slot.selected");
    const totalHours = selectedCells.length * 1.0;
    weeklyHoursInput.value = totalHours.toFixed(1);
    weeklyHoursDisplay.textContent = `Total Weekly Hours: ${totalHours.toFixed(1)}`;

    const selectedData = [];
    selectedCells.forEach((cell) => {
      selectedData.push({
        day: cell.dataset.day,
        time: cell.dataset.time,
      });
    });
    detailsInput.value = JSON.stringify(selectedData);
  }

  function loadGridState() {
    if (!detailsInput || !grid) return;
    try {
      const detailsValue = detailsInput.value;
      grid
        .querySelectorAll(".time-slot.selected")
        .forEach((cell) => cell.classList.remove("selected")); // Clear previous state

      if (detailsValue && detailsValue !== "[]") {
        const selectedData = JSON.parse(detailsValue);
        if (Array.isArray(selectedData)) {
          selectedData.forEach((slot) => {
            const cell = grid.querySelector(
              `.time-slot[data-day="${slot.day}"][data-time="${slot.time}"]`,
            );
            if (cell) {
              cell.classList.add("selected");
            } else {
              console.warn(
                `Load: Could not find cell for slot: ${slot.day} ${slot.time}`,
              );
            }
          });
        }
      }
    } catch (e) {
      console.error("Error parsing working hours details:", e);
      detailsInput.value = "[]"; // Reset if invalid
    }
    updateWorkingHoursState();
  }

  if (grid && weeklyHoursInput && weeklyHoursDisplay && detailsInput) {
    // Drag to select
    grid.addEventListener("mousedown", function (event) {
      if (event.target.classList.contains("time-slot")) {
        isMouseDown = true;
        const targetCell = event.target;
        const isInitiallySelected = targetCell.classList.contains("selected");

        // Determine the action for this drag sequence
        dragAction = isInitiallySelected ? "deselect" : "select";

        // Apply the action to the clicked cell immediately
        if (dragAction === "select") {
          targetCell.classList.add("selected");
        } else {
          targetCell.classList.remove("selected");
        }

        event.preventDefault(); // Prevent text selection during drag
      }
    });

    grid.addEventListener("mouseover", function (event) {
      if (isMouseDown && event.target.classList.contains("time-slot")) {
        const targetCell = event.target;
        // Apply the determined action during drag
        if (dragAction === "select") {
          targetCell.classList.add("selected");
        } else if (dragAction === "deselect") {
          targetCell.classList.remove("selected");
        }
      }
    });

    // Listen for mouseup anywhere on the page to stop dragging
    document.addEventListener("mouseup", function () {
      if (isMouseDown) {
        isMouseDown = false;
        dragAction = null; // Reset drag action
        updateWorkingHoursState(); // Update state once drag is finished
      }
    });

    loadGridState();
  } else {
    console.warn(
      "Working hours grid elements not found. Grid functionality disabled.",
    );
  }
});
