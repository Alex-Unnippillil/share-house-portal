import { PGlite } from '@electric-sql/pglite';
import { performance } from 'node:perf_hooks';

const TOTAL_AMENITIES = 10;
const SLOTS_PER_AMENITY = 10_000;
const SLOT_DURATION_MINUTES = 30;
const TOTAL_ROWS = TOTAL_AMENITIES * SLOTS_PER_AMENITY;

const amenities = Array.from({ length: TOTAL_AMENITIES }, (_, index) => `amenity-${index + 1}`);
const baseTimestamp = Date.parse('2025-01-01T00:00:00Z');

const db = new PGlite();

await db.query(`
  CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    amenity_id TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL
  );
`);

const chunkSize = 1_000;
for (let offset = 0; offset < TOTAL_ROWS; offset += chunkSize) {
  const rowsInChunk = Math.min(chunkSize, TOTAL_ROWS - offset);
  const values = [];
  const placeholders = [];

  for (let i = 0; i < rowsInChunk; i++) {
    const globalIndex = offset + i;
    const amenityIndex = Math.floor(globalIndex / SLOTS_PER_AMENITY);
    const slotIndex = globalIndex % SLOTS_PER_AMENITY;
    const amenityId = amenities[amenityIndex];
    const start = new Date(baseTimestamp + slotIndex * SLOT_DURATION_MINUTES * 60 * 1000);
    const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

    values.push(`booking-${globalIndex}`, amenityId, start.toISOString(), end.toISOString());
    const placeholderOffset = i * 4;
    placeholders.push(
      `($${placeholderOffset + 1}, $${placeholderOffset + 2}, $${placeholderOffset + 3}, $${placeholderOffset + 4})`
    );
  }

  await db.query(
    `INSERT INTO bookings (id, amenity_id, start_time, end_time) VALUES ${placeholders.join(', ')}`,
    values
  );
}

await db.query('ANALYZE bookings;');

async function benchmark(iterations) {
  const durations = [];

  for (let i = 0; i < iterations; i++) {
    const amenityId = amenities[i % amenities.length];
    const slotIndex = Math.floor(Math.random() * SLOTS_PER_AMENITY);
    const start = new Date(baseTimestamp + slotIndex * SLOT_DURATION_MINUTES * 60 * 1000);
    const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

    const t0 = performance.now();
    await db.query(
      'SELECT id FROM bookings WHERE amenity_id = $1 AND start_time < $3 AND end_time > $2 LIMIT 1',
      [amenityId, start.toISOString(), end.toISOString()]
    );
    const t1 = performance.now();
    durations.push(t1 - t0);
  }

  durations.sort((a, b) => a - b);

  const sum = durations.reduce((acc, value) => acc + value, 0);
  const average = sum / durations.length;
  const min = durations[0];
  const max = durations[durations.length - 1];
  const p90Index = Math.floor(0.9 * durations.length);
  const p90 = durations[Math.min(p90Index, durations.length - 1)];

  return { average, min, max, p90 };
}

const baseline = await benchmark(25);

await db.query('CREATE INDEX idx_bookings_amenity_time_range ON bookings (amenity_id, start_time, end_time);');
await db.query('ANALYZE bookings;');

const optimized = await benchmark(25);

console.log('Amenity bookings conflict benchmark (100k rows)');
console.table([
  {
    phase: 'Before index',
    averageMs: baseline.average.toFixed(3),
    p90Ms: baseline.p90.toFixed(3),
    maxMs: baseline.max.toFixed(3),
  },
  {
    phase: 'After composite index',
    averageMs: optimized.average.toFixed(3),
    p90Ms: optimized.p90.toFixed(3),
    maxMs: optimized.max.toFixed(3),
  },
]);

if (optimized.max > 10) {
  console.warn(`Warning: optimized conflict checks exceeded 10ms target (max ${optimized.max.toFixed(3)}ms).`);
}

await db.close();
