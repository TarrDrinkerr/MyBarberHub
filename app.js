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
const THEMES = [["amber", "Amber"], ["midnight", "Midnight"], ["forest", "Forest"], ["light", "Light"]];
const setTheme = t => { document.documentElement.dataset.theme = t; try { localStorage.setItem("theme", t); } catch {} };
const CONTACT = ""; // optional: your support email, shown in Settings
let cs = "rivalry", period = "all", lb = { all: [], month: [] }, cv = { convs: [], active: null, msgs: [], av: {} }, rt = null, chatTimer = null;
const QUICK = ["Where's your room?", "What styles do you do?", "Can I come earlier?"];
const stopChat = () => { clearInterval(chatTimer); if (rt) { sb.removeChannel(rt); rt = null; } };

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { me = null; return authView(); }
  try { const t = localStorage.getItem("theme"); if (t) setTheme(t); } catch {}
  const { data } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (!data) { await sb.auth.signOut(); return authView("login", "Profile not found. Please register again."); }
  me = data; setTheme(me.theme || "amber"); tab = me.role === "barber" ? "slots" : "barbers"; shell();
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
  box.innerHTML = `<h2 class="h">Top barbers</h2><div class="grid">${data.map(b => `<article class="card barber">${banner(b)}<div class="pad"><h3 style="margin-top:0">${esc(b.full_name)}</h3><p class="m">${esc(b.hall || "Campus")} · RM${b.price}</p><p>${b.avg_rating ? `${stars(b.avg_rating)} ${b.avg_rating}` : "New barber"} · ${b.cuts_count} cuts</p></div></article>`).join("")}</div>`;
}

function authView(mode = "login", msg = "") {
  document.documentElement.dataset.theme = "amber";
  stopChat(); cv = { convs: [], active: null, msgs: [], av: {} };
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
  stopChat();
  const tabs = me.role === "barber" ? [["slots", "My slots"], ["bookings", "Bookings"], ["profile", "Profile"], ["community", "Community"], ["settings", "Settings"]] : [["barbers", "Barbers"], ["mine", "My bookings"], ["community", "Community"], ["settings", "Settings"]];
  app.innerHTML = `<header class="bar"><b class="h" style="margin:0">MyBarberHub</b><nav>${tabs.map(([k, l]) => `<button class="tab${k === tab ? " on" : ""}" data-act="tab" data-k="${k}">${l}</button>`).join("")}</nav>
  <span class="m">${esc(me.full_name)} · <button class="link" data-act="out">Log out</button></span></header><main id="view"></main>`;
  ({ community: vCommunity, settings: vSettings, slots: vSlots, bookings: vBookings, profile: vProfile, barbers: vBarbers, mine: vBookings })[tab]();
}

/* ---------- customer ---------- */
async function vBarbers() {
  const { data, error } = await sb.from("barber_directory").select("*").order("avg_rating", { ascending: false, nullsFirst: false });
  view().innerHTML = `<h2 class="h">Pick a barber</h2>${error ? `<p class="msg">${esc(error.message)}</p>` : ""}<div class="grid">${(data || []).map(b => `
  <article class="card barber">${banner(b)}<div class="pad"><h3 style="margin-top:0">${esc(b.full_name)}</h3>
  <p class="m">${esc(b.hall || "Campus")} · ${esc(b.experience)} · RM${b.price}</p>
  <p>${b.avg_rating ? `${stars(b.avg_rating)} ${b.avg_rating} (${b.review_count})` : "No ratings yet"} · ${b.cuts_count} cuts</p>
  <p class="m">${esc(b.bio)}</p>${b.accepting === false ? `<p class="m">Not taking bookings right now.</p>` : `<button class="btn" data-act="open" data-id="${b.id}">See times</button>`}</div></article>`).join("") || `<p class="m">No barbers yet. Barbers appear here after they register as a barber.</p>`}</div>`;
}

