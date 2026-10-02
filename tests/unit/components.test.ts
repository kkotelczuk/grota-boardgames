import { beforeEach, describe, expect, it } from 'vitest';
import { createSSRApp, defineComponent, h, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { mount } from '@vue/test-utils';
import ChipGroup from '@/components/vue/ChipGroup.vue';
import FavoriteButton from '@/components/vue/FavoriteButton.vue';
import GameCard from '@/components/vue/GameCard.vue';
import { I18N } from '@/components/vue/i18n';
import { useTranslations } from '@/i18n';
import { FAVORITES_STORAGE_KEY, __resetFavoritesForTests } from '@/composables/useFavorites';
import { makeGame } from './fixtures';

const global = { provide: { [I18N as symbol]: { locale: 'pl', t: useTranslations('pl') } } };

beforeEach(() => {
  localStorage.clear();
  __resetFavoritesForTests();
});

describe('ChipGroup', () => {
  const options = [
    { value: 'a', label: 'Alfa' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
    { value: 'd', label: 'Delta' },
  ];

  it('toggles values and emits new arrays', async () => {
    const wrapper = mount(ChipGroup, {
      props: { legend: 'L', options, modelValue: ['a'] as string[] },
      global,
    });
    const chips = wrapper.findAll('button.chip');
    expect(chips.map((c) => c.attributes('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ]);
    await chips[1]!.trigger('click');
    await chips[0]!.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[['a', 'b']], [['b']]]);
  });

  it('reflects the selection passed through v-model', () => {
    const wrapper = mount(ChipGroup, {
      props: { legend: 'L', options, modelValue: ['c'] as string[] },
      global,
    });
    expect(wrapper.findAll('button.chip')[2]!.attributes('aria-pressed')).toBe('true');
  });

  it('limit hides extras behind "Pokaż więcej" but keeps selected ones visible', async () => {
    const wrapper = mount(ChipGroup, {
      props: { legend: 'L', options, limit: 2, modelValue: ['d'] as string[] },
      global,
    });
    const labels = () => wrapper.findAll('button.chip').map((c) => c.text());
    expect(labels()).toEqual(['Alfa', 'Beta', 'Delta']);
    const more = wrapper.find('button[aria-expanded]');
    expect(more.text()).toContain('Pokaż więcej');
    await more.trigger('click');
    expect(labels()).toEqual(['Alfa', 'Beta', 'Gamma', 'Delta']);
    expect(wrapper.find('button[aria-expanded]').attributes('aria-expanded')).toBe('true');
  });
});

describe('FavoriteButton', () => {
  it('toggles aria-pressed and label, emits toggle', async () => {
    const wrapper = mount(FavoriteButton, { props: { id: 'g1', title: 'Catan', locale: 'pl' } });
    await nextTick();
    const btn = wrapper.find('button');
    expect(btn.attributes('aria-pressed')).toBe('false');
    expect(btn.attributes('aria-label')).toBe('Dodaj do ulubionych: Catan');
    await btn.trigger('click');
    expect(btn.attributes('aria-pressed')).toBe('true');
    expect(btn.attributes('aria-label')).toBe('Usuń z ulubionych: Catan');
    await btn.trigger('click');
    expect(btn.attributes('aria-pressed')).toBe('false');
    expect(wrapper.emitted('toggle')).toEqual([
      ['g1', true],
      ['g1', false],
    ]);
  });

  it('reflects stored favorites only after mount', async () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(['g1']));
    const wrapper = mount(FavoriteButton, { props: { id: 'g1', title: 'Catan', locale: 'pl' } });
    await nextTick();
    expect(wrapper.find('button').attributes('aria-pressed')).toBe('true');
  });

  it('SSR render never reads storage (hydration safety)', async () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(['g1']));
    const Host = defineComponent({
      render: () => h('section', [h(FavoriteButton, { id: 'g1', title: 'Catan', locale: 'pl' })]),
    });
    const html = await renderToString(createSSRApp(Host));
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('aria-pressed="true"');
  });
});

describe('GameCard', () => {
  it('renders title link, subtitle and players range', () => {
    const game = makeGame({
      id: 'catan',
      title: 'Catan',
      subtitle: 'Settlers',
      minPlayers: 2,
      maxPlayers: 4,
    });
    const wrapper = mount(GameCard, { props: { game }, global });
    const link = wrapper.find('h3 a');
    expect(link.text()).toBe('Catan');
    expect(link.attributes('href')).toBe(game.href);
    expect(wrapper.text()).toContain('Settlers');
    expect(wrapper.text()).toContain('2–4');
  });

  it('shows "EN + PL" badge when Polish rules exist without a PL edition', () => {
    const game = makeGame({ languages: ['EN'], hasPolishRules: true });
    const wrapper = mount(GameCard, { props: { game }, global });
    expect(wrapper.find('.badge').text()).toBe('EN + PL');
  });

  it('shows plain language badge otherwise', () => {
    const game = makeGame({ languages: ['EN'], hasPolishRules: false });
    expect(mount(GameCard, { props: { game }, global }).find('.badge').text()).toBe('EN');
  });

  it('expansions toggle shows count and toggles list + aria-expanded', async () => {
    const game = makeGame({ id: 'base', title: 'Base' });
    const expansions = [
      makeGame({ id: 'e1', title: 'Exp One', kind: 'expansion' }),
      makeGame({ id: 'e2', title: 'Exp Two', kind: 'expansion' }),
    ];
    const wrapper = mount(GameCard, { props: { game, expansions }, global });
    const toggle = wrapper.find('button[aria-expanded]');
    expect(toggle.text()).toContain('+2 dodatki');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('ul').exists()).toBe(false);
    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(wrapper.findAll('ul li a').map((a) => a.attributes('href'))).toEqual(
      expansions.map((e) => e.href),
    );
    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('false');
  });
});
