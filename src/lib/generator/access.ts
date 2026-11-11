import { GENERATOR_ACCESS_KEY } from '@/config/generator';

/**
 * Czy w tej przeglądarce podano już hasło do narzędzi Groty (generator grafik, rozkład jazdy).
 * Oba narzędzia mają to samo hasło i wspólny klucz – wystarczy wpisać je raz.
 */
export function hasToolAccess(): boolean {
  try {
    return localStorage.getItem(GENERATOR_ACCESS_KEY) === '1';
  } catch {
    return false; // storage zablokowany – po prostu pytamy o hasło
  }
}
