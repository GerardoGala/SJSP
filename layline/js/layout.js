document.addEventListener("DOMContentLoaded", () => {
  const BASE = "https://gerardogala.github.io/Tutorial-Shared/";

  async function loadComponent(fileName, placeholderId) {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) {
      console.error(`[Layout] Missing element: #${placeholderId}`);
      return;
    }

    try {
      const response = await fetch(BASE + fileName);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      placeholder.innerHTML = html;
    } catch (err) {
      console.error(`Failed to load ${fileName}:`, err);
      placeholder.innerHTML = `<p style="color:red;padding:10px;">Error loading ${fileName}</p>`;
    }
  }

  // Load shared CSS
  const sharedCSS = document.createElement("link");
  sharedCSS.rel = "stylesheet";
  sharedCSS.href = BASE + "shared.css";
  document.head.appendChild(sharedCSS);

  // Load shared HTML components
  loadComponent("header.html", "header-placeholder");
  loadComponent("footer.html", "footer-placeholder");
});
