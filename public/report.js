import { RULES_VERSION } from './core/battle.js';

/** Replay data excludes the user's mailbox, currency and unrelated browser storage. */
export function runReport(run) {
  if(!run)return null;
  return {game:'sparkfall',version:RULES_VERSION,routeVersion:run.routeVersion,seed:run.seed,loadout:run.loadout,initialUnlocks:run.initialUnlocks,phase:run.phase,health:run.hp,floor:run.floor,artifacts:run.artifacts,stats:run.stats,decisions:run.history};
}
