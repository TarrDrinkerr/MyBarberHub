/* ==========================================================================
   MYBARBERHUB APPOINTMENTS CONTROLLER (LIVE SUPABASE BACKEND)
   ========================================================================== */

let selectedBookingState = {
  barberId: null,
  service: null,
  slot: null
};

document.addEventListener("DOMContentLoaded", () => {
  initAppointmentsUI();
  renderAppointments();
});

function initAppointmentsUI() {
  const subtabMake = document.getElementById("subtab-make-app");
  const subtabCheck = document.getElementById("subtab-check-app");
  const subviewMake = document.getElementById("subview-make-app");
  const subviewCheck = document.getElementById("subview-check-app");

  if (subtabMake && subtabCheck) {
    subtabMake.addEventListener("click", () => {
      subtabMake.classList.add("active");
      subtabCheck.classList.remove("active");
      subviewMake.classList.remove("hidden");
      subviewCheck.classList.add("hidden");
      renderBarberListForBooking();
    });

    subtabCheck.addEventListener("click", () => {
      subtabCheck.classList.add("active");
      subtabMake.classList.remove("active");
      subviewCheck.classList.remove("hidden");
      subviewMake.classList.add("hidden");
      renderActiveBookings();
    });
  }

  const subtabSchedule = document.getElementById("subtab-barber-schedule");
  const subtabIncoming = document.getElementById("subtab-barber-incoming");
  const subviewSchedule = document.getElementById("subview-barber-schedule");
  const subviewIncoming = document.getElementById("subview-barber-incoming");

  if (subtabSchedule && subtabIncoming) {
    subtabSchedule.addEventListener("click", () => {
      subtabSchedule.classList.add("active");
      subtabIncoming.classList.remove("active");
      subviewSchedule.classList.remove("hidden");
      subviewIncoming.classList.add("hidden");
      renderBarberScheduleManager();
    });

    subtabIncoming.addEventListener("click", () => {
      subtabIncoming.classList.add("active");
      subtabSchedule.classList.remove("active");
      subviewIncoming.classList.remove("hidden");
      subviewSchedule.classList.add("hidden");
      renderBarberIncomingBookings();
    });
  }

  const btnBack = document.getElementById("btn-back-to-barbers");
  if (btnBack) {
    btnBack.addEventListener("click", () => {
      document.getElementById("step-select-slot").classList.add("hidden");
      document.getElementById("step-select-barber").classList.remove("hidden");
      selectedBookingState = { barberId: null, service: null, slot: null };
    });
  }

  const btnConfirmSlot = document.getElementById("btn-confirm-slot");
  if (btnConfirmSlot) {
    btnConfirmSlot.addEventListener("click", () => confirmBooking());
  }

  const btnPublishSlot = document.getElementById("btn-publish-slot");
  if (btnPublishSlot) {
    btnPublishSlot.addEventListener("click", () => publishNewSlot());
  }
}

async function renderAppointments() {
  const role = mockData.currentUser.role;
  const customerView = document.getElementById("appointments-customer-view");
  const barberView = document.getElementById("appointments-barber-view");

  if (!customerView || !barberView) return;

  if (role === "customer") {
    customerView.classList.remove("hidden");
    barberView.classList.add("hidden");
    await renderBarberListForBooking();
    await renderActiveBookings();
  } else {
    customerView.classList.add("hidden");
    barberView.classList.remove("hidden");
    await renderBarberScheduleManager();
    await renderBarberIncomingBookings();
  }
}

/* ==========================================================================
   CUSTOMER FLOW (LIVE DB FETCH & BOOKING)
   ========================================================================== */

