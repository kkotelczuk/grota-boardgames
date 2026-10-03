/**
 * Jedno źródło prawdy o organizacji. Używane w treści, JSON-LD, llms.txt i przekierowaniu /discord/.
 * Wartości oznaczone `TODO` uzupełnia człowiek – nie zgadujemy faktów.
 */
export interface SiteConfig {
  name: string;
  shortName: string;
  legalForm: { pl: string; en: string };
  address: {
    street: string;
    city: string;
    /** TODO: kod pocztowy nieznany – uzupełnij. `null` = nie publikujemy. */
    postalCode: string | null;
    region: string;
    /** ISO 3166-2 województwa – meta `geo.region`. */
    regionCode: string;
    country: string;
  };
  /** Współrzędne budynku (OpenStreetMap, way 233189599) – JSON-LD `geo` i meta geo. */
  geo: { latitude: number; longitude: number };
  /** Aktualne zaproszenie na Discorda. Link nie jest stały – zmieniaj tylko tutaj. */
  discordInvite: string;
  /** Wewnętrzna, stała ścieżka przekierowująca na `discordInvite`. */
  discordPath: string;
  maps: { osm: string; google: string };
}

export const site: SiteConfig = {
  name: 'Białostocka Grupa Planszówkowa „Grota”',
  shortName: 'Grota',
  legalForm: { pl: 'stowarzyszenie', en: 'association' },
  address: {
    street: 'ul. Warszawska 44/2 lok. 4',
    city: 'Białystok',
    postalCode: null, // TODO: uzupełnij kod pocztowy
    region: 'podlaskie',
    regionCode: 'PL-20',
    country: 'PL',
  },
  geo: { latitude: 53.130908, longitude: 23.173157 },
  discordInvite: 'https://discord.gg/Gkc63kgQa',
  discordPath: 'discord/',
  maps: {
    osm: 'https://www.openstreetmap.org/search?query=Warszawska%2044%2C%20Bia%C5%82ystok',
    google: 'https://www.google.com/maps/search/?api=1&query=Warszawska+44%2F2%2C+Bia%C5%82ystok',
  },
};
