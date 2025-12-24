import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, addDoc, setDoc, collection, getDocs, query, orderBy, where, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDF1istdZ1PI6_AFNBBJmUGT4kaA0es9Pc",
  authDomain: "tattoo-parlour-booking.firebaseapp.com",
  projectId: "tattoo-parlour-booking",
  storageBucket: "tattoo-parlour-booking.firebasestorage.app",
  messagingSenderId: "948527588024",
  appId: "1:948527588024:web:2ca07ad29c9b9b5135ca4d",
  measurementId: "G-HG35Q4G92G"
};

const IMGBB_API_KEY = "c1c3975eab9d02dc16f05d8bd7b17f99";
const ADMIN_EMAIL = "oceanz.lounge@gmail.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- NAVIGATION ---
window.toggleMenu = () => {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
};

window.showLogin = () => {
    document.getElementById('landingView').classList.add('hidden');
    document.getElementById('authView').classList.remove('hidden');
};

window.navigate = (view) => {
    const views = ['bookingView', 'adminView', 'profileView', 'userHistoryView', 'landingView', 'authView'];
    views.forEach(v => document.getElementById(v)?.classList.add('hidden'));

    if (view === 'booking') document.getElementById('bookingView').classList.remove('hidden');
    if (view === 'history') {
        document.getElementById('bookingView').classList.remove('hidden');
        document.getElementById('userHistoryView').classList.remove('hidden');
    }
    if (view === 'profile') document.getElementById('profileView').classList.remove('hidden');
    if (view === 'list' || view === 'calendar') {
        document.getElementById('adminView').classList.remove('hidden');
        document.getElementById('listView').classList.toggle('hidden', view !== 'list');
        document.getElementById('calendarView').classList.toggle('hidden', view !== 'calendar');
        if (view === 'calendar') renderCalendar();
    }
    window.toggleMenu();
};

// --- AUTH ---
let isSignUpMode = false;
window.toggleAuthMode = () => {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('authTitle');
    const btn = document.getElementById('authBtn');
    const togglePrompt = document.getElementById('toggleAuth');
    const extras = document.querySelectorAll('.auth-extra');

    if (isSignUpMode) {
        title.innerText = "JOIN THE CREW";
        btn.innerText = "Sign Up";
        togglePrompt.innerHTML = 'Already have an account? <span>Login</span>';
        extras.forEach(f => f.classList.remove('hidden'));
    } else {
        title.innerText = "STUDIO LOGIN";
        btn.innerText = "Enter Studio";
        togglePrompt.innerHTML = 'New to the crew? <span>Sign Up</span>';
        extras.forEach(f => f.classList.add('hidden'));
    }
};

document.getElementById('authForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const errorDiv = document.getElementById('authError');
    errorDiv.classList.add('hidden');

    try {
        if (isSignUpMode) {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", res.user.uid), {
                name: document.getElementById('regName').value,
                phone: document.getElementById('regPhone').value,
                email: email, createdAt: new Date()
            });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (err) {
        errorDiv.innerText = err.message;
        errorDiv.classList.remove('hidden');
    }
};

onAuthStateChanged(auth, (user) => {
    const menuBtn = document.getElementById('menuBtn');
    document.querySelectorAll('.container').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.user-link, .admin-link, .auth-required').forEach(l => l.classList.add('hidden'));

    if (user) {
        menuBtn.classList.remove('hidden');
        document.querySelectorAll('.auth-required').forEach(l => l.classList.remove('hidden'));
        if (user.email === ADMIN_EMAIL) {
            document.querySelectorAll('.admin-link').forEach(l => l.classList.remove('hidden'));
            document.getElementById('adminView').classList.remove('hidden');
            loadAdminData();
        } else {
            document.querySelectorAll('.user-link').forEach(l => l.classList.remove('hidden'));
            document.getElementById('bookingView').classList.remove('hidden');
            loadUserData(user.email);
            loadProfileData();
        }
    } else {
        menuBtn.classList.add('hidden');
        document.getElementById('landingView').classList.remove('hidden');
    }
});

window.logout = () => {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    signOut(auth);
};

// --- DATA LOGIC ---
async function loadProfileData() {
    const snap = await getDocs(query(collection(db, "users"), where("email", "==", auth.currentUser.email)));
    if (!snap.empty) {
        const data = snap.docs[0].data();
        document.getElementById('editName').value = data.name || "";
        document.getElementById('editPhone').value = data.phone || "";
    }
}

