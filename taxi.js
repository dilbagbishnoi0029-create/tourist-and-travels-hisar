(() => {
  "use strict";

  const MAPS_KEY = "YOUR_GOOGLE_MAPS_API_KEY";
  const ORIGIN = "Hisar, Haryana, India";
  const RATE = 16;
  const WHATSAPP = "919996095229";
  const quickRoutes = [
    "Delhi", "Chandigarh", "Jodhpur", "Bhopal", "Mumbai", "Imphal",
    "Shillong", "Aizawl", "Kohima", "Bhubaneswar", "Jaipur", "Gangtok",
    "Chennai", "Hyderabad", "Agartala", "Lucknow", "Dehradun", "Kolkata",
  ];
  const routeDistances = {
    Delhi: 165, Chandigarh: 245, Jodhpur: 460, Bhopal: 780, Mumbai: 1400,
    Imphal: 2300, Shillong: 1900, Aizawl: 2400, Kohima: 2400,
    Bhubaneswar: 1600, Jaipur: 320, Gangtok: 1600, Chennai: 2300,
    Hyderabad: 1500, Agartala: 2000, Lucknow: 600, Dehradun: 260, Kolkata: 1500,
  };

  const section = document.getElementById("taxi");
  if (!section) return;

  const input = document.getElementById("taxi-destination");
  const estimateButton = document.getElementById("taxi-estimate");
  const result = document.getElementById("taxi-result");
  const note = document.getElementById("taxi-note");
  const chips = document.getElementById("taxi-chips");
  const destinationResult = document.getElementById("taxi-destination-result");
  const distanceResult = document.getElementById("taxi-distance");
  const roundResult = document.getElementById("taxi-round");
  const fareResult = document.getElementById("taxi-fare");
  const disclaimer = document.getElementById("taxi-disclaimer");
  const whatsapp = document.getElementById("taxi-whatsapp");
  const call = document.getElementById("taxi-call");
  const enquiryButton = document.getElementById("taxi-enquiry");
  const toast = document.getElementById("toast");

  let toastTimer;

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 6500);
  };

  const money = (value) =>
    `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(value)))}`;

  const findRouteDistance = (value) => {
    const key = Object.keys(routeDistances).find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase());
    return key ? routeDistances[key] : null;
  };

  const setNote = (message) => {
    if (!note) return;
    note.textContent = message;
    note.hidden = !message;
  };

  const loadMaps = () => {
    if (window.google?.maps?.places && window.google?.maps?.DistanceMatrixService) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const callback = "__ttMapsReady";
      window[callback] = () => {
        delete window[callback];
        resolve();
      };
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&libraries=places&callback=${callback}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error("Google Maps failed to load"));
      document.head.append(script);
    });
  };

  const renderChips = () => {
    if (!chips) return;
    chips.innerHTML = "";
    quickRoutes.forEach((destination) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "taxi-chip";
      button.textContent = destination;
      button.addEventListener("click", () => {
        input.value = destination;
        estimate();
      });
      chips.append(button);
    });
  };

  const estimate = async () => {
    const destination = input.value.trim();
    if (!destination) {
      showToast("Enter a destination first.");
      input.focus();
      return;
    }

    const toll = tollValue();

    if (!MAPS_KEY || MAPS_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
      const fallbackDistance = findRouteDistance(destination);
      if (fallbackDistance) {
        result.hidden = false;
        destinationResult.textContent = destination;
        distanceResult.textContent = `${fallbackDistance.toFixed(1)} km`;
        roundResult.textContent = `${(fallbackDistance * 2).toFixed(1)} km`;
        fareResult.textContent = money(Math.round(fallbackDistance * 2 * RATE));
        disclaimer.textContent = "Approximate distance for this listed route. Live Google Maps is not configured, so the final fare may vary. Tolls and parking are extra.";
        const message = encodeURIComponent(
          `Hi Tourist and Travels, I need a taxi from Hisar to ${destination}. Approximate distance: ${fallbackDistance.toFixed(1)} km one way / ${(fallbackDistance * 2).toFixed(1)} km round trip. Estimated fare: ₹${Math.round(fallbackDistance * 2 * RATE)}.`
        );
        whatsapp.href = `https://wa.me/${WHATSAPP}?text=${message}`;
        call.href = `tel:+${WHATSAPP}`;
        enquiryButton.onclick = () => {
          const destinationField = document.getElementById("enquiry-destination");
          const messageField = document.getElementById("enquiry-message");
          if (destinationField) destinationField.value = destination;
          if (messageField && !messageField.value.trim()) {
            messageField.value = `Taxi enquiry: Hisar to ${destination}, estimated fare ₹${Math.round(fallbackDistance * 2 * RATE)}.`;
          }
          document.getElementById("enquiry")?.scrollIntoView({ behavior: "smooth", block: "start" });
        };
        result.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }

      setNote("Google Maps is not configured yet. Quick-route chips show approximate fares for listed destinations. Replace YOUR_GOOGLE_MAPS_API_KEY in taxi.js for live distance to any place. Fares are ₹16/km round trip.");
      return;
    }

    estimateButton.disabled = true;
    estimateButton.textContent = "Estimating…";

    try {
      await loadMaps();

      if (window.google?.maps?.places) {
        const autocomplete = new window.google.maps.places.Autocomplete(input, {
          types: ["geocode"],
          fields: ["formatted_address", "name"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place?.formatted_address) input.value = place.formatted_address;
        });
      }

      const service = new window.google.maps.DistanceMatrixService();
      const response = await new Promise((resolve, reject) => {
        service.getDistanceMatrix(
          {
            origins: [ORIGIN],
            destinations: [destination],
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC,
          },
          (res, status) => {
            if (status !== "OK") reject(new Error(status));
            else resolve(res);
          }
        );
      });

      const element = response.rows?.[0]?.elements?.[0];
      if (!element || element.status !== "OK") throw new Error("No route found");

      const resolved = response.destinationAddresses?.[0] || destination;
      const oneWayKm = element.distance.value / 1000;
      const roundKm = oneWayKm * 2;
      const fare = Math.round(roundKm * RATE);

      result.hidden = false;
      destinationResult.textContent = resolved;
      distanceResult.textContent = `${oneWayKm.toFixed(1)} km`;
      roundResult.textContent = `${roundKm.toFixed(1)} km`;
      fareResult.textContent = money(fare);
      disclaimer.textContent = "Estimate only. Final fare may vary with tolls, parking, night charges, and vehicle type.";

      const message = encodeURIComponent(
        `Hi Tourist and Travels, I need a taxi from Hisar to ${resolved}. Estimated distance: ${oneWayKm.toFixed(1)} km one way / ${roundKm.toFixed(1)} km round trip. Estimated fare: ₹${fare}.`
      );
      whatsapp.href = `https://wa.me/${WHATSAPP}?text=${message}`;
      call.href = `tel:+${WHATSAPP}`;
      enquiryButton.onclick = () => {
        const destinationField = document.getElementById("enquiry-destination");
        const messageField = document.getElementById("enquiry-message");
        if (destinationField) destinationField.value = resolved;
        if (messageField && !messageField.value.trim()) {
          messageField.value = `Taxi enquiry: Hisar to ${resolved}, estimated fare ₹${fare}.`;
        }
        document.getElementById("enquiry")?.scrollIntoView({ behavior: "smooth", block: "start" });
      };

      result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch {
      result.hidden = false;
      destinationResult.textContent = destination;
      distanceResult.textContent = "—";
      roundResult.textContent = "—";
      fareResult.textContent = "—";
      disclaimer.textContent = "Could not calculate the distance. Check the destination spelling or add a valid Google Maps API key.";
      showToast("Distance calculation failed. Please try another destination.");
    } finally {
      estimateButton.disabled = false;
      estimateButton.textContent = "Estimate fare";
    }
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      estimate();
    }
  });
  estimateButton.addEventListener("click", estimate);
  renderChips();
  if (MAPS_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
    setNote("Google Maps is not configured yet. Replace YOUR_GOOGLE_MAPS_API_KEY in taxi.js with your key (Maps JavaScript API, Places API, Distance Matrix API) to enable live estimates. Fares are ₹16/km round trip.");
    estimateButton.disabled = true;
    estimateButton.setAttribute("aria-disabled", "true");
  } else {
    setNote("");
  }
})();
