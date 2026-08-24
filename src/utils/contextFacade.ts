/**
 * Stable façade over a context's split store/actions halves.
 *
 * PlayerContext/EconomyContext values are rebuilt on every state write, so
 * any callback listing them as a dependency is re-minted 15+ times per
 * puzzle completion — which is exactly what defeated GameScreen's memo and
 * re-rendered the whole gameplay tree during victory animations.
 *
 * The providers already expose the two halves this façade recombines:
 *  - a stable actions bag (PlayerActionsContext / EconomyActionsContext)
 *  - a zustand mirror store whose getState() is the current data snapshot
 *
 * The façade has a PERMANENT identity: action properties resolve to the
 * stable bag, everything else resolves to the store's CURRENT state at
 * property-access time. Event handlers can therefore depend on it (or omit
 * it from deps entirely) and still read fresh values at call time.
 *
 * NOT for render-time reads: accessing state through the façade does not
 * subscribe the component. Anything a component renders or lists as an
 * effect dependency must come from a narrow store selector instead
 * (usePlayerStore(selectX)); the façade is for call-time reads inside
 * stable callbacks.
 */
export function makeContextFacade<TData extends object, TActions extends object>(
  getState: () => TData,
  actions: TActions,
): TData & TActions {
  return new Proxy(actions as TData & TActions, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      return (getState() as Record<PropertyKey, unknown>)[prop];
    },
    has(target, prop) {
      return prop in target || prop in (getState() as object);
    },
  });
}