const mediaUrl = (id, kind, v) => v ? sb.storage.from("barber-media").getPublicUrl(`${id}/${kind}.jpg`).data.publicUrl + `?v=${v}` : "";
const banner = b => {
  const bu = mediaUrl(b.id, "banner", b.banner_v), au = mediaUrl(b.id, "avatar", b.avatar_v);
  return `<div class="hd"><div class="ph banner"${bu ? ` style="background-image:url('${esc(bu)}')"` : ""}></div>${au ? `<img class="av" src="${esc(au)}" alt="">` : `<span class="av" aria-hidden="true">${esc((b.full_name || "?").charAt(0).toUpperCase())}</span>`}</div>`;
};
const reviewList = rs => rs.length ? rs.map(r => `<div class="rev"><p style="margin:0">${stars(r.stars)} <span class="m">${esc(String(r.customer_name || "").split(" ")[0])} · ${new Date(r.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</span></p>${r.comment ? `<p style="margin:4px 0 0">${esc(r.comment)}</p>` : ""}</div>`).join("") : `<p class="m">No reviews yet.</p>`;
const loadReviews = id => sb.from("reviews").select("stars,comment,customer_name,created_at").eq("barber_id", id).order("created_at", { ascending: false }).limit(20);

async function openBarber(id) {
  const [{ data: b }, { data: s }, { data: rv }] = await Promise.all([
    sb.from("barber_directory").select("*").eq("id", id).single(),
    sb.from("slots").select("id,starts_at").eq("barber_id", id).eq("status", "open").gt("starts_at", new Date().toISOString()).order("starts_at"),
    loadReviews(id)]);
  st = { b, slots: b && b.accepting === false ? [] : (s || []), reviews: rv || [], day: null, slot: null }; vBook();
}

function vBook() {
  const { b, slots, reviews, day, slot } = st, days = [...new Set(slots.map(s => dayKey(s.starts_at)))];
  view().innerHTML = `<button class="link" data-act="tab" data-k="barbers">← All barbers</button><div class="card book" style="overflow:hidden">${banner(b)}<div class="pad" style="padding-top:40px"><h2 class="h">${esc(b.full_name)}</h2>
  <p class="m">RM${b.price} · ${esc(b.hall)}</p><button class="btn ghost" data-act="msg" data-id="${b.id}">Message ${esc(b.full_name)}</button>
  ${days.length ? `<h3>Pick a day</h3><div class="chips">${days.map(d => `<button class="btn${d === day ? "" : " ghost"}" data-act="day" data-d="${d}">${dayLbl(d)}</button>`).join("")}</div>` : `<p>${b.accepting === false ? "This barber isn't taking bookings right now." : "No open slots yet. Check back soon."}</p>`}
  ${day ? `<h3>Choose a time</h3><div class="chips">${slots.filter(s => dayKey(s.starts_at) === day).map(s => `<button class="btn${s.id === slot ? "" : " ghost"}" data-act="slot" data-id="${s.id}">${timeLbl(s.starts_at)}</button>`).join("")}</div>` : ""}
  ${slot ? `<h3>Describe your cut</h3><input id="notes" class="in" maxlength="300" aria-label="Hairstyle notes" placeholder="e.g. Mid skin fade, textured top"><button class="btn" data-act="book">Confirm booking</button>` : ""}<h3>What customers say</h3>${reviewList(reviews)}</div></div>`;
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
  const [{ data: b }, { data: p }, { data: rv }] = await Promise.all([sb.from("barbers").select("*").eq("id", me.id).single(), sb.from("barber_private").select("*").eq("barber_id", me.id).single(), loadReviews(me.id)]);
  const f = (n, l, v, x = "") => `<label>${l}<input class="in" name="${n}" value="${esc(v)}" ${x}></label>`;
  view().innerHTML = `<h2 class="h">Profile</h2><form id="pf" class="card pad book">${f("hall", "Hall (shown to everyone)", b.hall, 'maxlength="60"')}${f("experience", "Experience", b.experience, 'maxlength="60"')}${f("bio", "Short bio", b.bio, 'maxlength="300"')}
  ${f("price", "Haircut price (RM)", b.price, 'type="number" min="5" max="200"')}${f("room", "Room number (only shown after a booking)", p.room_details, 'maxlength="100"')}<button class="btn">Save profile</button></form><h2 class="h" style="margin-top:32px">My reviews</h2>${reviewList(rv || [])}`;
  $("#pf").onsubmit = async e => {
    e.preventDefault(); if (!(await sameUser())) return; const v = new FormData(e.target);
    const r1 = await sb.from("barbers").update({ hall: v.get("hall"), experience: v.get("experience"), bio: v.get("bio"), price: +v.get("price") }).eq("id", me.id);
    const r2 = await sb.from("barber_private").update({ room_details: v.get("room") }).eq("barber_id", me.id);
    alert(r1.error || r2.error ? (r1.error || r2.error).message : "Profile saved.");
  };
}

