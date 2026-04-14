import { truncateText } from "./utils.js";

export function getElements() {
  return {
    modal: document.querySelector("#composer-modal"),
    controlsModal: document.querySelector("#controls-modal"),
    previewModal: document.querySelector("#preview-modal"),
    openControlsButton: document.querySelector("#open-controls"),
    openComposerButton: document.querySelector("#open-composer"),
    closeControlsButton: document.querySelector("#close-controls"),
    closeComposerButton: document.querySelector("#close-composer"),
    closePreviewButton: document.querySelector("#close-preview"),
    form: document.querySelector("#note-form"),
    noteId: document.querySelector("#note-id"),
    title: document.querySelector("#note-title"),
    category: document.querySelector("#note-category"),
    content: document.querySelector("#note-content"),
    pinned: document.querySelector("#note-pinned"),
    resetButton: document.querySelector("#reset-note"),
    submitButton: document.querySelector("#submit-note"),
    formHint: document.querySelector("#form-hint"),
    searchInput: document.querySelector("#search-input"),
    categoryFilter: document.querySelector("#category-filter"),
    notesGrid: document.querySelector("#notes-grid"),
    emptyState: document.querySelector("#empty-state"),
    notesCount: document.querySelector("#notes-count"),
    composerTitle: document.querySelector("#composer-title"),
    previewCard: document.querySelector("#preview-card"),
  };
}

export function resetForm(elements) {
  elements.form.reset();
  elements.noteId.value = "";
  elements.category.value = "Work";
  elements.submitButton.textContent = "Save note";
  elements.composerTitle.textContent = "New note";
  elements.formHint.textContent =
    "Notes are stored in your browser automatically.";
}

export function fillForm(elements, note) {
  elements.noteId.value = note.id;
  elements.title.value = note.title;
  elements.category.value = note.category;
  elements.content.value = note.content;
  elements.pinned.checked = Boolean(note.pinned);
  elements.submitButton.textContent = "Update note";
  elements.composerTitle.textContent = "Edit note";
  elements.formHint.textContent = `Editing "${note.title}"`;
  elements.title.focus();
}

function syncBodyLock() {
  const hasOpenModal = Boolean(document.querySelector(".modal:not(.hidden)"));
  document.body.classList.toggle("modal-open", hasOpenModal);
}

function setModalVisibility(modal, isVisible) {
  modal.classList.toggle("hidden", !isVisible);
  modal.setAttribute("aria-hidden", isVisible ? "false" : "true");
  syncBodyLock();
}

export function openComposer(elements) {
  setModalVisibility(elements.modal, true);
}

export function closeComposer(elements) {
  setModalVisibility(elements.modal, false);
}

export function openControls(elements) {
  setModalVisibility(elements.controlsModal, true);
}

export function closeControls(elements) {
  setModalVisibility(elements.controlsModal, false);
}

export function openPreview(elements) {
  setModalVisibility(elements.previewModal, true);
}

export function closePreview(elements) {
  setModalVisibility(elements.previewModal, false);
}

function createNoteCard(note, activeNoteId, options = {}) {
  const safeTitle = escapeHtml(String(note.title || "Untitled note"));
  const safeCategory = escapeHtml(String(note.category || "General"));
  const safeContent = String(note.content || "");
  const renderedContent = options.expanded ? safeContent : truncateText(safeContent);
  const noteCard = document.createElement("article");

  noteCard.className = `note-card${note.pinned ? " pinned" : ""}${
    options.expanded ? " preview-card" : ""
  }${options.interactive ? " interactive" : ""}`;
  noteCard.dataset.noteId = note.id;

  if (options.interactive) {
    noteCard.tabIndex = 0;
    noteCard.setAttribute("role", "button");
    noteCard.setAttribute("aria-label", `Open note ${note.title}`);
  }

  noteCard.innerHTML = `
    <div class="note-card-head">
      <span class="category-chip">${safeCategory}</span>
      ${note.pinned ? '<span class="tag">Pinned</span>' : ""}
    </div>
    <h3 class="note-card-title">${safeTitle}</h3>
    <p class="note-card-body">${escapeHtml(renderedContent)}</p>
    <div class="note-card-actions">
      <button class="note-action ${
        activeNoteId === note.id ? "active" : ""
      }" type="button" data-action="edit">
        ${activeNoteId === note.id ? "Editing" : "Edit"}
      </button>
      <button class="note-action" type="button" data-action="pin">
        ${note.pinned ? "Unpin" : "Pin"}
      </button>
      <button class="note-action delete" type="button" data-action="delete">
        Delete
      </button>
    </div>
  `;

  return noteCard;
}

export function renderNotes(elements, notes, activeNoteId) {
  elements.notesGrid.innerHTML = "";

  if (!notes.length) {
    elements.emptyState.classList.remove("hidden");
    elements.notesCount.textContent = "0 notes";
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.notesCount.textContent = `${notes.length} ${
    notes.length === 1 ? "note" : "notes"
  }`;

  const fragment = document.createDocumentFragment();

  notes.forEach((note) => {
    fragment.append(createNoteCard(note, activeNoteId, { interactive: true }));
  });

  elements.notesGrid.append(fragment);
}

export function renderPreview(elements, note, activeNoteId) {
  elements.previewCard.innerHTML = "";

  if (!note) {
    return;
  }

  elements.previewCard.append(
    createNoteCard(note, activeNoteId, {
      expanded: true,
      interactive: false,
    }),
  );
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
