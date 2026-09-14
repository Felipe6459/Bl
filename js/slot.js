const symbols = [
  {e:'🧙‍♀️',name:'Bruxa',value:1000},
  {e:'🔮',name:'Cristal',value:500},
  {e:'🧪',name:'Poção',value:250},
  {e:'🌙',name:'Lua',value:100},
  {e:'⭐',name:'Estrela',value:25},
  {e:'🦇',name:'Morcego',value:10},
  {e:'🐈‍⬛',name:'Gato',value:10}
];
const reelsEl=document.getElementById('reels');
const lineButtons=document.getElementById('lineButtons');
const lineCountEl=document.getElementById('lineCount');
const maxPrizeEl=document.getElementById('maxPrize');
const spinBtn=document.getElementById('spinBtn');
const resultEl=document.getElementById('result');
const paylinesEl=document.getElementById('paylines');
let lines=1;
let spinning=false;

let audioCtx=null;
let masterGain=null;
let soundEnabled=true;
let spinOsc=null;
let spinGain=null;
let spinNoise=null;
let spinNoiseGain=null;
let tickTimer=null;

function initAudio(){
  if(!soundEnabled)return;
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext)return;
  if(!audioCtx){
    audioCtx=new AudioContext();
    masterGain=audioCtx.createGain();
    masterGain.gain.value=0.16;
    masterGain.connect(audioCtx.destination);
  }
  if(audioCtx.state==='suspended')audioCtx.resume();
}

function tone(freq,duration=0.08,type='square',volume=0.08,delay=0){
  if(!soundEnabled)return;
  initAudio();
  if(!audioCtx)return;
  const now=audioCtx.currentTime+delay;
  const osc=audioCtx.createOscillator();
  const gain=audioCtx.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(freq,now);
  gain.gain.setValueAtTime(0.0001,now);
  gain.gain.exponentialRampToValueAtTime(volume,now+0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now+duration+0.02);
}

function startSpinSound(){
  if(!soundEnabled)return;
  initAudio();
  if(!audioCtx)return;
  stopSpinSound();

  // Som contínuo de máquina girando + pequenos cliques rápidos.
  spinOsc=audioCtx.createOscillator();
  spinGain=audioCtx.createGain();
  spinOsc.type='sawtooth';
  spinOsc.frequency.value=115;
  spinGain.gain.value=0.035;
  spinOsc.connect(spinGain);
  spinGain.connect(masterGain);
  spinOsc.start();

  const bufferSize=Math.floor(audioCtx.sampleRate*0.18);
  const buffer=audioCtx.createBuffer(1,bufferSize,audioCtx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<bufferSize;i++)data[i]=(Math.random()*2-1)*0.45;
  spinNoise=audioCtx.createBufferSource();
  spinNoise.buffer=buffer;
  spinNoise.loop=true;
  spinNoiseGain=audioCtx.createGain();
  spinNoiseGain.gain.value=0.025;
  spinNoise.connect(spinNoiseGain);
  spinNoiseGain.connect(masterGain);
  spinNoise.start();

  // Cliques enquanto os rolos estão passando pelos símbolos.
  tickTimer=setInterval(()=>{
    if(spinning)tone(520+Math.random()*180,0.035,'square',0.035);
  },125);
}

function stopSpinSound(){
  if(tickTimer){clearInterval(tickTimer);tickTimer=null;}
  try{if(spinOsc)spinOsc.stop();}catch(e){}
  try{if(spinNoise)spinNoise.stop();}catch(e){}
  spinOsc=null;
  spinNoise=null;
}

function playReelStops(){
  [150,185,220,255,290].forEach((f,i)=>tone(f,0.055,'square',0.06,i*0.12));
}

function playWinSound(){
  [523,659,784,1047,1319].forEach((f,i)=>tone(f,0.18,'sine',0.09,i*0.09));
  tone(1568,0.35,'sine',0.1,0.5);
}

function playNoWinSound(){tone(180,0.12,'triangle',0.045);}

function addSoundControl(){
  if(!spinBtn||document.getElementById('soundToggle'))return;
  const b=document.createElement('button');
  b.type='button';
  b.id='soundToggle';
  b.className='line-btn';
  b.style.marginTop='8px';
  b.textContent='🔊 Som ligado';
  b.addEventListener('click',()=>{
    soundEnabled=!soundEnabled;
    b.textContent=soundEnabled?'🔊 Som ligado':'🔇 Som desligado';
    if(soundEnabled)initAudio();
    else stopSpinSound();
  });
  spinBtn.parentElement?.appendChild(b);
}

for(let i=1;i<=15;i++){
  const d=document.createElement('div');
  d.className='reel';
  d.id='reel'+i;
  d.textContent=symbols[(i-1)%symbols.length].e;
  reelsEl.appendChild(d);
}

const linePatterns = [
  [1,1,1,1,1], [2,2,2,2,2], [3,3,3,3,3],
  [1,2,3,2,1], [3,2,1,2,3], [1,1,2,1,1],
  [3,3,2,3,3], [2,1,1,1,2], [2,3,3,3,2],
  [1,2,2,2,1], [3,2,2,2,3], [1,3,2,3,1]
];

function svgEl(name,attrs={}){
  const el=document.createElementNS('http://www.w3.org/2000/svg',name);
  Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
  return el;
}

