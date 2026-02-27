import { useState } from "react";

/**
 * Honeypot anti-spam hook.
 * Renders a hidden field that bots tend to fill in.
 * If the field is filled → submission is a bot and should be silently ignored.
 */
export function useHoneypot() {
  const [value, setValue] = useState("");
  const isFilled = value.length > 0;

  return { value, setValue, isFilled };
}
