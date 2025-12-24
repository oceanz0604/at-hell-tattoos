import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore, doc, setDoc, getDoc,
  addDoc, collection, getDocs,
  query, where, orderBy, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* FIREBASE */
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

/* VIEWS */
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

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

/* MENU HELPERS */
function showMenu() { menuBtn.classList.remove("hidden"); }
function hideMenu() { menuBtn.classList.add("hidden"); }
function closeSidebar() {
  sidebar.classList.remove("active");
  overlay.classList.remove("active");
}

menuBtn.onclick = () => toggleMenu();
overlay.onclick = () => closeSidebar();

window.toggleMenu = () => {
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
};

/* NAVIGATION */
window.navigate = (view) => {
  Object.values(views).forEach(v => v.classList.add("hidden"));

  if (view === "booking") views.booking.classList.remove("hidden");
  if (view === "history") {
    views.history.classList.remove("hidden");
    loadUser(auth.currentUser.email);
  }
  if (view === "profile") views.profile.classList.remove("hidden");

  if (view === "list" || view === "calendar") {
    views.admin.classList.remove("hidden");
    views.list.classList.toggle("hidden", view !== "list");
    views.calendar.classList.toggle("hidden", view !== "calendar");
    if (view === "calendar") renderCalendar();
  }

  sidebar.classList.remove("active");
  overlay.classList.remove("active");
};

document.querySelectorAll("[data-nav]").forEach(el => {
  el.onclick = () => navigate(el.dataset.nav);
});

/* LANDING */
startBooking.onclick = () => {
  Object.values(views).forEach(v => v.classList.add("hidden"));
  hideMenu();
  views.auth.classList.remove("hidden");
};

/* AUTH */
let signup = false;
toggleAuth.onclick = () => {
  signup = !signup;
  document.querySelectorAll(".auth-extra").forEach(e => e.classList.toggle("hidden"));
  authTitle.textContent = signup ? "SIGN UP" : "STUDIO LOGIN";
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

/* AUTH STATE */
onAuthStateChanged(auth, async user => {
  Object.values(views).forEach(v => v.classList.add("hidden"));
  document.querySelectorAll(".user-link,.admin-link,.auth-required")
    .forEach(el => el.classList.add("hidden"));

  if (!user) {
    closeSidebar();
    hideMenu();
    views.landing.classList.remove("hidden");
    return;
  }

  showMenu();
  const snap = await getDoc(doc(db, "users", user.uid));
  const role = snap.data()?.role;

  if (role === "admin") {
    document.querySelectorAll(".admin-link,.auth-required")
      .forEach(el => el.classList.remove("hidden"));
    views.admin.classList.remove("hidden");
    views.list.classList.remove("hidden");
    loadAdmin();
  } else {
    document.querySelectorAll(".user-link,.auth-required")
      .forEach(el => el.classList.remove("hidden"));
    views.booking.classList.remove("hidden");
    loadProfile();
  }
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  closeSidebar();
  await signOut(auth);
  hideMenu();
  Object.values(views).forEach(v => v.classList.add("hidden"));
  views.landing.classList.remove("hidden");
};

/* PROFILE */
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

/* BOOKING */
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

/* HISTORY */
async function loadUser(email) {
  userList.innerHTML = "";
  const snap = await getDocs(query(collection(db, "bookings"), where("email", "==", email)));
  snap.forEach(d => {
    const b = d.data();
    userList.innerHTML += `
      <div class="booking-card">
        <strong>${b.date} @ ${b.time}</strong><br>
        Status: ${b.status}
      </div>`;
  });
}

/* ADMIN */
let adminCache = [];

async function loadAdmin() {
  adminCache = [];
  adminListView.innerHTML = "";

  const snap = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc")));
  snap.forEach(d => {
    const b = { id: d.id, ...d.data() };
    adminCache.push(b);
    adminListView.innerHTML += `
      <div class="booking-card">
        <strong>${b.email}</strong>
        <p>${b.idea}</p>
        <button onclick="confirmBooking('${b.id}')">Confirm</button>
      </div>`;
  });
}

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
