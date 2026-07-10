export type FeatureFlags = Record<string, boolean>;

interface FeaturesGlobal {
  __FEATURES__?: Record<string, boolean>;
}

// Default feature flags for Node.js environment
const NODE_DEFAULTS: FeatureFlags = {
  BUN_BYTECODE: false,
  BUN_BUNDLE: false,
  NODE_COMPAT: true,
};

// Runtime feature flags (can be updated)
let runtimeFlags: FeatureFlags = {};

export function feature(name: string): boolean {
  // Check build-time features first
  const buildTime = (globalThis as unknown as FeaturesGlobal).__FEATURES__;
  if (buildTime && name in buildTime) {
    return buildTime[name];
  }

  // Check runtime flags
  if (name in runtimeFlags) {
    return runtimeFlags[name];
  }

  // Check Node.js defaults
  if (name in NODE_DEFAULTS) {
    return NODE_DEFAULTS[name];
  }

  return false;
}

export function getFeatureFlags(): FeatureFlags {
  const buildTime = (globalThis as unknown as FeaturesGlobal).__FEATURES__ ?? {};
  return {
    ...buildTime,
    ...runtimeFlags,
  };
}

export function setFeatureFlags(flags: FeatureFlags): void {
  runtimeFlags = { ...runtimeFlags, ...flags };
}