/* ---------- community: rivalry + messages ---------- */
const mini = (id, v, n) => v ? `<img class="mav" src="${esc(mediaUrl(id, "avatar", v))}" alt="">` : `<span class="mav" aria-hidden="true">${esc((n || "?").charAt(0).toUpperCase())}</span>`;

function vCommunity() {
  view().innerHTML = `<h2 class="h">Community</h2><div class="chips" style="margin-bottom:20px">${[["rivalry", "Rivalry"], ["chat", "Messages"]].map(([k, l]) => `<button class="btn${cs === k ? "" : " ghost"}" data-act="cs" data-k="${k}">${l}</button>`).join("")}</div><div id="sub"></div>`;
  stopChat(); if (cs === "chat") vChat(); else vRivalry();
}

async function vRivalry() {
  const [a, m] = await Promise.all([sb.rpc("leaderboard", { p_period: "all" }), sb.rpc("leaderboard", { p_period: "month" })]);
  if (a.error) { $("#sub").innerHTML = `<p class="msg">${esc(a.error.message)}</p>`; return; }
  lb = { all: a.data || [], month: m.data || [] }; drawRivalry();
}

function drawRivalry() {
  const rows = lb[period], by = Object.fromEntries(lb.all.map(r => [r.barber_id, r]));
  const top = lb.month[0] && lb.month[0].cuts > 0 ? lb.month[0].barber_id : null;
  const tier = n => n >= 100 ? "Century Club" : n >= 50 ? "50 Club" : n >= 10 ? "10 Club" : n >= 1 ? "First Cut" : "";
  const bd = r => [r.barber_id === top ? "Barber of the month" : "", tier(by[r.barber_id].cuts)].filter(Boolean).map(x => `<span class="pill">${x}</span>`).join("");
  const rate = r => r.avg_rating ? `${stars(r.avg_rating)} ${r.avg_rating}` : "No ratings yet";
  const opts = sel => lb.all.map(r => `<option value="${r.barber_id}"${r.barber_id === sel ? " selected" : ""}>${esc(r.full_name)}</option>`).join("");
  $("#sub").innerHTML = `<div class="chips" style="margin-bottom:16px">${[["all", "All time"], ["month", "This month"]].map(([k, l]) => `<button class="btn${period === k ? "" : " ghost"}" data-act="period" data-k="${k}">${l}</button>`).join("")}</div>
  ${rows.length ? `<div class="grid">${rows.slice(0, 3).map((r, i) => `<article class="card barber">${banner({ ...r, id: r.barber_id })}<div class="pad"><h3 style="margin-top:0">${["1st", "2nd", "3rd"][i]} · ${esc(r.full_name)}</h3><p class="m">${esc(r.hall || "Campus")}</p><p><b>${r.cuts}</b> cuts · ${rate(r)}</p><div>${bd(r)}</div></div></article>`).join("")}</div>` : `<p class="m">No barbers yet.</p>`}
  ${rows.length > 3 ? `<div class="card" style="margin-top:16px">${rows.slice(3).map((r, i) => `<div class="rk"><b>${i + 4}</b>${mini(r.barber_id, r.avatar_v, r.full_name)}<span style="flex:1;min-width:120px"><b>${esc(r.full_name)}</b> <span class="m">${esc(r.hall || "")}</span></span><span><b>${r.cuts}</b> cuts</span><span>${rate(r)}</span><div>${bd(r)}</div></div>`).join("")}</div>` : ""}
  ${lb.all.length > 1 ? `<h3>Head to head</h3><div class="card pad"><div class="row"><label>Barber A<select id="ha" class="in">${opts(lb.all[0].barber_id)}</select></label><label>Barber B<select id="hb" class="in">${opts(lb.all[1].barber_id)}</select></label></div><div id="hh"></div></div>` : ""}`;
  if (lb.all.length > 1) { $("#ha").onchange = $("#hb").onchange = drawH2H; drawH2H(); }
}

