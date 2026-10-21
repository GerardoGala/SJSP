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
/**
 * Processes the game-over sequence for daily challenge matches.
 * Verifies if the score qualifies for the daily Top 10 leaderboard.
 * 
 * @param {number|string} finalScore - The player's unparsed endgame score.
 */
async function processChallengeEndgame(finalScore) {
    console.log("finalScore at start of processChallengeEndgame():", finalScore);
    
    // 1. MODE GUARD: Drop out instantly if the user is playing in unranked Free Play mode
    if (!window.isDailyChallengeMode) {
        console.log("Free Play active. Skipping leaderboard processing.");
        return;
    }

    const numericScore = Number(finalScore) || 0;

    // 2. SCORE GUARD: Early exit rule. If the score is 0, ignore it completely and bypass lookup
    if (numericScore === 0) {
        console.log("Score is 0. Bypassing leaderboard qualification checks entirely.");
        return;
    }

    const todayKey = getTodayDateKey();
    const container = document.getElementById("score-output-area");
    
    // Provide user interface visual feedback during database latency period
    if (container) {
        container.innerHTML = "<div>Checking today's leaderboard standings...</div>";
    }

    try {
        // Build query against today's entry sub-nodes sorted descending (Highest -> Lowest) capped at 10 rows
        const leaderboardRef = collection(db, "rollaword_leaderboard");
        const q = query(
            leaderboardRef, 
            where("date", "==", todayKey), 
            orderBy("score", "desc"), 
            limit(10)
        );
        
        // Execute safe asynchronous read payload extraction
        const querySnapshot = await getDocs(q);
        
        let makesTop10 = false;
        const totalEntriesToday = querySnapshot.size;
        const docs = querySnapshot.docs;

        // 3. QUALIFICATION DETERMINATION FLOW
        if (totalEntriesToday < 10) {
            // Condition A: If the board has structural vacancies (< 10 total posts), entry is guaranteed!
            makesTop10 = true;
        } else if (docs.length > 0) {
            // Condition B: Safe fallback tracking. Access the historical 10th row anchor index
            const tenthPlaceDoc = docs[docs.length - 1].data();
            
            // Defensively extract value or resolve fallback safely to prevent processing corruption
            const tenthPlaceScore = tenthPlaceDoc && tenthPlaceDoc.score ? Number(tenthPlaceDoc.score) : 0;

            // Mark pass authorization if the player matches or defeats the current boundary value
            if (numericScore >= tenthPlaceScore) {
                makesTop10 = true;
            }
        }

        // 4. CONDITIONAL POSTING PIPELINE: Prompt user ONLY if they earned a ranking spot
        if (makesTop10) {
            console.log("finalScore at prompt of Name for Leaderboard:", numericScore);
            
            const playerName = prompt(`Incredible! Your score of ${numericScore} qualifies for today's Top 10! Enter your name:`);
            
            // Clean extraction tracking validation check
            if (playerName && playerName.trim() !== "") {
                // Submit the verified record document to Firestore
                await addDoc(collection(db, "rollaword_leaderboard"), {
                    name: playerName.trim(),
                    date: todayKey,
                    score: numericScore
                });
                
                console.log("✈️ Navigating to beautiful leaderboard template...");
                window.location.href = "leaderboard.html"; 
            } else {
                console.log("Rankings submission bypassed by player. A name is required.");
            }
        } else {
            console.log(`Good game! Score ${numericScore} did not clear today's cutoff threshold.`);
        }

        // Always show the finalized leaderboard list on screen at the end
        // await displayDailyLeaderboard();

    } catch (error) {
        // Enforce strong administrative debug tracking logs if network mutations abort unexpectedly
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
