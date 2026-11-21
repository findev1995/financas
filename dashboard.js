function mostrarPagina(id){
  document.querySelectorAll('.page.active').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  const main=document.querySelector('.main');
  if(main)main.scrollTop=0;
  if(RENDERS[id])RENDERS[id]();
}
if(window.Chart)Chart.defaults.animation.duration=350;
function upsertChart(chart,id,cfg){
  if(chart){chart.data=cfg.data;chart.options=cfg.options;chart.update();return chart;}
  return new Chart(document.getElementById(id),cfg);
}
function goto(id,el){
  document.querySelectorAll('.nav-item.active').forEach(n=>n.classList.remove('active'));
  if(el)el.classList.add('active');
  mostrarPagina(id);
}

function mudaMes(d){
  vMonth+=d;
  if(vMonth<0){vMonth=11;vYear--;}
  if(vMonth>11){vMonth=0;vYear++;}
  renderDash();
}

function mesAtual(){
  return transacoes.filter(t=>{const d=new Date(t.data);return d.getFullYear()===vYear&&d.getMonth()===vMonth;});
}

// ── SNAPSHOTS ─────────────────────────────────────────────
function calcPatrimonio(){
  return contas.reduce((s,c)=>s+saldoEfetivo(c.id),0)
    +ativos.reduce((s,a)=>s+a.mkt,0)
    +investimentos.reduce((s,i)=>s+i.atual,0)
    +pprs.reduce((s,p)=>s+p.atual,0);
}
function calcDivida(){
  return creditos.reduce((s,c)=>s+estadoCreditoHoje(c).saldo,0);
}



// Versão baseada nos registos reais: avaliações e amortizações atualizam a linha.
function valorHistorico(item,chaveBase,referencia){
  const registos=(item.atualizacoes||[]).filter(r=>new Date(r.data+'T23:59:59')<=referencia).sort((a,b)=>a.data.localeCompare(b.data));
  return registos.length?+registos[registos.length-1].valor||0:+item[chaveBase]||0;
}
function saldoCreditoNaData(c,referencia){
  const plano=planoCredito(c);
  const pagos=plano.filter(r=>r.data<=referencia);
  let saldo=pagos.length?pagos[pagos.length-1].saldo:(+c.divida||0);
  const aplicadas=new Set(pagos.flatMap(r=>(r.amortizacoes||[]).map(a=>a.id)));
  (c.amortizacoes||[]).forEach(a=>{
    if(new Date(a.data+'T00:00:00')<=referencia&&!aplicadas.has(a.id)) saldo-=+a.valor||0;
  });
  return +Math.max(0,saldo).toFixed(2);
}
function reconstruirHistorico(){
  const pontos=[];
  if(!creditos.length&&!ativos.length&&!investimentos.length&&!pprs.length)return pontos;
  let minDate=new Date(hoje.getFullYear(),hoje.getMonth(),1);
  creditos.forEach(c=>{if(c.inicio){const d=new Date(c.inicio+'-01');if(d<minDate)minDate=d;}});
  ativos.forEach(a=>{if(a.ano){const d=new Date(+a.ano,0,1);if(d<minDate)minDate=d;}});
  [ativos,investimentos,pprs].flat().forEach(item=>(item.atualizacoes||[]).forEach(r=>{const d=new Date(r.data+'T00:00:00');if(d<minDate)minDate=d;}));
  const limite=new Date(hoje.getFullYear(),hoje.getMonth()-24,1);
  if(minDate<limite)minDate=limite;
  let cur=new Date(minDate.getFullYear(),minDate.getMonth(),1);
  while(cur<=hoje){
    const ano=cur.getFullYear(), mes=cur.getMonth();
    const atual=ano===hoje.getFullYear()&&mes===hoje.getMonth();
    const referencia=atual?hoje:new Date(ano,mes+1,0,23,59,59);
    const patrimonio=atual?calcPatrimonio():
      contas.reduce((s,c)=>s+saldoContaAte(c.id,dataLocalISO(referencia)),0)
      +ativos.filter(a=>(+a.ano||ano)<=ano).reduce((s,a)=>s+valorHistorico(a,'aq',referencia),0)
      +investimentos.reduce((s,i)=>s+valorHistorico(i,'inv',referencia),0)
      +pprs.reduce((s,p)=>s+valorHistorico(p,'contrib',referencia),0);
    const divida=atual?calcDivida():creditos.reduce((s,c)=>s+saldoCreditoNaData(c,referencia),0);
    pontos.push({mes:`${ano}-${String(mes+1).padStart(2,'0')}`,patrimonio,divida,real:atual});
    cur.setMonth(cur.getMonth()+1);
  }
  return pontos;
}

