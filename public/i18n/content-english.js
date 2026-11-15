export const englishContent = {
  enemy:{
    furnace:{name:'Furnace Automaton',tag:'Construct',flavor:'The fire in its chest has burned for a century. A little frost might help.',intents:[{name:'Piston Strike'},{name:'Searing Fist'},{name:'Heavy Blow'}]},
    sentinel:{name:'Brass Sentinel',tag:'Sentry',flavor:'It aims first and asks questions later. Usually, no one is left to answer.',intents:[{name:'Volley'},{name:'Charging the Cannon'},{name:'Piercing Shot'}]},
    collector:{name:'Spore Collector',tag:'Mutant',flavor:'The city forgot its name. The mushrooms paid more attention.',intents:[{name:'Spore Lash'},{name:'Mycelium Collapse'},{name:'Acid Discharge'}]},
    guardian:{name:'Armored Guardian',tag:'Construct',flavor:'Brass can stop a blade. Poison will find its way to the living heart.',intents:[{name:'Ram'},{name:'Crushing Blow'},{name:'Backstroke'}]},
    jailer:{name:'Rune Jailer',tag:'Elite',flavor:'Its chains bind aether itself. Match chained tiles to break the seal.',intents:[{name:'Chains 3 Cells'},{name:'Chain Strike'},{name:'Sentence'}]},
    alchemist:{name:'Unhinged Alchemist',tag:'Elite',flavor:'The experiment succeeded. Nobody had agreed on what success was supposed to look like.',intents:[{name:'Infects 3 Cells'},{name:'Caustic Discharge'},{name:'Flask Shards'}]},
    heart:{name:'Boiler Heart',tag:'Boss',flavor:'It once fed the Lower City. Now the city feeds it.',intents:[{name:'Reactor Hum'},{name:'Aether Discharge'},{name:'Overload'}],second:[{name:'Circuit Rupture'},{name:'Unstable Aether'},{name:'Final Pulse'}]},
  },
  loadout:{
    coil:{name:'Cascade Engineer',subtitle:'Chain reactions'},
    thermal:{name:'Thermal Engineer',subtitle:'Frost → Fire'},
    needle:{name:'Toxicologist',subtitle:'Blades + Poison'},
  },
  achievement:{
    first_blood:{name:'First Dismantling',text:'Win your first battle.'},
    chain_reaction:{name:'Chain Reaction',text:'Trigger 3 match waves in one action.'},
    venom:{name:'Delayed Reaction',text:'Defeat an enemy with Poison damage.'},
    spectrum:{name:'Full Spectrum',text:'Match 4 tile types in one action.'},
    elite:{name:'Protocol Breaker',text:'Defeat an elite enemy.'},
    boss:{name:'Silence in the Boiler House',text:'Stop the Boiler Heart.'},
  },
  event:{
    experiment:{name:'Unfinished Experiment',text:'A flask of living aether trembles on the table. A note in the margin promises a discovery. The author’s signature trails off.',choices:[{id:'study',name:'Finish the experiment',text:'−8 health · +4 sparks · storm advances by 1'},{id:'leave',name:'Leave it alone',text:'Walk away without consequences'}]},
    workshop:{name:'Blind Artisan',text:'The artisan sorts gears by touch. He can mend your circuit, or teach you something useful.',choices:[{id:'repair',name:'Repair the circuit',text:'+12 health · storm advances by 2'},{id:'learn',name:'Study the blueprint',text:'+3 sparks · storm advances by 1'}]},
    fountain:{name:'Aether Spring',text:'Pure aether glows between the paving stones. You could restore your strength. Or leave before the storm finds it.',choices:[{id:'drink',name:'Restore your strength',text:'+16 health · storm advances by 2'},{id:'hurry',name:'Hurry on',text:'+1 distance away from the storm'}]},
    rest:{name:'Quiet Workshop',text:'A protective circuit still holds here. The Boiler House is close. Decide what you need more: health or time.',choices:[{id:'rest',name:'Catch your breath',text:'+20 health · storm advances by 2'},{id:'hurry',name:'Keep moving',text:'+1 distance away from the storm'}]},
    ashCaravan:{name:'Ashen Caravan',text:'The wrecked wagon hangs together by its last few runes. A drive still turns in the ash. Caravan markers point toward the storm’s edge.',choices:[{id:'salvage',name:'Salvage the drive',text:'−6 health · storm advances by 1 · gain Overdrive'},{id:'markers',name:'Follow the markers',text:'+2 distance away from the storm'}]},
    groundTower:{name:'Grounding Tower',text:'Lightning is trapped in a copper lattice. Light the beacon to find the front, or harvest the energy before the storm swallows the tower.',choices:[{id:'beacon',name:'Light the beacon',text:'−6 health · +3 distance away from the storm'},{id:'condensate',name:'Collect the condensate',text:'+4 sparks · storm advances by 2'}]},
  },
};
