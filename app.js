/* MyBarberHub – customer & barber app (Supabase Auth + RLS) */
const sb = window.supabase.createClient("https://ojbuzzksygkrwuqujcvi.supabase.co", "sb_publishable_qfZ6b2_NhAWyu2-kKorLzA_LXXDco3T");
const $ = s => document.querySelector(s), app = $("#app"), view = () => $("#view");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const O = { weekday: "short", day: "numeric", month: "short" }, T = { hour: "numeric", minute: "2-digit" };
const when = d => new Date(d).toLocaleString("en-MY", { ...O, ...T });
const dayKey = d => new Date(d).toLocaleDateString("en-CA");
const dayLbl = k => new Date(k + "T00:00").toLocaleDateString("en-MY", O);
const timeLbl = d => new Date(d).toLocaleTimeString("en-MY", T);
const stars = n => `<span class="star" role="img" aria-label="${n} out of 5">${"★".repeat(Math.round(n))}${"☆".repeat(5 - Math.round(n))}</span>`;
let me = null, tab = "", st = {};

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { me = null; return authView(); }
  const { data } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (!data) { await sb.auth.signOut(); return authView("login", "Profile not found. Please register again."); }
  me = data; tab = me.role === "barber" ? "slots" : "barbers"; shell();
}

async function sameUser() {
  const { data: { session } } = await sb.auth.getSession();
  if (me && session && session.user.id === me.id) return true;
  alert("Your login changed (you may be signed in as another user in a different tab). Reloading your account.");
  boot(); return false;
}
sb.auth.onAuthStateChange((ev, session) => {
  if (ev === "SIGNED_OUT" && me) { me = null; authView(); }
  else if (ev === "SIGNED_IN" && me && session && session.user.id !== me.id) setTimeout(boot, 0);
});

async function loadTop() {
  const { data } = await sb.from("barber_directory").select("*").order("avg_rating", { ascending: false, nullsFirst: false }).limit(3);
  const box = $("#top"); if (!box || !data || !data.length) return;
  box.innerHTML = `<h2 class="h">Top barbers</h2><div class="grid">${data.map(b => `<article class="card barber"><div class="ph"></div><div class="pad"><h3 style="margin-top:0">${esc(b.full_name)}</h3><p class="m">${esc(b.hall || "Campus")} · RM${b.price}</p><p>${b.avg_rating ? `${stars(b.avg_rating)} ${b.avg_rating}` : "New barber"} · ${b.cuts_count} cuts</p></div></article>`).join("")}</div>`;
}

function authView(mode = "login", msg = "") {
  const reg = mode === "register";
  app.innerHTML = `<section class="hero"><div><h1 class="h">Fresh cuts, right in your hall.</h1>
  <p class="m" style="font-size:18px;max-width:480px">Book a trusted student barber on campus. Pick any day, choose a time, pay in person, then rate your cut.</p></div>
  <div class="card"><h2 class="h">${reg ? "Create account" : "Log in"}</h2><form id="af">
  ${reg ? `<label>Full name<input class="in" name="name" required maxlength="80"></label>` : ""}
  <label>Email<input class="in" type="email" name="email" required></label>
  <label>Password<input class="in" type="password" name="pw" minlength="6" required></label>
  ${reg ? `<fieldset><legend>I am a</legend><label><input type="radio" name="role" value="customer" required> Customer</label><label><input type="radio" name="role" value="barber"> Barber</label></fieldset>` : ""}
  <p class="msg" id="msg" role="alert">${esc(msg)}</p><button class="btn" style="width:100%">${reg ? "Create account" : "Log in"}</button></form>
  <button class="link" data-act="mode" data-mode="${reg ? "login" : "register"}">${reg ? "Have an account? Log in" : "New here? Create an account"}</button></div></section>
  <section class="land"><h2 class="h">How it works</h2><ol class="steps">
  <li class="card"><h3>Pick a barber</h3><p class="m">Browse student barbers by hall, price and rating.</p></li>
  <li class="card"><h3>Choose a day and time</h3><p class="m">Any day of the week, from the barber's open slots.</p></li>
  <li class="card"><h3>Get your cut</h3><p class="m">Pay the barber in person by cash or QR.</p></li>
  <li class="card"><h3>Rate your barber</h3><p class="m">Ratings unlock once payment is confirmed.</p></li></ol>
  <p><button class="btn" data-act="mode" data-mode="register">Create an account</button></p></section>
  <section class="land" id="top"></section>`;
  loadTop();
  $("#af").onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target), m = $("#msg"); m.textContent = "";
    const cred = { email: f.get("email"), password: f.get("pw") };
    const r = reg ? await sb.auth.signUp({ ...cred, options: { data: { full_name: f.get("name"), role: f.get("role") } } }) : await sb.auth.signInWithPassword(cred);
    if (r.error) return (m.textContent = r.error.message);
    if (!r.data.session) return (m.textContent = "Check your email to confirm your account, then log in.");
    boot();
  };
}