function drawH2H() {
  const g = id => lb.all.find(r => r.barber_id === $(id).value), a = g("#ha"), b = g("#hb");
  const mo = r => (lb.month.find(x => x.barber_id === r.barber_id) || { cuts: 0 }).cuts;
  const row = (l, x, y, f = v => v) => `<div class="vs"><b class="${x > y ? "win" : ""}">${f(x)}</b><span class="m">${l}</span><b class="${y > x ? "win" : ""}">${f(y)}</b></div>`;
  $("#hh").innerHTML = `<div class="vs"><b>${esc(a.full_name)}</b><span></span><b>${esc(b.full_name)}</b></div>` + row("All-time cuts", a.cuts, b.cuts) + row("This month", mo(a), mo(b)) + row("Average rating", +a.avg_rating || 0, +b.avg_rating || 0, v => v || "–") + row("Reviews", a.review_count, b.review_count);
}

const unread = c => { const rk = me.role === "barber" ? "barber_read_at" : "customer_read_at"; return c.last_sender && c.last_sender !== me.id && (!c[rk] || new Date(c.last_message_at) > new Date(c[rk])); };

async function loadConvs() {
  const { data } = await sb.from("conversations").select("*").order("last_message_at", { ascending: false, nullsFirst: false });
  cv.convs = data || [];
}

function renderList() {
  const el = $("#cl"); if (!el) return;
  el.innerHTML = cv.convs.length ? cv.convs.map(c => {
    const barber = me.role === "barber", n = barber ? c.customer_name : c.barber_name;
    return `<button class="ci${c.id === cv.active ? " on" : ""}" data-act="conv" data-id="${c.id}">${barber ? mini(c.customer_id, null, n) : mini(c.barber_id, cv.av[c.barber_id], n)}<span class="ctx"><b>${esc(n)}</b><span class="m">${esc(c.last_body || "No messages yet")}</span></span>${unread(c) ? `<i class="dot" role="img" aria-label="Unread"></i>` : ""}</button>`;
  }).join("") : `<p class="m pad">${me.role === "barber" ? "No messages yet. Customers can message you from your booking page." : "No conversations yet. Open a barber and tap Message."}</p>`;
}

async function loadMsgs() {
  const { data } = await sb.from("messages").select("*").eq("conversation_id", cv.active).order("created_at", { ascending: false }).limit(100);
  cv.msgs = (data || []).reverse();
  const c = cv.convs.find(x => x.id === cv.active);
  if (c && unread(c)) { sb.rpc("mark_read", { p_conversation: c.id }); c[me.role === "barber" ? "barber_read_at" : "customer_read_at"] = new Date().toISOString(); renderList(); }
}

function renderMsgs(jump) {
  const el = $("#ctm"); if (!el) return;
  const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  el.innerHTML = cv.msgs.length ? cv.msgs.map(m => `<div class="msgb${m.sender_id === me.id ? " me" : ""}"><p>${esc(m.body)}</p><small class="m">${timeLbl(m.created_at)}</small></div>`).join("") : `<p class="m">No messages yet. Say hello.</p>`;
  if (near || jump) el.scrollTop = el.scrollHeight;
}

async function refreshChat() {
  if (tab !== "community" || cs !== "chat" || !$("#cl")) return;
  await loadConvs(); renderList();
  if (cv.active && $("#ctm")) { await loadMsgs(); renderMsgs(); }
}

