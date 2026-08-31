/**
 * §4.2 enums. Values are stable identifiers stored in `daily_logs`; display labels always
 * come from the string table (§4.2 — never render the raw value).
 */
import { en } from '../i18n/en';

export const FLOW_LEVELS = ['none', 'spotting', 'light', 'medium', 'heavy'] as const;
export type FlowLevel = (typeof FLOW_LEVELS)[number];

export const MOODS = [
  'happy',
  'calm',
  'energetic',
  'sad',
  'anxious',
  'irritable',
  'sensitive',
  'low_energy',
] as const;
export type Mood = (typeof MOODS)[number];

export const SYMPTOMS = [
  'cramps',
  'headache',
  'backache',
  'bloating',
  'breast_tenderness',
  'acne',
  'nausea',
  'fatigue',
  'cravings',
  'constipation',
  'diarrhea',
  'insomnia',
  'dizziness',
  'spotting_between',
] as const;
export type Symptom = (typeof SYMPTOMS)[number];

/**
 * §6.4 — symptoms are laid out loosely grouped (pain / body / digestion) but without visible
 * group headers. This order drives the chip layout.
 */
export const SYMPTOMS_ORDERED: readonly Symptom[] = [
  'cramps',
  'headache',
  'backache',
  'bloating',
  'breast_tenderness',
  'acne',
  'fatigue',
  'insomnia',
  'dizziness',
  'nausea',
  'cravings',
  'constipation',
  'diarrhea',
  'spotting_between',
];

export const flowLabel = (value: FlowLevel): string => en[`flow_${value}`];
export const moodLabel = (value: Mood): string => en[`mood_${value}`];
export const symptomLabel = (value: Symptom): string => en[`symptom_${value}`];
