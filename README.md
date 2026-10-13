# Card Scanner — NICHEM

Scan business cards with your iPhone camera. Uses **Apple Vision** (on-device OCR) — no API key, no internet required, completely free.

---

## Features

- **Live card detection** — the shutter turns green when it sees text on a card
- **Scan front & back** of any business card
- **On-device OCR** via Apple Vision Framework — fast, private, works offline
- **Auto-extracts** name, designation, company, phone, mobile, email, website, address
- **Review & edit** before saving — nothing is committed without your tap
- **Saves to device contacts** (native iOS Contacts)
- **Card images** saved locally alongside the contact
- **Scan history** on the home screen (last 50 cards)

---

## Setup

### Prerequisites

- macOS with Xcode installed
- Node.js 18+
- iOS device (iPhone) — Apple Vision requires a real device, not the simulator

### Install

```bash
cd card-scanner
npm install
```

### Build and run on your iPhone

Since `react-native-vision-camera` uses native modules, you need a development build (not Expo Go):

```bash
# Generate the native iOS project
npx expo prebuild --platform ios

# Open in Xcode and run on your device
npx expo run:ios --device
```

The first build takes ~5 minutes. After that, subsequent runs are fast.

---

## Project Structure

```
card-scanner/
├── app/
│   ├── _layout.tsx      # Navigation shell
│   ├── index.tsx        # Home screen with scan history
│   ├── scan.tsx         # Camera screen — live OCR + front/back capture
│   └── review.tsx       # Edit extracted fields, save to contacts
├── src/
│   └── utils/
│       └── ocr.ts       # Apple Vision frame processor + card field parser
└── app.json             # Expo config (permissions, bundle ID)
```

---

## Notes

- **No API key needed.** OCR runs entirely on your iPhone using Apple's Vision framework.
- **No data leaves your phone.** Card images and contact data stay on-device.
- Card images are stored in `documentDirectory/cards/` and persist across restarts.
- The bundle ID is `com.nichem.cardscanner` — change in `app.json` if needed.
- Each saved contact gets a note: `Scanned by Card Scanner – DD Mon YYYY`
