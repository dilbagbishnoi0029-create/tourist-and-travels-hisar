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
  const isAndroid = /android/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  let deferredPrompt = null;

  if (isStandalone) {
    // Already running from the home screen.
    button.hidden = true;
    return;
  }

  // Keep the install button visible even when the browser does not offer
  // a native install prompt; tapping it shows the right instructions.
  button.hidden = false;

  const showInstallHelp = () => {
    if (isIos) {
      showToast("iPhone: tap Share, then choose “Add to Home Screen”.");
      return;
    }

    if (isAndroid) {
      showToast("Chrome menu (⋮) → “Add to Home screen” / “Install app”.");
      return;
    }

    showToast("Use the install icon in the address bar, or browser menu → “Install app”.");
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    button.hidden = false;
  });

  button.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;

      if (choice.outcome === "accepted") {
        button.hidden = true;
        showToast("App installed. Open it from your home screen.");
      }
      return;
    }

    showInstallHelp();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    button.hidden = true;
    showToast("App installed. Open it from your home screen.");
  });
})();