async function openConv(id) {
  const c = cv.convs.find(x => x.id === id); if (!c || !$("#chat")) return;
  cv.active = id;
  const other = me.role === "barber" ? c.customer_name : c.barber_name;
  $("#chat").classList.add("open");
  $("#ct").innerHTML = `<div class="cth"><button class="link back" data-act="chatback" aria-label="Back to conversations">←</button><b>${esc(other)}</b></div><div id="cbk" class="cbk m"></div><div id="ctm" class="ctm" aria-live="polite"></div>
  ${me.role === "customer" ? `<div class="chips qk">${QUICK.map(q => `<button class="btn ghost" data-act="chip" data-t="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : ""}
  <form id="cf" class="cf"><input class="in" name="m" maxlength="500" required autocomplete="off" aria-label="Message" placeholder="Message ${esc(other)}"><button class="btn">Send</button></form>`;
  $("#cf").onsubmit = async e => {
    e.preventDefault(); const inp = e.target.m, body = inp.value.trim(); if (!body) return;
    if (!(await sameUser())) return;
    inp.value = "";
    const { error } = await sb.rpc("send_message", { p_conversation: id, p_body: body });
    if (error) { alert(error.message); inp.value = body; return; }
    refreshChat();
  };
  sb.from("bookings").select("starts_at,status,payment_status").eq("customer_id", c.customer_id).eq("barber_id", c.barber_id).neq("status", "cancelled").order("starts_at", { ascending: false }).limit(1)
    .then(({ data }) => { const el = $("#cbk"); if (el) el.textContent = data && data[0] ? `Booking: ${when(data[0].starts_at)} · ${label(data[0])}` : "No booking between you two yet."; });
  await loadMsgs(); renderMsgs(true); renderList();
}

async function vChat() {
  $("#sub").innerHTML = `<div id="chat" class="chat card"><div id="cl" class="cl"></div><div id="ct" class="ct"><p class="m pad">Select a conversation.</p></div></div>`;
  if (me.role === "customer") { const { data } = await sb.from("barber_directory").select("id,avatar_v"); cv.av = Object.fromEntries((data || []).map(b => [b.id, b.avatar_v])); }
  await loadConvs(); renderList();
  if (cv.active && cv.convs.some(c => c.id === cv.active)) openConv(cv.active); else cv.active = null;
  rt = sb.channel("messages-feed").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => refreshChat()).subscribe();
  chatTimer = setInterval(refreshChat, 10000);
}

/* ---------- photo upload (resize + re-encode in the browser) ---------- */
const IMG = { avatar: [400, 400], banner: [1200, 400] };
async function uploadImg(kind, file) {
  const m = $("#imm"); if (!file) return;
  if (!(await sameUser())) return;
  m.style.color = "";
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return (m.textContent = "Choose a JPEG, PNG or WebP image.");
  if (file.size > 15 * 1024 * 1024) return (m.textContent = "That image is too large (max 15 MB).");
  m.textContent = "Uploading…";
  try {
    const [w, h] = IMG[kind];
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => createImageBitmap(file));
    const r = Math.max(w / bmp.width, h / bmp.height), sw = w / r, sh = h / r;
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cx = cv.getContext("2d"); cx.fillStyle = "#000"; cx.fillRect(0, 0, w, h);
    cx.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, w, h);
    const blob = await new Promise(res => cv.toBlob(res, "image/jpeg", 0.82));
    if (!blob) throw new Error("Could not process that image.");
    const up = await sb.storage.from("barber-media").upload(`${me.id}/${kind}.jpg`, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
    if (up.error) throw up.error;
    const { error } = await sb.from("barbers").update({ [kind + "_v"]: Date.now() }).eq("id", me.id);
    if (error) throw error;
    vSettings();
  } catch (err) { m.textContent = err.message || "Upload failed."; }
}

