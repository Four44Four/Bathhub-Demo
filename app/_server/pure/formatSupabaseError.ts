export function formatSupabaseError(context: string, message: string): string {
  return `${context}: ${message}`;
}
