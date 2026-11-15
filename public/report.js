import { RULES_VERSION } from './core/battle.js';

/** Build a portable filename from this run, never from an ambient presentation variable. */
export function reportFilename(run){return `sparkfall-${run.seed.replace(/[^a-z0-9-]/gi,'_')}.json`;}

/** Replay data excludes the user's mailbox, currency and unrelated browser storage. */
export function runReport(run) {
  if(!run)return null;
  return {game:'sparkfall',version:RULES_VERSION,...(run.artifactCatalog?{artifactCatalog:structuredClone(run.artifactCatalog)}:{}),routeVersion:run.routeVersion,glyphVersion:run.glyphVersion,seed:run.seed,loadout:run.loadout,initialUnlocks:run.initialUnlocks,phase:run.phase,health:run.hp,floor:run.floor,artifacts:run.artifacts,stats:run.stats,decisions:run.history};
}