function renderEvolucao(){
  const pontos=reconstruirHistorico();
  if(!pontos.length){
    document.getElementById('dash-evolucao-wrap').style.display='none';
    return;
  }
  document.getElementById('dash-evolucao-wrap').style.display='block';

  const labels=pontos.map(p=>{
    const [ano,mes]=p.mes.split('-');
    return MESES_SHORT[parseInt(mes)-1]+' '+ano.slice(2);
  });

  evolucaoChart=upsertChart(evolucaoChart,'chartEvolucao',{
    type:'line',
    data:{
      labels,
      datasets:[
        {
          label:'Património',
          data:pontos.map(p=>p.patrimonio),
          borderColor:'#2dd4a0',
          backgroundColor:'rgba(45,212,160,0.08)',
          fill:true,
          tension:.35,
          pointRadius:pontos.map(p=>p.real?4:2),
          pointBackgroundColor:pontos.map(p=>p.real?'#2dd4a0':'rgba(45,212,160,0.4)'),
          borderWidth:2
        },
        {
          label:'Dívida',
          data:pontos.map(p=>p.divida),
          borderColor:'#f06060',
          backgroundColor:'rgba(240,96,96,0.06)',
          fill:true,
          tension:.35,
          pointRadius:pontos.map(p=>p.real?4:2),
          pointBackgroundColor:pontos.map(p=>p.real?'#f06060':'rgba(240,96,96,0.4)'),
          borderWidth:2
        }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{
          display:true,
          labels:{color:'#8a8a96',font:{size:11},boxWidth:10,padding:16}
        },
        tooltip:{
          callbacks:{
            label:ctx=>' '+ctx.dataset.label+': €'+fmt(ctx.raw)
          }
        }
      },
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#55555f',font:{size:10}}},
        y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#55555f',font:{size:10},callback:v=>'€'+fmtK(v)}}
      }
    }
  });
}

function renderDashOrcamento(){
  const wrap=document.getElementById('dash-orcamento-wrap');
  const cats=Object.keys(orcamentos);
  if(!cats.length){wrap.innerHTML='';return;}

  const txs=mesAtual();
  const alertasOver=[];
  const alertasQuase=[];

  const barras=cats.map(cat=>{
    const gasto=txs.filter(t=>t.tipo==='despesa'&&t.cat===cat).reduce((s,t)=>s+t.valor,0);
    const lim=orcamentos[cat];
    const pct=(gasto/lim)*100;
    const pctCap=Math.min(pct,100);
    const over=gasto>lim;
    const quase=pct>=80&&!over;
    const col=over?'#f06060':quase?'#f0b060':'#2dd4a0';
    if(over) alertasOver.push({cat,gasto,lim,pct});
    else if(quase) alertasQuase.push({cat,gasto,lim,pct});
    return`<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <div class="row-left" style="gap:6px"><span class="dot" style="background:${col}"></span><span>${cat}</span></div>
        <span style="font-family:var(--mono);color:${col}">€${fmt(gasto)}<span style="color:var(--text3)"> / €${fmt(lim)}</span>
        ${over?` <span class="pill pill-red" style="font-size:10px">excedido</span>`:quase?` <span class="pill pill-amber" style="font-size:10px">${pct.toFixed(0)}%</span>`:''}
        </span>
      </div>
      <div class="prog-bg"><div class="prog-fill" style="width:${pctCap}%;background:${col}"></div></div>
    </div>`;
  }).join('');

  const dentroLimite=cats.filter(c=>{
    const g=txs.filter(t=>t.tipo==='despesa'&&t.cat===c).reduce((s,t)=>s+t.valor,0);
    return g<=orcamentos[c];
  }).length;

  let alertaHtml='';
  if(alertasOver.length||alertasQuase.length){
    const items=[
      ...alertasOver.map(a=>{const excessoPct=a.lim>0?((a.gasto-a.lim)/a.lim)*100:0;return `<div style="display:flex;align-items:center;gap:6px"><span style="color:var(--red)">●</span><span><strong>${escapeCal(a.cat)}</strong> excedido em <strong>${excessoPct.toFixed(1).replace('.',',')}%</strong> — €${fmt(a.gasto)} de €${fmt(a.lim)}</span></div>`;}),
      ...alertasQuase.map(a=>`<div style="display:flex;align-items:center;gap:6px"><span style="color:var(--amber)">●</span><span><strong>${a.cat}</strong> a ${a.pct.toFixed(0)}% do limite — faltam €${fmt(a.lim-a.gasto)}</span></div>`)
    ].join('');
    alertaHtml=`<div style="background:rgba(240,176,96,0.08);border:0.5px solid rgba(240,176,96,0.25);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:12px;font-size:12px;display:flex;flex-direction:column;gap:6px">${items}</div>`;
  }

  wrap.innerHTML=`<div class="card">
    <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
      <span>Orçamento do mês</span>
      <span style="font-size:11px;color:${dentroLimite===cats.length?'var(--green)':'var(--text3)'}">${dentroLimite}/${cats.length} dentro do limite</span>
    </div>
    ${alertaHtml}
    ${barras}
  </div>`;
}

