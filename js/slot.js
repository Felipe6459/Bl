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
let lines=1;
let spinning=false;

for(let i=1;i<=5;i++){
  const d=document.createElement('div'); d.className='reel'; d.id='reel'+i; d.textContent=symbols[0].e; reelsEl.appendChild(d);
}
for(let i=1;i<=12;i++){
  const b=document.createElement('button'); b.type='button'; b.className='line-btn'+(i===1?' active':''); b.textContent=i+' linha'+(i>1?'s':'');
  b.addEventListener('click',()=>{ if(spinning)return; lines=i; document.querySelectorAll('.line-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); updatePrize(); });
  lineButtons.appendChild(b);
}
function updatePrize(){
  lineCountEl.textContent=lines;
  // Mais linhas = prêmio máximo menor, conforme o modelo descrito pelo usuário.
  const prize=Math.max(100,Math.round(1000/lines));
  maxPrizeEl.textContent=prize.toLocaleString('pt-BR')+' pontos';
}
function randSymbol(){return symbols[Math.floor(Math.random()*symbols.length)];}
function render(values){values.forEach((s,i)=>{const r=document.getElementById('reel'+(i+1));r.textContent=s.e;});}
function evaluate(values){
  let prize=0,winName='';
  const counts={}; values.forEach(s=>counts[s.name]=(counts[s.name]||0)+1);
  const best=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  if(best[1]>=5){const s=symbols.find(x=>x.name===best[0]); prize=Math.round(s.value/lines); winName='5 '+best[0]+'s';}
  else if(best[1]>=3){prize=Math.max(5,Math.round(25/lines));winName='3 símbolos iguais';}
  return {prize,winName};
}
async function spin(){
  if(spinning)return;
  spinning=true; spinBtn.disabled=true; resultEl.className='result'; resultEl.textContent='Os rolos estão girando...'; document.querySelectorAll('.reel').forEach(r=>r.classList.add('spinning','win'));
  const start=Date.now();
  while(Date.now()-start<1050){render([randSymbol(),randSymbol(),randSymbol(),randSymbol(),randSymbol()]); await new Promise(r=>setTimeout(r,90));}
  const values=[randSymbol(),randSymbol(),randSymbol(),randSymbol(),randSymbol()]; render(values);
  document.querySelectorAll('.reel').forEach(r=>r.classList.remove('spinning','win'));
  const outcome=evaluate(values);
  if(outcome.prize>0){document.querySelectorAll('.reel').forEach(r=>r.classList.add('win'));resultEl.className='result win-text';resultEl.textContent='✨ '+outcome.winName+' — você ganhou '+outcome.prize.toLocaleString('pt-BR')+' pontos!';}
  else resultEl.textContent='Não houve combinação vencedora. Tente novamente.';
  spinBtn.disabled=false; spinning=false;
}
spinBtn.addEventListener('click',spin);
updatePrize();