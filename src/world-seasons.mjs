/** xDimension: a small deterministic 4-season calendar and NPC daily schedule. */
export const SEASON_KEYS=['spring','summer','autumn','winter'];
export const SEASON_LABELS={spring:'春',summer:'夏',autumn:'秋',winter:'冬'};
export const SEASON_PALETTES={
 spring:{grass:'#73986b',meadow:'#709879',leaf:'#588d62',leaf2:'#79a06c',sunrise:6,sunset:18,tint:'#a6c3e3'},
 summer:{grass:'#58875b',meadow:'#58805b',leaf:'#366a48',leaf2:'#518054',sunrise:5,sunset:19,tint:'#92bcd1'},
 autumn:{grass:'#998661',meadow:'#9a855d',leaf:'#b87943',leaf2:'#c99a4f',sunrise:6,sunset:18,tint:'#c3a995'},
 winter:{grass:'#a3aea4',meadow:'#b4bfbd',leaf:'#93a8a3',leaf2:'#bdc5c1',sunrise:7,sunset:17,tint:'#acbecd'}
};
export function seasonAtDay(day,daysPerSeason=1){
 const n=Number.isFinite(+day)?Math.max(1,Math.floor(+day)):1;
 const d=Number.isFinite(+daysPerSeason)?Math.max(1,Math.min(365,Math.floor(+daysPerSeason))):1;
 const cycle=(n-1)%(4*d);
 const idx=Math.floor(cycle/d);
 const key=SEASON_KEYS[idx];
 return {key,label:SEASON_LABELS[key],year:Math.floor((n-1)/(4*d))+1,dayInSeason:cycle%d+1,daysPerSeason:d,seasonIndex:idx,palette:SEASON_PALETTES[key]};
}
export function sunlightAtHour(hour,seasonKey='spring'){
 const s=SEASON_PALETTES[seasonKey]||SEASON_PALETTES.spring;
 const h=Number.isFinite(+hour)?Math.max(0,Math.min(24,+hour)):12;
 const fade=Math.min(1.5,(s.sunset-s.sunrise)*.15);
 const dayFactor=Math.max(0,Math.min(1,(h-s.sunrise)/fade,(s.sunset-h)/fade));
 const twilight=Math.max(0,1-Math.min(Math.abs(h-s.sunrise),Math.abs(h-s.sunset))/1.9);
 return {dayFactor,twilight,sunrise:s.sunrise,sunset:s.sunset};
}
export function npcSchedule(minuteOfDay){
 const minute=Math.min(1439.999,Math.max(0,Number(minuteOfDay)||0));
 // Day: walk around the village, dusk: walk toward home, night: inside.
 if(minute<7*60||minute>=19*60)return {state:'home',progress:0,visible:false};
 if(minute<8*60)return {state:'leaving',progress:(minute-420)/60,visible:true};
 if(minute<17*60)return {state:'walking',progress:(minute-480)/(9*60),visible:true};
 return {state:'returning',progress:(minute-1020)/120,visible:true};
}
export function npcPosition(home,work,minuteOfDay,phaseOffset=0){
 const state=npcSchedule(minuteOfDay);
 let progress=0;
 if(state.state==='leaving')progress=state.progress;
 if(state.state==='returning')progress=1-state.progress;
 if(state.state==='walking')progress=.6+.4*Math.cos(state.progress*4*Math.PI+Math.sin(Math.PI*state.progress)*phaseOffset);
 progress=Math.max(0,Math.min(1,progress));
 return {x:home.x+(work.x-home.x)*progress,z:home.z+(work.z-home.z)*progress,visible:state.visible,state:state.state};
}
