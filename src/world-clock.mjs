/** xDimension Game Engine: deterministic game-time service (no DOM or THREE dependency). */
export const WORLD_CLOCK_STORAGE_KEY='xdimension-game-engine-world-clock-v3'
export const WORLD_CLOCK_PREVIOUS_STORAGE_KEY='xdimension-game-engine-world-clock-v2';
export const WORLD_CLOCK_LEGACY_STORAGE_KEY='xdimension-game-engine-world-clock-v1';
const DAY_MINUTES=1440;
const RATE_MIN=.1;
const RATE_MAX=36;
function finite(value,fallback){const v=Number(value);return Number.isFinite(v)?v:fallback;}
export function createWorldClock(options={}){
  const rawDay=Math.floor(finite(options.day,1));
  const day=Math.max(1,Math.min(999999,rawDay));
  const minuteOfDay=Math.max(0,Math.min(DAY_MINUTES-0.000001,finite(options.minuteOfDay,1020)));
  const minutesPerRealSecond=Math.max(RATE_MIN,Math.min(RATE_MAX,finite(options.minutesPerRealSecond,12)));
  const seasonDays=Math.max(1,Math.min(365,Math.floor(finite(options.seasonDays,1))));
  return {day,minuteOfDay,minutesPerRealSecond,paused:Boolean(options.paused),seasonDays};
}
export function worldClockPhase(clock){
  const h=clock.minuteOfDay/60;
  if(h>=5&&h<8)return 'dawn';
  if(h>=8&&h<18)return 'day';
  if(h>=18&&h<21)return 'dusk';
  return 'night';
}
export function worldClockLabel(clock){
  const m=Math.floor(clock.minuteOfDay+1e-7);
  return `Day ${clock.day} · ${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
}
export function advanceWorldClock(clock,deltaSeconds){
  const prevMinute=Math.floor(clock.minuteOfDay);
  const previousDay=clock.day;
  const prevPhase=worldClockPhase(clock);
  const elapsed=Math.max(0,finite(deltaSeconds,0));
  if(!clock.paused&&elapsed>0){
    const total=clock.minuteOfDay+elapsed*clock.minutesPerRealSecond;
    const additionalDays=Math.floor(total/DAY_MINUTES);
    clock.day=Math.min(999999,clock.day+additionalDays);
    clock.minuteOfDay=total%DAY_MINUTES;
  }
  return {minuteChanged:Math.floor(clock.minuteOfDay)!==prevMinute||clock.day!==previousDay,
    dayChanged:clock.day!==previousDay,phaseChanged:worldClockPhase(clock)!==prevPhase};
}
export function seekWorldClock(clock,minute){
  const next=finite(minute,clock.minuteOfDay);
  clock.minuteOfDay=((next%DAY_MINUTES)+DAY_MINUTES)%DAY_MINUTES;
  return clock;
}
export function worldClockSnapshot(clock){
  return {day:clock.day,minuteOfDay:clock.minuteOfDay,minutesPerRealSecond:clock.minutesPerRealSecond,paused:clock.paused,seasonDays:clock.seasonDays};
}

/** One-time upgrade from pre-v0.0.8 saves. Previous 1x default becomes 12x.
 *  All other chosen rates and the calendar, pause and date are retained. */
export function migrateLegacyWorldClock(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  return {...value,minutesPerRealSecond:Number(value.minutesPerRealSecond)===1?12:value.minutesPerRealSecond};
}

/** First v0.0.11 load: old default 7 days becomes new default 1 day.
 * Other previously selected periods retain their value.
 * Preserve day, time, rate, and pause while migrating. */
export function migratePreviousSeasonClock(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  return {...value,seasonDays:Number(value.seasonDays)===7?1:value.seasonDays};
}
