/**
 * Anonymization helpers for client-facing proposal talent display.
 *
 * When talents are added to a proposal, they are shown to clients
 * under an anonymous label like "候補者1", "候補者2", etc.
 * Admins can override the label if needed.
 */

/**
 * Generate a default display label for a talent based on their index.
 * @param index 0-based index of the talent in the proposal
 * @returns A label like "候補者A", "候補者B", ...
 */
export function generateDisplayLabel(index: number): string {
  // Use alphabet letters A-Z, then AA, AB, ...
  if (index < 26) {
    return `候補者${String.fromCharCode(65 + index)}`;
  }
  const first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
  const second = String.fromCharCode(65 + (index % 26));
  return `候補者${first}${second}`;
}

/**
 * Generate a batch of display labels for a given count.
 * @param count Number of labels to generate
 * @returns Array of labels like ["候補者A", "候補者B", ...]
 */
export function generateDisplayLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => generateDisplayLabel(i));
}
