import { site } from '@/config/site';
import { faq } from '@/config/faq';
import { localizedPath, withBase } from '@/i18n';
import { gamePath } from '@/lib/data/games';
import { formatRange } from '@/lib/game-index';
import { editionLabel } from '@/lib/languages';
import type { Game } from '@/lib/schema';

/**
 * Treść llms.txt (https://llmstxt.org): krótkie, faktograficzne zdania + linki do kluczowych stron.
 * Dane organizacji z src/config/site.ts – ten sam NAP co w JSON-LD i stopce.
 */
export function llmsTxt(siteUrl: URL, games: Game[]): string {
  const abs = (path: string) => new URL(path, siteUrl).toString();
  const answered = faq.filter((item) => item.answer);
  const address = `${site.address.street}, ${site.address.postalCode ? `${site.address.postalCode} ` : ''}${site.address.city}, Polska`;

  return `# ${site.name}

> ${site.name} (Grota) to stowarzyszenie z Białegostoku (${site.address.street}), w którym gra się na miejscu w gry bez prądu: planszówki, karcianki, gry wojenne i imprezowe. Kolekcja liczy ${games.length} gier. Gier nie wypożyczamy – przychodzi się zagrać na miejscu. Dni otwarte są ogłaszane na Discordzie.

Białystok Board Game Group "Grota" is a non-profit association in Białystok, Poland, where people meet to play board games, card games, wargames and party games on site. The collection has ${games.length} games. Games are not lent out. Open days are announced on Discord.

- Adres / Address: ${address}
- Discord (dni otwarte / open days): ${site.discordInvite}
- Mapa / Map: ${site.maps.osm}

## Strony / Pages

- [Lista gier (PL)](${abs(localizedPath({ name: 'home' }, 'pl'))}): pełna kolekcja z wyszukiwarką i filtrami
- [Game list (EN)](${abs(localizedPath({ name: 'home' }, 'en'))}): the full collection in English
- [O Grocie i dojazd](${abs(localizedPath({ name: 'about' }, 'pl'))}): adres, jak to działa, FAQ
- [About Grota](${abs(localizedPath({ name: 'about' }, 'en'))}): address, how it works, FAQ

## Dane / Data

- [llms-full.txt](${abs(withBase('llms-full.txt'))}): pełna lista gier w Markdown (tytuł, gracze, czas, krótki opis)
- [games.json](${abs(withBase('games.json'))}): katalog kolekcji w JSON
- [Sitemap](${abs(withBase('sitemap-index.xml'))})

## FAQ

${answered.map((item) => `- **${item.question.pl}** ${item.answer!.pl}`).join('\n')}
`;
}

export function llmsFullTxt(siteUrl: URL, games: Game[]): string {
  const abs = (path: string) => new URL(path, siteUrl).toString();
  const lines = games.map((g) => {
    const players = formatRange(g.minPlayers, g.maxPlayers);
    const time = formatRange(g.minPlayTime, g.maxPlayTime);
    const facts = [
      players && `${players} graczy`,
      time && `${time} min`,
      g.minAge && `${g.minAge}+`,
      g.kind === 'expansion' && 'dodatek',
      g.copies.map((c) => editionLabel(c, 'pl')).join(', '),
    ].filter(Boolean);
    const original = g.titleOriginal !== g.titlePl ? ` (${g.titleOriginal})` : '';
    const summary = g.summary.pl ?? g.summary.en ?? '';
    return `### [${g.titlePl}${original}](${abs(gamePath(g, 'pl'))})\n\n${facts.join(' · ')}${summary ? `\n\n${summary}` : ''}\n`;
  });

  return `# Kolekcja gier – ${site.name}

> Wszystkie gry, w które można zagrać na miejscu w Grocie (${site.address.street}, ${site.address.city}). Gier nie wypożyczamy. ${games.length} pozycji.

${lines.join('\n')}`;
}
