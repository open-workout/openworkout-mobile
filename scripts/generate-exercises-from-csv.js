// One-off generator: chisels assets/exercises/exercises.csv into
// app/constants/exercisesCsv.json, which app/_layout.tsx seeds into SQLite.
// Re-run this script (`node scripts/generate-exercises-from-csv.js`) any time
// the source CSV changes.
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'assets', 'exercises', 'exercises.csv');
const OUT_PATH = path.join(__dirname, '..', 'app', 'constants', 'exercisesCsv.json');

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

function bodyPartToMuscle(part, target) {
  const p = part.trim();
  if (!p) return null;
  if (p === 'Hips') return 'glutes';
  if (p === 'Waist') return 'abs';
  if (p === 'Upper Arms') {
    const firstWord = target.trim().split(/[\s,]+/)[0] ?? '';
    return firstWord === 'Triceps' ? 'triceps' : 'biceps';
  }
  if (p === 'Thighs') {
    if (/Hamstring/i.test(target)) return 'hamstrings';
    if (/Adductor/i.test(target)) return 'adductors';
    if (/Gluteus/i.test(target)) return 'glutes';
    return 'quads';
  }
  return p.toLowerCase();
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
  const muscles = parts.map((p) => bodyPartToMuscle(p, target)).filter(Boolean);
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
