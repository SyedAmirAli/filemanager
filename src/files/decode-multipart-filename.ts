/**
 * Multer/busboy often expose `originalname` as a Latin-1 reading of UTF-8 bytes
 * (classic mojibake). Re-decode to UTF-8 when safe.
 *
 * If the string already contains Unicode above U+00FF, it was decoded correctly.
 * If Latin-1→UTF-8 would produce replacement chars, keep the original (e.g. real Latin-1 "café").
 */
export function decodeMultipartFilename(name: string): string {
  if (!name) return name;
  if ([...name].some((c) => c.codePointAt(0)! > 0xff)) {
    return name;
  }
  const asUtf8 = Buffer.from(name, 'latin1').toString('utf8');
  if (asUtf8.includes('\uFFFD')) {
    return name;
  }
  return asUtf8;
}