async function renderBarberListForBooking() {
  const container = document.getElementById("booking-barber-list");
  if (!container) return;

  // Fetch Barbers & their open slots directly from Supabase
  const { data: barbers, error } = await supabaseClient
    .from('barbers')
    .select('*, slots(*)');

  if (error || !barbers) {
    container.innerHTML = `<p style="color:red; font-size:12px;">Error loading barbers from cloud database.</p>`;
    return;
  }

  mockData.barbers = barbers; // Sync local state cache

  container.innerHTML = barbers.map(barber => {
    const openSlots = barber.slots ? barber.slots.filter(s => s.available) : [];
    return `
      <div class="wireframe-card">
        <h4>${barber.name}</h4>
        <p style="font-size: 11px; margin: 4px 0;"><strong>Dorm:</strong> ${barber.dorm}</p>
        <p style="font-size: 11px; margin: 4px 0;"><strong>Rating:</strong> ⭐ ${barber.rating} (${barber.cuts_count || 0} Cuts)</p>
        <p style="font-size: 11px; margin: 4px 0;"><strong>Badge:</strong> ${barber.badge}</p>
        <p style="font-size: 11px; margin: 4px 0;"><strong>Price Range:</strong> ${barber.price_range}</p>
        <p style="font-size: 11px; margin: 6px 0; color: ${openSlots.length > 0 ? '#16a34a' : '#dc2626'};">
          <strong>Open Slots:</strong> ${openSlots.length} Available
        </p>
        <button class="hitbox btn-primary btn-select-barber" data-id="${barber.id}" style="width: 100%; margin-top: 8px;">
          Book Appointment &rarr;
        </button>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".btn-select-barber").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const barberId = e.currentTarget.getAttribute("data-id");
      selectBarberForBooking(barberId);
    });
  });
}

async function selectBarberForBooking(barberId) {
  const barber = mockData.barbers.find(b => b.id === barberId);
  if (!barber) return;

  selectedBookingState.barberId = barberId;
  selectedBookingState.service = { name: "Classic Haircut", price: 15 };
  selectedBookingState.slot = null;

  document.getElementById("booking-target-barber").innerText = `Step 2: Booking Confirmation with ${barber.name}`;
  document.getElementById("step-select-barber").classList.add("hidden");
  document.getElementById("step-select-slot").classList.remove("hidden");

  renderSlotsList(barber);
}

function renderSlotsList(barber) {
  const slotContainer = document.getElementById("slot-options");
  if (!slotContainer) return;

  const availableSlots = barber.slots ? barber.slots.filter(s => s.available) : [];

  if (!availableSlots.length) {
    slotContainer.innerHTML = `
      <div style="grid-column: 1/-1; padding: 12px; border: 1px dashed #dc2626; background-color: #fef2f2; font-size: 12px; color: #dc2626;">
        ⚠️ <strong>No open slots currently available for ${barber.name}.</strong><br>
        Switch to <strong>[ROLE: Barber]</strong> in the top toolbar to publish available time slots first!
      </div>
    `;
    return;
  }

  slotContainer.innerHTML = barber.slots.map(s => {
    if (!s.available) {
      return `<button class="hitbox" style="border-color: #ccc; color: #999; cursor: not-allowed;" disabled>${s.day} ${s.time}<br>[BOOKED]</button>`;
    }
    return `<button class="hitbox slot-opt-btn" data-id="${s.id}">${s.day}<br><strong>${s.time}</strong></button>`;
  }).join("");

  slotContainer.querySelectorAll(".slot-opt-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const slotId = e.currentTarget.getAttribute("data-id");
      selectedBookingState.slot = barber.slots.find(s => s.id === slotId);
      slotContainer.querySelectorAll(".slot-opt-btn").forEach(b => b.classList.remove("btn-active"));
      e.currentTarget.classList.add("btn-active");
    });
  });
}

async function confirmBooking() {
  const barber = mockData.barbers.find(b => b.id === selectedBookingState.barberId);
  if (!barber) return;

  const styleInput = document.getElementById("input-desired-style").value.trim();

  if (!styleInput) {
    alert("⚠️ Please enter your desired hairstyle or cut notes.");
    return;
  }

  if (!selectedBookingState.slot) {
    alert("⚠️ Please select an available time slot published by the barber.");
    return;
  }

  const slot = selectedBookingState.slot;

  // 1. Update Slot Availability in Supabase
  await supabaseClient
    .from('slots')
    .update({ available: false, booked_by: mockData.currentUser.name })
    .eq('id', slot.id);

  // 2. Insert Booking Record into Supabase
  const { data: newBooking, error } = await supabaseClient
    .from('bookings')
    .insert([{
      barber_id: barber.id,
      barber_name: barber.name,
      customer_name: mockData.currentUser.name,
      service_name: "Classic Haircut",
      hairstyle_notes: styleInput,
      price: 15,
      day: slot.day,
      time: slot.time,
      slot_id: slot.id,
      location: barber.dorm,
      status: "Confirmed"
    }])
    .select();

  if (error) {
    alert("⚠️ Error saving booking to database.");
    return;
  }

  document.getElementById("input-desired-style").value = "";
  selectedBookingState = { barberId: null, service: null, slot: null };

  showModal(
    "Booking Confirmed! ✂️",
    `Your appointment with ${barber.name} for "${styleInput}" (RM 15) on ${slot.day} at ${slot.time} has been saved to the cloud database!`,
    () => {
      document.getElementById("subtab-check-app").click();
      document.getElementById("step-select-slot").classList.add("hidden");
      document.getElementById("step-select-barber").classList.remove("hidden");
    }
  );
}

async function renderActiveBookings() {
  const container = document.getElementById("active-bookings-list");
  if (!container) return;

  const { data: bookings, error } = await supabaseClient
    .from('bookings')
    .select('*')
    .eq('customer_name', mockData.currentUser.name);

  if (error || !bookings || bookings.length === 0) {
    container.innerHTML = `<p style="font-size: 12px; color: #666;">No active bookings found in cloud database.</p>`;
    return;
  }

  container.innerHTML = bookings.map(bk => `
    <div class="wireframe-card">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h4>${bk.barber_name} — ${bk.service_name}</h4>
        <span class="hitbox-sm" style="background-color: #111; color: #fff;">${bk.status}</span>
      </div>
      <p style="font-size: 12px; margin: 8px 0; background-color: #f8f9fa; padding: 6px; border: 1px dashed #111;">
        <strong>Requested Style:</strong> "${bk.hairstyle_notes}"
      </p>
      <p style="font-size: 12px; margin: 4px 0;"><strong>Date & Time:</strong> ${bk.day} (${bk.time})</p>
      <p style="font-size: 12px; margin: 4px 0;"><strong>Location:</strong> ${bk.location}</p>
      <p style="font-size: 12px; margin: 4px 0;"><strong>Total Price:</strong> RM ${bk.price}</p>
      
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="hitbox btn-danger btn-cancel-booking" data-id="${bk.id}" data-slot="${bk.slot_id}">Cancel Booking</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".btn-cancel-booking").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const bId = e.currentTarget.getAttribute("data-id");
      const sId = e.currentTarget.getAttribute("data-slot");
      cancelBooking(bId, sId);
    });
  });
}

