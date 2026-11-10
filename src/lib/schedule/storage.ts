import { SCHEDULE_PLAN_KEY } from '@/config/schedule';
import { parsePlan, type WeekPlan } from './plan';

export function loadPlan(): WeekPlan {
  try {
    return parsePlan(localStorage.getItem(SCHEDULE_PLAN_KEY));
  } catch {
    return parsePlan(null); // storage zablokowany – zaczynamy od pustego rozkładu
  }
}

/** `false` = nie udało się zapisać (storage zablokowany albo pełny, np. przez duże obrazki). */
export function savePlan(plan: WeekPlan): boolean {
  try {
    localStorage.setItem(SCHEDULE_PLAN_KEY, JSON.stringify(plan));
    return true;
  } catch {
    return false;
  }
}
