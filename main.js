/* ==========================================================================
   MYBARBERHUB MAIN ROUTER & APP INITIALIZER
   Manages core tab navigation and syncs UI views
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initMainNavigation();
});

function initMainNavigation() {
  const navTabs = document.querySelectorAll(".nav-tab");

  navTabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
      const targetTabId = e.currentTarget.getAttribute("data-tab");

      // Update active state on navigation tab buttons
      navTabs.forEach(t => t.classList.remove("active"));
      e.currentTarget.classList.add("active");

      // Hide all tab sections
      const tabContents = document.querySelectorAll(".tab-content");
      tabContents.forEach(content => content.classList.add("hidden"));

      // Show target tab content
      const activeContent = document.getElementById(targetTabId);
      if (activeContent) {
        activeContent.classList.remove("hidden");
      }

      // Trigger view re-renders on tab switch
      if (targetTabId === "tab-appointments" && typeof window.renderAppointments === "function") {
        window.renderAppointments();
      } else if (targetTabId === "tab-barbers" && typeof window.renderBarbers === "function") {
        window.renderBarbers();
      } else if (targetTabId === "tab-community" && typeof window.renderCommunity === "function") {
        window.renderCommunity();
      }
    });
  });
}