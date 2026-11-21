// BACKUP
function exportarDados(){
  const dados={
    versao:'1.0',
    schema:SCHEMA_ATUAL,
    data:new Date().toISOString(),
    transacoes,orcamentos,metas,creditos,contas,ativos,investimentos,pprs,subscricoes,previsoes
  };
  const blob=new Blob([JSON.stringify(dados,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='financas-backup-'+new Date().toISOString().split('T')[0]+'.json';
  a.click();
  URL.revokeObjectURL(url);
  try{localStorage.setItem('fp_ultimo_backup',String(Date.now()));}catch(e){}
}



// Ajusta o tamanho da letra dos valores nos cartões para nunca saírem do cartão
// (todas as leituras primeiro, todas as escritas depois — evita recalcular o layout a cada cartão)
function ajustarMetricas(){
  const els=[...document.querySelectorAll('.metric-value')].filter(el=>el.offsetParent);
  els.forEach(el=>el.style.removeProperty('font-size'));
  const medidas=els.map(el=>({el,f:parseFloat(getComputedStyle(el).fontSize),sw:el.scrollWidth,cw:el.clientWidth}));
  medidas.forEach(({el,f,sw,cw})=>{
    if(sw>cw+0.5)el.style.setProperty('font-size',Math.max(9,Math.floor(f*cw/sw*2)/2)+'px','important');
  });
}
(function(){
  let pendente=false;
  const agendar=()=>{if(pendente)return;pendente=true;requestAnimationFrame(()=>{pendente=false;try{ajustarMetricas();}catch(e){}});};
  new MutationObserver(agendar).observe(document.querySelector('.main'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',agendar);
  window.addEventListener('orientationchange',agendar);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(agendar);
  agendar();
})();

function importarDados(event){
  const file=event.target.files[0];
  if(!file) return;
  const msg=document.getElementById('import-msg');
  msg.style.display='block';
  msg.style.color='var(--text2)';
  msg.textContent='A ler ficheiro...';
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      // Limpar BOM e espaços extra que podem surgir nalguns browsers
      const raw=e.target.result.trim().replace(/^\uFEFF/,'');
      const dados=JSON.parse(raw);

      // Aceitar tanto o formato com wrapper {versao, data, transacoes...}
      // como um dump direto das chaves fp_*
      const fonte=dados.transacoes!==undefined?dados:{
        transacoes: dados.fp_tx||dados.transacoes||[],
        orcamentos: dados.fp_orc||dados.orcamentos||{},
        metas:      dados.fp_metas||dados.metas||[],
        creditos:   dados.fp_cred||dados.creditos||[],
        contas:     dados.fp_contas||dados.contas||[],
        ativos:     dados.fp_ativos||dados.ativos||[],
        investimentos: dados.fp_inv||dados.investimentos||[],
        pprs:       dados.fp_pprs||dados.pprs||[],
        subscricoes:dados.fp_subs||dados.subscricoes||[],
        previsoes:  dados.fp_prev||dados.previsoes||[]
      };

      transacoes=Array.isArray(fonte.transacoes)?fonte.transacoes:[];
      orcamentos=typeof fonte.orcamentos==='object'&&!Array.isArray(fonte.orcamentos)?fonte.orcamentos:{};
      metas=Array.isArray(fonte.metas)?fonte.metas:[];
      creditos=Array.isArray(fonte.creditos)?fonte.creditos:[];
      contas=Array.isArray(fonte.contas)?fonte.contas:[];
      ativos=Array.isArray(fonte.ativos)?fonte.ativos:[];
      investimentos=Array.isArray(fonte.investimentos)?fonte.investimentos:[];
      pprs=Array.isArray(fonte.pprs)?fonte.pprs:[];
      subscricoes=Array.isArray(fonte.subscricoes)?fonte.subscricoes:[];
      previsoes=Array.isArray(fonte.previsoes)?fonte.previsoes:[];

      sv('fp_tx',transacoes);
      sv('fp_orc',orcamentos);
      sv('fp_metas',metas);
      sv('fp_cred',creditos);
      sv('fp_contas',contas);
      sv('fp_ativos',ativos);
      sv('fp_inv',investimentos);
      sv('fp_pprs',pprs);
      sv('fp_subs',subscricoes);
      sv('fp_prev',previsoes);

      const total=transacoes.length+metas.length+creditos.length+contas.length+ativos.length+investimentos.length+pprs.length+subscricoes.length;
      msg.style.color='var(--green)';
      msg.innerHTML='✓ Importados com sucesso — '+total+' registos!';
      renderStorageInfo();
      // Re-render tudo sem precisar de reload
      populaSelectContas();
      renderDash();
      renderTx();
      renderOrc();
      renderMetas();
      renderCreditos();
      renderContas();
      renderAtivos();
      renderInv();
      renderPPR();
      renderSubs();

    } catch(err){
      msg.style.color='var(--red)';
      msg.textContent='Erro: '+err.message+'. Certifica-te que é um ficheiro JSON válido exportado desta app.';
      console.error('Import error:',err);
    }
  };
  reader.onerror=()=>{
    msg.style.color='var(--red)';
    msg.textContent='Erro ao ler o ficheiro.';
  };
  reader.readAsText(file,'UTF-8');
}


function forcaMigracao(){
  const migrou=migrarDadosAntigos();
  const msg=document.getElementById('migracao-msg');
  msg.style.display='block';
  if(migrou){
    // Reload all data
    transacoes=ld('fp_tx',[]);
    orcamentos=ld('fp_orc',{});
    metas=ld('fp_metas',[]);
    creditos=ld('fp_cred',[]);
    contas=ld('fp_contas',[]);
    ativos=ld('fp_ativos',[]);
    investimentos=ld('fp_inv',[]);
    pprs=ld('fp_pprs',[]);
    subscricoes=ld('fp_subs',[]);
    msg.style.color='var(--green)';
    msg.innerHTML='<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg> Dados migrados!';
    populaSelectContas();
    renderDash();renderTx();renderOrc();renderMetas();
    renderCreditos();renderContas();renderAtivos();
    renderInv();renderPPR();renderSubs();
  } else {
    const diag=diagnosticoStorage();
    if(diag.length){
      msg.style.color='var(--text2)';
      msg.innerHTML='Chaves encontradas: '+diag.map(d=>d.chave+'('+d.registos+')').join(', ');
    } else {
      msg.style.color='var(--text3)';
      msg.innerHTML='Nenhum dado anterior encontrado. Os dados podem estar noutro browser ou já foram migrados.';
    }
  }
}

function renderStorageInfo(){
  const keys=['fp_tx','fp_orc','fp_metas','fp_cred','fp_contas','fp_ativos','fp_inv','fp_pprs','fp_subs'];
  const labels={fp_tx:'Transações',fp_orc:'Orçamentos',fp_metas:'Metas',fp_cred:'Créditos',fp_contas:'Contas',fp_ativos:'Ativos',fp_inv:'Investimentos',fp_pprs:'PPR',fp_subs:'Subscrições'};
  const rows=keys.map(k=>{
    const val=localStorage.getItem(k)||'';
    const bytes=new Blob([val]).size;
    const arr=JSON.parse(val||'[]');
    const count=Array.isArray(arr)?arr.length:Object.keys(arr).length;
    return`<div class="row"><div>${labels[k]}</div><div style="display:flex;gap:16px;font-family:var(--mono);font-size:12px">
      <span style="color:var(--text2)">${count} registos</span>
      <span style="color:var(--text3)">${(bytes/1024).toFixed(1)} KB</span>
    </div></div>`;
  }).join('');
  document.getElementById('storage-info').innerHTML=rows;
}




function eliminarTodosDados(){
  if(!confirm('Tens a certeza? Esta ação elimina TODOS os dados e não pode ser desfeita.')) return;
  ['fp_tx','fp_orc','fp_metas','fp_cred','fp_contas','fp_ativos','fp_inv','fp_pprs','fp_subs','fp_prev','fp_snapshots'].forEach(k=>localStorage.removeItem(k));
  transacoes=[];orcamentos={};metas=[];creditos=[];contas=[];ativos=[];investimentos=[];pprs=[];subscricoes=[];previsoes=[];
  renderDash();
  const msg=document.getElementById('import-msg');
  if(msg){msg.style.display='block';msg.style.color='var(--green)';msg.textContent='Todos os dados foram eliminados.';}
}


