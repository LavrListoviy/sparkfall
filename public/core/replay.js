import { LEGACY_ARTIFACTS } from './legacy-artifacts.js';
import { catalogErrors } from './artifact-schema.js';
import { RULES_VERSION } from './battle.js';
import { createSession, startRun, enterNode, battleAction, chooseReward, chooseEvent, abandonRun } from './run.js';

/** Replay exported decisions through the same reducers, rejecting impossible transitions. */
export function replayReport(report) {
  if(![RULES_VERSION,'0.3.0','0.4.0','0.5.0','0.6.0'].includes(report?.version))throw new Error(`Unsupported rules version; expected ${RULES_VERSION}`);
  if(report.game!=='sparkfall'||typeof report.seed!=='string'||!Array.isArray(report.initialUnlocks)||!Array.isArray(report.decisions)||report.decisions.length>10000)throw new Error('Invalid expedition report');
  if(report.version===RULES_VERSION&&!report.artifactCatalog)throw new Error('Missing artifact catalog');
  const artifactCatalog=report.artifactCatalog??LEGACY_ARTIFACTS;
  if(catalogErrors({schema:1,items:artifactCatalog}).length)throw new Error('Invalid artifact catalog');
  const initial=createSession(); initial.profile.unlocked=[...report.initialUnlocks];
  let session=startRun(initial,report.seed,report.loadout,{artifactCatalog,routeVersion:report.routeVersion ?? (report.version==='0.3.0'?1:report.version==='0.4.0'?2:3),glyphVersion:[RULES_VERSION,'0.6.0'].includes(report.version)?(report.glyphVersion??1):0});
  if(!session.run)throw new Error('Unavailable starting loadout');
  for(const [index,decision] of report.decisions.entries()){
    const next=decision.type==='enter'?enterNode(session,decision.id)
      :decision.type==='battle'?battleAction(session,decision.action)
      :decision.type==='reward'?chooseReward(session,decision.id)
      :decision.type==='event'?chooseEvent(session,decision.id)
      :decision.type==='abandon'?abandonRun(session):session;
    if(next===session)throw new Error(`Invalid decision ${index+1}: ${decision.type}`);
    session=next;
  }
  return session;
}
