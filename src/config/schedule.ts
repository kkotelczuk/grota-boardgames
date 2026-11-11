/**
 * Generator „Rozkładu jazdy” (`/rozklad/`) – grafika z godzinami otwarcia Groty na dany tydzień.
 * Strona ukryta jak generator grafik (noindex, poza sitemapą, bez linków), na razie bez hasła.
 */
/** Klucz w localStorage – ostatni rozkład (`WeekPlan`). Zawsze jeden, bez historii. */
export const SCHEDULE_PLAN_KEY = 'grota:schedule:v1';
/** Maks. długość podpisu dnia (jedna linia na karcie). */
export const SCHEDULE_CAPTION_MAX = 28;
/** Dłuższy bok własnego obrazka po zmniejszeniu – trafia do localStorage jako data: URL. */
export const SCHEDULE_IMAGE_MAX = 640;
