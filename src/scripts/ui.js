import { truncateText } from "./utils.js";

export function getElements() {
  return {
    modal: document.querySelector("#composer-modal"),
    openComposerButton: document.querySelector("#open-composer"),
    closeComposerButton: document.querySelector("#close-composer"),
    form: document.querySelector("#note-form"),
    noteId: document.querySelector("#note-id"),
    title: document.querySelector("#note-title"),
    content: document.querySelector("#note-content"),
    submitButton: document.querySelector("#submit-note"),
    notesGrid: document.querySelector("#notes-grid"),
    emptyState: document.querySelector("#empty-state"),
    deleteDropzone: document.querySelector("#delete-dropzone"),
  };
}

export function resetForm(elements) {
  elements.form.reset();
  elements.noteId.value = "";
  elements.submitButton.textContent = "Save";
}

export function fillForm(elements, note) {
  elements.noteId.value = note.id;
  elements.title.value = note.title;
  elements.content.value = note.content;
  elements.submitButton.textContent = "Save";
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

function createNoteCard(note, options = {}) {
  const safeTitle = escapeHtml(String(note.title || ""));
  const safeContent = String(note.content || "");
  const renderedContent = truncateText(safeContent);
  const cardLabel = note.title
    ? `Edit note ${note.title}`
    : `Edit note ${truncateText(safeContent, 40) || note.id}`;
  const noteCard = document.createElement("article");

  noteCard.className = `note-card${note.pinned ? " pinned" : ""}${
    options.interactive ? " interactive" : ""
  }${
    options.dragActive ? " drag-context" : ""
  }`;
  noteCard.dataset.noteId = note.id;

  if (options.interactive) {
    noteCard.tabIndex = 0;
    noteCard.setAttribute("role", "button");
    noteCard.setAttribute("aria-label", cardLabel);
  }

  noteCard.innerHTML = `
    <div class="note-card-head">
      <div class="note-card-heading">
        ${
          note.title
            ? `<h3 class="note-card-title">${safeTitle}</h3>`
            : ""
        }
      </div>
      <div class="note-card-tools">
        <button
          class="note-icon-action pin-toggle${note.pinned ? " is-pinned" : ""}"
          type="button"
          draggable="false"
          data-action="pin"
          aria-label="${note.pinned ? "Unpin note" : "Pin note"}"
          title="${note.pinned ? "Unpin note" : "Pin note"}"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
            <path
              d="M9 15l-4.5 4.5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
            <path
              d="M14.5 4l5.5 5.5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
          </svg>
        </button>
        <button
          class="note-icon-action delete-toggle"
          type="button"
          draggable="false"
          data-action="delete"
          aria-label="Delete note"
          title="Delete note"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 7l16 0"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
            <path
              d="M10 11l0 6"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
            <path
              d="M14 11l0 6"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
            <path
              d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
            <path
              d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
        </button>
      </div>
    </div>
    <p class="note-card-body">${escapeHtml(renderedContent)}</p>
  `;

  return noteCard;
}

function createDropPlaceholder() {
  const placeholder = document.createElement("div");
  placeholder.className = "note-drop-placeholder";
  placeholder.setAttribute("aria-hidden", "true");
  return placeholder;
}

function animateNotePositions(previousPositions, cards, draggedNoteId) {
  cards.forEach((card) => {
    const noteId = card.dataset.noteId;

    if (noteId === draggedNoteId) {
      return;
    }

    const previousRect = previousPositions.get(noteId);

    if (!previousRect) {
      return;
    }

    const nextRect = card.getBoundingClientRect();
    const deltaX = previousRect.left - nextRect.left;
    const deltaY = previousRect.top - nextRect.top;

    if (!deltaX && !deltaY) {
      return;
    }

    card.style.transition = "none";
    card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    requestAnimationFrame(() => {
      card.style.transition = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";
      card.style.transform = "";

      const cleanup = () => {
        card.style.transition = "";
        card.removeEventListener("transitionend", cleanup);
      };

      card.addEventListener("transitionend", cleanup);
    });
  });
}

export function renderNotes(elements, notes, options = {}) {
  const previousPositions = new Map(
    [...elements.notesGrid.querySelectorAll(".note-card[data-note-id]")].map((card) => [
      card.dataset.noteId,
      card.getBoundingClientRect(),
    ]),
  );

  elements.notesGrid.innerHTML = "";

  if (!notes.length) {
    elements.emptyState.classList.remove("hidden");
    return;
  }

  elements.emptyState.classList.add("hidden");

  const fragment = document.createDocumentFragment();
  const draggedNoteId = options.draggedNoteId || "";
  const notesWithoutDragged = draggedNoteId
    ? notes.filter((note) => note.id !== draggedNoteId)
    : notes;

  let placeholderIndex = -1;

  if (draggedNoteId) {
    const originalIndex = notes.findIndex((note) => note.id === draggedNoteId);
    placeholderIndex = originalIndex === -1 ? notesWithoutDragged.length : originalIndex;

    if (options.placeholderNoteId) {
      const targetIndex = notesWithoutDragged.findIndex(
        (note) => note.id === options.placeholderNoteId,
      );

      if (targetIndex !== -1) {
        placeholderIndex =
          options.placeholderPosition === "after" ? targetIndex + 1 : targetIndex;
      }
    }
  }

  notesWithoutDragged.forEach((note, index) => {
    if (placeholderIndex === index) {
      fragment.append(createDropPlaceholder());
    }

    fragment.append(
      createNoteCard(note, {
        interactive: true,
        dragActive: Boolean(draggedNoteId),
      }),
    );
  });

  if (placeholderIndex === notesWithoutDragged.length) {
    fragment.append(createDropPlaceholder());
  }

  elements.notesGrid.append(fragment);

  animateNotePositions(
    previousPositions,
    [...elements.notesGrid.querySelectorAll(".note-card[data-note-id]")],
    draggedNoteId,
  );
}

export function clearDragIndicators(elements) {
  elements.notesGrid
    .querySelectorAll(".note-card.is-dragging, .note-card.drop-before, .note-card.drop-after")
    .forEach((card) => {
      card.classList.remove("is-dragging", "drop-before", "drop-after");
    });
}

export function markDraggingCard(elements, noteId) {
  clearDragIndicators(elements);

  const card = elements.notesGrid.querySelector(`[data-note-id="${noteId}"]`);

  if (card) {
    card.classList.add("is-dragging");
  }
}

export function markDropTarget(elements, noteId, position) {
  elements.notesGrid
    .querySelectorAll(".note-card.drop-before, .note-card.drop-after")
    .forEach((card) => {
      card.classList.remove("drop-before", "drop-after");
    });

  const card = elements.notesGrid.querySelector(`[data-note-id="${noteId}"]`);

  if (!card) {
    return;
  }

  card.classList.add(position === "before" ? "drop-before" : "drop-after");
}

export function setDeleteDropzoneState(elements, { visible, active }) {
  elements.deleteDropzone.classList.toggle("hidden", !visible);
  elements.deleteDropzone.classList.toggle("is-visible", visible);
  elements.deleteDropzone.classList.toggle("is-active", active);
  elements.deleteDropzone.setAttribute("aria-hidden", visible ? "false" : "true");
  document.body.classList.toggle("dragging-notes", visible);
}

export function createDragProxy(card) {
  const rect = card.getBoundingClientRect();
  const proxy = card.cloneNode(true);

  proxy.classList.remove("interactive", "is-dragging", "drop-before", "drop-after");
  proxy.classList.add("drag-proxy");
  proxy.removeAttribute("role");
  proxy.removeAttribute("tabindex");
  proxy.style.animation = "none";
  proxy.style.transition = "none";
  proxy.style.width = `${rect.width}px`;
  proxy.style.height = `${rect.height}px`;
  proxy.style.left = `${rect.left}px`;
  proxy.style.top = `${rect.top}px`;

  document.body.append(proxy);

  return proxy;
}

export function moveDragProxy(proxy, x, y) {
  proxy.style.left = `${x}px`;
  proxy.style.top = `${y}px`;
  proxy.style.transform = "rotate(1.5deg)";
}

export function removeDragProxy(proxy) {
  proxy?.remove();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
