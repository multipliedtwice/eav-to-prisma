/**
 * Match a pattern in text with flexible whitespace
 * Converts single spaces to \s+ regex pattern
 * 
 * @example
 * expectLine(schema, 'id String @id @default(cuid())')
 * // Matches: "id String @id @default(cuid())"
 * // Matches: "id       String   @id @default(cuid())"
 * // Matches: "id  String  @id  @default(cuid())"
 */
export function expectLine(text: string, pattern: string): void {
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
    .replace(/\s+/g, '\\s+'); // Allow flexible whitespace
  
  const regex = new RegExp(regexPattern);
  
  if (!regex.test(text)) {
    throw new Error(
      `Expected text to contain line:\n  "${pattern}"\n\nBut it was not found in:\n${text.substring(0, 500)}...`
    );
  }
}

/**
 * Check if text contains a pattern with flexible whitespace
 * Returns boolean instead of throwing
 */
export function containsLine(text: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  
  return new RegExp(regexPattern).test(text);
}

/**
 * Create a regex matcher for flexible whitespace
 * Use with expect().toMatch()
 */
export function flexMatch(pattern: string): RegExp {
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  
  return new RegExp(regexPattern);
}