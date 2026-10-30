(() => {
  "use strict";

  const MAPS_KEY = "YOUR_GOOGLE_MAPS_API_KEY";
  const ORIGIN = "Hisar, Haryana, India";
  const HISAR = { lat: 29.1492, lng: 75.7217 };
  const RATE = 16;
  const WHATSAPP = "919996095229";
  const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const NOMINATIM = "https://nominatim.openstreetmap.org/search";
  const OSRM = "https://router.project-osrm.org/route/v1/driving";

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

  let autocompleteAttached = false;
  let leafletPromise = null;

  const section = document.getElementById("taxi");
  if (!section) return;

  const input = document.getElementById("taxi-destination");
  const suggestions = document.getElementById("taxi-suggestions");
  const estimateButton = document.getElementById("taxi-estimate");
  const result = document.getElementById("taxi-result");
  const note = document.getElementById("taxi-note");
  const chips = document.getElementById("taxi-chips");
  const mapContainer = document.getElementById("taxi-map");
  const destinationResult = document.getElementById("taxi-destination-result");
  const distanceResult = document.getElementById("taxi-distance");
  const roundResult = document.getElementById("taxi-round");
  const durationResult = document.getElementById("taxi-duration");
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

  const keyMissing = () => !MAPS_KEY || MAPS_KEY === "YOUR_GOOGLE_MAPS_API_KEY";

  const findRouteDistance = (value) => {
    const key = Object.keys(routeDistances).find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase());
    return key ? routeDistances[key] : null;
  };

  const setNote = (message) => {
    if (!note) return;
    note.textContent = message;
    note.hidden = !message;
  };

  const formatDuration = (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "—";
    const totalMinutes = Math.round(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!hours) return `${minutes} min`;
    return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
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

  const loadLeaflet = () => {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "assets/vendor/leaflet/leaflet.js";
      script.async = true;
      script.onload = () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet unavailable"));
      };
      script.onerror = () => reject(new Error("Leaflet failed to load"));
      document.head.append(script);
    });
    return leafletPromise;
  };

  const geocodeDestination = async (query) => {
    const attempts = [query, `${query}, India`];
    for (const attempt of attempts) {
      const url = `${NOMINATIM}?format=jsonv2&limit=1&addressdetails=0&countrycodes=in&q=${encodeURIComponent(attempt)}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) continue;
      const results = await response.json();
      if (Array.isArray(results) && results.length) {
        const label = String(results[0].display_name || attempt)
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
          .slice(0, 3)
          .join(", ");
        return {
          lat: Number(results[0].lat),
          lng: Number(results[0].lon),
          label,
        };
      }
    }
    throw new Error("Destination not found");
  };

  const fetchOsrmRoute = async (place) => {
    const url = `${OSRM}/${HISAR.lng},${HISAR.lat};${place.lng},${place.lat}?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Route service unavailable");
    const data = await response.json();
    if (data.code !== "Ok" || !data.routes?.length) throw new Error("No driving route");
    const route = data.routes[0];
    return {
      km: route.distance / 1000,
      seconds: route.duration,
      geometry: route.geometry,
      label: place.label,
    };
  };

  const clearMapLayers = (map) => {
    if (!map || !map._ttLayers) return;
    map._ttLayers.forEach((layer) => map.removeLayer(layer));
    map._ttLayers = [];
  };

  const showOsmMap = async (route) => {
    if (!mapContainer) return;
    mapContainer.hidden = false;
    try {
      const L = await loadLeaflet();
      if (!mapContainer._ttMap) {
        mapContainer._ttMap = L.map(mapContainer, { scrollWheelZoom: false });
        L.tileLayer(OSM_TILES, {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapContainer._ttMap);
      }
      const map = mapContainer._ttMap;
      clearMapLayers(map);
      const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const line = L.polyline(latlngs, { color: "#e6b45e", weight: 5, opacity: 0.9 }).addTo(map);
      const pickup = L.circleMarker([HISAR.lat, HISAR.lng], {
        radius: 8, color: "#0b0f14", weight: 2, fillColor: "#e6b45e", fillOpacity: 1,
      }).addTo(map).bindTooltip("Pickup: Hisar");
      const end = latlngs[latlngs.length - 1];
      const drop = L.circleMarker(end, {
        radius: 8, color: "#0b0f14", weight: 2, fillColor: "#f4efe6", fillOpacity: 1,
      }).addTo(map).bindTooltip(route.label);
      map._ttLayers = [line, pickup, drop];
      map.fitBounds(line.getBounds(), { padding: [30, 30] });
      setTimeout(() => map.invalidateSize(), 80);
    } catch {
      mapContainer.hidden = true;
    }
  };

  const showGoogleMap = async (destination) => {
    if (!mapContainer) return;
    mapContainer.hidden = false;
    try {
      await loadMaps();
      const origin = HISAR;
      const map = new window.google.maps.Map(mapContainer, {
        center: origin,
        zoom: 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      const service = new window.google.maps.DirectionsService();
      const renderer = new window.google.maps.DirectionsRenderer({
        map,
        polylineOptions: { strokeColor: "#e6b45e", strokeWeight: 4 },
      });
      const route = await new Promise((resolve, reject) => {
        service.route(
          { origin: ORIGIN, destination, travelMode: window.google.maps.TravelMode.DRIVING },
          (response, status) => {
            if (status === "OK") resolve(response);
            else reject(new Error(status));
          }
        );
      });
      renderer.setDirections(route);
    } catch {
      try {
        await loadMaps();
        const geocoder = new window.google.maps.Geocoder();
        const places = await new Promise((resolve, reject) => {
          geocoder.geocode({ address: destination }, (results, status) => {
            if (status === "OK") resolve(results);
            else reject(new Error(status));
          });
        });
        const position = places[0].geometry.location;
        const map = new window.google.maps.Map(mapContainer, {
          center: position,
          zoom: 8,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        new window.google.maps.Marker({ position, map, title: destination });
        new window.google.maps.Marker({ position: origin, map, title: "Hisar" });
      } catch {
        mapContainer.hidden = true;
      }
    }
  };

  const applyResult = ({ destination, oneWayKm, seconds, route, source }) => {
    const roundKm = oneWayKm * 2;
    const fare = Math.round(roundKm * RATE);
    result.hidden = false;
    destinationResult.textContent = destination;
    distanceResult.textContent = `${oneWayKm.toFixed(1)} km`;
    roundResult.textContent = `${roundKm.toFixed(1)} km`;
    durationResult.textContent = formatDuration(seconds);
    fareResult.textContent = money(fare);
    if (source === "osm") {
      disclaimer.textContent = "Live driving route from Hisar via OpenStreetMap. Estimate only — tolls, parking, night charges, and vehicle type may change the final fare.";
    } else if (source === "google") {
      disclaimer.textContent = "Estimate only. Final fare may vary with tolls, parking, night charges, and vehicle type.";
    } else {
      disclaimer.textContent = "Approximate distance. Live map is unavailable right now — estimate only; tolls and parking are extra.";
    }

    const message = encodeURIComponent(
      `Hi Tourist and Travels, I need a taxi from Hisar to ${destination}. Estimated distance: ${oneWayKm.toFixed(1)} km one way / ${roundKm.toFixed(1)} km round trip. Estimated fare: ₹${fare}.`
    );
    whatsapp.href = `https://wa.me/${WHATSAPP}?text=${message}`;
    call.href = `tel:+${WHATSAPP}`;
    enquiryButton.onclick = () => {
      const destinationField = document.getElementById("enquiry-destination");
      const messageField = document.getElementById("enquiry-message");
      if (destinationField) destinationField.value = destination;
      if (messageField && !messageField.value.trim()) {
        messageField.value = `Taxi enquiry: Hisar to ${destination}, estimated fare ₹${fare}.`;
      }
      document.getElementById("enquiry")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (source === "osm" && route) showOsmMap(route);
    else if (source === "google") showGoogleMap(destination);
    else if (mapContainer) mapContainer.hidden = true;
  };

  const renderChips = () => {
    if (chips) {
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
    }

    if (suggestions) {
      suggestions.innerHTML = "";
      quickRoutes.forEach((destination) => {
        const option = document.createElement("option");
        option.value = destination;
        suggestions.append(option);
      });
    }
  };

  const estimate = async () => {
    const destination = input.value.trim();
    if (!destination) {
      showToast("Enter a destination first.");
      input.focus();
      return;
    }

    if (keyMissing()) {
      estimateButton.disabled = true;
      estimateButton.textContent = "Finding route…";
      setNote("Searching the live route from Hisar…");
      try {
        const place = await geocodeDestination(destination);
        const route = await fetchOsrmRoute(place);
        applyResult({
          destination: place.label,
          oneWayKm: route.km,
          seconds: route.seconds,
          route,
          source: "osm",
        });
        setNote("Live route via OpenStreetMap. Fares are ₹16/km round trip. Tolls and parking extra.");
      } catch {
        const fallbackDistance = findRouteDistance(destination);
        if (fallbackDistance) {
          applyResult({
            destination,
            oneWayKm: fallbackDistance,
            seconds: null,
            source: "fallback",
          });
          setNote("Live map is unavailable, so an approximate distance is shown for this listed route. Try again in a moment for the full map.");
        } else {
          if (mapContainer) mapContainer.hidden = true;
          setNote("We couldn't find that place. Check the spelling or pick a nearby city from the quick routes.");
          showToast("Destination not found. Please try another place.");
        }
      } finally {
        estimateButton.disabled = false;
        estimateButton.textContent = "Estimate fare";
      }
      return;
    }

    estimateButton.disabled = true;
    estimateButton.textContent = "Estimating…";

    try {
      await loadMaps();

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
      const seconds = element.duration?.value;

      applyResult({ destination: resolved, oneWayKm, seconds, source: "google" });
    } catch {
      if (mapContainer) mapContainer.hidden = true;
      result.hidden = false;
      destinationResult.textContent = destination;
      distanceResult.textContent = "—";
      roundResult.textContent = "—";
      durationResult.textContent = "—";
      fareResult.textContent = "—";
      disclaimer.textContent = "Could not calculate the distance. Check the destination spelling or add a valid Google Maps API key.";
      showToast("Distance calculation failed. Please try another destination.");
    } finally {
      estimateButton.disabled = false;
      estimateButton.textContent = "Estimate fare";
    }
  };

  const ensureAutocomplete = async () => {
    if (autocompleteAttached || keyMissing()) return;
    try {
      await loadMaps();
      if (window.google?.maps?.places && !autocompleteAttached) {
        const autocomplete = new window.google.maps.places.Autocomplete(input, {
          types: ["geocode"],
          fields: ["formatted_address", "name"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place?.formatted_address) {
            input.value = place.formatted_address;
            estimate();
          }
        });
        autocompleteAttached = true;
      }
    } catch {
      // Keep the text input usable even if Maps fails to load.
    }
  };

  input.addEventListener("focus", () => {
    ensureAutocomplete();
  });
  input.addEventListener("change", () => {
    if (input.value.trim()) estimate();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      estimate();
    }
  });
  estimateButton.addEventListener("click", estimate);
  renderChips();
  if (keyMissing()) {
    setNote("Live route, distance, drive time and map are powered by OpenStreetMap. Fares are ₹16/km round trip. Tolls and parking extra.");
  } else {
    setNote("");
  }
})();
