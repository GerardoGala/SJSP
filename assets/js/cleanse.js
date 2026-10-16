// ============================================================
// ROLLAWORD DICTIONARY CLEANSER
// Loads small.txt, filters unwanted words, and downloads
// the cleaned result as dictionary.txt.
// ============================================================

(async function cleanseDictionary() {
  const INPUT_FILE = "/assets/js/small.txt";
    const OUTPUT_FILE = "/assets/dictionary.txt";

    try {
        console.log("RollaWord: Loading dictionary...");

        const response = await fetch(INPUT_FILE);

        if (!response.ok) {
            throw new Error(`Cannot load ${INPUT_FILE}: HTTP ${response.status}`);
        }

        const contents = await response.text();

        const originalWords = contents
            .split(/\s+/)
            .filter(word => word.length > 0);

        const cleanedWords = [...new Set(
            originalWords.filter(word =>
                !word.includes("'") &&
                word.length <= 8 &&
                !/[A-Z]/.test(word) &&
                !word.includes("-")
            )
        )].sort();

        const dictionaryText = cleanedWords.join("\n") + "\n";

        const blob = new Blob(
            [dictionaryText],
            { type: "text/plain;charset=utf-8" }
        );

        const downloadURL = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");

        downloadLink.href = downloadURL;
        downloadLink.download = OUTPUT_FILE;
        downloadLink.textContent = "Download cleaned dictionary.txt";
        downloadLink.style.display = "block";
        downloadLink.style.margin = "10px";

        document.body.appendChild(downloadLink);

        // Automatically initiate the download.
        downloadLink.click();

        console.log(`Original entries: ${originalWords.length}`);
        console.log(`Cleaned entries: ${cleanedWords.length}`);
        console.log(`Removed entries: ${originalWords.length - cleanedWords.length}`);
        console.log("RollaWord: Dictionary cleansing complete.");

        // Keep the download link available if automatic download is blocked.
        URL.revokeObjectURL(downloadURL);

    } catch (error) {
        console.error("RollaWord dictionary cleansing failed:", error);
    }
})();