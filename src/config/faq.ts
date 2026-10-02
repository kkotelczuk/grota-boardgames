import type { Locale } from '@/lib/languages';

export interface FaqItem {
  question: Record<Locale, string>;
  /** `null` = odpowiedź nieznana (TODO dla człowieka) – pytanie nie jest publikowane ani w JSON-LD. */
  answer: Record<Locale, string> | null;
}

/** FAQ strony „O Grocie”. Nie zmyślamy faktów – nieznane odpowiedzi zostają `null` z TODO. */
export const faq: FaqItem[] = [
  {
    question: { pl: 'Czy mogę wypożyczyć grę do domu?', en: 'Can I borrow a game to take home?' },
    answer: {
      pl: 'Nie. Gier z kolekcji Groty nie wypożyczamy – można w nie zagrać na miejscu, przy ul. Warszawskiej 44/2 lok. 4 w Białymstoku.',
      en: 'No. Games from the Grota collection are not lent out – you can play them on site at ul. Warszawska 44/2 lok. 4 in Białystok.',
    },
  },
  {
    question: { pl: 'Kiedy Grota jest otwarta?', en: 'When is Grota open?' },
    answer: {
      pl: 'Terminy dni otwartych ogłaszamy na bieżąco na naszym serwerze Discord.',
      en: 'Open days are announced on our Discord server.',
    },
  },
  {
    question: {
      pl: 'Skąd wiem, w co można zagrać?',
      en: 'How do I know which games are available?',
    },
    answer: {
      pl: 'Pełna lista gier jest na tej stronie – możesz ją przeszukiwać i filtrować np. po liczbie graczy czy czasie gry.',
      en: 'The full list of games is on this website – you can search it and filter by player count, playing time and more.',
    },
  },
  // TODO: uzupełnij odpowiedź (opłaty / składki / wejściówki)
  { question: { pl: 'Czy trzeba płacić?', en: 'Do I have to pay?' }, answer: null },
  // TODO: uzupełnij odpowiedź
  {
    question: { pl: 'Czy mogę przynieść swoją grę?', en: 'Can I bring my own game?' },
    answer: null,
  },
  // TODO: uzupełnij odpowiedź (czy ktoś tłumaczy zasady nowym osobom)
  {
    question: { pl: 'Czy muszę znać zasady gier?', en: 'Do I need to know the rules?' },
    answer: null,
  },
  // TODO: uzupełnij odpowiedź (czy trzeba być członkiem stowarzyszenia, jak się zapisać)
  {
    question: { pl: 'Czy muszę być członkiem stowarzyszenia?', en: 'Do I need to be a member?' },
    answer: null,
  },
];
