/**
 * Internal helpers shared by SDK components. Not exported from the
 * package — kept private to keep the public API surface minimal.
 */

let warnedComponents = new Set<string>();

/**
 * One-time warning when a developer omits `name` from a component.
 * Keyed by the component type so each (Button / Input / Form) gets
 * its own warning rather than spamming if multiple are unnamed.
 */
export function warnMissingName(componentType: string) {
  if (typeof window === 'undefined') return;
  if (warnedComponents.has(componentType)) return;
  warnedComponents.add(componentType);
  console.warn(
    `[Saync] <Saync.${componentType}> rendered without a \`name\` prop. Contract reports will use the random id; add name="something-meaningful" for readable dashboards.`,
  );
}
