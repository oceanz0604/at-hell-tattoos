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

window.navigate = (view) => {
    const views = ['bookingView', 'adminView', 'profileView', 'userHistoryView'];
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

// --- AUTH LOGIC ---
let isSignUpMode = false;
window.toggleAuthMode = () => {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('authTitle');
    const btn = document.getElementById('authBtn');
    const toggle = document.getElementById('toggleAuth');
    const extras = document.querySelectorAll('.auth-extra');

    if (isSignUpMode) {
        title.innerText = "JOIN THE CREW";
        btn.innerText = "Sign Up";
        toggle.innerHTML = 'Already have an account? <span>Login</span>';
        extras.forEach(f => f.classList.remove('hidden'));
    } else {
        title.innerText = "STUDIO LOGIN";
        btn.innerText = "Enter Studio";
        toggle.innerHTML = 'Don\'t have an account? <span>Sign Up</span>';
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
        document.getElementById('authView').classList.remove('hidden');
    }
});

window.logout = () => {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    signOut(auth);
};

// --- PROFILE ---
async function loadProfileData() {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
    if (!snap.empty) {
        const data = snap.docs[0].data();
        document.getElementById('editName').value = data.name || "";
        document.getElementById('editPhone').value = data.phone || "";
    }
}

document.getElementById('profileForm').onsubmit = async (e) => {
    e.preventDefault();
    const msg = document.getElementById('profileMsg');
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
        name: document.getElementById('editName').value,
        phone: document.getElementById('editPhone').value
    });
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
};

// --- BOOKING ---
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
    snap.forEach(d => docsArr.push(d.data()));
    docsArr.sort((a,b) => b.createdAt - a.createdAt);

    docsArr.forEach(b => {
        list.innerHTML += `<div class="booking-card ${b.status === 'confirmed' ? 'status-confirmed' : ''}">
            <p><strong>STATUS:</strong> ${b.status.toUpperCase()}</p>
            <p><strong>DATE:</strong> ${b.date} @ ${b.time}</p>
            <p><strong>QUOTE:</strong> ${b.quote ? '$'+b.quote : 'Artist is reviewing...'}</p>
        </div>`;
    });
}

// --- ADMIN ---
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
        const card = document.createElement('div');
        card.className = `booking-card ${b.status === 'confirmed' ? 'status-confirmed' : ''}`;
        card.innerHTML = `
            <p><strong>${u.name}</strong> (${u.phone})</p>
            <p>${b.idea}</p>
            ${b.imageUrl ? `<img src="${b.imageUrl}" class="ref-img" style="width:100px; cursor:pointer;" onclick="window.open('${b.imageUrl}')">` : ''}
            <div class="row" style="margin-top:10px;">
                <input type="number" id="q-${b.id}" placeholder="$" value="${b.quote || ''}" style="width:70px; margin:0;">
                <button onclick="sendQuote('${b.id}')" style="width:auto">Confirm</button>
            </div>
        `;
        list.appendChild(card);
    });
}

window.sendQuote = async (id) => {
    const val = document.getElementById(`q-${id}`).value;
    await updateDoc(doc(db, "bookings", id), { quote: val, status: "confirmed" });
    loadAdminData();
};

function renderCalendar() {
    const events = adminCache.map(b => ({
        title: `$${b.quote || '??'} - ${b.email}`,
        start: `${b.date}T${b.time}`,
        color: b.status === 'confirmed' ? '#4CAF50' : '#ffc107'
    }));
    const calendarEl = document.getElementById('calendar');
    new FullCalendar.Calendar(calendarEl, { initialView: 'daygridmonth', events }).render();
}