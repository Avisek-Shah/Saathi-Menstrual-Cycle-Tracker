// SPEC: pure prediction per §5; takes Period[] + settings + today (string)
export type Confidence = 'low' | 'medium' | 'high';
export interface Prediction {
  avgCycleLength: number; avgPeriodLength: number; nextPeriodStart: string;
  nextPeriodEnd: string; predictionWindow: number; ovulationDate: string;
  fertileStart: string; fertileEnd: string; confidence: Confidence;
  isIrregular: boolean; cyclesUsed: number;
}

function roundClamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, Math.round(n))); }

export function predict(periods: { start_date:string; cycle_length:number|null; length_days:number; is_outlier:boolean }[], settings: { reported_cycle_length:number; reported_period_length:number; birth_year?:number }, today: string): Prediction {
  // Non-outlier cycles only, newest first
  const nonOutlier = periods.filter(p => !p.is_outlier && p.cycle_length !== null).reverse();
  const last6 = nonOutlier.slice(0, 6);
  const weights = [6,5,4,3,2,1];
  const avgCycle = last6.length ? roundClamp(last6.reduce((s,p,i) => s + (p.cycle_length! * weights[i]), 0) / weights.slice(0, last6.length).reduce((a,b)=>a+b,0), 21, 45) : settings.reported_cycle_length;
  const avgPeriod = last6.length ? roundClamp(last6.reduce((s,p,i) => s + (p.length_days * weights[i]), 0) / weights.slice(0, last6.length).reduce((a,b)=>a+b,0), 1, 10) : settings.reported_period_length;
  const cyclesUsed = last6.length;
  const lastPeriodStart = periods.filter(p => p.start_date <= today).pop()?.start_date || today;
  const nextPeriodStart = addDays(lastPeriodStart, avgCycle);
  const nextPeriodEnd = addDays(nextPeriodStart, avgPeriod - 1);
  const ovulationDate = addDays(nextPeriodStart, -14);
  const fertileStart = addDays(ovulationDate, -5);
  const fertileEnd = addDays(ovulationDate, 1);
  // Confidence (§5.4)
  let confidence: Confidence = 'low';
  if (cyclesUsed >= 4 && !isIrregular(last6)) confidence = 'high';
  else if (cyclesUsed >= 2) confidence = 'medium';
  else confidence = 'low';
  // Irregular (§5.5)
  const isIrregular = checkIrregular(last6, periods);
  // Window (§5.5)
  let window = (confidence === 'high') ? 1 : confidence === 'medium' ? 3 : 5;
  if (isIrregular) window = Math.min(7, window + 2);
  return { avgCycleLength: avgCycle, avgPeriodLength: avgPeriod, nextPeriodStart, nextPeriodEnd, predictionWindow: window, ovulationDate, fertileStart, fertileEnd, confidence, isIrregular, cyclesUsed };
}

function isIrregular(last6: any[], all: any[]): boolean {
  if (last6.length < 2) return false;
  const len = last6.map(p => p.cycle_length!).sort((a,b)=>a-b);
  const min = len[0], max = len[len.length-1];
  const mean = len.reduce((a,b)=>a+b,0)/len.length;
  const sd = Math.sqrt(len.reduce((sum,v)=>sum + (v-mean)**2, 0) / len.length);
  if (sd > 7) return true;
  if (max - min >= 9) return true;
  const last3 = all.slice(-3);
  if (last3.some(p => p.is_outlier)) return true;
  return false;
}

function addDays(s: string, n: number): string {
  const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
