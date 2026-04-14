import { generateId, normalizeNoteOrder } from "./utils.js";

const STORAGE_KEY = "note:v1";
const LEGACY_STORAGE_KEY = "quiet-notes:v1";
const API_ENDPOINT = "/api/notes";

function createSeedNotes() {
  const now = new Date().toISOString();

  return normalizeNoteOrder([
    {
      id: generateId(),
      title: "Weekly priorities",
      content:
        "Prepare the client presentation, review the design feedback, and send the final timeline before Friday afternoon.",
      pinned: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: "Ideas to revisit",
      content:
        "Build a calmer note dashboard with elegant typography, quick pinning, and a larger preview for long writing.",
      pinned: false,
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

function readBrowserStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!stored && legacyStored) {
    localStorage.setItem(STORAGE_KEY, legacyStored);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  const nextStored = localStorage.getItem(STORAGE_KEY);

  if (!nextStored) {
    return null;
  }

  try {
    const notes = JSON.parse(nextStored);
    return Array.isArray(notes) ? normalizeNoteOrder(notes) : null;
  } catch (error) {
    console.error("Failed to parse stored notes from localStorage.", error);
    return null;
  }
}

function writeBrowserStorage(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

async function fetchRemoteNotes() {
  const response = await fetch(API_ENDPOINT, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load remote notes: ${response.status}`);
  }

  const notes = await response.json();
  return Array.isArray(notes) ? normalizeNoteOrder(notes) : [];
}

async function writeRemoteNotes(notes) {
  const response = await fetch(API_ENDPOINT, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notes),
  });

  if (!response.ok) {
    throw new Error(`Failed to save remote notes: ${response.status}`);
  }
}

export async function loadNotes() {
  try {
    const remoteNotes = await fetchRemoteNotes();

    if (remoteNotes.length) {
      writeBrowserStorage(remoteNotes);
      return remoteNotes;
    }
  } catch (error) {
    console.warn("Remote note storage is unavailable, using browser storage.", error);
  }

  const browserNotes = readBrowserStorage();

  if (browserNotes?.length) {
    return browserNotes;
  }

  const seedNotes = createSeedNotes();
  writeBrowserStorage(seedNotes);

  try {
    await writeRemoteNotes(seedNotes);
  } catch (error) {
    console.warn("Failed to seed remote note storage.", error);
  }

  return seedNotes;
}

export async function saveNotes(notes) {
  writeBrowserStorage(notes);

  try {
    await writeRemoteNotes(notes);
  } catch (error) {
    console.warn("Failed to save notes to remote storage.", error);
  }
}
