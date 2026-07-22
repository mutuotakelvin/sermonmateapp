import type { Edge } from 'react-native-safe-area-context';

const ALL_EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];
const WITHOUT_BOTTOM: readonly Edge[] = ['top', 'right', 'left'];

/**
 * Which safe-area edges a Screen should pad for.
 *
 * Inside the tab navigator the bottom inset is already spoken for: the tab bar adds
 * `insets.bottom` to its own height (see (tabs)/_layout.tsx). Padding for it a second
 * time leaves a dead strip of background between the scroll content and the tab bar —
 * the content stops short instead of running right up to it.
 *
 * React Navigation does not zero the inset for us. BottomTabView only *consumes*
 * SafeAreaInsetsContext to size the tab bar; it never re-provides a reduced inset to
 * the screens. So we drop the bottom edge ourselves whenever a tab bar is present.
 *
 * Outside the tabs (verse, login, onboarding) the bottom inset is still needed, or
 * content runs under Android's navigation bar — the edge-to-edge trap that made the
 * Mood and Profile tabs untappable for beta testers.
 */
export function resolveEdges(insideTabs: boolean, override?: readonly Edge[]): readonly Edge[] {
  if (override) return override;
  return insideTabs ? WITHOUT_BOTTOM : ALL_EDGES;
}
