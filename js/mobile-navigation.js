if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister()));
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

// ── MOBILE NAV ──────────────────────────────────────────────
const MP_GROUPS = {
  dinheiro:   [{id:'transacoes',label:'Transações'},{id:'contas',label:'Contas'},{id:'previsao',label:'Previsão'},{id:'orcamento',label:'Orçamento'}],
  obrigacoes: [{id:'creditos',label:'Créditos'},{id:'mapa',label:'Mapa prestações'},{id:'simulador',label:'Simulador'},{id:'subscricoes',label:'Subscrições'},{id:'calendario',label:'Calendário'}],
  patrimonio: [{id:'ativos',label:'Ativos'},{id:'poupancas',label:'Poupanças'},{id:'investimentos',label:'Investimentos'},{id:'ppr',label:'PPR / Pensões'}],
  settings:   [{id:'orcamento',label:'Orçamento'},{id:'backup',label:'Backup'}]
};
function mpShowPage(id){mostrarPagina(id);}
function mpDash(){
  document.querySelectorAll('.mp-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('mp-dashboard').classList.add('active');
  const sec=document.getElementById('mobile-secondary');
  sec.classList.remove('show'); sec.innerHTML='';
  mpShowPage('dashboard');
}
function mpGroup(g){
  document.querySelectorAll('.mp-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('mp-'+g).classList.add('active');
  const items=MP_GROUPS[g];
  const sec=document.getElementById('mobile-secondary');
  sec.classList.add('show');
  sec.innerHTML=items.map((it,i)=>`<div class="ms-item${i===0?' active':''}" id="ms-${it.id}" onclick="mpSub('${it.id}')">${it.label}</div>`).join('');
  mpShowPage(items[0].id);
}
function mpSub(id){
  document.querySelectorAll('.ms-item').forEach(el=>el.classList.remove('active'));
  const el=document.getElementById('ms-'+id);
  if(el) el.classList.add('active');
  mpShowPage(id);
}