function shell() {
  const tabs = me.role === "barber" ? [["slots", "My slots"], ["bookings", "Bookings"], ["profile", "Profile"]] : [["barbers", "Barbers"], ["mine", "My bookings"]];
  app.innerHTML = `<header class="bar"><b class="h" style="margin:0">MyBarberHub</b><nav>${tabs.map(([k, l]) => `<button class="tab${k === tab ? " on" : ""}" data-act="tab" data-k="${k}">${l}</button>`).join("")}</nav>
  <span class="m">${esc(me.full_name)} · <button class="link" data-act="out">Log out</button> · <button class="link" data-act="del">Delete account</button></span></header><main id="view"></main>`;
  ({ slots: vSlots, bookings: vBookings, profile: vProfile, barbers: vBarbers, mine: vBookings })[tab]();
}

/* ---------- customer ---------- */
async function vBarbers() {
  const { data, error } = await sb.from("barber_directory").select("*").order("avg_rating", { ascending: false, nullsFirst: false });
  view().innerHTML = `<h2 class="h">Pick a barber</h2>${error ? `<p class="msg">${esc(error.message)}</p>` : ""}<div class="grid">${(data || []).map(b => `
  <article class="card barber"><div class="ph"></div><div class="pad"><h3 style="margin-top:0">${esc(b.full_name)}</h3>
  <p class="m">${esc(b.hall || "Campus")} · ${esc(b.experience)} · RM${b.price}</p>
  <p>${b.avg_rating ? `${stars(b.avg_rating)} ${b.avg_rating} (${b.review_count})` : "No ratings yet"} · ${b.cuts_count} cuts</p>
  <p class="m">${esc(b.bio)}</p><button class="btn" data-act="open" data-id="${b.id}">See times</button></div></article>`).join("") || `<p class="m">No barbers yet. Barbers appear here after they register as a barber.</p>`}</div>`;
}

async function openBarber(id) {
  const [{ data: b }, { data: s }] = await Promise.all([
    sb.from("barber_directory").select("*").eq("id", id).single(),
    sb.from("slots").select("id,starts_at").eq("barber_id", id).eq("status", "open").gt("starts_at", new Date().toISOString()).order("starts_at")]);
  st = { b, slots: s || [], day: null, slot: null }; vBook();
}

function vBook() {
  const { b, slots, day, slot } = st, days = [...new Set(slots.map(s => dayKey(s.starts_at)))];
  view().innerHTML = `<button class="link" data-act="tab" data-k="barbers">← All barbers</button><div class="card pad book"><h2 class="h">${esc(b.full_name)}</h2>
  <p class="m">RM${b.price} · ${esc(b.hall)}</p>
  ${days.length ? `<h3>Pick a day</h3><div class="chips">${days.map(d => `<button class="btn${d === day ? "" : " ghost"}" data-act="day" data-d="${d}">${dayLbl(d)}</button>`).join("")}</div>` : `<p>No open slots yet. Check back soon.</p>`}
  ${day ? `<h3>Choose a time</h3><div class="chips">${slots.filter(s => dayKey(s.starts_at) === day).map(s => `<button class="btn${s.id === slot ? "" : " ghost"}" data-act="slot" data-id="${s.id}">${timeLbl(s.starts_at)}</button>`).join("")}</div>` : ""}
  ${slot ? `<h3>Describe your cut</h3><input id="notes" class="in" maxlength="300" aria-label="Hairstyle notes" placeholder="e.g. Mid skin fade, textured top"><button class="btn" data-act="book">Confirm booking</button>` : ""}</div>`;
}

