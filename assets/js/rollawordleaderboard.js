// =========================================================================
// ROLLAWORD - CONDITIONAL TOP 10 DAILY CHALLENGE LEADERBOARD
// =========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, limit, getDocs, addDoc, writeBatch} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Firebase configuration credentials
const firebaseConfig = {
    apiKey: "AIzaSyC_ayepAzJV_vfV5Qh8m52tGnn1Iw7CRnY",
    authDomain: "://firebaseapp.com",
    projectId: "laser-sailing-simulator",
    storageBucket: "laser-sailing-simulator.firebasestorage.app",
    messagingSenderId: "45397375888",
    appId: "1:145397375888:web:1ca8d7688170787624d115"
};

// 2. Initialize Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function getTodayDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * 🚀 CHIEF EVALUATION PIPELINE
 * Evaluates if a score deserves entry, prompts only if it qualifies, then updates the UI.
 * @param {number} finalScore - The verified score integer from your game engine loop.
 */
async function processChallengeEndgame(finalScore) {
    console.log("finalScore at start of processChallengeEndgame():", finalScore);
    if (!window.isDailyChallengeMode) {
        console.log("Free Play active. Skipping leaderboard processing.");
        return;
    }

    const todayKey = getTodayDateKey();
    const numericScore = Number(finalScore) || 0;
    const container = document.getElementById("score-output-area");
    
    if (container) {
        container.innerHTML = "<div>Checking today's leaderboard standings...</div>";
    }

    try {
        // Query today's existing scores sorted from highest to lowest (Limit 10)
        const leaderboardRef = collection(db, "rollaword_leaderboard");
        const q = query(
            leaderboardRef, 
            where("date", "==", todayKey), 
            orderBy("score", "desc"), 
            limit(10)
        );
        const querySnapshot = await getDocs(q);
        
        let makesTop10 = false;
        const totalEntriesToday = querySnapshot.size;

        if (totalEntriesToday < 10) {
            // Condition A: If there are fewer than 10 scores posted today, they qualify automatically!
            makesTop10 = true;
        } else {
            // Condition B: Find the current 10th place score anchor
            const docs = querySnapshot.docs;
            const tenthPlaceDoc = docs[docs.length - 1].data();
            const tenthPlaceScore = Number(tenthPlaceDoc.score) || 0;

            // If player score is better than or equal to the 10th score, they qualify
            if (numericScore >= tenthPlaceScore) {
                makesTop10 = true;
            }
        }

        // Conditional Branching: Prompt user ONLY if they earned a ranking spot
        if (makesTop10) {
   console.log("finalScore at prompt of Name for Leaderboard", finalScore);
            const playerName = prompt(`Incredible! Your score of ${numericScore} qualifies for today's Top 10! Enter your name:`);
            
            if (playerName && playerName.trim() !== "") {
                // Submit the verified record document to Firestore
                await addDoc(collection(db, "rollaword_leaderboard"), {
                    name: playerName.trim(),
                    date: todayKey,
                    score: numericScore
                });
                alert("Your score has been posted!");
                    console.log("✈️ Navigating to beautiful leaderboard template...");
                    window.location.href = "leaderboard.html"; 
            } else {
                alert("Rankings submission bypassed. A name is required.");
            }
        } else {
            alert(`Good game! Your score was ${numericScore}. Today's Top 10 cutoff is higher. Try again tomorrow!`);
        }

        // Always show the finalized leaderboard list on screen at the end
        await displayDailyLeaderboard();

    } catch (error) {
        console.error("Database endgame verification sequence error:", error);
        if (container) {
            container.innerHTML = "<div>Could not verify leaderboard position.</div>";
        }
    }
}

/**
 * 📅 FETCH & DISPLAY RANKINGS FUNCTION
 */
async function displayDailyLeaderboard() {
    const todayKey = getTodayDateKey();
    const container = document.getElementById("score-output-area");
    
    if (!container) return;

    try {
        const leaderboardRef = collection(db, "rollaword_leaderboard");
        const q = query(
            leaderboardRef, 
            where("date", "==", todayKey), 
            orderBy("score", "desc"), 
            limit(10)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = `<div>Daily Challenge Rankings (${todayKey})</div><div style='color: #6b7280; margin-top: 5px;'>Be the first to submit a score today! 🏆</div>`;
            return;
        }

        let htmlRows = `<div><strong>TOP DECK LEADERBOARD (${todayKey})</strong></div>`;
        let rank = 1;

        querySnapshot.forEach((doc) => {
            const entry = doc.data();
            htmlRows += `<div style="display: flex; justify-content: space-between; font-family: monospace; width: 100%; max-width: 250px; margin: 2px auto;">
                <span>${rank}. ${entry.name}</span>
                <span><strong>${entry.score} pts</strong></span>
            </div>`;
            rank++;
        });

        container.innerHTML = htmlRows;

    } catch (error) {
        console.error("Error reading leaderboard:", error);
        container.innerHTML = "<div>Could not load standings.</div>";
    }
}

// Bind cleanly to window scope
window.processChallengeEndgame = processChallengeEndgame;
window.displayDailyLeaderboard = displayDailyLeaderboard;
