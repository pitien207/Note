import { loadNotes, saveNotes } from "./store.js";
import {
  clearDragIndicators,
  closeComposer,
  createDragProxy,
  fillForm,
  getElements,
  markDraggingCard,
  markDropTarget,
  moveDragProxy,
  openComposer,
  removeDragProxy,
  renderNotes,
  resetForm,
  setDeleteDropzoneState,
} from "./ui.js";
import { createNotePayload, normalizeNoteOrder, sortNotes } from "./utils.js";

const state = {
  notes: [],
  drag: {
    draggedNoteId: "",
    sourceCard: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    offsetX: 0,
    offsetY: 0,
    active: false,
    targetNoteId: "",
    targetPosition: "after",
    deleteActive: false,
    suppressClick: false,
    proxy: null,
    animationFrameId: 0,
  },
};

const elements = getElements();

function getNoteById(noteId) {
  return state.notes.find((note) => note.id === noteId) || null;
}

function syncView() {
  const sortedNotes = sortNotes(state.notes);
  renderNotes(elements, sortedNotes, {
    draggedNoteId: state.drag.active ? state.drag.draggedNoteId : "",
    placeholderNoteId: state.drag.active ? state.drag.targetNoteId : "",
    placeholderPosition: state.drag.active ? state.drag.targetPosition : "after",
  });

  if (state.drag.active && state.drag.draggedNoteId) {
    if (state.drag.targetNoteId) {
      markDropTarget(elements, state.drag.targetNoteId, state.drag.targetPosition);
    }
  }
}

function persistNotes(nextNotes, shouldRender = true) {
  state.notes = normalizeNoteOrder(nextNotes);
  void saveNotes(state.notes);

  if (shouldRender) {
    syncView();
  }
}

function getFormValues() {
  const existingNote = state.notes.find((note) => note.id === elements.noteId.value);

  return {
    title: elements.title.value,
    content: elements.content.value,
    pinned: existingNote?.pinned ?? false,
    order: existingNote?.order ?? state.notes.length,
    createdAt:
      existingNote?.createdAt || "",
  };
}

function upsertNote(event) {
  event.preventDefault();

  const formValues = getFormValues();
  const trimmedTitle = formValues.title.trim();
  const trimmedContent = formValues.content.trim();

  if (!trimmedContent) {
    elements.content.reportValidity();
    elements.content.focus();
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

  persistNotes(state.notes);
  resetForm(elements);
  closeComposer(elements);
}

function openNoteEditor(note) {
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

  persistNotes(state.notes);
}

function deleteNote(note) {
  state.notes = state.notes.filter((entry) => entry.id !== note.id);

  if (elements.noteId.value === note.id) {
    resetForm(elements);
    closeComposer(elements);
  }

  persistNotes(state.notes);
}

function runNoteAction(action, note) {
  if (!note) {
    return;
  }

  if (action === "open") {
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
  if (state.drag.suppressClick) {
    state.drag.suppressClick = false;
    return;
  }

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

function getCardRows(cards) {
  const rowTolerance = 10;
  const rows = [];

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return;
    }

    const row = rows.find((candidate) => (
      Math.abs(candidate.top - rect.top) <= rowTolerance
    ));
    const item = { card, rect };

    if (row) {
      row.items.push(item);
      row.top = Math.min(row.top, rect.top);
      row.bottom = Math.max(row.bottom, rect.bottom);
      return;
    }

    rows.push({
      top: rect.top,
      bottom: rect.bottom,
      items: [item],
    });
  });

  rows.sort((left, right) => left.top - right.top);
  rows.forEach((row) => {
    row.items.sort((left, right) => left.rect.left - right.rect.left);
  });

  return rows;
}

function getDropTargetFromRow(row, clientX) {
  const firstItem = row.items[0];

  if (!firstItem) {
    return null;
  }

  for (const item of row.items) {
    const midpointX = item.rect.left + item.rect.width / 2;

    if (clientX < midpointX) {
      return {
        noteId: item.card.dataset.noteId,
        position: "before",
      };
    }
  }

  const lastItem = row.items.at(-1);

  return {
    noteId: lastItem.card.dataset.noteId,
    position: "after",
  };
}

function getDropTargetFromPointer(clientX, clientY) {
  const cards = [
    ...elements.notesGrid.querySelectorAll(".note-card.interactive[data-note-id]"),
  ].filter((card) => card.dataset.noteId !== state.drag.draggedNoteId);
  const rows = getCardRows(cards);

  if (!rows.length) {
    return null;
  }

  if (clientY < rows[0].top) {
    return getDropTargetFromRow(rows[0], clientX);
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const nextRow = rows[index + 1];
    const rowBandBottom = nextRow
      ? row.bottom + Math.max(0, nextRow.top - row.bottom) / 2
      : Infinity;

    if (clientY <= rowBandBottom) {
      return getDropTargetFromRow(row, clientX);
    }
  }

  const lastRow = rows.at(-1);
  const lastItem = lastRow?.items.at(-1);

  if (!lastItem) {
    return null;
  }

  return {
    noteId: lastItem.card.dataset.noteId,
    position: "after",
  };
}