async function cancelBooking(bookingId, slotId) {
  showModal("Cancel Appointment?", `Are you sure you want to cancel your appointment?`, async () => {
    if (slotId) {
      await supabaseClient.from('slots').update({ available: true, booked_by: null }).eq('id', slotId);
    }
    await supabaseClient.from('bookings').delete().eq('id', bookingId);
    await renderActiveBookings();
  });
}

/* ==========================================================================
   BARBER SCHEDULE & INCOMING WORKFLOW
   ========================================================================== */

async function renderBarberScheduleManager() {
  const container = document.getElementById("barber-active-slots-list");
  if (!container) return;

  const { data: barbers } = await supabaseClient.from('barbers').select('*');
  if (!barbers || !barbers.length) return;

  const mainBarber = barbers[0]; // Marcus Tan
  const { data: slots } = await supabaseClient.from('slots').select('*').eq('barber_id', mainBarber.id);

  if (!slots || slots.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; font-size: 12px; color: #666;">No slots published yet in cloud database.</p>`;
    return;
  }

  container.innerHTML = slots.map(s => `
    <div class="wireframe-card" style="padding: 10px; margin-bottom: 0; text-align: center; border-color: ${s.available ? '#111' : '#dc2626'};">
      <strong style="font-size: 12px;">${s.day}</strong><br>
      <span style="font-size: 13px;">${s.time}</span><br>
      <span class="hitbox-sm" style="margin-top: 6px; display: inline-block; background-color: ${s.available ? '#ffffff' : '#111111'}; color: ${s.available ? '#111111' : '#ffffff'};">
        ${s.available ? 'AVAILABLE' : 'BOOKED'}
      </span>
      <div style="margin-top: 8px;">
        <button class="hitbox-sm btn-danger btn-delete-slot" data-id="${s.id}" style="width: 100%;">Delete Slot</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".btn-delete-slot").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const sId = e.currentTarget.getAttribute("data-id");
      await supabaseClient.from('slots').delete().eq('id', sId);
      await renderBarberScheduleManager();
    });
  });
}

async function publishNewSlot() {
  const day = document.getElementById("input-slot-day").value;
  const timeInput = document.getElementById("input-slot-time");
  const time = timeInput.value.trim();

  if (!time) {
    alert("⚠️ Please enter a time for the open slot.");
    return;
  }

  const { data: barbers } = await supabaseClient.from('barbers').select('*');
  const mainBarber = barbers[0];

  await supabaseClient.from('slots').insert([{
    barber_id: mainBarber.id,
    day: day,
    time: time,
    available: true
  }]);

  timeInput.value = "";
  showModal("Slot Published! 📅", `New slot saved to cloud for ${day} at ${time}.`, async () => {
    await renderBarberScheduleManager();
  });
}

async function renderBarberIncomingBookings() {
  const container = document.getElementById("barber-incoming-bookings-list");
  if (!container) return;

  const { data: barbers } = await supabaseClient.from('barbers').select('*');
  const mainBarber = barbers[0];

  const { data: bookings } = await supabaseClient.from('bookings').select('*').eq('barber_id', mainBarber.id);

  if (!bookings || bookings.length === 0) {
    container.innerHTML = `<p style="font-size: 12px; color: #666;">No client bookings found in cloud database.</p>`;
    return;
  }

  container.innerHTML = bookings.map(bk => `
    <div class="wireframe-card">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h4>Client: ${bk.customer_name}</h4>
        <span class="hitbox-sm" style="background-color: #111; color: #fff;">${bk.status}</span>
      </div>
      <p style="font-size: 12px; margin: 8px 0; background-color: #f8f9fa; padding: 6px; border: 1px dashed #111;">
        <strong>Requested Style:</strong> "${bk.hairstyle_notes}"
      </p>
      <p style="font-size: 12px; margin: 4px 0;"><strong>Time:</strong> ${bk.day} (${bk.time})</p>
      
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="hitbox btn-primary btn-complete-cut" data-id="${bk.id}" data-barber="${bk.barber_id}">Mark Cut Completed ✂️</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".btn-complete-cut").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const bId = e.currentTarget.getAttribute("data-id");
      const barberId = e.currentTarget.getAttribute("data-barber");
      await markCutCompleted(bId, barberId);
    });
  });
}

async function markCutCompleted(bookingId, barberId) {
  // Delete completed booking
  await supabaseClient.from('bookings').delete().eq('id', bookingId);
  
  // Increment barber cuts count in DB
  const { data: barber } = await supabaseClient.from('barbers').select('cuts_count').eq('id', barberId).single();
  if (barber) {
    await supabaseClient.from('barbers').update({ cuts_count: (barber.cuts_count || 0) + 1 }).eq('id', barberId);
  }

  showModal("Cut Completed! ✂️", `Cloud record updated!`, async () => {
    await renderBarberIncomingBookings();
  });
}

function showModal(title, text, onConfirm) {
  const container = document.getElementById("modal-container");
  document.getElementById("modal-title").innerText = title;
  document.getElementById("modal-body").innerText = text;

  const btnConfirm = document.getElementById("modal-btn-confirm");
  const btnCancel = document.getElementById("modal-btn-cancel");

  container.classList.remove("hidden");
  const close = () => container.classList.add("hidden");

  btnConfirm.onclick = () => {
    close();
    if (onConfirm) onConfirm();
  };

  btnCancel.onclick = close;
}

window.renderAppointments = renderAppointments;