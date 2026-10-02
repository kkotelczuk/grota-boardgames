"""
Jednorazowe odchudzenie fontów z @fontsource-variable (wynik commitowany w src/assets/fonts/).

Dlaczego: pełne pliki latin + latin-ext Inter i Fraunces to ~200 KB i były na ścieżce krytycznej
LCP strony głównej. Zostawiamy:
  - oś wagi 400–700 (używamy tylko 400/500/600/700),
  - z latin-ext tylko Latin Extended-A (U+0100–017F: ą ć ę ł ń ś ź ż + litery z nazwisk autorów),
  - latin bez zmian zakresu.

Uruchomienie (wymaga: pip install fonttools brotli):
    python3 scripts/subset-fonts.py
"""

from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src/assets/fonts"

FONTS = {
    "inter": ROOT / "node_modules/@fontsource-variable/inter/files/inter-{subset}-wght-normal.woff2",
    "fraunces": ROOT / "node_modules/@fontsource-variable/fraunces/files/fraunces-{subset}-wght-normal.woff2",
}

# Zakresy zgodne z unicode-range w src/styles/global.css.
SUBSETS = {
    "latin": "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD",
    "latin-ext": "U+0100-0130,U+0132-0151,U+0154-017F",
}


def parse_ranges(spec: str) -> list[int]:
    codepoints: list[int] = []
    for part in spec.split(","):
        part = part.strip().removeprefix("U+")
        start, _, end = part.partition("-")
        codepoints.extend(range(int(start, 16), int(end or start, 16) + 1))
    return codepoints


for family, pattern in FONTS.items():
    for subset, ranges in SUBSETS.items():
        source = Path(str(pattern).format(subset=subset))
        font = TTFont(source, lazy=False)

        options = Options()
        options.flavor = "woff2"
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        subsetter = Subsetter(options)
        subsetter.populate(unicodes=parse_ranges(ranges))
        subsetter.subset(font)
        # Instancer po subsetowaniu – odwrotna kolejność gubi spójność tabeli gvar.
        font = instantiateVariableFont(font, {"wght": (400, 700)})

        target = OUT / f"{family}-{subset}.woff2"
        target.parent.mkdir(parents=True, exist_ok=True)
        font.flavor = "woff2"
        font.save(target)
        print(f"{target.relative_to(ROOT)}: {source.stat().st_size // 1024} KB → {target.stat().st_size // 1024} KB")
