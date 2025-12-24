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

// --- AUTH LOGIC ---
let isSignUpMode = false;
window.toggleAuthMode = () => {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('authTitle');
    const btn = document.getElementById('authBtn');
    const toggleLink = document.getElementById('toggleAuth');
    const extraFields = document.querySelectorAll('.auth-extra');
    document.getElementById('authError').classList.add('hidden');

    if (isSignUpMode) {
        title.innerText = "JOIN THE CREW";
        btn.innerText = "Create Account";
        toggleLink.innerHTML = "Already have an account? <span>Login</span>";
        extraFields.forEach(f => f.classList.remove('hidden'));
    } else {
        title.innerText = "A.T HELL LOGIN";
        btn.innerText = "Enter Studio";
        toggleLink.innerHTML = "Don't have an account? <span>Sign Up</span>";
        extraFields.forEach(f => f.classList.add('hidden'));
    }
};

document.getElementById('authForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const btn = document.getElementById('authBtn');
    const errorDiv = document.getElementById('authError');

    errorDiv.classList.add('hidden');
    btn.disabled = true;

    try {
        if (isSignUpMode) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                name: document.getElementById('regName').value,
                phone: document.getElementById('regPhone').value,
                email: email,
                createdAt: new Date()
            });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (error) {
        errorDiv.classList.remove('hidden');
        errorDiv.innerText = error.message;
    } finally { btn.disabled = false; }
};

window.logout = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    document.querySelectorAll('.container').forEach(c => c.classList.add('hidden'));
    if (user) {
        if (user.email === ADMIN_EMAIL) {
            document.getElementById('adminView').classList.remove('hidden');
            loadAdminData();
        } else {
            document.getElementById('bookingView').classList.remove('hidden');
            loadUserData(user.email);
        }
    } else {
        document.getElementById('authView').classList.remove('hidden');
    }
});

// --- BOOKING SUBMISSION ---
document.getElementById('bookingForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.innerText = "Uploading Project..."; btn.disabled = true;

    let imageUrl = "";
    const file = document.getElementById('refImage').files[0];
    if (file) {
        const formData = new FormData();
        formData.append("image", file);
        try {
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
            const json = await res.json();
            imageUrl = json.data.display_url;
        } catch (err) { console.error("ImgBB upload failed"); }
    }

    await addDoc(collection(db, "bookings"), {
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        idea: document.getElementById('idea').value,
        imageUrl: imageUrl,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        status: "pending",
        quote: "",
        createdAt: new Date()
    });
    location.reload();
};

// --- ADMIN FEATURES ---
let adminBookings = [];
async function loadAdminData() {
    const snap = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc")));
    const usersSnap = await getDocs(collection(db, "users"));
    const userMap = {};
    usersSnap.forEach(u => userMap[u.id] = u.data());

    const list = document.getElementById('listView');
    list.innerHTML = "";
    adminBookings = [];

    snap.forEach(d => {
        const b = { id: d.id, ...d.data() };
        adminBookings.push(b);
        const uInfo = userMap[b.userId] || { name: "Client", phone: "N/A" };

        const card = document.createElement('div');
        card.className = `booking-card ${b.status === 'confirmed' ? 'status-confirmed' : ''}`;
        card.innerHTML = `
            <p><strong>${uInfo.name}</strong> (${b.email})</p>
            <p><strong>Phone:</strong> ${uInfo.phone}</p>
            <p>${b.idea}</p>
            ${b.imageUrl ? `<a href="${b.imageUrl}" target="_blank"><img src="${b.imageUrl}" class="ref-img"></a>` : ''}
            <div class="row" style="margin-top:10px;">
                <input type="number" id="q-${d.id}" placeholder="$" value="${b.quote || ''}" style="width:80px; margin:0;">
                <button onclick="sendQuote('${d.id}')" style="width:auto">Confirm</button>
                <button onclick="deleteBooking('${d.id}')" class="btn-sm danger">Delete</button>
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

window.deleteBooking = async (id) => {
    if(confirm("Delete this session?")) { await deleteDoc(doc(db, "bookings", id)); loadAdminData(); }
};

window.showView = (v) => {
    document.getElementById('listView').classList.toggle('hidden', v !== 'list');
    document.getElementById('calendarView').classList.toggle('hidden', v !== 'calendar');
    if(v === 'calendar') {
        const events = adminBookings.map(b => ({ title: `$${b.quote || '??'} - ${b.email}`, start: `${b.date}T${b.time}`, color: b.status === 'confirmed' ? '#4CAF50' : '#ffc107' }));
        new FullCalendar.Calendar(document.getElementById('calendar'), { events }).render();
    }
};

// --- USER FEATURES ---
async function loadUserData(email) {
    const q = query(collection(db, "bookings"), where("email", "==", email));
    const snap = await getDocs(q);
    const list = document.getElementById('userList');
    list.innerHTML = "";

    const docsArr = [];
    snap.forEach(d => docsArr.push(d.data()));
    docsArr.sort((a,b) => b.createdAt - a.createdAt);

    docsArr.forEach(b => {
        const isConfirmed = b.status === 'confirmed';
        list.innerHTML += `
            <div class="booking-card ${isConfirmed ? 'status-confirmed' : ''}">
                <p><strong>STATUS:</strong> ${b.status.toUpperCase()}</p>
                <p><strong>DATE:</strong> ${b.date} @ ${b.time}</p>
                <p><strong>QUOTE:</strong> ${b.quote ? '$'+b.quote : 'Artist is reviewing...'}</p>
                ${isConfirmed ? `
                    <button class="btn-share" onclick="shareBooking('${b.date}', '${b.time}')">
                        Share Status
                    </button>` : ''}
            </div>`;
    });
}

window.shareBooking = async (date, time) => {
    const shareData = {
        title: 'A.T Hell Tattoos',
        text: `Got my session booked at A.T Hell Tattoos for ${date} at ${time}! 🔥`,
        url: window.location.origin
    };
    try {
        if (navigator.share) await navigator.share(shareData);
        else alert("Link copied to clipboard!");
    } catch (err) { console.log(err); }
};