// Stub file - Teleport functionality has been removed

export type EnvironmentKind = 'local' | 'remote'
export type EnvironmentResource = any

export async function fetchEnvironments(): Promise<EnvironmentResource[]> {
  return []
}
export async function createDefaultCloudEnvironment(): Promise<EnvironmentResource | null> { return null }
