/**
 * Produce an edited MusicXML string by removing `<note>` elements whose
 * `id` attribute is in `deletedIds`.
 *
 * Implementation notes:
 *  - We use `DOMParser` + `XMLSerializer` (both available in the browser)
 *    so we never have to hand-parse XML.
 *  - We do NOT mutate the input string. We parse a fresh DOM each call.
 *  - The output preserves the original XML declaration and DOCTYPE when
 *    the browser emits them; we re-prepend `<?xml version="1.0" …?>` if
 *    `XMLSerializer` strips it.
 *  - If no deletions are pending, the input is returned unchanged.
 */
export function serializeEditedMusicXml(
  xml: string,
  deletedIds: ReadonlySet<string>,
): string {
  if (deletedIds.size === 0) return xml;

  if (typeof window === 'undefined' || !('DOMParser' in window)) {
    // Server-side fallback: no edits applied. Should not happen for save
    // since the save action runs in the browser, but defend the contract.
    return xml;
  }

  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return xml;

  const notes = doc.querySelectorAll('note[id]');
  let removed = 0;
  notes.forEach((n) => {
    const id = n.getAttribute('id');
    if (id && deletedIds.has(id)) {
      n.parentNode?.removeChild(n);
      removed += 1;
    }
  });
  if (removed === 0) return xml;

  const out = new XMLSerializer().serializeToString(doc);
  // XMLSerializer in some browsers drops the prolog; re-add it if absent.
  if (!/^<\?xml/i.test(out)) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${out}`;
  }
  return out;
}
