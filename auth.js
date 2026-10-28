/* ==========================================================================
   MYBARBERHUB AUTHENTICATION & DEMO CONTROLLER
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initDemoToolbar();
});

function initAuth() {
  const authForm = document.getElementById("auth-form");
  const tabLogin = document.getElementById("auth-tab-login");
  const tabSignup = document.getElementById("auth-tab-signup");

  if (tabLogin && tabSignup) {
    tabLogin.addEventListener("click", (e) => {
      e.preventDefault();
      tabLogin.classList.add("active");
      tabSignup.classList.remove("active");
    });

    tabSignup.addEventListener("click", (e) => {
      e.preventDefault();
      tabSignup.classList.add("active");
      tabLogin.classList.remove("active");
    });
  }

  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("input-email").value;
      const roleRadio = document.querySelector('input[name="role"]:checked');
      const role = roleRadio ? roleRadio.value : "customer";

      mockData.currentUser.email = emailInput;
      mockData.currentUser.role = role;

      // Switch view from Auth to Dashboard
      document.getElementById("view-auth").classList.add("hidden");
      document.getElementById("view-dashboard").classList.remove("hidden");

      updateRoleDisplay(role);

      if (typeof window.renderAppointments === "function") window.renderAppointments();
    });
  }
}

function initDemoToolbar() {
  const btnCustomer = document.getElementById("btn-role-customer");
  const btnBarber = document.getElementById("btn-role-barber");

  if (btnCustomer && btnBarber) {
    btnCustomer.addEventListener("click", () => {
      mockData.currentUser.role = "customer";
      updateRoleDisplay("customer");

      // Auto-open dashboard if on auth view
      document.getElementById("view-auth").classList.add("hidden");
      document.getElementById("view-dashboard").classList.remove("hidden");

      if (typeof window.renderAppointments === "function") window.renderAppointments();
    });

    btnBarber.addEventListener("click", () => {
      mockData.currentUser.role = "barber";
      updateRoleDisplay("barber");

      // Auto-open dashboard if on auth view
      document.getElementById("view-auth").classList.add("hidden");
      document.getElementById("view-dashboard").classList.remove("hidden");

      if (typeof window.renderAppointments === "function") window.renderAppointments();
    });
  }
}

function updateRoleDisplay(role) {
  const display = document.getElementById("active-role-display");
  const btnCustomer = document.getElementById("btn-role-customer");
  const btnBarber = document.getElementById("btn-role-barber");

  if (display) display.innerText = role.toUpperCase();

  if (btnCustomer && btnBarber) {
    if (role === "customer") {
      btnCustomer.classList.add("btn-active");
      btnBarber.classList.remove("btn-active");
    } else {
      btnBarber.classList.add("btn-active");
      btnCustomer.classList.remove("btn-active");
    }
  }
}