/**
 * Triggers a browser-native file download for arbitrary text content,
 * without any server involvement. Works by creating a Blob, wrapping it
 * in an object URL, and clicking a throwaway <a download> element — the
 * standard client-side download pattern.
 *
 * This always lands in *the user's actual browser* Downloads folder (or
 * wherever their browser is configured to save files / prompt), regardless
 * of where the Next.js server process happens to be running. This is what
 * makes it work correctly even if the app is later deployed remotely.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'application/vnd.recordare.musicxml+xml',
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // Some browsers require the anchor to be in the DOM to reliably fire.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Release the object URL on the next tick — revoking immediately can
  // occasionally race the download start in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}