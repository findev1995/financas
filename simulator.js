// ── SIMULADOR DE AMORTIZAÇÃO ─────────────────────────────────────
// Reaproveita planoCredito (juros, IS, amortizações já registadas): o que se vê aqui é o que a app vai calcular.
let simModo='prazo', simChart=null, simPreferido=null, simMsgOk='';
function simSetModo(m){
  simModo=m;
  document.querySelectorAll('.sim-seg button').forEach(b=>b.classList.toggle('active',b.dataset.modo===m));
  simCalc();
}
function simValor(v){
  document.getElementById('sim-valor').value=(+v).toFixed(2).replace(/\.00$/,'');
  simCalc();
}
function irSimular(id){
  simPreferido=String(id);
  if(window.matchMedia('(max-width:768px)').matches){mpGroup('obrigacoes');mpSub('simulador');}
  else{
    const n=[...document.querySelectorAll('.sidebar .nav-item')].find(x=>(x.getAttribute('onclick')||'').includes("'simulador'"));
    goto('simulador',n);
  }
}
function renderSim(){
  const vazio=!creditos.length;
  document.getElementById('sim-vazio').style.display=vazio?'block':'none';
  document.getElementById('sim-corpo').style.display=vazio?'none':'';
  if(vazio)return;
  const sel=document.getElementById('sim-credito');
  const atual=simPreferido||sel.value;
  simPreferido=null;
  sel.innerHTML=creditos.map(c=>`<option value="${c.id}">${escapeCal(c.nome)}</option>`).join('');
  if(creditos.some(c=>String(c.id)===atual))sel.value=atual;
  const dt=document.getElementById('sim-data'), h=dataLocalISO(hoje);
  dt.min=h;
  if(!dt.value||dt.value<h)dt.value=h;
  const v=document.getElementById('sim-valor');
  if(!v.value){
    const c=creditos.find(x=>String(x.id)===sel.value);
    const saldo=c?saldoCreditoNaData(c,new Date(dt.value+'T00:00:00')):0;
    if(saldo>0)v.value=Math.min(1000,Math.floor(saldo));
  }
  const rent=document.getElementById('sim-rent');
  if(!rent.value)rent.value=Math.max(0,...contas.map(x=>+x.taxa||0))||3;
  simCalc();
}
function simResumo(c,dataObj){
  const h0=new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate());
  const rows=planoCredito(c).filter(r=>r.data>=h0&&!r.inicial&&r.prest>0.004);
  const apos=rows.find(r=>r.data>=dataObj);
  const soma=k=>rows.reduce((s,r)=>s+(r[k]||0),0);
  const ult=rows[rows.length-1];
  return {rows,saldo:saldoCreditoNaData(c,dataObj),prest:apos?apos.prest:null,prestFinal:rows.length?rows[Math.max(0,rows.length-2)].prest:null,meses:rows.length,
    fimLabel:ult?FMT_MES.format(ult.data):'—',juros:soma('juros'),selo:soma('selo'),total:soma('prest')};
}
let simCenarios=[];
const SIM_FREQ={1:'mensal',3:'trimestral',6:'semestral',12:'anual'};
function simParams(){
  const $=id=>document.getElementById(id);
  return {creditoId:$('sim-credito').value,valor:parseFloat($('sim-valor').value)||0,data:$('sim-data').value||dataLocalISO(hoje),
    pct:parseFloat($('sim-comissao').value)||0,modo:simModo,passo:+$('sim-rep').value||0,
    vezes:Math.max(2,Math.min(60,parseInt($('sim-vezes').value)||2))};
}
function simRepChange(){simCalc();}
// lista de amortizações do cenário: as repetições nunca passam do capital que ainda existe nessa data
function simAmorts(c,p){
  const lista=[], n=p.passo?p.vezes:1, d0=new Date(p.data+'T00:00:00');
  let atual={...c,amortizacoes:[...(c.amortizacoes||[])]};
  for(let k=0;k<n;k++){
    const d=p.passo?dataComDia(d0.getFullYear(),d0.getMonth()+k*p.passo,d0.getDate()):d0;
    const v=k===0?p.valor:Math.min(p.valor,saldoCreditoNaData(atual,d));
    if(!(v>0.004))break;
    const am={id:-(k+1),data:dataLocalISO(d),valor:+v.toFixed(2),comissao:+(v*p.pct/100).toFixed(2),modo:p.modo};
    lista.push(am);
    atual={...atual,amortizacoes:[...atual.amortizacoes,am]};
  }
  return lista;
}
function simAvaliar(c,p){
  const dataObj=new Date(p.data+'T00:00:00');
  const A=simResumo(c,dataObj), amorts=simAmorts(c,p);
  const B=simResumo({...c,amortizacoes:[...(c.amortizacoes||[]),...amorts]},dataObj);
  const totalAm=+amorts.reduce((x,a)=>x+a.valor,0).toFixed(2), comissao=+amorts.reduce((x,a)=>x+a.comissao,0).toFixed(2);
  const poupanca=+((A.juros+A.selo)-(B.juros+B.selo)-comissao).toFixed(2);
  return {A,B,amorts,totalAm,comissao,poupanca};
}
function simLabel(p){
  const quando=p.data===dataLocalISO(hoje)?'agora':prevData(p.data)+'/'+p.data.slice(2,4);
  return '€'+fmt(p.valor).replace(',00','')+(p.passo?' · '+p.vezes+'× '+SIM_FREQ[p.passo]:'')+' · '+quando+' · '+(p.modo==='prazo'?'prazo':'prestação');
}
// investir o mesmo dinheiro (cada amortização, desde a sua data até ao fim original do crédito)
function simInvestir(av,rentPct,impPct){
  const rows=av.A.rows; if(!rows.length)return null;
  const fim=rows[rows.length-1].data;
  const partes=av.amorts.map(a=>{const d=new Date(a.data+'T00:00:00');return {v:a.valor,n:Math.max(0,(fim.getFullYear()-d.getFullYear())*12+fim.getMonth()-d.getMonth())};});
  const g=x=>partes.reduce((t,o)=>t+o.v*(Math.pow(1+x/12,o.n)-1),0);
  const rend=+g((rentPct/100)*(1-impPct/100)).toFixed(2);
  let equilibrio=null;
  if(av.poupanca<=0)equilibrio=0;
  else if(g(1)>=av.poupanca){
    let lo=0,hi=1;
    for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(g(mid)<av.poupanca)lo=mid;else hi=mid;}
    equilibrio=impPct<100?hi/(1-impPct/100)*100:null;
  }
  return {rend,equilibrio};
}
function simGrafico(A,B,extras){
  if(!window.Chart)return;
  const mapa=r=>new Map(r.map(x=>[x.data.getTime(),x.saldo]));
  const tempo=B?mapa(B.rows):new Map();
  const eixo='rgba(255,255,255,0.04)',txt='#55555f', cores=['#60a0f0','#f0b060','#c060f0','#f060c0'];
  const datasets=[
    {label:'Sem amortização',data:A.rows.map(r=>r.saldo),borderColor:'#f06060',backgroundColor:'rgba(240,96,96,0.06)',fill:true,tension:.2,pointRadius:0,borderWidth:2},
    {label:'Com amortização',data:B?A.rows.map(r=>tempo.get(r.data.getTime())??0):[],borderColor:'#2dd4a0',backgroundColor:'rgba(45,212,160,0.08)',fill:true,tension:.2,pointRadius:0,borderWidth:2}
  ];
  (extras||[]).forEach((e,i)=>{
    const m=mapa(e.rows);
    datasets.push({label:e.label,data:A.rows.map(r=>m.get(r.data.getTime())??0),borderColor:cores[i%cores.length],backgroundColor:'transparent',borderDash:[5,4],tension:.2,pointRadius:0,borderWidth:1.5});
  });
  simChart=upsertChart(simChart,'chartSim',{
    type:'line',
    data:{labels:A.rows.map(r=>r.label),datasets},
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{display:true,labels:{color:'#8a8a96',font:{size:11},boxWidth:10,padding:14}},
        tooltip:{callbacks:{label:ctx=>' '+ctx.dataset.label+': €'+fmt(ctx.raw)}}
      },
      scales:{
        x:{grid:{color:eixo},ticks:{color:txt,font:{size:10},maxTicksLimit:7,maxRotation:0}},
        y:{grid:{color:eixo},ticks:{color:txt,font:{size:10},callback:v=>'€'+fmtK(v)}}
      }
    }
  });
}
function simRenderCenarios(c){
  const lista=simCenarios.filter(x=>x.p.creditoId===String(c.id));
  document.getElementById('sim-cen').style.display=lista.length?'':'none';
  const av=lista.map(x=>({x,r:simAvaliar(c,x.p)}));
  const melhorP=Math.max(...av.map(o=>o.r.poupanca)), melhorR=Math.max(...av.map(o=>o.r.totalAm>0?o.r.poupanca/o.r.totalAm:-1));
  document.getElementById('sim-cen-body').innerHTML=av.map(({x,r})=>{
    const ret=r.totalAm>0?r.poupanca/r.totalAm*100:0, fim=r.B.meses?r.B.fimLabel:'liquidado';
    return `<tr><td><div class="cen-cell"><div><button type="button" class="sim-link" onclick="simCarregar(${x.id})">${simLabel(x.p)}</button><div class="sub">termina ${fim} · ${r.B.meses} meses</div></div><button class="btn-ghost" type="button" onclick="simRemoverCenario(${x.id})" aria-label="Remover cenário">✕</button></div></td>`
      +`<td>€${fmt(r.totalAm)}</td><td class="${r.poupanca===melhorP&&av.length>1?'sim-best':''}">€${fmt(r.poupanca)}</td><td class="${(r.totalAm>0?r.poupanca/r.totalAm:-1)===melhorR&&av.length>1?'sim-best':''}">€${fmt(ret)}</td></tr>`;
  }).join('');
  return av.map(({x,r})=>({label:simLabel(x.p),rows:r.B.rows}));
}
function simGuardarCenario(){
  if(document.getElementById('sim-guardar').disabled)return;
  const p=simParams();
  if(simCenarios.filter(x=>x.p.creditoId===p.creditoId).length>=4){alert('Podes guardar até 4 cenários por crédito. Remove um para guardar outro.');return;}
  simCenarios.push({id:Date.now(),p});
  simCalc();
}
function simRemoverCenario(id){simCenarios=simCenarios.filter(x=>x.id!==id);simCalc();}
function simCarregar(id){
  const x=simCenarios.find(o=>o.id===id); if(!x)return;
  const $=g=>document.getElementById(g), p=x.p;
  $('sim-valor').value=p.valor;$('sim-data').value=p.data<dataLocalISO(hoje)?dataLocalISO(hoje):p.data;
  $('sim-comissao').value=p.pct;$('sim-rep').value=String(p.passo);$('sim-vezes').value=p.vezes;
  simSetModo(p.modo);
}
function simCalc(){
  const $=id=>document.getElementById(id);
  const c=creditos.find(x=>String(x.id)===$('sim-credito').value);
  if(!c)return;
  const hojeISO=dataLocalISO(hoje), p=simParams(), dataObj=new Date(p.data+'T00:00:00');
  const saldoData=saldoCreditoNaData(c,dataObj);
  const comissao1=+(p.valor*p.pct/100).toFixed(2);
  $('sim-vezes-wrap').style.display=p.passo?'':'none';
  $('sim-comissao-eur').textContent='Comissão: €'+fmt(comissao1)+(p.passo?' por amortização':'');
  $('sim-saldo').textContent='Capital em dívida nessa data: €'+fmt(saldoData);
  $('sim-chips').innerHTML=[1000,2500,5000,10000].filter(v=>v<saldoData)
    .map(v=>`<button class="btn-ghost" type="button" onclick="simValor(${v})">€${fmt(v).replace(',00','')}</button>`).join('')
    +(saldoData>0?`<button class="btn-ghost" type="button" onclick="simValor(${saldoData})">Liquidar tudo</button>`:'');
  const aviso=$('sim-aviso'), registar=$('sim-registar'), guardar=$('sim-guardar');
  const extras=simRenderCenarios(c);
  const A=simResumo(c,dataObj);
  let erro='';
  if(p.data<hojeISO)erro='A data da amortização não pode ser anterior a hoje.';
  else if(p.valor>saldoData+0.005)erro='O valor excede o capital em dívida nessa data (€'+fmt(saldoData)+').';
  if(erro||!(p.valor>0)){
    registar.disabled=true;guardar.disabled=true;
    $('sim-vezes-total').textContent='';
    aviso.innerHTML=erro?`<div class="sim-msg err">${erro}</div>`
      :simMsgOk?`<div class="sim-msg ok">${simMsgOk}</div>`
      :'<div class="sim-msg warn">Indica o valor a amortizar para ver a comparação.</div>';
    simMsgOk='';
    $('sim-hero').innerHTML='';
    $('sim-inv-res').innerHTML='<div class="sim-hint">Indica o valor a amortizar para comparar com investir.</div>';
    $('sim-body').innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text3)">—</td></tr>';
    simGrafico(A,null,extras);
    return;
  }
  simMsgOk='';
  const av=simAvaliar(c,p), B=av.B, n=av.amorts.length, rep=n>1;
  const custoA=A.juros+A.selo;
  const poupanca=av.poupanca, comissao=av.comissao;
  const eur=v=>'€'+fmt(v);
  const dif=(v,fn)=>Math.abs(v)<0.005?'<span style="color:var(--text3)">—</span>'
    :`<span style="color:var(--${v<0?'green':'red'})">${v<0?'−':'+'}${fn(Math.abs(v))}</span>`;
  const meses=k=>k+(k===1?' mês':' meses');
  const liquidado=B.meses===0;
  const prB=(p.passo&&p.modo==='prestacao')?B.prestFinal:B.prest;
  $('sim-vezes-total').textContent=p.passo?(n+(n===1?' amortização':' amortizações')+' · total '+eur(av.totalAm)+(n<p.vezes?' (as restantes já não têm capital para amortizar)':'')):'';
  // cartões de destaque
  const cartoes=[{rot:'Poupança líquida',val:(poupanca<0?'−':'')+eur(Math.abs(poupanca)),cor:poupanca>0?'green':'red',sub:rep?n+' amortizações · '+eur(av.totalAm):'juros + IS − comissão'}];
  if(liquidado)cartoes.push({rot:'Crédito',val:'Liquidado',cor:'green',sub:meses(A.meses)+' evitados'});
  else if(p.modo==='prazo'){
    const d=A.meses-B.meses;
    cartoes.push({rot:'Prazo',val:d===0?'Sem alteração':(d>0?'−':'+')+meses(Math.abs(d)),cor:d>0?'green':'amber',sub:A.meses+' → '+B.meses+' meses'});
  }else{
    const d=(A.prest||0)-(prB||0);
    cartoes.push({rot:'Prestação',val:Math.abs(d)<0.005?'Sem alteração':(d>0?'−':'+')+eur(Math.abs(d))+'/mês',cor:d>0.004?'green':'amber',sub:eur(A.prest||0)+' → '+eur(prB||0)});
  }
  cartoes.push({rot:'Último pagamento',val:B.fimLabel,cor:'blue',sub:'antes: '+A.fimLabel});
  $('sim-hero').innerHTML=cartoes.map(k=>`<div class="metric"><div class="metric-label">${k.rot}</div><div class="metric-value ${k.cor}">${k.val}</div><div class="sub">${k.sub}</div></div>`).join('');
  // tabela comparativa
  const totA=A.total, totB=B.total+av.totalAm+comissao;
  const linha=(rot,a,b,d,cls)=>`<tr${cls?` class="${cls}"`:''}><td>${rot}</td><td>${a}</td><td>${b}</td><td>${d}</td></tr>`;
  $('sim-body').innerHTML=[
    linha('Capital em dívida na data',eur(A.saldo),eur(B.saldo),dif(B.saldo-A.saldo,eur)),
    linha('Prestação mensal',A.prest==null?'—':eur(A.prest),prB==null?'—':eur(prB),A.prest==null||prB==null?'—':dif(prB-A.prest,eur)),
    linha('Prazo restante',meses(A.meses),meses(B.meses),dif(B.meses-A.meses,meses)),
    linha('Último pagamento',A.fimLabel,B.fimLabel,''),
    linha('Juros por pagar',eur(A.juros),eur(B.juros),dif(B.juros-A.juros,eur)),
    linha('IS por pagar',eur(A.selo),eur(B.selo),dif(B.selo-A.selo,eur)),
    rep?linha('Amortizações','—',n+'× · '+eur(av.totalAm),''):'',
    linha('Comissão','—',comissao>0?eur(comissao):'—',comissao>0?dif(comissao,eur):'—'),
    linha('Total a desembolsar',eur(totA),eur(totB),dif(totB-totA,eur),'sim-total')
  ].join('');
  // amortizar ou investir
  const rentPct=parseFloat($('sim-rent').value)||0, impPct=Math.min(100,Math.max(0,parseFloat($('sim-imp').value)||0));
  const inv=simInvestir(av,rentPct,impPct);
  if(inv){
    const d=+(poupanca-inv.rend).toFixed(2);
    const be=inv.equilibrio==null?'mais de 100%':fmt(inv.equilibrio).replace(',00','')+'%';
    $('sim-inv-res').innerHTML=`<div class="sim-vs"><div class="metric"><div class="metric-label">Amortizar poupa</div><div class="metric-value ${poupanca>0?'green':'red'}">${poupanca<0?'−':''}${eur(Math.abs(poupanca))}</div><div class="sub">certo · juros + IS − comissão</div></div>`
      +`<div class="metric"><div class="metric-label">Investir rende</div><div class="metric-value blue">${eur(inv.rend)}</div><div class="sub">a ${fmt(rentPct).replace(',00','')}% ao ano, após imposto</div></div></div>`
      +(d>=0?`<div class="sim-msg ok">Amortizar compensa mais: ${eur(d)} a mais do que investir com essa rentabilidade.</div>`
             :`<div class="sim-msg warn">Investir renderia mais ${eur(Math.abs(d))}, se conseguires essa rentabilidade de forma consistente.</div>`)
      +`<div class="sim-note">Investir só compensa se render pelo menos <b>${be} ao ano</b> antes de impostos (o crédito custa ${fmt(+c.taxa||0).replace(',00','')}% ao ano mais IS). Compara-se o mesmo dinheiro até ao fim original do crédito. Amortizar é um ganho certo e sem risco; investir tem risco e liquidez, e amortizar reduz a tua reserva. Em «reduzir prazo», as prestações que deixas de pagar no fim também poderiam ser investidas, o que favorece ainda mais a amortização.</div>`;
  }else $('sim-inv-res').innerHTML='';
  // avisos
  let msgs='';
  if(liquidado)msgs+='<div class="sim-msg ok">Esta amortização liquida o crédito por completo.</div>';
  if(poupanca<=0)msgs+=`<div class="sim-msg warn">A comissão (€${fmt(comissao)}) é igual ou superior ao que poupas em juros e IS.</div>`;
  aviso.innerHTML=msgs;
  registar.disabled=false;guardar.disabled=false;
  registar.textContent=rep?`Registar as ${n} amortizações`:'Registar esta amortização';
  simGrafico(A,B,extras);
}
function simRegistar(){
  const $=id=>document.getElementById(id);
  const c=creditos.find(x=>String(x.id)===$('sim-credito').value);
  const p=simParams();
  if(!c||!p.data||!(p.valor>0)||p.data<dataLocalISO(hoje)||p.valor>saldoCreditoNaData(c,new Date(p.data+'T00:00:00'))+0.005)return;
  const lista=simAmorts(c,p);
  if(!lista.length)return;
  const total=lista.reduce((x,a)=>x+a.valor,0);
  const texto=lista.length>1
    ?`Registar ${lista.length} amortizações (€${fmt(total)} no total, de ${new Date(lista[0].data+'T00:00:00').toLocaleDateString('pt-PT')} a ${new Date(lista[lista.length-1].data+'T00:00:00').toLocaleDateString('pt-PT')}) em «${c.nome}»?`
    :`Registar amortização de €${fmt(p.valor)} em «${c.nome}» a ${new Date(p.data+'T00:00:00').toLocaleDateString('pt-PT')}?`;
  if(!confirm(texto))return;
  const base=Date.now();
  creditos=creditos.map(x=>x.id===c.id?{...x,amortizacoes:[...(x.amortizacoes||[]),...lista.map((a,i)=>({...a,id:base+i}))]}:x);
  sv('fp_cred',creditos);
  simCenarios=simCenarios.filter(x=>x.p.creditoId!==String(c.id));  // já estão refletidos no crédito
  $('sim-valor').value='';
  simMsgOk=lista.length>1?'Amortizações registadas. Já estão refletidas no plano do crédito.':'Amortização registada. Já está refletida no plano do crédito.';
  simCalc();
}