/* ---------- bookings (customer "mine" and barber "bookings") ---------- */
const label = b => b.status === "cancelled" ? "Cancelled" : b.status === "confirmed" ? "Confirmed" : b.payment_status === "paid" ? "Paid" : "Completed, payment pending";

async function vBookings() {
  const barber = me.role === "barber";
  const [{ data: bk, error }, { data: rv }, { data: rooms }] = await Promise.all([
    sb.from("bookings").select("*").order("starts_at", { ascending: false }),
    sb.from("reviews").select("booking_id").eq("customer_id", me.id),
    sb.from("barber_private").select("*")]);
  const done = new Set((rv || []).map(r => r.booking_id)), room = Object.fromEntries((rooms || []).map(r => [r.barber_id, r.room_details]));
  view().innerHTML = `<h2 class="h">${barber ? "Bookings" : "My bookings"}</h2>${error ? `<p class="msg">${esc(error.message)}</p>` : ""}` + ((bk || []).map(b => {
    let act = "";
    if (b.status === "confirmed") act += `<button class="btn ghost" data-act="cancel" data-id="${b.id}">Cancel</button>`;
    if (barber && b.status === "confirmed") act += `<button class="btn" data-act="complete" data-id="${b.id}">Mark cut completed</button>`;
    if (barber && b.status === "completed" && b.payment_status === "unpaid") act += `<button class="btn" data-act="paid" data-id="${b.id}">Confirm payment received</button>`;
    if (!barber && b.payment_status === "paid") act += done.has(b.id) ? `<span class="m">Thanks, you rated this cut.</span>` :
      `<label>Rating<select id="st-${b.id}" class="in">${[5, 4, 3, 2, 1].map(n => `<option>${n}</option>`).join("")}</select></label><label>Comment (optional)<input id="cm-${b.id}" class="in" maxlength="300"></label><button class="btn" data-act="rate" data-id="${b.id}">Submit rating</button>`;
    return `<div class="card pad bk"><div class="top"><b>${esc(barber ? b.customer_name : b.barber_name)} · ${when(b.starts_at)}</b><span class="st">${label(b)}</span></div>
    <p class="m" style="margin:6px 0">“${esc(b.hairstyle_notes)}” · RM${b.price}</p>
    ${!barber && room[b.barber_id] && b.status !== "cancelled" ? `<p>Room: ${esc(room[b.barber_id])}</p>` : ""}${act ? `<div class="row">${act}</div>` : ""}</div>`;
  }).join("") || `<p class="m">No bookings yet.</p>`);
}

