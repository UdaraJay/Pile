export const TODO_TAG = 'todo';
export const DONE_TAG = 'done';

export function isDone(tags: string[] | undefined | null): boolean {
  if (!Array.isArray(tags)) return false;
  return tags.includes(DONE_TAG);
}

export function isOpenTodo(tags: string[] | undefined | null): boolean {
  if (!Array.isArray(tags)) return false;
  return tags.includes(TODO_TAG) && !isDone(tags);
}

export function markDone(addTag: (tag: string) => void) {
  return () => addTag(DONE_TAG);
}

export function undoDone(removeTag: (tag: string) => void) {
  return () => removeTag(DONE_TAG);
}

export function toggleDone(
  addTag: (tag: string) => void,
  removeTag: (tag: string) => void,
  tags: string[] | undefined | null,
) {
  if (isDone(tags)) {
    removeTag(DONE_TAG);
  } else {
    addTag(DONE_TAG);
  }
}

