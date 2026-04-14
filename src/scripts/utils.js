export function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function sortNotes(notes) {
  return [...notes].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return new Date(right.updatedAt) - new Date(left.updatedAt);
  });
}

export function filterNotes(notes, filters) {
  const query = filters.query.trim().toLowerCase();

  return notes.filter((note) => {
    const matchesCategory =
      filters.category === "all" || note.category === filters.category;
    const matchesQuery =
      !query ||
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });
}

export function createNotePayload(formData, existingId) {
  const timestamp = new Date().toISOString();

  return {
    id: existingId || generateId(),
    title: formData.title.trim(),
    category: formData.category,
    content: formData.content.trim(),
    pinned: formData.pinned,
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
