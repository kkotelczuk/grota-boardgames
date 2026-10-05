import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import GamePicker from '@/components/vue/generator/GamePicker.vue';
import PasswordGate from '@/components/vue/generator/PasswordGate.vue';
import { I18N } from '@/components/vue/i18n';
import { GENERATOR_ACCESS_KEY, GENERATOR_PASSWORD } from '@/config/generator';
import { useTranslations } from '@/i18n';
import type { GeneratorGame } from '@/lib/generator/types';
import { normalizeForSearch } from '@/lib/text';

const global = { provide: { [I18N as symbol]: { locale: 'pl', t: useTranslations('pl') } } };

/** Wyszukiwarka ma debounce 150 ms. */
const afterDebounce = () => new Promise((resolve) => setTimeout(resolve, 200));

const game = (id: string, title: string, subtitle: string | null = null): GeneratorGame => ({
  id,
  title,
  subtitle,
  search: [title, subtitle]
    .filter(Boolean)
    .map((s) => normalizeForSearch(s!))
    .join(' | '),
  cover: null,
});
const games = [
  game('zlodziej', 'Złodziej', 'The Thief'),
  game('scythe', 'Scythe'),
  game('azul', 'Azul'),
];

beforeEach(() => localStorage.clear());

describe('PasswordGate', () => {
  it('shows an error for a wrong password and clears the field', async () => {
    const wrapper = mount(PasswordGate, { global, attachTo: document.body });
    const input = wrapper.find('input[type="password"]');
    await input.setValue('zle-haslo');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.find('[role="alert"]').text()).toBe('Nieprawidłowe hasło.');
    expect((input.element as HTMLInputElement).value).toBe('');
    expect(document.activeElement).toBe(input.element);
    expect(wrapper.emitted('unlock')).toBeUndefined();
    wrapper.unmount();
  });

  it('unlocks and remembers access for the correct password', async () => {
    const wrapper = mount(PasswordGate, { global });
    await wrapper.find('input[type="password"]').setValue(` ${GENERATOR_PASSWORD} `);
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('unlock')).toHaveLength(1);
    expect(localStorage.getItem(GENERATOR_ACCESS_KEY)).toBe('1');
  });
});

describe('GamePicker', () => {
  const mountPicker = (selected: string[] = []) =>
    mount(GamePicker, {
      props: { games, selectedKeys: new Set(selected), disabled: false },
      global,
    });

  it('finds a Polish title by a phrase without diacritics', async () => {
    const wrapper = mountPicker();
    await wrapper.find('input[type="search"]').setValue('zlodziej');
    await afterDebounce();
    const results = wrapper.findAll('ul button');
    expect(results).toHaveLength(1);
    expect(results[0]!.text()).toContain('Złodziej');
    expect(results[0]!.text()).toContain('Złodziej The Thief');
  });

  it('emits `add` with a catalog item and clears the phrase', async () => {
    const wrapper = mountPicker();
    const input = wrapper.find('input[type="search"]');
    await input.setValue('scy');
    await afterDebounce();
    await wrapper.find('ul button').trigger('click');
    expect(wrapper.emitted('add')).toEqual([
      [{ key: 'scythe', source: 'catalog', title: 'Scythe', cover: null }],
    ]);
    expect((input.element as HTMLInputElement).value).toBe('');
  });

  it('disables games that are already selected', async () => {
    const wrapper = mountPicker(['azul']);
    await wrapper.find('input[type="search"]').setValue('azul');
    await afterDebounce();
    const button = wrapper.find('ul button');
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.text()).toContain('dodano');
  });

  it('shows a message when nothing matches', async () => {
    const wrapper = mountPicker();
    await wrapper.find('input[type="search"]').setValue('xyz');
    await afterDebounce();
    expect(wrapper.text()).toContain('Brak gier pasujących do wyszukiwania.');
  });
});
