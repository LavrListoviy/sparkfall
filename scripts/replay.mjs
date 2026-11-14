import { readFile } from 'node:fs/promises';
import { replayReport } from '../public/core/replay.js';

const path=process.argv[2];
if(!path){console.error('Usage: npm run replay -- path/to/report.json');process.exitCode=1;}
else{
  try{
    const report=JSON.parse(await readFile(path,'utf8'));
    const {run}=replayReport(report);
    console.log(JSON.stringify({seed:run.seed,phase:run.phase,floor:run.floor,hp:run.hp,artifacts:run.artifacts,decisions:run.history.length,stats:run.stats},null,2));
    if(report.health!==undefined && report.health!==run.hp)throw new Error('Replay health differs from the report');
    if(report.phase!==undefined && report.phase!==run.phase)throw new Error('Replay phase differs from the report');
  }catch(error){console.error(error.message);process.exitCode=1;}
}
