/**
 * True when an admin action targets the acting admin's own account.
 * Used to prevent self-demotion / self-suspension lockout.
 */
export function isSelfTargeted(actorId: string, targetId: string): boolean {
  return actorId === targetId
}
