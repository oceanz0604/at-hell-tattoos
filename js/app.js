import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= FIREBASE ================= */
const firebaseConfig = {
  apiKey: "AIzaSyBwdm22I80Cau2t7BNYJf1jQsLixA_c3ww",
  authDomain: "at-hell-tattoo.firebaseapp.com",
  projectId: "at-hell-tattoo",
  storageBucket: "at-hell-tattoo.firebasestorage.app",
  messagingSenderId: "906336432152",
  appId: "1:906336432152:web:c62868081b1b940622d36d"
};

const IMGBB_API_KEY = "c1c3975eab9d02dc16f05d8bd7b17f99";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ================= SHARED STATE ================= */
let adminCache = [];

/* ================= DOM ================= */
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");

/* ================= VIEWS ================= */
const views = {
  landing: landingView,
  auth: authView,
  booking: bookingView,
  history: historyView,
  profile: profileView,
  admin: adminView,
  list: listView,
  calendar: calendarView
};

/* ================= HELPERS ================= */
function show(el) {
  if (el) el.classList.remove("hidden");
}

function hide(el) {
  if (el) el.classList.add("hidden");
}

function hideAllViews() {
  Object.values(views).forEach(v => {
    if (v) v.classList.add("hidden");
  });
}

function showMenu() {
  menuBtn?.classList.remove("hidden");
}

function hideMenu() {
  menuBtn?.classList.add("hidden");
}

function closeSidebar() {
  sidebar?.classList.remove("active");
  overlay?.classList.remove("active");
}

/* ================= SIDEBAR ================= */
menuBtn?.addEventListener("click", () => {
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
});

overlay?.addEventListener("click", closeSidebar);

/* ================= NAVIGATION ================= */
document.querySelectorAll("[data-nav]").forEach(el => {
  el.addEventListener("click", () => navigate(el.dataset.nav));
});

window.navigate = (view) => {
  hideAllViews();

  if (view === "booking") show(views.booking);

  if (view === "history") {
    show(views.history);
    loadUser(auth.currentUser.email);
  }

  if (view === "profile") show(views.profile);

  if (view === "list" || view === "calendar") {
    show(views.admin);

    if (views.list) {
      views.list.classList.toggle("hidden", view !== "list");
    }

    if (views.calendar) {
      views.calendar.classList.toggle("hidden", view !== "calendar");
    }

    if (view === "calendar" && views.calendar) {
      renderCalendar();
    }
  }

  closeSidebar();
};

/* ================= LANDING ================= */
startBooking.onclick = () => {
  hideAllViews();
  hideMenu();
  show(views.auth);
};

/* ================= AUTH ================= */
let signup = false;

toggleAuth.onclick = () => {
  signup = !signup;

  document.querySelectorAll(".auth-extra")
    .forEach(e => e.classList.toggle("hidden"));

  authTitle.textContent = signup ? "CREATE ACCOUNT" : "STUDIO LOGIN";

  authToggleText.textContent = signup
    ? "Already have an account? Login"
    : "New here? Create an account";
};

authForm.onsubmit = async e => {
  e.preventDefault();
  try {
    if (signup) {
      const res = await createUserWithEmailAndPassword(auth, email.value, password.value);
      await setDoc(doc(db, "users", res.user.uid), {
        name: regName.value,
        phone: regPhone.value,
        email: email.value,
        role: "user"
      });
    } else {
      await signInWithEmailAndPassword(auth, email.value, password.value);
    }
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove("hidden");
  }
};

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, async user => {
  hideAllViews();
  closeSidebar();

  document.querySelectorAll(".user-link,.admin-link,.auth-required")
    .forEach(el => el.classList.add("hidden"));

  if (!user) {
    hideMenu();
    show(views.landing);
    return;
  }

  document.querySelector(".auth-card")?.classList.add("auth-success");
  showMenu();

  const snap = await getDoc(doc(db, "users", user.uid));
  const role = snap.data()?.role;

  if (role === "admin") {
    document.querySelectorAll(".admin-link,.auth-required")
      .forEach(el => el.classList.remove("hidden"));
    show(views.admin);
    show(views.list);
    loadAdmin();
  } else {
    document.querySelectorAll(".user-link,.auth-required")
      .forEach(el => el.classList.remove("hidden"));
    show(views.booking);
    loadProfile();
  }
});

/* ================= LOGOUT ================= */
logoutBtn?.addEventListener("click", () => {
  logoutModal.classList.remove("hidden");
});

cancelLogout?.addEventListener("click", () => {
  logoutModal.classList.add("hidden");
});

confirmLogout?.addEventListener("click", async () => {
  logoutModal.classList.add("hidden");
  closeSidebar();
  hideMenu();
  await signOut(auth);
  hideAllViews();
  show(views.landing);
});

/* ================= PROFILE ================= */
async function loadProfile() {
  const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
  editName.value = snap.data()?.name || "";
  editPhone.value = snap.data()?.phone || "";
}

profileForm.onsubmit = async e => {
  e.preventDefault();
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    name: editName.value,
    phone: editPhone.value
  });
};

