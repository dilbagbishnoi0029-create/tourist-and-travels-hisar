(() => {
  "use strict";

  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("primary-nav");
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const year = document.getElementById("year");
  const mobileQuery = window.matchMedia("(max-width: 767px)");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  const setMenu = (open) => {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  };

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a") && mobileQuery.matches) {
        setMenu(false);
      }
    });

    document.addEventListener("click", (event) => {
      if (menuToggle.getAttribute("aria-expanded") !== "true") return;
      if (!nav.contains(event.target) && !menuToggle.contains(event.target)) {
        setMenu(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        menuToggle.focus();
      }
    });

    const handleViewportChange = (event) => {
      if (!event.matches) setMenu(false);
    };

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", handleViewportChange);
    } else if (typeof mobileQuery.addListener === "function") {
      mobileQuery.addListener(handleViewportChange);
    }
  }

  if (header) {
    const updateHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  if ("IntersectionObserver" in window && navLinks.length) {
    const sections = navLinks
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    const setActive = (id) => {
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("is-active", active);
        if (active) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -52% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
  }

  const enquiryForm = document.getElementById("enquiry-form");
  if (enquiryForm) {
    const FIREBASE_PROJECT_ID = "tourist-and-travels-hisar";
    const FIREBASE_API_KEY = "AIzaSyD09nW6UMPdiUoHgFiu4gNqXw_jS3EqYbk";
    const ENDPOINT = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/enquiries?key=${FIREBASE_API_KEY}`;
    const status = document.getElementById("enquiry-status");
    const submit = enquiryForm.querySelector(".enquiry-submit");

    const setStatus = (message, type) => {
      if (!status) return;
      status.textContent = message;
      status.classList.remove("is-success", "is-error");
      if (type) status.classList.add(type);
    };

    enquiryForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (enquiryForm.elements.website.value) {
        setStatus("Thank you — your enquiry is with us.", "success");
        enquiryForm.reset();
        return;
      }

      const data = {
        name: enquiryForm.elements.name.value.trim(),
        email: enquiryForm.elements.email.value.trim(),
        phone: enquiryForm.elements.phone.value.trim(),
        destination: enquiryForm.elements.destination.value,
        message: enquiryForm.elements.message.value.trim(),
        createdAt: new Date().toISOString(),
      };

      if (!data.name) {
        setStatus("Please enter your name.", "error");
        enquiryForm.elements.name.focus();
        return;
      }
      if (!data.email) {
        setStatus("Please enter your email address.", "error");
        enquiryForm.elements.email.focus();
        return;
      }
      if (!data.phone) {
        setStatus("Please enter your phone number.", "error");
        enquiryForm.elements.phone.focus();
        return;
      }
      if (!data.destination) {
        setStatus("Please choose a destination.", "error");
        enquiryForm.elements.destination.focus();
        return;
      }

      const phoneDigits = data.phone.replace(/\D/g, "");
      if (data.name.length < 2) {
        setStatus("Please enter your full name.", "error");
        enquiryForm.elements.name.focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        setStatus("Please enter a valid email address.", "error");
        enquiryForm.elements.email.focus();
        return;
      }
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        setStatus("Please enter a valid phone number.", "error");
        enquiryForm.elements.phone.focus();
        return;
      }

      const payload = {
        fields: {
          name: { stringValue: data.name },
          email: { stringValue: data.email },
          phone: { stringValue: data.phone },
          destination: { stringValue: data.destination },
          message: { stringValue: data.message },
          createdAt: { stringValue: data.createdAt },
        },
      };

      submit.disabled = true;
      submit.textContent = "Sending…";
      setStatus("Sending your enquiry…");

      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`Firestore responded ${response.status}`);

        setStatus("Thank you — your enquiry is with us. We’ll reply within one business day.", "success");
        enquiryForm.reset();
      } catch (error) {
        setStatus("We couldn’t send your enquiry. Please try WhatsApp or email lilurambishnoi1982@gmail.com.", "error");
      } finally {
        submit.disabled = false;
        submit.textContent = "Send enquiry";
      }
    });
  }
})();
