import { scanOCR } from '@bear-block/vision-camera-ocr';
import type { Frame } from 'react-native-vision-camera';

export type CardData = {
  name?: string;
  designation?: string;
  company?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  address?: string;
};

/**
 * Runs Apple Vision OCR on a captured frame and parses business card fields.
 * Called from the camera's frame processor — runs entirely on-device, no network.
 */
export function runOcrOnFrame(frame: Frame): string {
  'worklet';
  const result = scanOCR(frame);
  return result.result.text;
}

/**
 * Parses raw OCR text (from one or two card sides) into structured contact fields.
 */
export function parseCardText(frontText: string, backText?: string): CardData {
  const combined = [frontText, backText].filter(Boolean).join('\n');
  const lines = combined
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const result: CardData = {};

  // ── Email ──────────────────────────────────────────────────────────────
  const emailMatch = combined.match(/[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.email = emailMatch[0].toLowerCase();

  // ── Phone numbers (Indian & international) ─────────────────────────────
  const phoneMatches = [
    // Indian mobile: starts 6-9, 10 digits (with optional +91 prefix)
    ...combined.matchAll(/(?:\+91[-\s]?)?[6-9]\d{9}/g),
    // International: +XX ... format
    ...combined.matchAll(/\+\d{1,3}[-\s]?\(?\d{1,4}\)?[-\s]?\d{3,4}[-\s]?\d{4}/g),
    // Landline: 0XX-XXXXXXXX
    ...combined.matchAll(/\b0\d{2,4}[-\s]?\d{6,8}\b/g),
  ];
  const phones = [...new Set(phoneMatches.map((m) => m[0].replace(/\s+/g, ' ').trim()))];
  if (phones[0]) result.phone = phones[0];
  if (phones[1] && phones[1] !== phones[0]) result.mobile = phones[1];

  // ── Website ────────────────────────────────────────────────────────────
  const webMatch = combined.match(
    /(?:www\.|https?:\/\/)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)*/i
  );
  if (webMatch) result.website = webMatch[0];

  // ── Name: first non-noise prominent line ───────────────────────────────
  const noisePattern =
    /[@\d\/\\|]|^(www\.|http)|^\+|\b(pvt|ltd|inc|corp|llp|private|limited|solutions|services|industries|technologies|consulting|group|enterprises|ventures|road|street|nagar|plot|sector|phase|floor)\b/i;

  const designationKeywords =
    /\b(manager|director|founder|owner|ceo|cto|cfo|vp|vice\s?president|head\s+of|head,|engineer|executive|consultant|analyst|officer|associate|partner|president|md|managing|sales|marketing|operations|technical|lead|senior|junior|assistant|advisor|chairman|trustee)\b/i;

  const nameCandidates = lines.filter(
    (l) =>
      l.length >= 3 &&
      l.length <= 50 &&
      !noisePattern.test(l) &&
      !result.email?.includes(l) &&
      !result.website?.includes(l)
  );

  // Prefer a line that looks like a human name (2+ words, mostly letters)
  const humanName = nameCandidates.find(
    (l) =>
      /^[A-Za-z\s.]+$/.test(l) &&
      l.split(' ').length >= 2 &&
      !designationKeywords.test(l)
  );
  if (humanName) result.name = toTitleCase(humanName);
  else if (nameCandidates[0]) result.name = toTitleCase(nameCandidates[0]);

  // ── Designation ────────────────────────────────────────────────────────
  const designationLine = lines.find(
    (l) => designationKeywords.test(l) && l !== result.name && l.length < 60
  );
  if (designationLine) result.designation = toTitleCase(designationLine);

  // ── Company ────────────────────────────────────────────────────────────
  const companyPattern =
    /\b(pvt\.?\s?ltd\.?|private\s+limited|ltd\.?|inc\.?|corp\.?|llp|solutions|services|industries|technologies|consulting|group|enterprises|ventures|chemicals|pharma|foods)\b/i;
  const companyLine = lines.find(
    (l) => companyPattern.test(l) && l !== result.name && l !== result.designation
  );
  if (companyLine) result.company = toTitleCase(companyLine);

  // ── Address ────────────────────────────────────────────────────────────
  const addressPattern =
    /\b(road|rd\.?|street|st\.?|avenue|ave\.?|nagar|plot|sector|phase|floor|building|bldg|complex|estate|industrial|area|district|pin|pincode|taluk|tehsil|maharashtra|gujarat|delhi|mumbai|pune|bangalore|chennai|hyderabad|\d{6})\b/i;
  const addressIdx = lines.findIndex((l) => addressPattern.test(l));
  if (addressIdx !== -1) {
    const addressParts = lines.slice(addressIdx, addressIdx + 3).filter(
      (l) =>
        l !== result.name &&
        l !== result.company &&
        l !== result.designation &&
        !result.email?.includes(l) &&
        !result.phone?.includes(l)
    );
    if (addressParts.length) result.address = addressParts.join(', ');
  }

  return result;
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w+/g, (word) => {
    // Keep known abbreviations uppercase
    if (/^(pvt|ltd|llp|ceo|cto|cfo|vp|md|mr|ms|dr|prof)\.?$/i.test(word)) {
      return word.toUpperCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}