/* ---------- settings ---------- */
async function vSettings() {
  const barber = me.role === "barber";
  let acc = true, av = null, bv = null;
  if (barber) { const { data } = await sb.from("barbers").select("accepting,avatar_v,banner_v").eq("id", me.id).single(); acc = !data || data.accepting !== false; av = data && data.avatar_v; bv = data && data.banner_v; }
  view().innerHTML = `<h2 class="h">Settings</h2><div class="set">
  <form id="nf" class="card pad"><h3 style="margin-top:0">Display name</h3><label>Name<input class="in" name="n" value="${esc(me.full_name)}" required maxlength="80"></label><button class="btn">Save name</button></form>
  <div class="card pad"><h3 style="margin-top:0">Color theme</h3><div class="chips">${THEMES.map(([k, l]) => `<button class="btn${(me.theme || "amber") === k ? "" : " ghost"}" data-act="theme" data-k="${k}">${l}</button>`).join("")}</div></div>
  ${barber ? `<div class="card pad"><h3 style="margin-top:0">Bookings</h3><p class="m">${acc ? "Customers can book your open slots." : "Bookings are paused. Customers can't book your slots."}</p><button class="btn${acc ? " ghost" : ""}" data-act="pause" data-v="${acc ? "false" : "true"}">${acc ? "Pause bookings" : "Resume bookings"}</button></div>` : ""}
  ${barber ? `<div class="card pad"><h3 style="margin-top:0">Photos</h3><p class="m">Shown on your barber card and booking page. Images are resized in your browser and hidden location data is removed.</p>${banner({ id: me.id, full_name: me.full_name, avatar_v: av, banner_v: bv })}<div style="height:36px"></div>
  <div class="row"><label>Banner (wide photo)<input class="in" type="file" id="f-banner" accept="image/jpeg,image/png,image/webp"></label>${bv ? `<button class="btn ghost" data-act="rmimg" data-k="banner">Remove banner</button>` : ""}</div>
  <div class="row"><label>Profile picture<input class="in" type="file" id="f-avatar" accept="image/jpeg,image/png,image/webp"></label>${av ? `<button class="btn ghost" data-act="rmimg" data-k="avatar">Remove picture</button>` : ""}</div>
  <p class="msg" id="imm" role="status"></p></div>` : ""}
  <form id="pw" class="card pad"><h3 style="margin-top:0">Change password</h3><label>New password<input class="in" type="password" name="p1" minlength="6" required autocomplete="new-password"></label><label>Repeat password<input class="in" type="password" name="p2" minlength="6" required autocomplete="new-password"></label><p class="msg" id="pwm" role="alert"></p><button class="btn">Change password</button></form>
  <div class="card pad"><h3 style="margin-top:0">Privacy and terms</h3>
  <p class="m">We store your name, email, bookings, ratings and reviews. Payments happen in person; this site never handles money or card details.</p>
  <p class="m">Barbers see the name and style notes of customers who book them. Customers see a barber's name, hall, price and reviews, and the room number only after booking. Review comments show your first name.</p>
  <p class="m">You can delete your account at any time below, which removes your data from the site.${CONTACT ? ` Questions: ${esc(CONTACT)}` : ""}</p></div>
  <div class="card pad"><h3 style="margin-top:0">Delete account</h3><p class="m">Permanently removes your account, slots, bookings and reviews. Cancel any upcoming bookings first.</p><button class="btn ghost" data-act="del">Delete my account</button></div></div>`;
  if (barber) { $("#f-banner").onchange = e => uploadImg("banner", e.target.files[0]); $("#f-avatar").onchange = e => uploadImg("avatar", e.target.files[0]); }
  $("#nf").onsubmit = async e => {
    e.preventDefault(); if (!(await sameUser())) return;
    const n = String(new FormData(e.target).get("n")).trim(); if (!n) return;
    const { error } = await sb.from("profiles").update({ full_name: n }).eq("id", me.id);
    if (error) return alert(error.message);
    me.full_name = n; shell(); alert("Name saved.");
  };
  $("#pw").onsubmit = async e => {
    e.preventDefault(); if (!(await sameUser())) return;
    const f = new FormData(e.target), m = $("#pwm");
    if (f.get("p1") !== f.get("p2")) { m.style.color = ""; return (m.textContent = "Passwords don't match."); }
    const { error } = await sb.auth.updateUser({ password: f.get("p1") });
    m.style.color = error ? "" : "var(--ac)"; m.textContent = error ? error.message : "Password changed.";
    if (!error) e.target.reset();
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
    const { count } = await sb.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed");
    if (count) return alert("Cancel your upcoming bookings before deleting your account.");
    if (me.role === "barber") await sb.storage.from("barber-media").remove([`${me.id}/avatar.jpg`, `${me.id}/banner.jpg`]);
    const { error } = await sb.rpc("delete_my_account");
    if (error) return alert(error.message);
    await sb.auth.signOut({ scope: "local" }); me = null; boot();
  }
  else if (a === "cs") { cs = el.dataset.k; vCommunity(); }
  else if (a === "period") { period = el.dataset.k; drawRivalry(); }
  else if (a === "conv") openConv(id);
  else if (a === "chatback") { $("#chat").classList.remove("open"); cv.active = null; renderList(); }
  else if (a === "chip") { const i = $("#cf").m; i.value = el.dataset.t; i.focus(); }
  else if (a === "msg") {
    const { data, error } = await sb.rpc("start_conversation", { p_barber: id });
    if (error) return alert(error.message);
    cv.active = data; cs = "chat"; tab = "community"; shell();
  }
  else if (a === "rmimg") {
    const k = el.dataset.k;
    const { error } = await sb.from("barbers").update({ [k + "_v"]: null }).eq("id", me.id);
    if (error) alert(error.message); else await sb.storage.from("barber-media").remove([`${me.id}/${k}.jpg`]);
    vSettings();
  }
  else if (a === "theme") {
    const k = el.dataset.k; me.theme = k; setTheme(k);
    const { error } = await sb.from("profiles").update({ theme: k }).eq("id", me.id);
    if (error) alert(error.message);
    vSettings();
  }
  else if (a === "pause") {
    const { error } = await sb.from("barbers").update({ accepting: el.dataset.v === "true" }).eq("id", me.id);
    if (error) alert(error.message);
    vSettings();
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
