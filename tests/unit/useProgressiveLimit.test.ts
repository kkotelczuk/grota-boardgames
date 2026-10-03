import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useProgressiveLimit } from '@/composables/useProgressiveLimit';

function mountWithLimit(total: number, options?: Parameters<typeof useProgressiveLimit>[1]) {
  let limit!: Ref<number>;
  const wrapper = mount(
    defineComponent({
      setup() {
        limit = useProgressiveLimit(total, options);
        return () => h('div');
      },
    }),
  );
  return { wrapper, limit: () => limit.value };
}

function navigationType(type: NavigationTimingType | undefined) {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue(
    type ? ([{ type }] as unknown as PerformanceEntryList) : [],
  );
}

describe('useProgressiveLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom nie ma requestIdleCallback – composable korzysta wtedy z setTimeout (jak Safari).
    navigationType('navigate');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('zaczyna od `initial` i dorasta porcjami do `total`', async () => {
    const { limit } = mountWithLimit(30, { initial: 10, chunk: 8 });
    expect(limit()).toBe(10);
    await vi.advanceTimersToNextTimerAsync();
    expect(limit()).toBe(18);
    await vi.runAllTimersAsync();
    expect(limit()).toBe(30);
  });

  it('nie przekracza `total` i nic nie planuje dla krótkiej listy', () => {
    const { limit } = mountWithLimit(5, { initial: 24 });
    expect(limit()).toBe(24);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['back_forward', 'reload'] as const)(
    'przy nawigacji %s renderuje od razu całą listę (przywracanie przewinięcia)',
    (type) => {
      navigationType(type);
      const { limit } = mountWithLimit(100, { initial: 24 });
      expect(limit()).toBe(100);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('po powrocie przewija na pozycję zapisaną przy opuszczeniu strony', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const first = mountWithLimit(100);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(4321);
    window.dispatchEvent(new Event('pagehide'));
    first.wrapper.unmount();

    // Przeglądarka ucięła pozycję do wysokości pierwszych kart.
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(1200);
    navigationType('back_forward');
    mountWithLimit(100);
    await vi.waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 4321));
  });

  it('nie przewija, gdy przeglądarka sama przywróciła pozycję', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    sessionStorage.setItem(`grota:scroll:${location.pathname}${location.search}`, '800');
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(800);
    navigationType('reload');
    mountWithLimit(100);
    await Promise.resolve();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('odmontowanie anuluje zaplanowaną porcję', async () => {
    const { wrapper, limit } = mountWithLimit(100, { initial: 10, chunk: 10 });
    wrapper.unmount();
    await vi.runAllTimersAsync();
    expect(limit()).toBe(10);
  });
});
