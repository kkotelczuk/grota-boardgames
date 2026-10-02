import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref, type App } from 'vue';
import { useUrlQueryState } from '@/composables/useUrlQueryState';
import { defaultFilterState, stateFromQuery, stateToQuery, type FilterState } from '@/lib/filters';

let app: App | undefined;

function mountWith(debounce = 50) {
  const state = ref<FilterState>(defaultFilterState());
  app = createApp(
    defineComponent({
      setup() {
        useUrlQueryState(state, { parse: stateFromQuery, serialize: stateToQuery }, { debounce });
        return () => h('div');
      },
    }),
  );
  app.mount(document.createElement('div'));
  return state;
}

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  vi.useRealTimers();
});

describe('useUrlQueryState', () => {
  it('reads state from the URL on mount', async () => {
    window.history.replaceState(null, '', '/?players=4&sort=year&q=lis');
    const state = mountWith();
    await nextTick();
    expect(state.value.players).toBe(4);
    expect(state.value.sort).toBe('year');
    expect(state.value.q).toBe('lis');
  });

  it('writes URL via replaceState after the debounce, without adding history entries', async () => {
    const state = mountWith();
    await nextTick();
    await vi.advanceTimersByTimeAsync(100); // flush the read-from-URL microtask / watcher
    const length = window.history.length;
    state.value.players = 3;
    await nextTick();
    expect(window.location.search).toBe('');
    await vi.advanceTimersByTimeAsync(60);
    expect(window.location.search).toBe('?players=3');
    expect(window.history.length).toBe(length);
  });

  it('removes params when state returns to defaults', async () => {
    window.history.replaceState(null, '', '/?players=4');
    const state = mountWith();
    await vi.advanceTimersByTimeAsync(100);
    state.value = defaultFilterState();
    await vi.advanceTimersByTimeAsync(100);
    expect(window.location.search).toBe('');
  });

  it('popstate re-reads the URL', async () => {
    const state = mountWith();
    await vi.advanceTimersByTimeAsync(100);
    window.history.replaceState(null, '', '/?kind=base&fav=1');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await nextTick();
    expect(state.value.kind).toBe('base');
    expect(state.value.favoritesOnly).toBe(true);
  });

  it('stops listening to popstate after unmount', async () => {
    const state = mountWith();
    await vi.advanceTimersByTimeAsync(100);
    app!.unmount();
    app = undefined;
    window.history.replaceState(null, '', '/?kind=base');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(state.value.kind).toBe('all');
  });
});
