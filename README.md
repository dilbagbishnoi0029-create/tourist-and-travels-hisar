# Tourist and Travels — Landing Page

A single-page travel website for **Tourist and Travels**, based in Hisar and covering destinations across India.

- **Live site:** https://tourist-and-travels-hisar.web.app
- **Firebase project:** `tourist-and-travels-hisar`
- **Stack:** plain HTML, CSS, and JavaScript (no build step)

## Pages and content

- Hero, About, six tour packages, testimonials, footer
- Packages show a route from Hisar, INR pricing, and WhatsApp enquiry links
- Pricing note: fares from ₹16/km
- Dark responsive design at 375 / 768 / 1440 px
- Photo credits are listed in the footer

> Package prices, durations, and testimonials are sample content awaiting owner approval. Contact details and the WhatsApp number are owner-supplied.

## Local preview

Serve the project root with any static server, for example:

```sh
npx serve .
# or
python -m http.server 8080
```

Then open http://localhost:8080.

## Deploy to Firebase

```sh
firebase deploy --only hosting --project tourist-and-travels-hisar
```

Hosting configuration lives in `firebase.json`; the public directory is the project root, with task docs and tooling ignored.

## Firestore

- Default database: `projects/tourist-and-travels-hisar/databases/(default)`
- Rules: `firestore.rules`
- `enquiries` allows validated creates only; public reads, updates, and deletes are denied.
- Deploy rules with:

```sh
firebase deploy --only firestore:rules --project tourist-and-travels-hisar
```

## Project files

```text
index.html            Page markup
styles.css            Theme and responsive layout
script.js             Navigation, active section, year
assets/               Destination photos and favicon
firebase.json         Hosting + Firestore config
firestore.rules       Enquiry validation rules
tasks/                RFP requirements, tests, and evidence (not deployed)
```

## Photo credits

Photos are from Wikimedia Commons under CC BY 4.0 / CC BY-SA 4.0. Author, source, and license links are in the site footer.
