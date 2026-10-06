import { nextTick, ref, useId, type Ref } from 'vue';

/**
 * Zakładki wg wzorca WAI-ARIA Tabs: strzałki ←/→ (z zawijaniem), Home/End, „roving tabindex”
 * (Tab wchodzi tylko na aktywną zakładkę, potem od razu do panelu).
 *
 * [Vue] Composable zwraca funkcje budujące atrybuty – w szablonie `v-bind="tab('tiles')"`.
 * Klucze `onClick`/`onKeydown` w obiekcie z v-bind Vue zamienia na nasłuchiwacze zdarzeń.
 */
export function useTabs<T extends string>(ids: readonly T[], initial: T) {
  const active = ref(initial) as Ref<T>;
  const base = useId();
  const tabId = (id: T) => `${base}-tab-${id}`;
  const panelId = (id: T) => `${base}-panel-${id}`;

  async function select(id: T, focus = false) {
    active.value = id;
    if (focus) {
      await nextTick();
      document.getElementById(tabId(id))?.focus();
    }
  }

  function onKeydown(event: KeyboardEvent) {
    const index = ids.indexOf(active.value);
    const target: Record<string, number> = {
      ArrowRight: (index + 1) % ids.length,
      ArrowLeft: (index - 1 + ids.length) % ids.length,
      Home: 0,
      End: ids.length - 1,
    };
    const next = target[event.key];
    if (next === undefined) return;
    event.preventDefault();
    void select(ids[next]!, true);
  }

  const tab = (id: T) => ({
    id: tabId(id),
    role: 'tab',
    type: 'button' as const,
    'aria-selected': active.value === id,
    'aria-controls': panelId(id),
    tabindex: active.value === id ? 0 : -1,
    onClick: () => select(id),
    onKeydown,
  });

  const panel = (id: T) => ({
    id: panelId(id),
    role: 'tabpanel',
    'aria-labelledby': tabId(id),
    tabindex: 0,
  });

  return { active, select, tab, panel };
}