/* ---------- barber ---------- */
const pad2 = n => String(n).padStart(2, "0");
let lastDay = "";
function dayOptions() {
  let o = "";
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const k = d.toLocaleDateString("en-CA");
    o += `<option value="${k}"${k === lastDay ? " selected" : ""}>${d.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "short" })}</option>`;
  }
  return o;
}
function timeOptions() {
  let o = "";
  for (let m = 8 * 60; m <= 23 * 60 + 30; m += 30) {
    const v = `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
    o += `<option value="${v}">${new Date(`2000-01-01T${v}`).toLocaleTimeString("en-MY", T)}</option>`;
  }
  return o;
}

async function vSlots() {
  const { data } = await sb.from("slots").select("*").eq("barber_id", me.id).gt("starts_at", new Date().toISOString()).order("starts_at");
  view().innerHTML = `<h2 class="h">My slots</h2><form id="sf" class="card pad row"><label>Day<select class="in" name="d">${dayOptions()}</select></label><label>Time<select class="in" name="tm">${timeOptions()}</select></label><button class="btn">Publish slot</button></form>
  <div class="grid">${(data || []).map(s => `<div class="card pad"><b>${when(s.starts_at)}</b><p class="m">${s.status === "open" ? "Open" : "Booked"}</p>${s.status === "open" ? `<button class="btn ghost" data-act="delslot" data-id="${s.id}">Delete</button>` : ""}</div>`).join("") || `<p class="m">No upcoming slots. Publish your first one above.</p>`}</div>`;
  $("#sf").onsubmit = async e => {
    e.preventDefault();
    if (!(await sameUser())) return;
    const f = new FormData(e.target), at = new Date(`${f.get("d")}T${f.get("tm")}`);
    lastDay = f.get("d");
    if (at <= new Date()) return alert(`${when(at)} has already passed. Pick a later time.`);
    const { error } = await sb.from("slots").insert({ barber_id: me.id, starts_at: at.toISOString() });
    if (error) alert(error.code === "23505" ? "You already have a slot at that time." : error.message);
    vSlots();
  };
}

async function vProfile() {
  const [{ data: b }, { data: p }] = await Promise.all([sb.from("barbers").select("*").eq("id", me.id).single(), sb.from("barber_private").select("*").eq("barber_id", me.id).single()]);
  const f = (n, l, v, x = "") => `<label>${l}<input class="in" name="${n}" value="${esc(v)}" ${x}></label>`;
  view().innerHTML = `<h2 class="h">Profile</h2><form id="pf" class="card pad book">${f("hall", "Hall (shown to everyone)", b.hall, 'maxlength="60"')}${f("experience", "Experience", b.experience, 'maxlength="60"')}${f("bio", "Short bio", b.bio, 'maxlength="300"')}
  ${f("price", "Haircut price (RM)", b.price, 'type="number" min="5" max="200"')}${f("room", "Room number (only shown after a booking)", p.room_details, 'maxlength="100"')}<button class="btn">Save profile</button></form>`;
  $("#pf").onsubmit = async e => {
    e.preventDefault(); if (!(await sameUser())) return; const v = new FormData(e.target);
    const r1 = await sb.from("barbers").update({ hall: v.get("hall"), experience: v.get("experience"), bio: v.get("bio"), price: +v.get("price") }).eq("id", me.id);
    const r2 = await sb.from("barber_private").update({ room_details: v.get("room") }).eq("barber_id", me.id);
    alert(r1.error || r2.error ? (r1.error || r2.error).message : "Profile saved.");
  };
}

/* ---------- actions ---------- */
document.addEventListener("click", async e => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  if (!["mode", "out"].includes(a) && !(await sameUser())) return;
  const rpc = async (fn, args) => { const { error } = await sb.rpc(fn, args); if (error) alert(error.message); shell(); };
  if (a === "mode") authView(el.dataset.mode);
  else if (a === "del") {
    if (prompt("This permanently deletes your account and data. Type DELETE to confirm.") !== "DELETE") return;
    const { error } = await sb.rpc("delete_my_account");
    if (error) return alert(error.message);
    await sb.auth.signOut({ scope: "local" }); me = null; boot();
  }
  else if (a === "tab") { tab = el.dataset.k; shell(); }
  else if (a === "out") { await sb.auth.signOut(); boot(); }
  else if (a === "open") openBarber(id);
  else if (a === "day") { st.day = el.dataset.d; st.slot = null; vBook(); }
  else if (a === "slot") { st.slot = id; vBook(); }
  else if (a === "book") {
    const { error } = await sb.rpc("book_slot", { p_slot_id: st.slot, p_notes: $("#notes").value });
    if (error) { alert(error.message); return openBarber(st.b.id); }
    tab = "mine"; shell();
  }
  else if (a === "cancel") { if (confirm("Cancel this booking?")) rpc("cancel_booking", { p_booking_id: id }); }
  else if (a === "complete") rpc("complete_booking", { p_booking_id: id });
  else if (a === "paid") rpc("mark_paid", { p_booking_id: id });
  else if (a === "rate") rpc("submit_review", { p_booking_id: id, p_stars: +$("#st-" + id).value, p_comment: $("#cm-" + id).value });
  else if (a === "delslot") { await sb.from("slots").delete().eq("id", id); vSlots(); }
});

boot();
