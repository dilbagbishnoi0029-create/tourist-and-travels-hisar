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

  if (!window.firebase) {
    showToast("Sign-in is unavailable right now. Please try again later.");
    return;
  }

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
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

  auth.onAuthStateChanged(updateUser);

  window.TT = {
    auth,
    db: firebase.firestore(),
    adminEmails: ["dilbagbishnoi0029@gmail.com", "vishavsuthar0@gmail.com"],
  };
})();
