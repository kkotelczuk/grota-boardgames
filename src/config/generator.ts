/**
 * Generator grafik na Facebooka (`/generator/`).
 *
 * Hasło jest jawne w bundlu JS – to świadoma ochrona tylko przed botami i przypadkowymi
 * gośćmi (strona nie ma logowania). Kto zajrzy w źródła, i tak nic nie zepsuje.
 */
export const GENERATOR_PASSWORD = 'test-123';
/** Maks. liczba gier na grafice (siatka 5×5). */
export const GENERATOR_MAX_GAMES = 25;
/** Klucz w localStorage – `'1'` = hasło podane, nie pytamy ponownie. */
export const GENERATOR_ACCESS_KEY = 'grota:generator-access';