// Cartão "Disponível nas contas": saldo atual de cada conta e total (não depende do mês escolhido)
function renderDashContas(){
  const wrap=document.getElementById('dash-contas-wrap');
  if(!wrap)return;
  if(!contas.length){wrap.innerHTML='';return;}
  const eur=v=>(v<0?'-':'')+'€'+fmt(Math.abs(v));
  const total=contas.reduce((s,c)=>s+saldoEfetivo(c.id),0);
  const linhas=contas.map(c=>{
    const s=saldoEfetivo(c.id);
    return`<div class="row">
      <div class="row-left" style="flex:1;min-width:0">
        <span class="dot" style="background:${CN_DOT[c.tipo]||'#888'}"></span>
        <div style="min-width:0">
          <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeCal(c.nome)}</div>
          ${c.tipo?`<div class="sub">${escapeCal(c.tipo)}</div>`:''}
        </div>
      </div>
      <span class="amount ${s>=0?'green':'red'}" style="white-space:nowrap;margin-left:12px">${eur(s)}</span>
    </div>`;
  }).join('');
  wrap.innerHTML=`<div class="card">
    <div class="card-title" style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
      <span>Disponível nas contas</span>
      <span class="amount ${total>=0?'green':'red'}" style="font-size:15px;white-space:nowrap;letter-spacing:0">${eur(total)}</span>
    </div>
    ${linhas}
  </div>`;
}

