import { plural } from './plural.ts';

const p = (count: number, one: string, few: string, many: string) =>
  plural('pl', count, { one, few, many, other: few });

export const pl = {
  meta: {
    siteName: 'Grota – gry planszowe w Białymstoku',
    homeTitle: 'Gry planszowe w Grocie – kolekcja stowarzyszenia z Białegostoku',
    homeDescription:
      'Sprawdź, w co zagrasz w Grocie: ponad 260 planszówek, karcianek i gier wojennych. Białostocka Grupa Planszówkowa, ul. Warszawska 44/2, Białystok.',
    favoritesTitle: 'Twoje ulubione gry',
    favoritesDescription: 'Gry z kolekcji Groty zapisane jako ulubione.',
    aboutTitle: 'O Grocie i jak do nas trafić',
    aboutDescription:
      'Białostocka Grupa Planszówkowa „Grota” – stowarzyszenie, w którym gra się w planszówki na miejscu. Adres, dojazd, Discord i najczęstsze pytania.',
    notFoundTitle: 'Nie znaleziono strony',
    gameTitle: (title: string) => `${title} – zagraj w Grocie w Białymstoku`,
    gameDescriptionFallback: (title: string) =>
      `${title} – gra planszowa dostępna do zagrania na miejscu w Grocie, Białystok.`,
  },
  a11y: {
    skipToContent: 'Przejdź do treści',
    mainNav: 'Główna nawigacja',
    footerNav: 'Nawigacja w stopce',
    breadcrumbs: 'Ścieżka nawigacji',
    openMenu: 'Otwórz menu',
    closeMenu: 'Zamknij menu',
    externalLink: '(otwiera się w nowej karcie)',
  },
  nav: {
    games: 'Gry',
    favorites: 'Ulubione',
    about: 'O Grocie',
    discord: 'Discord',
    home: 'Strona główna',
  },
  theme: {
    toggle: 'Przełącz motyw',
    light: 'Jasny motyw',
    dark: 'Ciemny motyw',
  },
  language: {
    switchTo: 'English',
    switchLabel: 'Switch to English',
  },
  hero: {
    eyebrow: 'Białostocka Grupa Planszówkowa',
    title: 'W co zagramy w Grocie?',
    lead: 'Grota to stowarzyszenie z Białegostoku, w którym gra się w planszówki, karcianki, gry wojenne i imprezowe – na miejscu, przy wspólnym stole. Gier nie wypożyczamy: przyjdź i zagraj z nami.',
    address: 'ul. Warszawska 44/2 lok. 4, Białystok',
    cta: 'Dołącz na Discordzie',
    ctaHint: 'Dni otwarte ogłaszamy na Discordzie',
    stats: (games: number) =>
      p(games, '{n} gra w kolekcji', '{n} gry w kolekcji', '{n} gier w kolekcji'),
  },
  list: {
    heading: 'Kolekcja gier',
    searchLabel: 'Szukaj gry',
    searchPlaceholder: 'Szukaj po tytule…',
    clearSearch: 'Wyczyść wyszukiwanie',
    filters: 'Filtry',
    showFilters: 'Pokaż filtry',
    closeFilters: 'Zamknij filtry',
    applyFilters: (count: number) =>
      p(count, 'Pokaż {n} wynik', 'Pokaż {n} wyniki', 'Pokaż {n} wyników'),
    clearFilters: 'Wyczyść filtry',
    clearShort: 'Wyczyść',
    activeFilters: 'Aktywne filtry',
    removeFilter: (label: string) => `Usuń filtr: ${label}`,
    results: (count: number) => p(count, '{n} gra', '{n} gry', '{n} gier'),
    resultsOf: (count: number, total: number) =>
      `${p(count, '{n} gra', '{n} gry', '{n} gier')} z ${total}`,
    emptyTitle: 'Nic nie pasuje do tych kryteriów',
    emptyText: 'Spróbuj innej frazy albo usuń część filtrów.',
    sortLabel: 'Sortuj',
    sort: {
      title: 'Tytuł A–Z',
      rating: 'Ocena BGG',
      rank: 'Ranking BGG',
      year: 'Najnowsze',
      time: 'Czas gry',
      weight: 'Złożoność',
    },
    filter: {
      players: 'Liczba graczy',
      playersAny: 'Dowolna',
      playersValue: (n: number) => (n >= 8 ? '8+' : String(n)),
      time: 'Czas gry',
      timeOptions: {
        short: 'do 30 min',
        medium: '30–60 min',
        long: '1–2 godz.',
        epic: 'ponad 2 godz.',
      },
      weight: 'Złożoność',
      weightOptions: {
        light: 'Lekka',
        medium: 'Średnia',
        heavy: 'Ciężka',
      },
      age: 'Wiek',
      ageValue: (n: number) => p(n, '{n} rok', '{n} lata', '{n} lat'),
      ageOptions: 'Wiek najmłodszego gracza',
      language: 'Język wydania',
      polishRules: 'Z polską instrukcją',
      categories: 'Kategorie',
      mechanics: 'Mechaniki',
      kind: 'Typ',
      kindOptions: {
        all: 'Wszystko',
        base: 'Gry podstawowe',
        expansion: 'Dodatki',
      },
      favoritesOnly: 'Tylko ulubione',
      showMore: 'Pokaż więcej',
      showLess: 'Pokaż mniej',
      searchTerms: 'Filtruj listę…',
    },
  },
  card: {
    players: (min: number | null, max: number | null) =>
      min == null ? '–' : min === max || max == null ? `${min}` : `${min}–${max}`,
    playersUnit: 'graczy',
    minutes: 'min',
    age: (n: number) => `${n}+`,
    expansions: (count: number) => `+${p(count, '{n} dodatek', '{n} dodatki', '{n} dodatków')}`,
    showExpansions: 'Pokaż dodatki',
    hideExpansions: 'Ukryj dodatki',
    expansionBadge: 'Dodatek',
    rating: 'Ocena BGG',
    noImage: 'Brak okładki',
    copies: (count: number) => p(count, '{n} egzemplarz', '{n} egzemplarze', '{n} egzemplarzy'),
  },
  favorites: {
    add: 'Dodaj do ulubionych',
    remove: 'Usuń z ulubionych',
    added: 'Dodano do ulubionych',
    removed: 'Usunięto z ulubionych',
    counter: (count: number) =>
      p(count, '{n} ulubiona gra', '{n} ulubione gry', '{n} ulubionych gier'),
    heading: 'Ulubione gry',
    lead: 'Twoja lista jest zapisana tylko w tej przeglądarce – nie trzeba się logować.',
    emptyTitle: 'Nie masz jeszcze ulubionych gier',
    emptyText:
      'Kliknij serduszko przy grze, żeby zapisać ją na później – np. listę gier na najbliższy wieczór w Grocie.',
    emptyCta: 'Przeglądaj kolekcję',
    loading: 'Wczytywanie ulubionych…',
  },
  game: {
    originalTitle: 'Tytuł oryginalny',
    polishEdition: 'Wydanie polskie',
    players: 'Liczba graczy',
    best: (players: string) => `najlepiej: ${players}`,
    playTime: 'Czas gry',
    minutes: (range: string) => `${range} min`,
    age: 'Wiek',
    ageValue: (n: number) => `od ${n} lat`,
    weight: 'Złożoność',
    weightScale: (value: string) => `${value} / 5`,
    weightLabels: ['bardzo lekka', 'lekka', 'średnia', 'wymagająca', 'ciężka'] as const,
    rating: 'Ocena BGG',
    ratingValue: (value: string, votes: string) => `${value} / 10 (${votes} głosów)`,
    rank: 'Ranking BGG',
    rankValue: (rank: number) => `#${rank}`,
    year: 'Rok wydania',
    categories: 'Kategorie',
    mechanics: 'Mechaniki',
    designers: 'Autorzy',
    description: 'Opis',
    descriptionFallback: 'Opis w języku angielskim – polskie tłumaczenie jeszcze nie jest gotowe.',
    noDescription: 'Opis tej gry nie jest jeszcze gotowy.',
    inGrota: 'W Grocie',
    copies: 'Egzemplarze',
    edition: 'Wydanie',
    expansionsHeading: 'Dodatki dostępne w Grocie',
    baseGameHeading: 'Gra podstawowa',
    expansionOf: 'To dodatek do gry',
    baseNotInCollection: (names: string) =>
      `To dodatek do gry ${names}, której nie ma w naszej kolekcji – do zagrania potrzebny jest egzemplarz podstawki.`,
    similarHeading: 'Podobne gry w Grocie',
    onBgg: 'Zobacz na BoardGameGeek',
    source: 'Źródło',
    ctaTitle: 'Chcesz zagrać?',
    ctaText: 'Sprawdź dni otwarte na Discordzie i przyjdź do Groty – gry czekają na stole.',
    ctaButton: 'Dni otwarte na Discordzie',
    incomplete: 'Część informacji o tej grze jest jeszcze uzupełniana.',
    unknown: 'brak danych',
  },
  about: {
    heading: 'O Grocie',
    collection: (count: number) =>
      `${p(count, 'W kolekcji Groty jest {n} gra', 'W kolekcji Groty są {n} gry', 'W kolekcji Groty jest {n} gier')} – listę z opisami znajdziesz na stronie głównej.`,
    lead: 'Białostocka Grupa Planszówkowa „Grota” to stowarzyszenie z Białegostoku, które zrzesza miłośników gier bez prądu: planszówek, karcianek, gier wojennych i imprezowych.',
    howItWorksHeading: 'Jak to działa',
    howItWorks: [
      'Do Groty przychodzi się zagrać na miejscu – są stoły, gry z naszej kolekcji i ludzie, z którymi można zagrać.',
      'Gier nie wypożyczamy do domu. Ta strona pokazuje, w co możesz u nas zagrać.',
      'Terminy dni otwartych ogłaszamy na Discordzie – tam też najłatwiej znaleźć współgraczy.',
    ],
    feeHeading: 'Ile to kosztuje',
    feeText: 'Jednorazowa opłata za skorzystanie z klubu i biblioteki gier wynosi',
    feeAmount: '10 zł',
    feeNote:
      'Opłata jest pobierana w ramach odpłatnej działalności statutowej Stowarzyszenia i przeznaczana na realizację jego celów statutowych, w szczególności utrzymanie i rozwój działalności klubu oraz zapewnienie dostępu do jego zasobów.',
    whereHeading: 'Gdzie jesteśmy',
    addressLabel: 'Adres',
    openMap: 'Otwórz w OpenStreetMap',
    openGoogleMap: 'Otwórz w Mapach Google',
    hoursHeading: 'Kiedy jesteśmy otwarci',
    hoursText: 'Godziny i dni otwarte ogłaszamy na bieżąco na naszym Discordzie.',
    faqHeading: 'Najczęstsze pytania',
  },
  discord: {
    title: 'Przekierowanie na Discorda Groty',
    text: 'Za chwilę przeniesiemy Cię na serwer Discord Groty.',
    fallback: 'Jeśli nic się nie dzieje, kliknij tutaj',
  },
  notFound: {
    heading: 'Tej strony tu nie ma',
    text: 'Może gra zmieniła adres albo link jest literówką. Wróć do kolekcji i poszukaj jeszcze raz.',
    cta: 'Wróć do kolekcji',
  },
  footer: {
    tagline: 'Stowarzyszenie miłośników gier bez prądu z Białegostoku.',
    poweredBy: 'Dane o grach pochodzą z',
    bggTerms: 'BoardGameGeek',
    rights: 'Białostocka Grupa Planszówkowa „Grota”',
    machine: 'Dane dla maszyn',
  },
};

/** Słownik PL wyznacza kształt – EN musi mieć komplet kluczy (patrz en.ts). */
type Widen<T> = T extends string
  ? string
  : T extends readonly string[]
    ? readonly string[]
    : T extends (...args: infer A) => infer R
      ? (...args: A) => R
      : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof pl>;