document.getElementById('profileForm').onsubmit = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
        name: document.getElementById('editName').value,
        phone: document.getElementById('editPhone').value
    });
    document.getElementById('profileMsg').classList.remove('hidden');
    setTimeout(() => document.getElementById('profileMsg').classList.add('hidden'), 3000);
};

document.getElementById('bookingForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.innerText = "Processing..."; btn.disabled = true;

    let imageUrl = "";
    const file = document.getElementById('refImage').files[0];
    if (file) {
        const formData = new FormData();
        formData.append("image", file);
        try {
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
            const json = await res.json();
            imageUrl = json.data.display_url;
        } catch (err) { console.error("ImgBB failed"); }
    }

    await addDoc(collection(db, "bookings"), {
        userId: auth.currentUser.uid, email: auth.currentUser.email,
        idea: document.getElementById('idea').value, imageUrl: imageUrl,
        date: document.getElementById('date').value, time: document.getElementById('time').value,
        status: "pending", quote: "", createdAt: new Date()
    });
    location.reload();
};

async function loadUserData(email) {
    const snap = await getDocs(query(collection(db, "bookings"), where("email", "==", email)));
    const list = document.getElementById('userList');
    list.innerHTML = "";
    const docsArr = [];
    snap.forEach(d => docsArr.push({ id: d.id, ...d.data() }));
    docsArr.sort((a,b) => b.createdAt - a.createdAt);
    docsArr.forEach(b => {
        const isConfirmed = b.status === 'confirmed';
        list.innerHTML += `<div class="booking-card ${isConfirmed ? 'status-confirmed' : ''}">
            <p><strong>STATUS:</strong> ${b.status.toUpperCase()}</p>
            <p><strong>DATE:</strong> ${b.date} @ ${b.time}</p>
            <p><strong>QUOTE:</strong> ${b.quote ? '$'+b.quote : 'Artist is reviewing...'}</p>
            ${isConfirmed ? `<button onclick="shareBooking('${b.date}','${b.time}')" style="margin-top:10px; font-size:0.7rem; padding:8px;">Share My New Ink</button>` : ''}
        </div>`;
    });
}

window.shareBooking = (date, time) => {
    const text = `Booked my new session at A.T Hell Tattoos for ${date} at ${time}! 🔥`;
    if (navigator.share) { navigator.share({ title: 'A.T Hell', text: text, url: window.location.href }); }
    else { alert("Booking status copied!"); }
};

let adminCache = [];
async function loadAdminData() {
    const snap = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc")));
    const uSnap = await getDocs(collection(db, "users"));
    const uMap = {}; uSnap.forEach(u => uMap[u.id] = u.data());
    const list = document.getElementById('adminListView');
    list.innerHTML = ""; adminCache = [];
    snap.forEach(d => {
        const b = { id: d.id, ...d.data() }; adminCache.push(b);
        const u = uMap[b.userId] || { name: "Client", phone: "N/A" };
        list.innerHTML += `<div class="booking-card ${b.status === 'confirmed' ? 'status-confirmed' : ''}">
            <p><strong>${u.name}</strong> (${u.phone})</p>
            <p>${b.idea}</p>
            ${b.imageUrl ? `<a href="${b.imageUrl}" target="_blank"><img src="${b.imageUrl}" style="width:100px; height:auto; margin:10px 0; border-radius:8px;"></a>` : ''}
            <div class="row">
                <input type="number" id="q-${b.id}" placeholder="$" value="${b.quote || ''}" style="width:70px; margin:0;">
                <button onclick="sendQuote('${b.id}')" style="width:auto">Quote</button>
            </div>
        </div>`;
    });
}

window.sendQuote = async (id) => {
    await updateDoc(doc(db, "bookings", id), { quote: document.getElementById(`q-${id}`).value, status: "confirmed" });
    loadAdminData();
};

function renderCalendar() {
    const events = adminCache.map(b => ({ title: `${b.email}`, start: `${b.date}T${b.time}`, color: b.status === 'confirmed' ? '#4CAF50' : '#ffc107' }));
    new FullCalendar.Calendar(document.getElementById('calendar'), { initialView: 'dayGridMonth', events }).render();
}