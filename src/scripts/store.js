import { generateId } from "./utils.js";

const STORAGE_KEY = "note:v1";
const LEGACY_STORAGE_KEY = "quiet-notes:v1";

function createSeedNotes() {
  const now = new Date().toISOString();

  return [
    {
      id: generateId(),
      title: "Weekly priorities",
      category: "Work",
      content:
        "Prepare the client presentation, review the design feedback, and send the final timeline before Friday afternoon.",
      pinned: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: "Ideas to revisit",
      category: "Ideas",
      content:
        "Build a calmer note dashboard with categories, elegant typography, and a quick search field for faster recall.",
      pinned: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function loadNotes() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!stored && legacyStored) {
    localStorage.setItem(STORAGE_KEY, legacyStored);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  const nextStored = localStorage.getItem(STORAGE_KEY);

  if (!nextStored) {
    const seedNotes = createSeedNotes();
    saveNotes(seedNotes);
    return seedNotes;
  }

  try {
    const notes = JSON.parse(nextStored);
    return Array.isArray(notes) ? notes : [];
  } catch (error) {
    console.error("Failed to parse stored notes.", error);
    return [];
  }
}

export function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}
