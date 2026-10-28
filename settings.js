/* ==========================================================================
   MYBARBERHUB SETTINGS & SUPPORT CONTROLLER
   Handles profile updates, campus preferences, and report submissions
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initSettingsUI();
});

function initSettingsUI() {
  const btnSave = document.getElementById("btn-save-settings");
  const btnSubmitSupport = document.getElementById("btn-submit-support");

  // Save Profile Changes
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      const nameInput = document.getElementById("settings-name").value.trim();
      const dormInput = document.getElementById("settings-dorm").value.trim();

      if (nameInput) mockData.currentUser.name = nameInput;
      if (dormInput) mockData.currentUser.dorm = dormInput;

      alert("✅ Profile settings updated successfully!");
    });
  }

  // Submit Support / Dispute Report
  if (btnSubmitSupport) {
    btnSubmitSupport.addEventListener("click", () => {
      const supportMsg = document.getElementById("support-message").value.trim();

      if (!supportMsg) {
        alert("⚠️ Please enter a description of the issue before submitting.");
        return;
      }

      alert("📩 Report submitted to Campus Admin. Reference Ticket: #RPT-" + Math.floor(1000 + Math.random() * 9000));
      document.getElementById("support-message").value = "";
    });
  }
}