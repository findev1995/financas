function abrirModalMeta(){
  const modal=document.getElementById('modal-poupancas');
  if(modal)modal.classList.add('open');
}
function fecharModalMeta(){
  const modal=document.getElementById('modal-poupancas');
  if(modal)modal.classList.remove('open');
}
function addMeta(){
  const nome=document.getElementById('p-nome').value.trim();
  const obj=parseFloat(document.getElementById('p-obj').value)||0;
  const atual=parseFloat(document.getElementById('p-atual').value)||0;
  const reforco=parseFloat(document.getElementById('p-reforco').value)||0;
  const dia=parseInt(document.getElementById('p-dia').value)||1;
  const cat=document.getElementById('p-cat').value||'Poupança';
  if(!nome||!obj)return;
  const criada=new Date().toISOString().split('T')[0];
  metas.push({id:Date.now(),nome,obj,atual,reforco,dia,cat,criada,historico:[]});
  sv('fp_metas',metas);
  ['p-nome','p-obj','p-atual','p-reforco','p-dia'].forEach(id=>document.getElementById(id).value='');
  renderMetas();
  fecharModalMeta();
}
function delMeta(id){metas=metas.filter(m=>m.id!==id);sv('fp_metas',metas);renderMetas();}

function addToMeta(id){
  const v=parseFloat(prompt('Adicionar manualmente à meta (€):'));
  if(!v||v<=0)return;
  const hoje=new Date().toISOString().split('T')[0];
  metas=metas.map(m=>{
    if(m.id!==id)return m;
    const novoAtual=Math.min((m.atual||0)+v,m.obj);
    const hist=[...(m.historico||[]),{data:hoje,valor:v,tipo:'manual'}];
    return{...m,atual:novoAtual,historico:hist};
  });
  sv('fp_metas',metas);renderMetas();
}

function aplicarReforcoMeta(id){
  metas=metas.map(m=>{
    if(m.id!==id||!m.reforco||m.atual>=m.obj)return m;
    const hoje=new Date().toISOString().split('T')[0];
    const novoAtual=Math.min((m.atual||0)+m.reforco,m.obj);
    const hist=[...(m.historico||[]),{data:hoje,valor:m.reforco,tipo:'reforco'}];
    transacoes.unshift({id:Date.now(),tipo:'despesa',valor:m.reforco,cat:m.cat||'Poupança',data:hoje,desc:'Reforço: '+m.nome});
    sv('fp_tx',transacoes);
    return{...m,atual:novoAtual,historico:hist};
  });
  sv('fp_metas',metas);renderMetas();
}

function renderMetas(){
  const el=document.getElementById('lista-metas');
  if(!metas.length){el.innerHTML='<div class="card"><div style="color:var(--text3);font-size:13px">Nenhuma meta criada</div></div>';return;}

  const totalReforcos=metas.filter(m=>m.reforco&&m.atual<m.obj).reduce((s,m)=>s+m.reforco,0);
  const metricHtml=totalReforcos>0?`<div class="metrics" style="margin-bottom:1rem">
    <div class="metric"><div class="metric-label">Reforços mensais totais</div><div class="metric-value" style="color:var(--teal)">€${fmt(totalReforcos)}/mês</div></div>
    <div class="metric"><div class="metric-label">Metas ativas</div><div class="metric-value blue">${metas.filter(m=>m.atual<m.obj).length}</div></div>
    <div class="metric"><div class="metric-label">Metas concluídas</div><div class="metric-value green">${metas.filter(m=>m.atual>=m.obj).length}</div></div>
  </div>`:'';

  el.innerHTML=metricHtml+metas.map(m=>{
    const pct=Math.min(((m.atual||0)/(m.obj||1))*100,100);
    const done=(m.atual||0)>=(m.obj||0);
    const falta=Math.max((m.obj||0)-(m.atual||0),0);
    const mesesRestantes=m.reforco>0&&!done?Math.ceil(falta/m.reforco):null;
    const dataFim=mesesRestantes?new Date(new Date().setMonth(new Date().getMonth()+mesesRestantes)).toLocaleDateString('pt-PT',{month:'long',year:'numeric'}):null;
    const hist=(m.historico||[]).slice(-3).reverse();

    return`<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div style="font-weight:500;font-size:15px">${escapeCal(m.nome)}${done?' <span style="color:var(--green)">✓</span>':''}</div>
          <div class="sub" style="margin-top:2px">${m.cat||'Poupança'}${m.reforco?` · reforço de €${fmt(m.reforco)}/mês no dia ${m.dia}`:''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn-del" onclick="delMeta(${m.id})" aria-label="Remover"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px;margin-bottom:14px">
        <div><div style="color:var(--text3);margin-bottom:2px">Poupado</div><div style="font-family:var(--mono);color:var(--green)">€${fmt(m.atual||0)}</div></div>
        <div><div style="color:var(--text3);margin-bottom:2px">Objetivo</div><div style="font-family:var(--mono)">€${fmt(m.obj)}</div></div>
        <div><div style="color:var(--text3);margin-bottom:2px">Falta</div><div style="font-family:var(--mono);color:${done?'var(--green)':'var(--amber)'}">€${fmt(falta)}</div></div>
      </div>

      <div class="prog-bg" style="margin-bottom:6px"><div class="prog-fill" style="width:${pct}%;background:${done?'#2dd4a0':pct>66?'#60f0a0':pct>33?'#60a0f0':'#a090f0'}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:14px">
        <span>${pct.toFixed(0)}% concluído</span>
        ${mesesRestantes?`<span style="color:var(--teal)">~${mesesRestantes} meses · ${dataFim}</span>`:''}
        ${done?`<span style="color:var(--green)">Meta atingida!</span>`:''}
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${!done&&m.reforco?`<button class="btn-primary" onclick="aplicarReforcoMeta(${m.id})" style="font-size:12px;padding:6px 14px"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M18 13l-6 6-6-6"/></svg> Registar reforço €${fmt(m.reforco)}</button>`:''}
        <button class="btn-ghost" onclick="addToMeta(${m.id})" style="font-size:12px;padding:6px 12px"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Adicionar manualmente</button>
      </div>

      ${hist.length?`<div style="margin-top:12px;padding-top:12px;border-top:0.5px solid var(--border)">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px">Últimos movimentos</div>
        ${hist.map(h=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:var(--text2)">
          <span>${new Date(h.data).toLocaleDateString('pt-PT')} <span class="pill pill-gray" style="font-size:10px">${h.tipo==='reforco'?'reforço':'manual'}</span></span>
          <span style="font-family:var(--mono);color:var(--green)">+€${fmt(h.valor)}</span>
        </div>`).join('')}
      </div>`:''}
    </div>`;
  }).join('');
}