function buildReorderedNotes(targetNoteId, targetPosition) {
  const draggedIndex = state.notes.findIndex(
    (note) => note.id === state.drag.draggedNoteId,
  );
  const targetIndex = state.notes.findIndex((note) => note.id === targetNoteId);

  if (draggedIndex === -1 || targetIndex === -1) {
    return null;
  }

  const nextNotes = [...state.notes];
  const [draggedNote] = nextNotes.splice(draggedIndex, 1);
  let insertIndex = nextNotes.findIndex((note) => note.id === targetNoteId);

  if (insertIndex === -1) {
    nextNotes.push(draggedNote);
  } else {
    if (targetPosition === "after") {
      insertIndex += 1;
    }

    nextNotes.splice(insertIndex, 0, draggedNote);
  }

  const isSameOrder = nextNotes.every((note, index) => note.id === state.notes[index]?.id);

  if (isSameOrder) {
    return null;
  }

  return nextNotes;
}

function updateDragProxyPosition() {
  if (!state.drag.proxy) {
    return;
  }

  moveDragProxy(
    state.drag.proxy,
    state.drag.currentX - state.drag.offsetX,
    state.drag.currentY - state.drag.offsetY,
  );
}

function updateDragFeedback() {
  if (!state.drag.active) {
    return;
  }

  const deleteRect = elements.deleteDropzone.getBoundingClientRect();
  const isOverDeleteZone =
    state.drag.currentX >= deleteRect.left &&
    state.drag.currentX <= deleteRect.right &&
    state.drag.currentY >= deleteRect.top &&
    state.drag.currentY <= deleteRect.bottom;

  if (isOverDeleteZone) {
    const targetChanged = !state.drag.deleteActive || state.drag.targetNoteId;
    state.drag.deleteActive = true;
    state.drag.targetNoteId = "";
    clearDragIndicators(elements);
    markDraggingCard(elements, state.drag.draggedNoteId);
    setDeleteDropzoneState(elements, { visible: true, active: true });
    state.drag.proxy?.classList.add("delete-ready");

    if (targetChanged) {
      syncView();
    }

    return;
  }

  const wasDeleteActive = state.drag.deleteActive;
  state.drag.deleteActive = false;
  state.drag.proxy?.classList.remove("delete-ready");
  setDeleteDropzoneState(elements, { visible: true, active: false });

  const dropTarget = getDropTargetFromPointer(
    state.drag.currentX,
    state.drag.currentY,
  );

  if (!dropTarget) {
    const targetChanged = wasDeleteActive || state.drag.targetNoteId;
    state.drag.targetNoteId = "";
    state.drag.targetPosition = "after";

    if (targetChanged) {
      syncView();
    }

    return;
  }

  const targetChanged =
    wasDeleteActive ||
    state.drag.targetNoteId !== dropTarget.noteId ||
    state.drag.targetPosition !== dropTarget.position;

  state.drag.targetNoteId = dropTarget.noteId;
  state.drag.targetPosition = dropTarget.position;

  if (targetChanged) {
    syncView();
  }
}

function queueDragFrame() {
  if (state.drag.animationFrameId) {
    return;
  }

  state.drag.animationFrameId = window.requestAnimationFrame(() => {
    state.drag.animationFrameId = 0;
    updateDragProxyPosition();
    updateDragFeedback();
  });
}

function cancelDragFrame() {
  if (!state.drag.animationFrameId) {
    return;
  }

  window.cancelAnimationFrame(state.drag.animationFrameId);
  state.drag.animationFrameId = 0;
}

function resetDragState() {
  cancelDragFrame();
  state.drag.draggedNoteId = "";
  state.drag.sourceCard = null;
  state.drag.pointerId = null;
  state.drag.startX = 0;
  state.drag.startY = 0;
  state.drag.currentX = 0;
  state.drag.currentY = 0;
  state.drag.offsetX = 0;
  state.drag.offsetY = 0;
  state.drag.active = false;
  state.drag.targetNoteId = "";
  state.drag.targetPosition = "after";
  state.drag.deleteActive = false;
  state.drag.proxy = null;
  state.drag.animationFrameId = 0;
  clearDragIndicators(elements);
  setDeleteDropzoneState(elements, { visible: false, active: false });
}

function isPointerOverDraggedCard(noteId) {
  const hoveredElement = document.elementFromPoint(
    state.drag.currentX,
    state.drag.currentY,
  );
  const card = hoveredElement?.closest(".note-card.interactive[data-note-id]");

  return card?.dataset.noteId === noteId;
}