/* ================= BOOKING ================= */
const timeSelect = document.getElementById("time");

function populateTimeSlots(startHour = 11, endHour = 22) {
  timeSelect.innerHTML = '<option value="">Select time</option>';

  for (let hour = startHour; hour <= endHour; hour++) {
    const h = String(hour).padStart(2, "0");

    timeSelect.innerHTML += `
      <option value="${h}:00">${h}:00</option>
      <option value="${h}:30">${h}:30</option>
    `;
  }
}

populateTimeSlots();

bookingForm.onsubmit = async e => {
  e.preventDefault();

  const clash = await getDocs(query(
    collection(db, "bookings"),
    where("date", "==", date.value),
    where("time", "==", time.value),
    where("status", "==", "confirmed")
  ));

  if (!clash.empty) {
    alert("Slot already booked");
    return;
  }

  let imageUrl = "";
  if (refImage.files[0]) {
    const fd = new FormData();
    fd.append("image", refImage.files[0]);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: fd
    });
    imageUrl = (await res.json()).data.display_url;
  }

  await addDoc(collection(db, "bookings"), {
    userId: auth.currentUser.uid,
    email: auth.currentUser.email,
    idea: idea.value,
    imageUrl,
    date: date.value,
    time: time.value,
    status: "pending",
    createdAt: new Date()
  });

  bookingForm.reset();
};

/* ================= HISTORY ================= */
async function loadUser(email) {
  userList.innerHTML = "";
  const snap = await getDocs(query(collection(db, "bookings"), where("email", "==", email)));
  snap.forEach(d => {
    const b = d.data();
    const hasImage = !!b.imageUrl;
    userList.innerHTML += `
      <div class="history-item">

        <!-- HEADER -->
        <div class="row">
          <span class="history-date">${b.date}</span>
        </div>

        <!-- TIME -->
        <div class="history-time">${b.time}</div>

        <!-- IDEA -->
        <div class="history-idea">${b.idea}</div>

        <!-- IMAGE PREVIEW -->
        ${hasImage ? `
          <img src="${b.imageUrl}" class="history-image" alt="Tattoo reference">
        ` : ""}

        <div class="roadmap">

          <!-- DOT ROW -->
          <div class="road-track">
            <div class="road-node ${b.status === 'pending' || b.status === 'quoted' || b.status === 'confirmed' ? 'active pending' : ''}"></div>
            <div class="road-connector"></div>
            <div class="road-node ${b.status === 'quoted' || b.status === 'confirmed' ? 'active quoted' : ''}"></div>
            <div class="road-connector"></div>
            <div class="road-node ${b.status === 'confirmed' ? 'active confirmed' : ''}"></div>
          </div>

          <!-- LABEL ROW -->
          <div class="road-labels">
            <span>Pending</span>
            <span>Quote</span>
            <span>Confirmed</span>
          </div>

        </div>

      </div>
    `;
  });
}

/* ================= ADMIN ================= */
async function loadAdmin() {
  adminCache = [];
  adminListView.innerHTML = "";

  const snap = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc")));
  snap.forEach(d => {
    const b = { id: d.id, ...d.data() };
    adminCache.push(b);
    adminListView.innerHTML += `
      <div class="admin-card">

        <div class="admin-header">
          <div>
            <strong class="admin-email">${b.email}</strong>
            <div class="admin-meta">
              ${b.date} • ${b.time}
            </div>
          </div>

          <span class="admin-status ${b.status}">
            ${b.status}
          </span>
        </div>

        <div class="admin-idea">
          ${b.idea}
        </div>

        ${b.imageUrl ? `
          <img src="${b.imageUrl}" class="admin-image" alt="Tattoo reference">
        ` : ""}

        <div class="admin-actions">

          ${b.status === "pending" ? `
            <input
              type="number"
              placeholder="Quote ₹"
              class="quote-input"
              id="quote-${b.id}"
            />

            <button class="quote-btn" onclick="sendQuote('${b.id}')">
              Quote
            </button>
          ` : ""}

          ${b.status === "quoted" ? `
            <button class="approve" onclick="confirmBooking('${b.id}')">
              Confirm
            </button>
          ` : ""}

          ${b.status !== "confirmed" ? `
            <button class="reject" onclick="rejectBooking('${b.id}')">
              Reject
            </button>
          ` : ""}

        </div>

      </div>
    `;
  });
}

window.sendQuote = async (id) => {
  const input = document.getElementById(`quote-${id}`);
  const quote = Number(input?.value);

  if (!quote || quote <= 0) {
    alert("Please enter a valid quote amount");
    return;
  }

  await updateDoc(doc(db, "bookings", id), {
    status: "quoted",
    quoteAmount: quote
  });

  loadAdmin();
};

window.confirmBooking = async id => {
  await updateDoc(doc(db, "bookings", id), { status: "confirmed" });
  loadAdmin();
};

function renderCalendar() {
  new FullCalendar.Calendar(calendar, {
    initialView: "dayGridMonth",
    events: adminCache.map(b => ({
      title: b.email,
      start: `${b.date}T${b.time}`
    }))
  }).render();
}