function drawPaylines(winningIndexes=[]){
  if(!paylinesEl)return;
  paylinesEl.innerHTML='';
  paylinesEl.classList.remove('hidden');
  linePatterns.forEach((pattern,index)=>{
    const active=index<lines;
    const winning=winningIndexes.includes(index);
    if(!active&&!winning)return;
    const points=pattern.map((row,col)=>`${col*25+12.5},${(row-1)*50+25}`).join(' ');
    const p=svgEl('polyline',{points,class:'payline'+(active?' active':'')+(winning?' winning':'')});
    paylinesEl.appendChild(p);
    const startRow=pattern[0],endRow=pattern[4];
    const start=svgEl('circle',{cx:'5',cy:String((startRow-1)*50+25),r:'3.2',fill:winning?'#fff':'#6d28d9',stroke:'#f5c451','stroke-width':'0.8'});
    const end=svgEl('circle',{cx:'95',cy:String((endRow-1)*50+25),r:'3.2',fill:winning?'#fff':'#6d28d9',stroke:'#f5c451','stroke-width':'0.8'});
    const t1=svgEl('text',{x:'5',y:String((startRow-1)*50+25),class:'payline-label'});t1.textContent=String(index+1);
    const t2=svgEl('text',{x:'95',y:String((endRow-1)*50+25),class:'payline-label'});t2.textContent=String(index+1);
    paylinesEl.append(start,end,t1,t2);
  });
}

drawPaylines();

for(let i=1;i<=12;i++){
  const b=document.createElement('button');
  b.type='button';
  b.className='line-btn'+(i===1?' active':'');
  b.textContent=i+' linha'+(i>1?'s':'');
  b.addEventListener('click',()=>{
    if(spinning)return;
    lines=i;
    document.querySelectorAll('.line-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    updatePrize();
    drawPaylines();
    resultEl.className='result';
    resultEl.textContent=`${lines} ${lines===1?'linha':'linhas'} de pagamento ativa${lines===1?'':'s'} — as linhas douradas mostram onde pode sair prêmio.`;
  });
  lineButtons.appendChild(b);
}

function updatePrize(){
  lineCountEl.textContent=lines;
  const prize=Math.max(100,Math.round(1000/lines));
  maxPrizeEl.textContent=prize.toLocaleString('pt-BR')+' pontos';
}

function randSymbol(){return symbols[Math.floor(Math.random()*symbols.length)];}

function render(values){
  values.forEach((s,i)=>{
    const r=document.getElementById('reel'+(i+1));
    r.textContent=s.e;
  });
}

function lineIndexesFor(values){
  const wins=[];
  linePatterns.slice(0,lines).forEach((pattern,index)=>{
    const first=values[pattern[0]-1];
    let same=true;
    for(let col=1;col<5;col++){
      const symbol=values[col*3+(pattern[col]-1)];
      if(symbol.name!==first.name){same=false;break;}
    }
    if(same)wins.push(index);
  });
  return wins;
}

function createDemoWin(values){
  const demoWinChance=0.04+(lines-1)*0.012;
  if(Math.random()>demoWinChance)return false;
  const index=Math.floor(Math.random()*lines);
  const pattern=linePatterns[index];
  const symbol=randSymbol();
  pattern.forEach((row,col)=>{values[col*3+(row-1)]=symbol;});
  return true;
}

function evaluate(values){
  let wins=lineIndexesFor(values);
  if(!wins.length){
    createDemoWin(values);
    wins=lineIndexesFor(values);
  }
  if(!wins.length)return {prize:0,winName:'',wins:[]};
  const pattern=linePatterns[wins[0]];
  const first=values[pattern[0]-1];
  return {prize:Math.max(5,Math.round(first.value/lines)),winName:`Linha ${wins[0]+1} — 5 ${first.name}s`,wins};
}

async function spin(){
  if(spinning)return;
  spinning=true;
  spinBtn.disabled=true;
  resultEl.className='result';
  resultEl.textContent='Os 15 quadros estão girando...';
  paylinesEl.classList.add('hidden');
  document.querySelectorAll('.reel').forEach(r=>r.classList.remove('win'));
  document.querySelectorAll('.reel').forEach(r=>r.classList.add('spinning'));

  initAudio();
  startSpinSound();
  tone(90,0.1,'square',0.07);

  const start=Date.now();
  while(Date.now()-start<2500){
    render(Array.from({length:15},randSymbol));
    await new Promise(r=>setTimeout(r,100));
  }

  const values=Array.from({length:15},randSymbol);
  const outcome=evaluate(values);
  render(values);
  stopSpinSound();
  playReelStops();
  document.querySelectorAll('.reel').forEach(r=>r.classList.remove('spinning','win'));

  if(outcome.prize>0){
    outcome.wins.forEach(index=>{
      linePatterns[index].forEach((row,col)=>{
        const reel=document.getElementById('reel'+(col*3+row));
        if(reel)reel.classList.add('win');
      });
    });
    drawPaylines(outcome.wins);
    resultEl.className='result win-text';
    resultEl.textContent='✨ '+outcome.winName+' — '+outcome.prize.toLocaleString('pt-BR')+' pontos!';
    playWinSound();
  }else{
    paylinesEl.classList.add('hidden');
    resultEl.textContent='Não houve combinação vencedora. Tente novamente.';
    playNoWinSound();
  }
  spinBtn.disabled=false;
  spinning=false;
}

spinBtn.addEventListener('click',spin);
addSoundControl();
updatePrize();