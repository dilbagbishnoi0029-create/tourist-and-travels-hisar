(() => {
  "use strict";

  const firebaseConfig = {
    apiKey: "AIzaSyD09nW6UMPdiUoHgFiu4gNqXw_jS3EqYbk",
    authDomain: "tourist-and-travels-hisar.firebaseapp.com",
    projectId: "tourist-and-travels-hisar",
    storageBucket: "tourist-and-travels-hisar.firebasestorage.app",
    messagingSenderId: "421849943923",
    appId: "1:421849943923:web:fd9af5aa95f2ec34a0bf06",
  };

  const signInButton = document.getElementById("google-signin");
  const userBox = document.getElementById("auth-user");
  const avatar = document.getElementById("auth-avatar");
  const name = document.getElementById("auth-name");
  const signOutButton = document.getElementById("auth-signout");
  const toast = document.getElementById("toast");
  const phonePrompt = document.getElementById("phone-prompt");
  const phoneForm = document.getElementById("phone-prompt-form");
  const phoneInput = document.getElementById("phone-prompt-input");
  const phoneSkip = document.getElementById("phone-prompt-skip");
  const phoneStatus = document.getElementById("phone-prompt-status");

  const PHONE_SKIP_KEY = "tt-phone-prompt-skipped";

  let toastTimer;

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 6500);
  };

  const setBusy = (busy) => {
    if (!signInButton) return;
    signInButton.disabled = busy;
    signInButton.setAttribute("aria-busy", String(busy));
  };

  const updateUser = (user) => {
    if (!signInButton || !userBox || !avatar || !name) return;

    if (!user) {
      signInButton.hidden = false;
      userBox.hidden = true;
      avatar.style.backgroundImage = "";
      avatar.textContent = "";
      name.textContent = "";
      name.removeAttribute("title");
      return;
    }

    const label = user.displayName || user.email || "Account";
    signInButton.hidden = true;
    userBox.hidden = false;
    name.textContent = label;
    name.title = user.email || label;
    avatar.textContent = user.photoURL ? "" : label.charAt(0).toUpperCase();
    avatar.style.backgroundImage = user.photoURL ? `url("${user.photoURL}")` : "";
  };

  const normalisePhone = (value) => String(value ?? "").trim().slice(0, 20);
  const phoneDigits = (value) => String(value ?? "").replace(/\D/g, "");

  const setPhoneStatus = (message, type = "") => {
    if (!phoneStatus) return;
    phoneStatus.textContent = message;
    phoneStatus.classList.remove("is-success", "is-error");
    if (type) phoneStatus.classList.add(type);
  };

  const hidePhonePrompt = () => {
    if (!phonePrompt) return;
    phonePrompt.hidden = true;
  };

  const showPhonePrompt = () => {
    if (!phonePrompt) return;
    let skipped = false;
    try {
      skipped = sessionStorage.getItem(PHONE_SKIP_KEY) === "1";
    } catch {
      skipped = false;
    }
    if (skipped) return;
    setPhoneStatus("");
    phonePrompt.hidden = false;
  };

  const saveProfile = async (user) => {
    const ref = db.collection("users").doc(user.uid);
    const now = new Date().toISOString();
    let existing = null;

    try {
      const snapshot = await ref.get();
      if (snapshot.exists) existing = snapshot.data();
    } catch {
      existing = null;
    }

    const profile = {
      uid: user.uid,
      name: String(user.displayName || user.email || "Account").slice(0, 120),
      email: String(user.email || "").slice(0, 120),
      photoUrl: String(user.photoURL || "").slice(0, 600),
      phone: normalisePhone(existing?.phone),
      provider: String(user.providerData?.[0]?.providerId || "google.com").slice(0, 40),
      createdAt: String(existing?.createdAt || now).slice(0, 40),
      lastLoginAt: now,
    };

    try {
      await ref.set(profile);
    } catch {
      // Offline or rules not deployed yet: keep the site usable.
    }

    return profile;
  };

  if (!window.firebase) {
    showToast("Sign-in is unavailable right now. Please try again later.");
    return;
  }

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  auth.useDeviceLanguage();

  auth.getRedirectResult().catch((error) => {
    if (error?.code === "auth/operation-not-allowed") {
      showToast("Google sign-in isn't enabled yet. Please try again later.");
    }
  });

  signInButton?.addEventListener("click", async () => {
    setBusy(true);
    let error;

    try {
      await auth.signInWithPopup(provider);
    } catch (popupError) {
      error = popupError;

      if (
        error?.code === "auth/popup-blocked" ||
        error?.code === "auth/operation-not-supported-in-this-environment"
      ) {
        try {
          await auth.signInWithRedirect(provider);
          return;
        } catch (redirectError) {
          error = redirectError;
        }
      }
    } finally {
      setBusy(false);
    }

    if (!error) return;
    if (auth.currentUser) return;
    if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") return;

    if (error.code === "auth/operation-not-allowed") {
      showToast("Google sign-in isn't enabled yet. Please try again later.");
    } else if (error.code === "auth/unauthorized-domain") {
      showToast("This domain isn't authorised for Google sign-in yet.");
    } else {
      showToast("Could not sign in with Google. Please try again.");
    }
  });

  signOutButton?.addEventListener("click", async () => {
    try {
      await auth.signOut();
      showToast("Signed out.");
    } catch {
      showToast("Could not sign out. Please try again.");
    }
  });

  phoneForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      hidePhonePrompt();
      return;
    }

    const phone = normalisePhone(phoneInput?.value);
    const digits = phoneDigits(phone);

    if (digits.length < 7 || digits.length > 15) {
      setPhoneStatus("Please enter a valid phone number.", "is-error");
      phoneInput?.focus();
      return;
    }

    const submit = phoneForm.querySelector('button[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Saving…";
    }
    setPhoneStatus("Saving your phone…");

    try {
      await db.collection("users").doc(user.uid).set({ phone }, { merge: true });
      setPhoneStatus("");
      hidePhonePrompt();
      showToast("Phone saved.");
    } catch {
      setPhoneStatus("Could not save your phone. Please try again.", "is-error");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Save phone";
      }
    }
  });

  phoneSkip?.addEventListener("click", () => {
    try {
      sessionStorage.setItem(PHONE_SKIP_KEY, "1");
    } catch {
      // Private mode without storage: the prompt still closes for this page.
    }
    hidePhonePrompt();
  });

  auth.onAuthStateChanged(async (user) => {
    updateUser(user);

    if (!user) {
      hidePhonePrompt();
      return;
    }

    const profile = await saveProfile(user);
    if (profile.phone) {
      hidePhonePrompt();
    } else {
      showPhonePrompt();
    }
  });

  window.TT = {
    auth,
    db,
    adminEmails: ["dilbagbishnoi0029@gmail.com"],
  };
})();
