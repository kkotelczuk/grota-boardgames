/* eslint-disable vue/one-component-per-file -- test harness mounts several tiny islands */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, type App } from 'vue';
import {
  FAVORITES_STORAGE_KEY,
  __resetFavoritesForTests,
  useFavorites,
} from '@/composables/useFavorites';

type Api = ReturnType<typeof useFavorites>;
const apps: App[] = [];

const Probe = defineComponent({
  emits: ['ready'],
  setup(_, { emit }) {
    const api = useFavorites();
    emit('ready', api, api.count.value);
    return () => h('div');
  },
});

function island() {
  let api!: Api;
  let before = -1;
  const app = createApp(Probe, {
    onReady: (a: Api, count: number) => {
      api = a;
      before = count;
    },
  });
  apps.push(app);
  return {
    mount() {
      app.mount(document.createElement('div'));
      return api;
    },
    get countBeforeMount() {
      return before;
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  __resetFavoritesForTests();
});
afterEach(() => {
  apps.splice(0).forEach((a) => a.unmount());
});

describe('useFavorites', () => {
  it('is empty until mounted (SSR-like), even with storage populated', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(['a']));
    // The count is captured inside setup(), before onMounted – same state as an SSR render.
    const i = island();
    const api = i.mount();
    expect(i.countBeforeMount).toBe(0);
    expect(api.count.value).toBe(1);
  });

  it('reads storage after mount', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(['a', 'b']));
    const api = island().mount();
    expect(api.count.value).toBe(2);
    expect(api.isFavorite('a')).toBe(true);
    expect(api.ready.value).toBe(true);
  });

  it('toggle writes to storage and returns the new state', () => {
    const api = island().mount();
    expect(api.toggle('x')).toBe(true);
    expect(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY)!)).toEqual(['x']);
    expect(api.toggle('x')).toBe(false);
    expect(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY)!)).toEqual([]);
  });

  it('shares state between separately mounted apps', () => {
    const a = island().mount();
    const b = island().mount();
    a.toggle('g1');
    expect(b.isFavorite('g1')).toBe(true);
    expect(b.count.value).toBe(1);
  });

  it('corrupted JSON yields an empty set', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, '{not json');
    expect(island().mount().count.value).toBe(0);
  });

  it('non-array / non-string payloads are filtered', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(['a', 1, null]));
    expect(island().mount().count.value).toBe(1);
  });

  it('storage event updates state', () => {
    const api = island().mount();
    expect(api.count.value).toBe(0);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(['z']));
    window.dispatchEvent(new StorageEvent('storage', { key: FAVORITES_STORAGE_KEY }));
    expect(api.isFavorite('z')).toBe(true);
  });

  it('ignores storage events for other keys', () => {
    const api = island().mount();
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(['z']));
    window.dispatchEvent(new StorageEvent('storage', { key: 'other' }));
    expect(api.count.value).toBe(0);
  });
});
