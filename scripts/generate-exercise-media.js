// One-off generator: scans the (gitignored) assets/exercises/media/ folder
// and chisels it into app/constants/exerciseMedia.generated.ts, a map of
// humanReadableId -> require() calls that Metro can statically bundle.
// Re-run this script (`node scripts/generate-exercise-media.js`) any time
// files are added to or removed from assets/exercises/media/.
const fs = require('fs');
const path = require('path');

const MEDIA_DIR = path.join(__dirname, '..', 'assets', 'exercises', 'media');
const THUMBNAILS_DIR = path.join(MEDIA_DIR, 'thumbnails');
const ANIMATIONS_DIR = path.join(MEDIA_DIR, 'animations');
const OUT_PATH = path.join(__dirname, '..', 'app', 'constants', 'exerciseMedia.generated.ts');
const REQUIRE_PREFIX = '../../assets/exercises/media';

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith('.'))
    .sort();
}

function buildMap(dir, subfolder) {
  const entries = listFiles(dir).map((file) => {
    const [csvId] = file.split('-');
    const requirePath = `${REQUIRE_PREFIX}/${subfolder}/${file}`;
    return `  '${csvId}': require('${requirePath}'),`;
  });
  return entries.join('\n');
}

const thumbnails = buildMap(THUMBNAILS_DIR, 'thumbnails');
const animations = buildMap(ANIMATIONS_DIR, 'animations');

const output = `// GENERATED FILE - do not edit by hand.
// Run \`node scripts/generate-exercise-media.js\` to regenerate after adding
// or removing files in assets/exercises/media/.
// Keyed by the exercise's csvId (see app/constants/exercisesCsv.json), taken
// from the leading "<csvId>-..." segment of each filename.

export const EXERCISE_THUMBNAILS: Record<string, number> = {
${thumbnails}
};

export const EXERCISE_ANIMATIONS: Record<string, number> = {
${animations}
};
`;

fs.writeFileSync(OUT_PATH, output);
const thumbCount = listFiles(THUMBNAILS_DIR).length;
const animCount = listFiles(ANIMATIONS_DIR).length;
console.log(
  `Wrote ${thumbCount} thumbnails and ${animCount} animations to ${path.relative(process.cwd(), OUT_PATH)}`
);
