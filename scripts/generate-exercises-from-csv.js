// One-off generator: chisels assets/exercises/exercises.csv into
// constants/exercisesCsv.json, which app/_layout.tsx seeds into SQLite.
// Re-run this script (`node scripts/generate-exercises-from-csv.js`) any time
// the source CSV changes.
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'assets', 'exercises', 'exercises.csv');
const OUT_PATH = path.join(__dirname, '..', 'constants', 'exercisesCsv.json');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      // skip
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const raw = fs.readFileSync(CSV_PATH, 'utf8');
const [header, ...rows] = parseCsv(raw).filter((r) => r.length > 1 || r[0] !== '');
const col = (row, name) => row[header.indexOf(name)] ?? '';

const WEIGHTED_EQUIPMENT = new Set([
  'dumbbell', 'barbell', 'cable', 'leverage-machine', 'kettlebell', 'weighted',
  'smith-machine', 'ez-barbell', 'medicine-ball', 'sled-machine', 'power-sled',
  'trap-bar', 'olympic-barbell', 'hammer',
]);

const ASSISTED_PATTERN = /assisted/i;

function slugifyEquipment(raw) {
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean);
}

// Maps a single raw anatomical name, as it appears in the CSV's Target
// column (e.g. "Adductor Longus", "Deltoid Posterior"), onto our simplified
// muscle vocabulary. Returns null for anything unrecognized (e.g. the
// occasional truncated/malformed Target entry in the source data) rather
// than guessing.
function targetNameToMuscle(rawTarget) {
  const t = rawTarget.trim();
  if (/Hamstring/i.test(t)) return 'hamstrings';
  if (/Adductor/i.test(t) || t === 'Gracilis' || t === 'Pectineous') return 'adductors';
  if (/Gluteus/i.test(t)) return 'glutes';
  if (/Quadricep/i.test(t) || t === 'Sartorius' || t === 'Tensor Fasciae Latae') return 'quads';
  if (/Gastrocnemius|Soleus/i.test(t)) return 'calves';
  if (/Deltoid|Infraspinatus|Teres Major|Teres Minor/i.test(t)) return 'shoulders';
  if (/Trapezius|Latissimus Dorsi|Erector Spinae/i.test(t)) return 'back';
  if (/Biceps Brachii|Brachialis|Brachioradialis/i.test(t)) return 'biceps';
  if (/Triceps Brachii/i.test(t)) return 'triceps';
  if (/Pectoralis|Serratus Anterior/i.test(t)) return 'chest';
  if (/Obliques|Rectus Abdominis|Iliopsoas/i.test(t)) return 'abs';
  if (/Splenius/i.test(t)) return 'neck';
  return null;
}

// Thighs/Hips rows list every worked muscle in Target (e.g. "Gluteus
// Maximus, Quadriceps" for a compound lift) rather than one dominant
// muscle, so all of them count as primary muscles instead of picking just
// one via a priority heuristic. Falls back to `fallback` when Target is
// empty (quads for Thighs, glutes for Hips).
function musclesFromTarget(target, fallback) {
  const items = target.trim().split(',').map((s) => s.trim()).filter(Boolean);
  const muscles = items.map(targetNameToMuscle).filter(Boolean);
  return muscles.length > 0 ? muscles : [fallback];
}

function bodyPartToMuscle(part, target) {
  const p = part.trim();
  if (!p) return [];
  if (p === 'Hips') return musclesFromTarget(target, 'glutes');
  if (p === 'Waist') return ['abs'];
  if (p === 'Upper Arms') {
    const firstWord = target.trim().split(/[\s,]+/)[0] ?? '';
    return [firstWord === 'Triceps' ? 'triceps' : 'biceps'];
  }
  if (p === 'Thighs') return musclesFromTarget(target, 'quads');
  return [p.toLowerCase()];
}

const MALE_FEMALE_PATTERN = /\(\s*(male|female)\s*\)/gi;

function cleanName(name) {
  return name.replace(MALE_FEMALE_PATTERN, '').replace(/\s+/g, ' ').trim();
}

function humanReadableId(name) {
  return name.replace(/\([^)]*\)/g, '').replace(/[^a-zA-Z0-9]/g, '');
}

function primaryMusclesFor(bodyPart, target) {
  const parts = bodyPart.split(',').map((s) => s.trim()).filter(Boolean);
  const muscles = parts.flatMap((p) => bodyPartToMuscle(p, target));
  return Array.from(new Set(muscles));
}

const seen = new Set();
const exercises = [];

for (const row of rows) {
  const csvId = col(row, 'ID').trim();
  const name = cleanName(col(row, 'Name'));
  const exerciseType = col(row, 'Exercise type').trim();
  const bodyPart = col(row, 'BodyPart').trim();
  const equipmentRaw = col(row, 'Equipment').trim();
  const target = col(row, 'Target').trim();

  if (!exerciseType) continue; // not a real exercise (anatomy diagram, pose, measurement chart, ...)

  const key = name.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);

  const equipment = slugifyEquipment(equipmentRaw);
  const requiresWeight = equipment.some((e) => WEIGHTED_EQUIPMENT.has(e));

  const canBeDoneInReps = exerciseType !== 'Stretching';
  const canBeDoneInTime = true;
  const canBeDoneInDistance = exerciseType === 'Aerobic' && bodyPart === 'Cardio';

  exercises.push({
    csvId,
    name,
    humanReadableId: humanReadableId(name),
    primaryMuscles: primaryMusclesFor(bodyPart, target),
    secondaryMuscles: [],
    equipment,
    canBeDoneInReps,
    canBeDoneInTime,
    canBeDoneInDistance,
    requiresWeight,
    weightDirection: ASSISTED_PATTERN.test(name) ? -1 : 1,
  });
}

fs.writeFileSync(OUT_PATH, JSON.stringify(exercises, null, 2) + '\n');
console.log(`Wrote ${exercises.length} exercises to ${path.relative(process.cwd(), OUT_PATH)}`);
