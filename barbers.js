/* ==========================================================================
   MYBARBERHUB BARBERS DIRECTORY CONTROLLER
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initBarbersUI();
  renderBarbers();
});

function initBarbersUI() {
  const searchInput = document.getElementById("search-barber");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      renderBarbers(query);
    });
  }
}

function renderBarbers(searchQuery = "") {
  const container = document.getElementById("directory-barber-list");
  if (!container) return;

  const filteredBarbers = mockData.barbers.filter(barber => {
    const nameMatch = barber.name.toLowerCase().includes(searchQuery);
    const dormMatch = barber.dorm.toLowerCase().includes(searchQuery);
    const specMatch = barber.specialties.some(s => s.toLowerCase().includes(searchQuery));
    return nameMatch || dormMatch || specMatch;
  });

  if (filteredBarbers.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; font-size: 12px; color: #666;">No barbers found matching "${searchQuery}".</p>`;
    return;
  }

  container.innerHTML = filteredBarbers.map(barber => `
    <div class="wireframe-card" style="display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <h4>${barber.name}</h4>
          <span class="hitbox-sm" style="background-color: #f8f9fa;">${barber.badge}</span>
        </div>
        <p style="font-size: 11px; margin: 4px 0;"><strong>Dorm:</strong> ${barber.dorm}</p>
        <p style="font-size: 11px; margin: 4px 0;"><strong>Experience:</strong> ${barber.experience}</p>
        <p style="font-size: 11px; margin: 4px 0;"><strong>Rating:</strong> ⭐ ${barber.rating} (${barber.cutsCount} Cuts)</p>
        <p style="font-size: 11px; margin: 4px 0;"><strong>Pricing:</strong> ${barber.priceRange}</p>
      </div>

      <button class="hitbox btn-primary btn-fast-track" data-id="${barber.id}" style="width: 100%; margin-top: 12px;">
        Book Appointment &rarr;
      </button>
    </div>
  `).join("");

  container.querySelectorAll(".btn-fast-track").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const barberId = e.currentTarget.getAttribute("data-id");
      fastTrackBooking(barberId);
    });
  });
}

function fastTrackBooking(barberId) {
  const appTab = document.querySelector('[data-tab="tab-appointments"]');
  if (appTab) appTab.click();

  if (typeof window.selectBarberForBooking === "function") {
    window.selectBarberForBooking(barberId);
  }
}

window.renderBarbers = renderBarbers;