function finishPointerDrag(shouldPersist = true) {
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
  window.removeEventListener("pointercancel", handlePointerCancel);

  const draggedNoteId = state.drag.draggedNoteId;
  const deleteActive = state.drag.deleteActive;
  const targetNoteId = state.drag.targetNoteId;
  const targetPosition = state.drag.targetPosition;
  const wasActive = state.drag.active;
  const draggedNote = draggedNoteId ? getNoteById(draggedNoteId) : null;
  const nextNotes =
    shouldPersist && wasActive && !deleteActive && targetNoteId
      ? buildReorderedNotes(targetNoteId, targetPosition)
      : null;
  const shouldOpenClickedCard =
    shouldPersist &&
    !wasActive &&
    Boolean(draggedNote) &&
    isPointerOverDraggedCard(draggedNoteId);

  if (state.drag.sourceCard && state.drag.pointerId !== null) {
    try {
      state.drag.sourceCard.releasePointerCapture(state.drag.pointerId);
    } catch {}
  }

  removeDragProxy(state.drag.proxy);
  resetDragState();

  if (wasActive) {
    if (deleteActive && draggedNote) {
      deleteNote(draggedNote);
    } else if (nextNotes) {
      persistNotes(nextNotes);
    } else {
      syncView();
    }
  } else if (shouldOpenClickedCard) {
    state.drag.suppressClick = true;
    openNoteEditor(draggedNote);
  } else {
    syncView();
  }

  window.setTimeout(() => {
    state.drag.suppressClick = false;
  }, 0);
}

function handlePointerDown(event) {
  const card = event.target.closest(".note-card.interactive[data-note-id]");

  if (!card) {
    return;
  }

  if (event.target.closest("[data-action]")) {
    return;
  }

  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  const rect = card.getBoundingClientRect();

  state.drag.draggedNoteId = card.dataset.noteId;
  state.drag.sourceCard = card;
  state.drag.pointerId = event.pointerId;
  state.drag.startX = event.clientX;
  state.drag.startY = event.clientY;
  state.drag.currentX = event.clientX;
  state.drag.currentY = event.clientY;
  state.drag.offsetX = event.clientX - rect.left;
  state.drag.offsetY = event.clientY - rect.top;
  state.drag.active = false;
  state.drag.targetNoteId = "";
  state.drag.targetPosition = "after";
  state.drag.deleteActive = false;
  state.drag.suppressClick = false;

  try {
    card.setPointerCapture(event.pointerId);
  } catch {}

  event.preventDefault();

  window.addEventListener("pointermove", handlePointerMove, { passive: false });
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerCancel);
}

function handlePointerMove(event) {
  if (!state.drag.draggedNoteId || event.pointerId !== state.drag.pointerId) {
    return;
  }

  state.drag.currentX = event.clientX;
  state.drag.currentY = event.clientY;

  if (!state.drag.active) {
    const deltaX = event.clientX - state.drag.startX;
    const deltaY = event.clientY - state.drag.startY;

    if (Math.hypot(deltaX, deltaY) < 8) {
      return;
    }

    const sourceCard = elements.notesGrid.querySelector(
      `[data-note-id="${state.drag.draggedNoteId}"]`,
    );

    if (!sourceCard) {
      finishPointerDrag(false);
      return;
    }

    state.drag.active = true;
    state.drag.suppressClick = true;
    state.drag.proxy = createDragProxy(sourceCard);
    updateDragProxyPosition();
    markDraggingCard(elements, state.drag.draggedNoteId);
    setDeleteDropzoneState(elements, { visible: true, active: false });
  }

  event.preventDefault();
  queueDragFrame();
}

function handlePointerUp(event) {
  if (!state.drag.draggedNoteId || event.pointerId !== state.drag.pointerId) {
    return;
  }

  finishPointerDrag(true);
}

function handlePointerCancel(event) {
  if (!state.drag.draggedNoteId || event.pointerId !== state.drag.pointerId) {
    return;
  }

  finishPointerDrag(false);
}

function handleOpenComposer() {
  resetForm(elements);
  openComposer(elements);
  syncView();
  elements.title.focus();
}

function handleCloseComposer() {
  resetForm(elements);
  closeComposer(elements);
  syncView();
}

function handleModalClick(event) {
  if (event.target.dataset.closeModal === "true") {
    handleCloseComposer();
  }
}

function handleEscape(event) {
  if (event.key !== "Escape") {
    return;
  }

  if (!elements.modal.classList.contains("hidden")) {
    handleCloseComposer();
  }
}

elements.form.addEventListener("submit", upsertNote);
elements.openComposerButton.addEventListener("click", handleOpenComposer);
elements.closeComposerButton.addEventListener("click", handleCloseComposer);
elements.modal.addEventListener("click", handleModalClick);
elements.notesGrid.addEventListener("pointerdown", handlePointerDown);
elements.notesGrid.addEventListener("click", handleGridClick);
elements.notesGrid.addEventListener("keydown", handleGridKeydown);
document.addEventListener("keydown", handleEscape);

async function initializeApp() {
  resetForm(elements);
  closeComposer(elements);
  state.notes = await loadNotes();
  syncView();
}

void initializeApp();
