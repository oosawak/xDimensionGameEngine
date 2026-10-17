import assert from 'node:assert/strict';
import {
  WORLD_CLOCK_STORAGE_KEY,WORLD_CLOCK_PREVIOUS_STORAGE_KEY,WORLD_CLOCK_LEGACY_STORAGE_KEY,
  createWorldClock,advanceWorldClock,worldClockSnapshot,migrateLegacyWorldClock
} from '../src/world-clock.mjs';

assert.match(WORLD_CLOCK_STORAGE_KEY,/-v3$/);
assert.match(WORLD_CLOCK_LEGACY_STORAGE_KEY,/-v1$/);
assert.match(WORLD_CLOCK_PREVIOUS_STORAGE_KEY,/-v2$/);
assert.equal(createWorldClock().minutesPerRealSecond,12);
assert.equal(createWorldClock({minutesPerRealSecond:36}).minutesPerRealSecond,36);
assert.equal(createWorldClock({minutesPerRealSecond:1000}).minutesPerRealSecond,36);
for(const rate of [0.25,1,4,8,12,18,24,36]){
  const c=createWorldClock({minuteOfDay:0,minutesPerRealSecond:rate});
  advanceWorldClock(c,1440/rate);
  assert.equal(c.day,2,`day should advance at ${rate}x`);
  assert.ok(c.minuteOfDay<0.00001,`minute should wrap at ${rate}x`);
  assert.equal(createWorldClock(worldClockSnapshot(c)).minutesPerRealSecond,rate);
}
const old={day:11,minuteOfDay:840,seasonDays:14,paused:true,minutesPerRealSecond:1};
const migrated=createWorldClock(migrateLegacyWorldClock(old));
assert.equal(migrated.minutesPerRealSecond,12);
assert.equal(migrated.day,11);
assert.equal(migrated.minuteOfDay,840);
assert.equal(migrated.seasonDays,14);
assert.equal(migrated.paused,true);
assert.equal(createWorldClock(migrateLegacyWorldClock({...old,minutesPerRealSecond:4})).minutesPerRealSecond,4);
assert.equal(createWorldClock(worldClockSnapshot(migrated)).minutesPerRealSecond,12);
console.log('time rates: PASS (12x default, 36x max, 40 seconds/day, v1 migration, save)');