function renderDash(){
  document.getElementById('dash-mes-label').textContent=MESES_FULL[vMonth]+' '+vYear;
  renderDashContas();
  const txs=mesAtual();
  const rec=txs.filter(t=>t.tipo==='receita'&&!t.isTransferencia).reduce((s,t)=>s+t.valor,0);
  const desp=txs.filter(t=>t.tipo==='despesa'&&!t.isTransferencia).reduce((s,t)=>s+t.valor,0);
  const saldo=rec-desp;
  const divida=creditos.reduce((s,c)=>s+estadoCreditoHoje(c).saldo,0);
  const prestMes=creditos.reduce((s,c)=>s+(estadoCreditoHoje(c).futuros[0]?.prest||0),0);
  const totalContas=contas.reduce((s,c)=>s+saldoEfetivo(c.id),0);
  const totalAtMkt=ativos.reduce((s,a)=>s+a.mkt,0);
  const totalPPR=pprs.reduce((s,p)=>s+p.atual,0);
  const totalInv=investimentos.reduce((s,i)=>s+i.atual,0);
  const patrimLiq=totalContas+totalAtMkt+totalPPR+totalInv-divida;

  const todosUrgentes=[...todosOsCustos(),...subscricoesCal(),...creditosCal()];
  const urgentes=todosUrgentes.filter(c=>c.dias>=0&&c.dias<=7).sort((a,b)=>a.dias-b.dias);
  let alertas=[];
  if(urgentes.length){
    const detalhes=urgentes.map(c=>{
      const tipo=c.isCredito?'prestação':c.isSub?'sub':c.isConta?'conta':'custo';
      const cor=c.isCredito?'var(--amber)':c.isSub?'var(--pink)':c.isConta?'var(--blue)':'var(--red)';
      return`<span style="color:${cor};font-family:var(--mono)">${escapeCal(c.desc)} €${fmt(c.valor)} <span style="color:var(--text3);font-size:10px">dia ${c.dia}</span></span>`;
    }).join('<span style="color:var(--text3);margin:0 4px">·</span>');
    alertas.push(`<div class="alert-banner"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><div style="display:flex;flex-direction:column;gap:4px"><div>${urgentes.length} pagamento${urgentes.length>1?'s':''} nos próximos 7 dias — total €${fmt(urgentes.reduce((s,c)=>s+c.valor,0))}</div><div style="font-size:11px;flex-wrap:wrap;display:flex;gap:4px;align-items:center">${detalhes}</div></div></div>`);
  }
  // Alertas de orçamento
  const txsAtual=mesAtual();
  Object.entries(orcamentos).forEach(([cat,lim])=>{
    const gasto=txsAtual.filter(t=>t.tipo==='despesa'&&t.cat===cat).reduce((s,t)=>s+t.valor,0);
    const pct=(gasto/lim)*100;
    if(gasto>lim){
      const excessoPct=lim>0?((gasto-lim)/lim)*100:0;
      alertas.push(`<div class="alert-banner" style="background:var(--red-bg);border-color:rgba(240,96,96,.25);color:var(--red-text)"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg><span>Orçamento <strong>${escapeCal(cat)}</strong> excedido em <strong>${excessoPct.toFixed(1).replace('.',',')}%</strong> — €${fmt(gasto)} gastos face a €${fmt(lim)} de limite (excesso: €${fmt(gasto-lim)})</span></div>`);
    } else if(pct>=80){
      alertas.push(`<div class="alert-banner" style="background:var(--amber-bg);border-color:rgba(240,176,96,.25);color:var(--amber-text)"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg><span>Orçamento <strong>${cat}</strong> a ${pct.toFixed(0)}% — faltam €${fmt(lim-gasto)}</span></div>`);
    }
  });
  // Previsão: conta que fica negativa nos próximos 30 dias com os compromissos já conhecidos
  try{
    const hojeISO=dataLocalISO(hoje);
    prevCalcular(30,false).resumo.filter(r=>r.negISO).forEach(r=>{
      alertas.push(`<div class="alert-banner" style="background:var(--red-bg);border-color:rgba(240,96,96,.25);color:var(--red-text)"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg><span><b>${escapeCal(r.conta.nome)}</b> ${r.negISO===hojeISO?'já está negativa':'fica negativa a '+prevData(r.negISO)} com os compromissos já conhecidos. Vê a Previsão de saldo.</span></div>`);
    });
  }catch(e){}
  document.getElementById('dash-alertas').innerHTML=alertas.join('');

  document.getElementById('dash-metrics').innerHTML=`
    <div class="metric"><div class="metric-label">Receitas</div><div class="metric-value green">€${fmt(rec)}</div></div>
    <div class="metric"><div class="metric-label">Despesas</div><div class="metric-value red">€${fmt(desp)}</div></div>
    <div class="metric"><div class="metric-label">Saldo mês</div><div class="metric-value ${saldo>=0?'green':'red'}">${saldo<0?'-':''}€${fmt(Math.abs(saldo))}</div></div>`;

  const catMap={};
  txs.filter(t=>t.tipo==='despesa'&&!t.isTransferencia).forEach(t=>{catMap[t.cat]=(catMap[t.cat]||0)+t.valor;});
  const sorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const totalDesp=sorted.reduce((s,[,v])=>s+v,0);

  // Donut chart
  if(sorted.length){
    document.getElementById('dash-cats-total-val').textContent='€'+fmt(totalDesp);
    catsChart=upsertChart(catsChart,'chartCats',{
      type:'doughnut',
      data:{
        labels:sorted.map(([cat])=>cat),
        datasets:[{
          data:sorted.map(([,val])=>val),
          backgroundColor:sorted.map(([cat])=>CAT_DOT[cat]||'#555'),
          borderWidth:0,
          hoverOffset:4
        }]
      },
      options:{
        responsive:true,
        cutout:'72%',
        plugins:{
          legend:{display:false},
          tooltip:{
            callbacks:{
              label:ctx=>' €'+fmt(ctx.raw)+' ('+((ctx.raw/totalDesp)*100).toFixed(0)+'%)'
            }
          }
        }
      }
    });
  } else {
    document.getElementById('dash-cats-total-val').textContent='—';
    if(catsChart){catsChart.destroy();catsChart=null;}
  }

  // Legenda por baixo
  document.getElementById('dash-cats').innerHTML=sorted.length?sorted.map(([cat,val])=>`
    <div class="row"><div class="row-left"><span class="dot" style="background:${CAT_DOT[cat]||'#555'}"></span>
    <span>${cat}</span></div>
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:11px;color:var(--text3)">${((val/totalDesp)*100).toFixed(0)}%</span>
      <span class="amount red">€ ${fmt(val)}</span>
    </div></div>`).join(''):'<div style="color:var(--text3);font-size:13px;padding:8px 0">Sem despesas este mês</div>';


  const recent=[...txs].filter(t=>!t.isTransferencia).sort((a,b)=>new Date(b.data)-new Date(a.data)).slice(0,6);
  document.getElementById('dash-recent').innerHTML=recent.length?recent.map(t=>`
    <div class="row"><div class="row-left"><span class="dot" style="background:${CAT_DOT[t.cat]||'#555'}"></span>
    <div><div>${escapeCal(t.desc||t.cat)}</div><div class="sub">${new Date(t.data).toLocaleDateString('pt-PT')}</div></div></div>
    <span class="amount ${t.tipo==='receita'?'green':'red'}">${t.tipo==='receita'?'+':'-'}€${fmt(t.valor)}</span></div>`).join(''):'<div style="color:var(--text3);font-size:13px;padding:8px 0">Sem transações</div>';

  document.getElementById('dash-balanco').innerHTML=`
    <div class="row"><div>Contas bancárias</div><span class="amount green">€ ${fmt(totalContas)}</span></div>
    <div class="row"><div>Ativos físicos</div><span class="amount green">€ ${fmt(totalAtMkt)}</span></div>
    <div class="row"><div>Investimentos</div><span class="amount green">€ ${fmt(totalInv)}</span></div>
    <div class="row"><div>PPR / Pensões</div><span class="amount green">€ ${fmt(totalPPR)}</span></div>
    <div class="row"><div>Dívidas</div><span class="amount red">-€ ${fmt(divida)}</span></div>
    <div class="row" style="font-weight:500"><div>Património líquido</div><span class="amount ${patrimLiq>=0?'green':'red'}">${patrimLiq<0?'-':''}€ ${fmt(Math.abs(patrimLiq))}</span></div>
  `;

  const last6=[];
  for(let i=5;i>=0;i--){
    let m=vMonth-i, y=vYear;
    if(m<0){m+=12;y--;}
    const mtx=transacoes.filter(t=>{const d=new Date(t.data);return d.getFullYear()===y&&d.getMonth()===m;});
    last6.push({label:MESES_SHORT[m],rec:mtx.filter(t=>t.tipo==='receita'&&!t.isTransferencia).reduce((s,t)=>s+t.valor,0),desp:mtx.filter(t=>t.tipo==='despesa'&&!t.isTransferencia).reduce((s,t)=>s+t.valor,0)});
  }
  dashChart=upsertChart(dashChart,'chartDash',{
    type:'bar',
    data:{labels:last6.map(x=>x.label),datasets:[
      {label:'Receitas',data:last6.map(x=>x.rec),backgroundColor:'#2dd4a0',borderRadius:3},
      {label:'Despesas',data:last6.map(x=>x.desp),backgroundColor:'#f06060',borderRadius:3}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#55555f',font:{size:11}}},
              y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#55555f',font:{size:11},callback:v=>'€'+v}}}}
  });

  renderDashOrcamento();
  renderEvolucao();
}

