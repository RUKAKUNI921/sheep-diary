export function usernameFromMetadata(
  metadata: Record<string, unknown> | undefined,
): string {
  const saved = metadata?.username;
  return typeof saved === "string" ? saved : "";
}
