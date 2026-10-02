import { describe, expect, it } from 'vitest';
import {
  cleanDescription,
  parseBggXml,
  parsePlayerSummary,
  splitItems,
} from '../../scripts/lib/bgg-xml.ts';

describe('parsePlayerSummary', () => {
  it('parses ranges, lists and single values', () => {
    expect(parsePlayerSummary('Best with 7–8 players')).toEqual([7, 8]);
    expect(parsePlayerSummary('Recommended with 1–4 players')).toEqual([1, 2, 3, 4]);
    expect(parsePlayerSummary('Best with 2–3, 5 players')).toEqual([2, 3, 5]);
    expect(parsePlayerSummary('Best with 3 players')).toEqual([3]);
  });

  it('returns an empty list for undefined or unrelated text', () => {
    expect(parsePlayerSummary(undefined)).toEqual([]);
    expect(parsePlayerSummary('No votes')).toEqual([]);
  });
});

describe('cleanDescription', () => {
  it('decodes double-encoded entities', () => {
    expect(cleanDescription('Don&amp;rsquo;t panic')).toBe('Don’t panic');
  });

  it('turns encoded newlines into paragraphs', () => {
    expect(cleanDescription('One.&amp;#10;&amp;#10;Two.&amp;#10;Three.')).toBe(
      'One.\n\nTwo.\n\nThree.',
    );
    expect(cleanDescription('One.&#10;&#10;Two.')).toBe('One.\n\nTwo.');
  });
});

const xml = `<?xml version="1.0" encoding="utf-8"?>
<items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item type="boardgame" id="100">
    <image>https://img.example/100.jpg
    </image>
    <name type="primary" sortorder="1" value="Test &amp; Game"/>
    <name type="alternate" sortorder="1" value="Gra Testowa"/>
    <description>Line one.&amp;#10;&amp;#10;It&amp;rsquo;s fun.</description>
    <yearpublished value="2019"/>
    <minplayers value="1"/>
    <maxplayers value="8"/>
    <poll-summary name="suggested_numplayers" title="User Suggested Number of Players">
      <result name="bestwith" value="Best with 3–4 players"/>
      <result name="recommmendedwith" value="Recommended with 1–5 players"/>
    </poll-summary>
    <playingtime value="90"/>
    <minplaytime value="60"/>
    <maxplaytime value="120"/>
    <minage value="12"/>
    <link type="boardgamecategory" id="1002" value="Card Game"/>
    <link type="boardgamemechanic" id="2001" value="Hand Management"/>
    <link type="boardgamedesigner" id="9" value="Jane Doe"/>
    <link type="boardgamepublisher" id="7" value="Pub Co"/>
    <link type="boardgameexpansion" id="200" value="Test Expansion"/>
    <statistics page="1">
      <ratings>
        <usersrated value="1234"/>
        <average value="7.4567"/>
        <bayesaverage value="7.1"/>
        <ranks>
          <rank type="subtype" id="1" name="boardgame" friendlyname="Board Game Rank" value="1574" bayesaverage="7.1"/>
          <rank type="family" id="5" name="strategygames" friendlyname="Strategy" value="300" bayesaverage="7.2"/>
        </ranks>
        <averageweight value="2.5"/>
      </ratings>
    </statistics>
  </item>
  <item type="boardgameexpansion" id="200">
    <name type="primary" sortorder="1" value="Test Expansion"/>
    <yearpublished value="2020"/>
    <link type="boardgameexpansion" id="100" value="Test &amp; Game" inbound="true"/>
    <statistics page="1">
      <ratings>
        <usersrated value="0"/>
        <average value="0"/>
        <bayesaverage value="0"/>
        <ranks>
          <rank type="subtype" id="1" name="boardgame" friendlyname="Board Game Rank" value="Not Ranked" bayesaverage="Not Ranked"/>
        </ranks>
        <averageweight value="0"/>
      </ratings>
    </statistics>
  </item>
  <item type="boardgameaccessory" id="300"><name type="primary" value="Sleeves"/></item>
</items>`;

describe('parseBggXml', () => {
  const items = parseBggXml(xml);
  const base = items.find((i) => i.bggId === 100)!;
  const expansion = items.find((i) => i.bggId === 200)!;

  it('ignores unsupported item types', () => {
    expect(items.map((i) => i.bggId)).toEqual([100, 200]);
  });

  it('parses a base game', () => {
    expect(base).toMatchObject({
      type: 'boardgame',
      name: 'Test & Game',
      alternateNames: ['Gra Testowa'],
      year: 2019,
      minPlayers: 1,
      maxPlayers: 8,
      minPlayTime: 60,
      maxPlayTime: 120,
      minAge: 12,
      imageUrl: 'https://img.example/100.jpg',
      description: 'Line one.\n\nIt’s fun.',
    });
  });

  it('reads the player poll summary including the "recommmendedwith" typo', () => {
    expect(base.bestPlayers).toEqual([3, 4]);
    expect(base.recommendedPlayers).toEqual([1, 2, 3, 4, 5]);
  });

  it('parses statistics and the overall rank', () => {
    expect(base).toMatchObject({
      usersRated: 1234,
      rating: 7.46,
      bayesRating: 7.1,
      weight: 2.5,
      rank: 1574,
    });
  });

  it('parses links', () => {
    expect(base.categories).toEqual([{ id: 1002, name: 'Card Game' }]);
    expect(base.mechanics).toEqual([{ id: 2001, name: 'Hand Management' }]);
    expect(base.designers).toEqual(['Jane Doe']);
    expect(base.publishers).toEqual(['Pub Co']);
    expect(base.expansions).toEqual([{ bggId: 200, name: 'Test Expansion' }]);
    expect(base.baseGames).toEqual([]);
  });

  it('treats inbound expansion links as base games', () => {
    expect(expansion.type).toBe('boardgameexpansion');
    expect(expansion.baseGames).toEqual([{ bggId: 100, name: 'Test & Game' }]);
    expect(expansion.expansions).toEqual([]);
  });

  it('maps zero weight and "Not Ranked" to null', () => {
    expect(expansion.weight).toBeNull();
    expect(expansion.rank).toBeNull();
    expect(expansion.rating).toBeNull();
    expect(expansion.usersRated).toBe(0);
  });
});

describe('splitItems', () => {
  it('returns a map keyed by id with standalone documents', () => {
    const map = splitItems(xml);
    expect([...map.keys()]).toEqual([100, 200, 300]);
    const doc = map.get(200)!;
    expect(doc).toContain('<items>');
    expect(parseBggXml(doc).map((i) => i.bggId)).toEqual([200]);
  });
});
