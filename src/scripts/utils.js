export function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeNoteOrder(notes) {
  return notes.map((note, index) => ({
    ...note,
    order: index,
  }));
}

export function sortNotes(notes) {
  return [...notes].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

export function createNotePayload(formData, existingId) {
  const timestamp = new Date().toISOString();

  return {
    id: existingId || generateId(),
    title: formData.title.trim(),
    content: formData.content.trim(),
    pinned: formData.pinned,
    order: formData.order ?? 0,
    createdAt: formData.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

export function truncateText(value, length = 180) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length).trim()}...`;
}
