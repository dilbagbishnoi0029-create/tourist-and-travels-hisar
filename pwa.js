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

  const help = document.getElementById("install-help");
  const helpTitle = document.getElementById("install-help-title");
  const helpIntro = document.getElementById("install-help-intro");
  const helpSteps = document.getElementById("install-help-steps");
  const helpUrl = document.getElementById("install-help-url");
  const openChromeButton = document.getElementById("install-open-chrome");
  const copyLinkButton = document.getElementById("install-copy-link");
  const closeButtons = help ? help.querySelectorAll("[data-install-close]") : [];

  const ua = navigator.userAgent || "";
  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const inAppBrowsers = [
    { test: /WhatsApp/i, name: "WhatsApp" },
    { test: /Instagram/i, name: "Instagram" },
    { test: /FBAN|FBAV|FB_IAB/i, name: "Facebook" },
    { test: /Line\//i, name: "LINE" },
    { test: /MicroMessenger/i, name: "WeChat" },
    { test: /Snapchat/i, name: "Snapchat" },
    { test: /Twitter/i, name: "X" },
    { test: /LinkedInApp/i, name: "LinkedIn" },
    { test: /GSA\//i, name: "Google" },
  ];
  const inAppBrowser = inAppBrowsers.find((item) => item.test.test(ua));

  const shareUrl = window.location.href.split("#")[0];

  let deferredPrompt = null;
  let promptWaiter = null;

  if (isStandalone) {
    // Already running from the home screen.
    button.hidden = true;
    return;
  }

  // Keep the install button visible even when the browser does not offer a
  // native install prompt; tapping it opens clear step-by-step instructions.
  button.hidden = false;

  const setHelpContent = (title, intro, steps) => {
    if (!helpTitle || !helpIntro || !helpSteps) return;

    helpTitle.textContent = title;
    helpIntro.textContent = intro;
    helpSteps.replaceChildren(
      ...steps.map((step) => {
        const item = document.createElement("li");
        item.textContent = step;
        return item;
      })
    );
  };

  const openHelp = () => {
    if (!help) {
      showToast("Open this site in Chrome, then use the browser menu → Install app.");
      return;
    }

    let title = "Install the app";
    let intro = "Your browser can install this website like an app.";
    let steps = [
      "Click the install icon in the address bar (a small screen with an arrow).",
      "Or open the browser menu and choose “Install app”.",
      "Confirm “Install”.",
    ];
    let showChrome = false;
    let showCopy = false;

    if (inAppBrowser) {
      const appName = inAppBrowser.name;

      if (isAndroid) {
        title = "Open in Chrome first";
        intro = `You are using the ${appName} browser. Open this page in Chrome to install the app.`;
        steps = [
          `Tap the ${appName} menu (⋮) at the top right.`,
          "Choose “Open in browser” or “Open in Chrome”.",
          "On the Chrome page, tap “Install app” in the top bar.",
        ];
        showChrome = true;
      } else {
        title = "Open in Safari first";
        intro = `You are using the ${appName} browser. Open this page in Safari to install the app.`;
        steps = [
          `Tap the ${appName} menu and choose “Open in Safari”.`,
          "If that option is missing, copy this link and paste it in Safari.",
          "In Safari, tap Share → “Add to Home Screen” → “Add”.",
        ];
        showCopy = true;
      }
    } else if (isIos) {
      title = "Install on iPhone";
      intro = "Safari can add this website to your home screen.";
      steps = [
        "Tap the Share button (square with an arrow).",
        "Scroll down and tap “Add to Home Screen”.",
        "Tap “Add” — the app icon appears on your home screen.",
      ];
      showCopy = true;
    } else if (isAndroid) {
      title = "Install on Android";
      intro = "Chrome can install this website like an app.";
      steps = [
        "Tap the Chrome menu (⋮) at the top right.",
        "Tap “Install app” or “Add to Home screen”.",
        "Confirm “Install” — the app icon appears on your home screen.",
      ];
      showCopy = true;
    }

    setHelpContent(title, intro, steps);

    if (openChromeButton) {
      if (showChrome && isAndroid) {
        const withoutScheme = shareUrl.replace(/^https?:\/\//i, "");
        openChromeButton.href = `intent://${withoutScheme}#Intent;scheme=https;package=com.android.chrome;end`;
        openChromeButton.hidden = false;
      } else {
        openChromeButton.hidden = true;
      }
    }

    if (copyLinkButton) {
      copyLinkButton.hidden = !showCopy;
    }

    if (helpUrl) {
      helpUrl.textContent = showCopy || inAppBrowser ? shareUrl : "";
    }

    help.hidden = false;
    document.body.classList.add("install-help-open");

    const closeButton = help.querySelector(".install-help-close");
    if (closeButton) closeButton.focus();
  };

  const closeHelp = () => {
    if (!help || help.hidden) return;
    help.hidden = true;
    document.body.classList.remove("install-help-open");
    if (!button.hidden) button.focus();
  };

  const closeHelpOnBackdrop = (event) => {
    if (event.target === help) closeHelp();
  };

  closeButtons.forEach((element) => {
    element.addEventListener("click", closeHelp);
  });

  if (help) {
    help.addEventListener("click", closeHelpOnBackdrop);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeHelp();
  });

  if (copyLinkButton) {
    copyLinkButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Link copied. Paste it in Chrome or Safari.");
      } catch {
        if (helpUrl) {
          const range = document.createRange();
          range.selectNodeContents(helpUrl);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        showToast("Link selected. Copy it and open in Chrome or Safari.");
      }
    });
  }

  const waitForPrompt = (milliseconds) =>
    new Promise((resolve) => {
      if (deferredPrompt) {
        resolve(true);
        return;
      }

      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        promptWaiter = null;
        resolve(value);
      };

      promptWaiter = () => finish(true);
      window.setTimeout(() => finish(Boolean(deferredPrompt)), milliseconds);
    });

  const promptInstall = async () => {
    if (!deferredPrompt) return;

    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    promptEvent.prompt();

    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      button.hidden = true;
      closeHelp();
      showToast("App installed. Open it from your home screen.");
    }
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    button.hidden = false;
    if (promptWaiter) promptWaiter();
  });

  button.addEventListener("click", async () => {
    if (deferredPrompt) {
      await promptInstall();
      return;
    }

    // Inside WhatsApp/Instagram/etc. there is no browser install prompt.
    // Show the "open in Chrome/Safari" steps immediately.
    if (inAppBrowser || isIos) {
      openHelp();
      return;
    }

    const promptArrived = await waitForPrompt(2200);
    if (promptArrived && deferredPrompt) {
      await promptInstall();
      return;
    }

    openHelp();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    button.hidden = true;
    closeHelp();
    showToast("App installed. Open it from your home screen.");
  });
})();
