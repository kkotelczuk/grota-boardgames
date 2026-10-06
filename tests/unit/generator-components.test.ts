import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import DesignPanel from '@/components/vue/generator/DesignPanel.vue';
import GamePicker from '@/components/vue/generator/GamePicker.vue';
import OptionGroup from '@/components/vue/generator/OptionGroup.vue';
import PasswordGate from '@/components/vue/generator/PasswordGate.vue';
import { I18N } from '@/components/vue/i18n';
import { GENERATOR_ACCESS_KEY, GENERATOR_PASSWORD } from '@/config/generator';
import { useTranslations } from '@/i18n';
import type { PosterDesign } from '@/lib/generator/design';
import { THEMES, defaultDesign, matchingTheme } from '@/lib/generator/themes';
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

describe('OptionGroup', () => {
  it('is a radio group bound to v-model', async () => {
    const wrapper = mount(OptionGroup, {
      props: {
        legend: 'Ramka',
        options: [
          { value: 'none', label: 'Brak' },
          { value: 'line', label: 'Linia' },
        ],
        modelValue: 'none',
      },
    });
    expect(wrapper.find('legend').text()).toBe('Ramka');
    const radios = wrapper.findAll('input[type="radio"]');
    expect((radios[0]!.element as HTMLInputElement).checked).toBe(true);
    await radios[1]!.setValue(true);
    expect(wrapper.emitted('update:modelValue')).toEqual([['line']]);
  });
});

describe('DesignPanel', () => {
  // Miniatury i kontrolki rysują na canvasie / ładują fonty – jsdom tego nie umie.
  const stubs = {
    DesignThumb: true,
    BackgroundControls: true,
    HeadingControls: true,
    TileControls: true,
  };
  const mountPanel = (design: PosterDesign) => {
    const wrapper = mount(DesignPanel, {
      global: { ...global, stubs },
      attachTo: document.body,
      props: {
        hasImage: false,
        imageError: false,
        modelValue: design,
      },
    });
    return wrapper;
  };
  /** Ostatni projekt wysłany przez `v-model` (rodzica tu nie ma – patrzymy na emit). */
  const emittedDesign = (wrapper: ReturnType<typeof mountPanel>) =>
    wrapper.emitted<[PosterDesign]>('update:modelValue')?.at(-1)?.[0];
  const checkedTheme = (wrapper: ReturnType<typeof mountPanel>) =>
    wrapper
      .findAll('input[type="radio"]')
      .find((input) => (input.element as HTMLInputElement).checked)
      ?.element.parentElement?.textContent?.trim() ?? null;

  it('marks the matching theme and applies a clicked one', async () => {
    const wrapper = mountPanel(defaultDesign());
    expect(checkedTheme(wrapper)).toBe('Grota');
    const neon = wrapper.findAll('label').find((label) => label.text() === 'Neon')!;
    await neon.find('input').setValue(true);
    expect(matchingTheme(emittedDesign(wrapper)!)).toBe('neon');
    wrapper.unmount();
  });

  it('no theme is marked after a manual change', () => {
    const design = defaultDesign();
    const wrapper = mountPanel({ ...design, heading: { ...design.heading, align: 'center' } });
    expect(checkedTheme(wrapper)).toBeNull();
    wrapper.unmount();
  });

  it('restores the default design', async () => {
    const wrapper = mountPanel(THEMES.neon);
    await wrapper.find('button.btn-ghost').trigger('click');
    expect(matchingTheme(emittedDesign(wrapper)!)).toBe('grota');
    wrapper.unmount();
  });

  it('tabs follow the WAI-ARIA pattern (arrows, Home/End, roving tabindex)', async () => {
    const wrapper = mountPanel(defaultDesign());
    const tabs = () => wrapper.findAll('[role="tab"]');
    const selected = () => tabs().findIndex((tab) => tab.attributes('aria-selected') === 'true');
    expect(selected()).toBe(0);
    expect(tabs().map((tab) => tab.attributes('tabindex'))).toEqual(['0', '-1', '-1']);

    await tabs()[0]!.trigger('keydown', { key: 'ArrowRight' });
    expect(selected()).toBe(1);
    await tabs()[1]!.trigger('keydown', { key: 'End' });
    expect(selected()).toBe(2);
    await tabs()[2]!.trigger('keydown', { key: 'ArrowRight' }); // zawija
    expect(selected()).toBe(0);
    await tabs()[0]!.trigger('keydown', { key: 'ArrowLeft' });
    expect(selected()).toBe(2);
    await new Promise((resolve) => setTimeout(resolve));
    expect(document.activeElement).toBe(tabs()[2]!.element);

    const panelId = tabs()[2]!.attributes('aria-controls')!;
    expect(wrapper.find(`#${CSS.escape(panelId)}`).isVisible()).toBe(true);
    wrapper.unmount();
  });
});
