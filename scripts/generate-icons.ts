/**
 * Generates favicons, PWA/touch icons and the default OG image into `public/`
 * from the logos in `src/assets/brand/`.
 *
 * One-off script: re-run only when the logo files change.
 *   pnpm exec tsx scripts/generate-icons.ts
 *
 * Idempotent: outputs are fully overwritten on every run.
 * `site.webmanifest` is intentionally not generated (needs base-path aware URLs).
 */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const logoDark = `${root}src/assets/brand/bgp_grota.png`;
const logoWhite = `${root}src/assets/brand/bgp_grota_white.png`;
const outDir = `${root}public`;

const PAPER = '#f6f1e7';
const INK = '#1b1916';

interface IconSpec {
  file: string;
  width: number;
  height: number;
  /** Fraction of the canvas the logo may occupy (fit: contain). */
  scale: number;
  background: string;
  logo: string;
}

async function render({ file, width, height, scale, background, logo }: IconSpec): Promise<void> {
  const logoBuffer = await sharp(logo)
    .resize({
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({ create: { width, height, channels: 4, background } })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toFile(`${outDir}/${file}`);

  console.log(`created public/${file} (${width}x${height})`);
}

const square = (file: string, size: number, scale: number): IconSpec => ({
  file,
  width: size,
  height: size,
  scale,
  background: PAPER,
  logo: logoDark,
});

const specs: IconSpec[] = [
  square('favicon-16.png', 16, 0.92),
  square('favicon-32.png', 32, 0.92),
  square('favicon-48.png', 48, 0.92),
  square('apple-touch-icon.png', 180, 0.76),
  square('icon-192.png', 192, 0.76),
  square('icon-512.png', 512, 0.76),
  // Maskable: logo kept inside the central 80% safe zone.
  square('icon-maskable-512.png', 512, 0.6),
  {
    file: 'og-default.png',
    width: 1200,
    height: 630,
    scale: 0.7,
    background: INK,
    logo: logoWhite,
  },
];

await mkdir(outDir, { recursive: true });
for (const spec of specs) {
  await render(spec);
}
