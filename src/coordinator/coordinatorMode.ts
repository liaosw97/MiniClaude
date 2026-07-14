// Stub file - Coordinator Mode has been removed

export function isCoordinatorMode(): boolean {
  return false
}

export function activateCoordinatorMode(): void {
  // No-op
}

export function deactivateCoordinatorMode(): void {
  // No-op
}

export function matchSessionMode(_mode?: string): string | undefined {
  // stub - coordinator mode removed
  return undefined
}

export function getCoordinatorUserContext(
  _mcpClients: ReadonlyArray<unknown>,
  _scratchpadDir?: string,
): {} {
  // stub - coordinator mode removed
  return {}
}
