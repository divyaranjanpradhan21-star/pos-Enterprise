/**
 * Pure RFC 9562 UUIDv7 generator: timestamp-ordered, collision-free, offline-friendly.
 */
export function uuidv7(): string {
  const now = Date.now();
  const timeHex = now.toString(16).padStart(12, '0');

  // Random bytes
  const bytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 10; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const hexBytes = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // 32 hex chars with version 7 and variant RFC 4122
  // Format: 8-4-4-4-12
  const part1 = timeHex.slice(0, 8);
  const part2 = timeHex.slice(8, 12);
  const part3 = '7' + hexBytes.slice(0, 3);
  const variantNibble = ((parseInt(hexBytes.slice(3, 4), 16) & 0x3) | 0x8).toString(16);
  const part4 = variantNibble + hexBytes.slice(4, 7);
  const part5 = hexBytes.slice(7, 19);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}
