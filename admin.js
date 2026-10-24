(() => {
  "use strict";

  const TT = window.TT;
  if (!TT) return;

  const { auth, db, adminEmails } = TT;
  const packageGrid = document.getElementById("package-grid");
  const panel = document.getElementById("admin-panel");
  const adminLink = document.getElementById("admin-link");
  const list = document.getElementById("admin-list");
  const form = document.getElementById("admin-form");
  const newButton = document.getElementById("admin-new");
  const cancelButton = document.getElementById("admin-cancel");
  const deleteButton = document.getElementById("admin-delete");
  const status = document.getElementById("admin-status");

  if (!packageGrid || !panel || !list || !form) return;

  const fields = {
    id: document.getElementById("admin-id"),
    name: document.getElementById("admin-name"),
    destination: document.getElementById("admin-destination"),
    duration: document.getElementById("admin-duration"),
    price: document.getElementById("admin-price"),
    discount: document.getElementById("admin-discount"),
    order: document.getElementById("admin-order"),
    image: document.getElementById("admin-image"),
    highlights: document.getElementById("admin-highlights"),
    visible: document.getElementById("admin-visible"),
  };

  const WHATSAPP = "919996095229";
  const FALLBACK_IMAGE = "assets/hero.webp";

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[character];
    });

  const safeImage = (value) => {
    const url = String(value || "").trim();
    return /^(https?:\/\/|assets\/)/i.test(url) ? url : FALLBACK_IMAGE;
  };

  const formatPrice = (value) =>
    `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(Number(value) || 0)))}`;

  const priceParts = (pkg) => {
    const price = Math.max(0, Math.round(Number(pkg.price) || 0));
    const discount = Math.min(90, Math.max(0, Math.round(Number(pkg.discountPercent) || 0)));
    const finalPrice = Math.round(price * (1 - discount / 100));
    return { price, discount, finalPrice };
  };

  const arrow = `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const renderSite = (packages) => {
    const destinationList = document.getElementById("destination-options");
    if (destinationList) {
      destinationList.innerHTML =
        packages.map((pkg) => `<option value="${escapeHtml(pkg.name)}"></option>`).join("") +
        `<option value="Somewhere else in India"></option>`;
    }

    if (!packages.length) {
      packageGrid.innerHTML = `<p class="package-empty">No packages are visible right now. Please check back soon or message us on WhatsApp.</p>`;
      return;
    }

    packageGrid.innerHTML = packages
      .map((pkg) => {
        const { price, discount, finalPrice } = priceParts(pkg);
        const highlights = (Array.isArray(pkg.highlights) ? pkg.highlights : [])
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("");
        const oldPrice =
          discount > 0
            ? `<span class="price-was">${formatPrice(price)}</span><span class="discount-badge">${discount}% off</span>`
            : "";
        const message = encodeURIComponent(`Hi, I'm interested in the ${pkg.name} package.`);

        return `<article class="package-card">
          <div class="package-media">
            <img src="${escapeHtml(safeImage(pkg.imageUrl))}" width="1280" height="853" loading="lazy" alt="${escapeHtml(pkg.name)} — ${escapeHtml(pkg.destination)}">
            <span class="package-duration">${escapeHtml(pkg.duration)}</span>
          </div>
          <div class="package-body">
            <p class="package-route"><span class="route-from">From Hisar</span><span class="route-sep" aria-hidden="true">→</span><span>${escapeHtml(pkg.destination)}</span></p>
            <div class="package-head">
              <h3>${escapeHtml(pkg.name)}</h3>
              <p class="package-price"><span class="price-amount">${formatPrice(finalPrice)}</span> <span class="price-unit">per person</span>${oldPrice}</p>
            </div>
            <ul class="highlights">${highlights}</ul>
            <a class="package-link" href="https://wa.me/${WHATSAPP}?text=${message}" target="_blank" rel="noopener">
              Enquire on WhatsApp ${arrow}
            </a>
          </div>
        </article>`;
      })
      .join("");
  };

  const loadSite = () => {
    db.collection("packages")
      .where("visible", "==", true)
      .onSnapshot(
        (snapshot) => {
          const packages = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
          renderSite(packages);
        },
        () => {
          // Keep the static fallback cards if the database is unavailable.
        }
      );
  };

  const isAdmin = (user) =>
    Boolean(user?.email) && adminEmails.includes(String(user.email).toLowerCase());

  const setStatus = (message, type = "") => {
    if (!status) return;
    status.textContent = message;
    status.dataset.type = type;
  };

  const resetForm = (packageCount = 0) => {
    fields.id.value = "";
    fields.name.value = "";
    fields.destination.value = "";
    fields.duration.value = "";
    fields.price.value = "";
    fields.discount.value = "0";
    fields.order.value = String(packageCount);
    fields.image.value = "";
    fields.highlights.value = "";
    fields.visible.checked = true;
    deleteButton.hidden = true;
    setStatus("");
  };

  const openNew = () => {
    resetForm(list.children.length);
    form.hidden = false;
    fields.name.focus();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const openEdit = (pkg) => {
    fields.id.value = pkg.id;
    fields.name.value = pkg.name || "";
    fields.destination.value = pkg.destination || "";
    fields.duration.value = pkg.duration || "";
    fields.price.value = String(Number(pkg.price) || "");
    fields.discount.value = String(Number(pkg.discount) || 0);
    fields.order.value = String(Number(pkg.order) || 0);
    fields.image.value = pkg.imageUrl || "";
    fields.highlights.value = (Array.isArray(pkg.highlights) ? pkg.highlights : []).join("\n");
    fields.visible.checked = Boolean(pkg.visible);
    deleteButton.hidden = false;
    form.hidden = false;
    setStatus("");
    fields.name.focus();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const renderAdminList = (packages) => {
    list.innerHTML = "";
    if (!packages.length) {
      list.innerHTML = `<p class="admin-empty">No packages yet. Use “Add package” to create one.</p>`;
      return;
    }

    packages
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
      .forEach((pkg) => {
        const { finalPrice, discount } = priceParts(pkg);
        const item = document.createElement("article");
        item.className = "admin-item";
        item.innerHTML = `<div class="admin-item-main">
            <strong>${escapeHtml(pkg.name)}</strong>
            <span>${escapeHtml(pkg.destination)} · ${escapeHtml(pkg.duration)}</span>
          </div>
          <div class="admin-item-meta">
            <span class="admin-price">${formatPrice(finalPrice)}</span>
            ${discount > 0 ? `<span class="admin-discount">${discount}% off</span>` : ""}
            <span class="admin-pill ${pkg.visible ? "is-visible" : "is-hidden"}">${pkg.visible ? "Visible" : "Hidden"}</span>
            <span class="admin-order">#${Number(pkg.order) || 0}</span>
          </div>
          <div class="admin-item-actions">
            <button type="button" class="admin-edit" data-id="${pkg.id}">Edit</button>
            <button type="button" class="admin-remove" data-id="${pkg.id}">Delete</button>
          </div>`;
        list.append(item);
      });
  };

  const loadAdmin = async () => {
    const snapshot = await db.collection("packages").get();
    const packages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const destinationList = document.getElementById("admin-destination-options");
    if (destinationList) {
      const destinations = [...new Set(packages.map((pkg) => pkg.destination).filter(Boolean))].sort();
      destinationList.innerHTML = destinations
        .map((destination) => `<option value="${escapeHtml(destination)}"></option>`)
        .join("");
    }
    renderAdminList(packages);
    return packages;
  };

  list.addEventListener("click", async (event) => {
    const editButton = event.target.closest(".admin-edit");
    const removeButton = event.target.closest(".admin-remove");

    if (editButton) {
      const snapshot = await db.collection("packages").doc(editButton.dataset.id).get();
      if (snapshot.exists) openEdit({ id: snapshot.id, ...snapshot.data() });
    }

    if (removeButton) {
      const id = removeButton.dataset.id;
      if (!window.confirm("Delete this package permanently?")) return;
      try {
        await db.collection("packages").doc(id).delete();
        setStatus("Package deleted.", "success");
        await loadAdmin();
      } catch {
        setStatus("Could not delete the package. Please try again.", "error");
      }
    }
  });

  newButton?.addEventListener("click", openNew);
  cancelButton?.addEventListener("click", () => {
    form.hidden = true;
    resetForm();
  });

  deleteButton?.addEventListener("click", async () => {
    const id = fields.id.value;
    if (!id || !window.confirm("Delete this package permanently?")) return;
    try {
      await db.collection("packages").doc(id).delete();
      form.hidden = true;
      resetForm();
      setStatus("Package deleted.", "success");
      await loadAdmin();
    } catch {
      setStatus("Could not delete the package. Please try again.", "error");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!isAdmin(user)) {
      setStatus("Your account is not allowed to edit packages.", "error");
      return;
    }

    const highlights = fields.highlights.value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const price = Number(fields.price.value);
    const discount = Number(fields.discount.value) || 0;
    const order = Number(fields.order.value) || 0;

    if (!fields.name.value.trim() || !fields.destination.value.trim() || !fields.duration.value.trim()) {
      setStatus("Name, destination, and duration are required.", "error");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setStatus("Price must be greater than 0.", "error");
      return;
    }
    if (discount < 0 || discount > 90) {
      setStatus("Discount must be between 0 and 90.", "error");
      return;
    }
    if (!highlights.length) {
      setStatus("Add at least one highlight.", "error");
      return;
    }

    const id = fields.id.value || db.collection("packages").doc().id;
    const data = {
      name: fields.name.value.trim(),
      destination: fields.destination.value.trim(),
      duration: fields.duration.value.trim(),
      highlights,
      price,
      discountPercent: discount,
      imageUrl: fields.image.value.trim(),
      visible: fields.visible.checked,
      order,
      updatedAt: new Date().toISOString(),
      updatedBy: user.email,
    };

    try {
      setStatus("Saving package.");
      await db.collection("packages").doc(id).set(data);
      form.hidden = true;
      resetForm();
      setStatus("Package saved. The public page is updated.", "success");
      await loadAdmin();
    } catch {
      setStatus("Could not save the package. Check the fields and try again.", "error");
    }
  });

  const applyAdmin = async (user) => {
    const allowed = isAdmin(user);
    panel.hidden = !allowed;
    if (adminLink) adminLink.hidden = !allowed;

    if (!allowed) {
      form.hidden = true;
      list.innerHTML = "";
      setStatus("");
      return;
    }

    try {
      await loadAdmin();
    } catch {
      setStatus("Could not load packages. Please refresh.", "error");
    }
  };

  loadSite();
  auth.onAuthStateChanged(applyAdmin);
})();
