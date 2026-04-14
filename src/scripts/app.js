import { loadNotes, saveNotes } from "./store.js";
import {
  closeComposer,
  closeControls,
  closePreview,
  fillForm,
  getElements,
  openComposer,
  openControls,
  openPreview,
  renderNotes,
  renderPreview,
  resetForm,
} from "./ui.js";
import { createNotePayload, filterNotes, sortNotes } from "./utils.js";

const state = {
  notes: loadNotes(),
  filters: {
    query: "",
    category: "all",
  },
  activeNoteId: "",
  previewNoteId: "",
};

const elements = getElements();

function getNoteById(noteId) {
  return state.notes.find((note) => note.id === noteId) || null;
}

function syncView() {
  const filteredNotes = filterNotes(state.notes, state.filters);
  const sortedNotes = sortNotes(filteredNotes);
  const previewNote = getNoteById(state.previewNoteId);

  renderNotes(elements, sortedNotes, state.activeNoteId);
  renderPreview(elements, previewNote, state.activeNoteId);

  if (previewNote) {
    openPreview(elements);
  } else {
    closePreview(elements);
  }
}

function getFormValues() {
  return {
    title: elements.title.value,
    category: elements.category.value,
    content: elements.content.value,
    pinned: elements.pinned.checked,
    createdAt:
      state.notes.find((note) => note.id === elements.noteId.value)?.createdAt ||
      "",
  };
}

function upsertNote(event) {
  event.preventDefault();

  const formValues = getFormValues();
  const trimmedTitle = formValues.title.trim();
  const trimmedContent = formValues.content.trim();

  if (!trimmedTitle || !trimmedContent) {
    elements.formHint.textContent = "Please add a title and note content.";
    return;
  }

  const existingId = elements.noteId.value;
  const notePayload = createNotePayload(
    {
      ...formValues,
      title: trimmedTitle,
      content: trimmedContent,
    },
    existingId,
  );

  if (existingId) {
    state.notes = state.notes.map((note) =>
      note.id === existingId ? notePayload : note,
    );
  } else {
    state.notes = [notePayload, ...state.notes];
  }

  saveNotes(state.notes);
  state.activeNoteId = "";
  resetForm(elements);
  closeComposer(elements);
  syncView();
}

function openNotePreview(note) {
  state.previewNoteId = note.id;
  syncView();
}

function openNoteEditor(note) {
  state.activeNoteId = note.id;
  state.previewNoteId = "";
  openComposer(elements);
  fillForm(elements, note);
  syncView();
}

function togglePinnedState(note) {
  state.notes = state.notes.map((entry) =>
    entry.id === note.id
      ? {
          ...entry,
          pinned: !entry.pinned,
          updatedAt: new Date().toISOString(),
        }
      : entry,
  );

  saveNotes(state.notes);
  syncView();
}

function deleteNote(note) {
  state.notes = state.notes.filter((entry) => entry.id !== note.id);

  if (state.activeNoteId === note.id) {
    state.activeNoteId = "";
    resetForm(elements);
  }

  if (state.previewNoteId === note.id) {
    state.previewNoteId = "";
  }

  saveNotes(state.notes);
  syncView();
}

function runNoteAction(action, note) {
  if (!note) {
    return;
  }

  if (action === "open") {
    openNotePreview(note);
    return;
  }

  if (action === "edit") {
    openNoteEditor(note);
    return;
  }

  if (action === "pin") {
    togglePinnedState(note);
    return;
  }

  if (action === "delete") {
    deleteNote(note);
  }
}

function getNoteFromEvent(event) {
  const card = event.target.closest("[data-note-id]");

  if (!card) {
    return null;
  }

  return getNoteById(card.dataset.noteId);
}

function handleGridClick(event) {
  const note = getNoteFromEvent(event);

  if (!note) {
    return;
  }

  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    runNoteAction("open", note);
    return;
  }

  runNoteAction(actionButton.dataset.action, note);
}

function handlePreviewClick(event) {
  const note = getNoteFromEvent(event);
  const actionButton = event.target.closest("[data-action]");

  if (!note || !actionButton) {
    return;
  }

  runNoteAction(actionButton.dataset.action, note);
}

function handleGridKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest(".note-card.interactive[data-note-id]");

  if (!card || event.target.closest("[data-action]")) {
    return;
  }

  event.preventDefault();
  runNoteAction("open", getNoteById(card.dataset.noteId));
}

function handleSearch(event) {
  state.filters.query = event.target.value;
  syncView();
}

function handleFilter(event) {
  state.filters.category = event.target.value;
  syncView();
}

function handleReset() {
  state.activeNoteId = "";
  resetForm(elements);
  syncView();
}

function handleOpenComposer() {
  state.activeNoteId = "";
  state.previewNoteId = "";
  resetForm(elements);
  openComposer(elements);
  syncView();
  elements.title.focus();
}

function handleOpenControls() {
  openControls(elements);
}

function handleCloseComposer() {
  state.activeNoteId = "";
  resetForm(elements);
  closeComposer(elements);
  syncView();
}

function handleCloseControls() {
  closeControls(elements);
}

function handleClosePreview() {
  state.previewNoteId = "";
  syncView();
}

function handleModalClick(event) {
  if (event.target.dataset.closeModal === "true") {
    handleCloseComposer();
  }

  if (event.target.dataset.closeControls === "true") {
    handleCloseControls();
  }

  if (event.target.dataset.closePreview === "true") {
    handleClosePreview();
  }
}

function handleEscape(event) {
  if (event.key !== "Escape") {
    return;
  }

  if (!elements.modal.classList.contains("hidden")) {
    handleCloseComposer();
    return;
  }

  if (!elements.controlsModal.classList.contains("hidden")) {
    handleCloseControls();
    return;
  }

  if (!elements.previewModal.classList.contains("hidden")) {
    handleClosePreview();
  }
}

elements.form.addEventListener("submit", upsertNote);
elements.resetButton.addEventListener("click", handleReset);
elements.openControlsButton.addEventListener("click", handleOpenControls);
elements.openComposerButton.addEventListener("click", handleOpenComposer);
elements.closeControlsButton.addEventListener("click", handleCloseControls);
elements.closeComposerButton.addEventListener("click", handleCloseComposer);
elements.closePreviewButton.addEventListener("click", handleClosePreview);
elements.controlsModal.addEventListener("click", handleModalClick);
elements.modal.addEventListener("click", handleModalClick);
elements.previewModal.addEventListener("click", handleModalClick);
elements.searchInput.addEventListener("input", handleSearch);
elements.categoryFilter.addEventListener("change", handleFilter);
elements.notesGrid.addEventListener("click", handleGridClick);
elements.notesGrid.addEventListener("keydown", handleGridKeydown);
elements.previewCard.addEventListener("click", handlePreviewClick);
document.addEventListener("keydown", handleEscape);

resetForm(elements);
closeControls(elements);
closeComposer(elements);
closePreview(elements);
syncView();
