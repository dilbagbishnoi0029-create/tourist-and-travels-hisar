(() => {
  "use strict";

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        // Registration can fail on unsupported browsers; the site still works.
      });
    });
  }

  const button = document.getElementById("install-app");
  if (!button) return;

  const toast = document.getElementById("toast");
  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.hidden = true;
    }, 7000);
  };

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  let deferredPrompt = null;

  if (isStandalone) {
    button.hidden = true;
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    button.hidden = false;
  });

  if (isIos) {
    button.hidden = false;
  }

  button.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      button.hidden = true;
      if (choice.outcome === "accepted") {
        showToast("App installed. Open it from your home screen.");
      }
      return;
    }

    if (isIos) {
      showToast("iPhone: tap Share, then choose “Add to Home Screen”.");
      return;
    }

    showToast("Open this site in Chrome, then use the browser menu → Install app.");
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    button.hidden = true;
    showToast("App installed. Open it from your home screen.");
  });
})();
