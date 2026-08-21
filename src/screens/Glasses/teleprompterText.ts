/** Splits `text` (from a code-point offset) into a page that fits within `maxUtf8Bytes`. */
export function pageFromOffset(text: string, startCodePoint: number, maxUtf8Bytes: number): string {
  const codePoints = Array.from(text);
  if (startCodePoint >= codePoints.length) return '';

  let byteLength = 0;
  let endIndex = startCodePoint;
  for (let i = startCodePoint; i < codePoints.length; i++) {
    const charBytes = utf8ByteLength(codePoints[i]);
    if (byteLength + charBytes > maxUtf8Bytes) break;
    byteLength += charBytes;
    endIndex = i + 1;
  }
  return codePoints.slice(startCodePoint, endIndex).join('');
}

export function totalCodePoints(text: string): number {
  return Array.from(text).length;
}

function utf8ByteLength(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code <= 0x7f) return 1;
  if (code <= 0x7ff) return 2;
  if (code <= 0xffff) return 3;
  return 4;
}
