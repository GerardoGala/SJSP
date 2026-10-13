import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
    getFunctions,
    httpsCallable
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js";

const firebaseConfig = {
    apiKey: "AIzaSyCsVFxlWhfnogijECMRgsUBFDGPyi4LjVo",
    authDomain: "san-juan-academy.firebaseapp.com",
    projectId: "san-juan-academy",
    appId: "1:579054522531:web:1b03832b8c43042e79af16"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app); // Default region: us-central1
const listAuthUsers = httpsCallable(functions, "listAuthUsers");

const signInForm = document.getElementById("signInForm");
const emailInput = document.getElementById("adminEmail");
const passwordInput = document.getElementById("adminPassword");
const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");
const refreshButton = document.getElementById("refreshButton");
const statusMessage = document.getElementById("statusMessage");
const userCount = document.getElementById("userCount");
const tableBody = document.getElementById("usersTableBody");
const sortButtons = [...document.querySelectorAll("[data-sort]")];

let users = [];
let sortKey = "createdAt";
let sortDirection = "descending";

function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("status-error", isError);
}

function formatDate(value) {
    if (!value) return "Never";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function valueForSort(user, key) {
    switch (key) {
        case "email": return (user.email || "").toLocaleLowerCase();
        case "uid": return (user.uid || "").toLocaleLowerCase();
        case "emailVerified": return Boolean(user.emailVerified) ? 1 : 0;
        case "disabled": return Boolean(user.disabled) ? 1 : 0;
        case "createdAt": return user.createdAt ? new Date(user.createdAt).getTime() : 0;
        case "lastSignInAt": return user.lastSignInAt ? new Date(user.lastSignInAt).getTime() : 0;
        default: return "";
    }
}

function renderUsers() {
    const direction = sortDirection === "ascending" ? 1 : -1;
    const sortedUsers = [...users].sort((a, b) => {
        const av = valueForSort(a, sortKey);
        const bv = valueForSort(b, sortKey);
        if (typeof av === "number" && typeof bv === "number") {
            return (av - bv) * direction;
        }
        return String(av).localeCompare(String(bv), undefined, {
            numeric: true,
            sensitivity: "base"
        }) * direction;
    });

    for (const button of sortButtons) {
        button.setAttribute("aria-sort", button.dataset.sort === sortKey ? sortDirection : "none");
    }

    tableBody.replaceChildren();

    if (sortedUsers.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = "No users to display.";
        row.appendChild(cell);
        tableBody.appendChild(row);
        userCount.textContent = "0 users.";
        return;
    }

    const fragment = document.createDocumentFragment();

    for (const user of sortedUsers) {
        const row = document.createElement("tr");
        const values = [
            user.email || "—",
            user.uid || "—",
            user.emailVerified ? "Yes" : "No",
            formatDate(user.createdAt),
            formatDate(user.lastSignInAt),
            user.disabled ? "Yes" : "No"
        ];

        for (const value of values) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        }
        fragment.appendChild(row);
    }

    tableBody.appendChild(fragment);
    userCount.textContent = `${sortedUsers.length} user${sortedUsers.length === 1 ? "" : "s"}.`;
}

async function loadUsers() {
    refreshButton.disabled = true;
    setStatus("Loading users…");

    try {
        const result = await listAuthUsers();
        // The callable function returns { users: [...] }.
        users = Array.isArray(result.data?.users) ? result.data.users : [];
        renderUsers();
        setStatus("User list loaded.");
    } catch (error) {
        console.error("Unable to list Firebase Authentication users:", error);
        users = [];
        renderUsers();

        if (error.code === "functions/permission-denied") {
            setStatus("Access denied. This account is not authorized to view the user directory.", true);
        } else if (error.code === "functions/unauthenticated") {
            setStatus("Your session has expired. Please sign in again.", true);
        } else if (error.code === "functions/not-found") {
            setStatus("The listAuthUsers Cloud Function was not found. Deploy the backend function and check its region.", true);
        } else {
            setStatus(`Could not load users: ${error.message || error.code || "Unknown error"}`, true);
        }
    } finally {
        refreshButton.disabled = !auth.currentUser;
    }
}

signInForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    signInButton.disabled = true;
    setStatus("Signing in…");

    try {
        await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
        passwordInput.value = "";
        // onAuthStateChanged handles the initial user-list load.
    } catch (error) {
        console.error("Administrator sign-in failed:", error);
        setStatus(`Sign-in failed: ${error.message || error.code}`, true);
    } finally {
        signInButton.disabled = false;
    }
});

signOutButton.addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        setStatus(`Sign-out failed: ${error.message || error.code}`, true);
    }
});

refreshButton.addEventListener("click", loadUsers);

sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const clickedKey = button.dataset.sort;
        if (sortKey === clickedKey) {
            sortDirection = sortDirection === "ascending" ? "descending" : "ascending";
        } else {
            sortKey = clickedKey;
            sortDirection = "ascending";
        }
        renderUsers();
    });
});

onAuthStateChanged(auth, async (user) => {
    const signedIn = Boolean(user);
    signInButton.hidden = signedIn;
    emailInput.disabled = signedIn;
    passwordInput.disabled = signedIn;
    signOutButton.hidden = !signedIn;
    refreshButton.disabled = !signedIn;

    if (user) {
        setStatus(`Signed in as ${user.email || "administrator"}. Checking administrator permission…`);
        await loadUsers();
    } else {
        users = [];
        renderUsers();
        setStatus("Please sign in to load users.");
    }
});
