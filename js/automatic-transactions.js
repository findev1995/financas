// ── MOVIMENTOS AUTOMÁTICOS ─────────────────────────────────────────
// Cada ocorrência tem uma chave determinística para nunca ser duplicada.
function dataLocalISO(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function dataComDia(ano,mes,dia){return new Date(ano,mes,Math.min(Math.max(1,+dia||1),new Date(ano,mes+1,0).getDate()));}
function saldoContaAte(contaId,dataISO){
  const c=contas.find(x=>x.id===contaId);if(!c)return 0;
  const delta=transacoes.filter(t=>t.contaId===contaId&&t.data<=dataISO).reduce((s,t)=>t.tipo==='receita'?s+(+t.valor||0):s-(+t.valor||0),0);
  return (+c.saldo||0)+delta;
}
var _autoKeys;
function criarMovimentoAutomatico(chave,{tipo,valor,cat,data,desc,contaId}){
  if(!(valor>0)||!data||_autoKeys.has(chave))return false;
  _autoKeys.add(chave);
  transacoes.unshift({id:Date.now()+Math.floor(Math.random()*100000),tipo,valor:+(+valor).toFixed(2),cat,data,desc,contaId:contaId||null,automatico:true,autoKey:chave});
  return true;
}
function processarMovimentosAutomaticos(){
  const hojeISO=dataLocalISO(new Date()), hojeData=new Date(hojeISO+'T00:00:00');
  let alterou=false;
  _autoKeys=new Set(transacoes.filter(t=>t.autoKey).map(t=>t.autoKey));
  const migrou=contas.some(c=>!c.autoDesde)||subscricoes.some(x=>!x.autoDesde)||creditos.some(x=>!x.autoDesde);
  // Migração segura: não cria retroativos para registos já existentes antes desta versão.
  contas=contas.map(c=>c.autoDesde?c:{...c,autoDesde:hojeISO});
  subscricoes=subscricoes.map(s=>s.autoDesde?s:{...s,autoDesde:hojeISO});
  creditos=creditos.map(c=>c.autoDesde?c:{...c,autoDesde:hojeISO});
  // Comissões: debitadas na própria conta, no dia configurado.
  contas.forEach(c=>{
    const desde=c.autoDesde||hojeISO;
    if(+c.comissao>0){
      const inicio=new Date(desde+'T00:00:00');
      for(let cur=new Date(inicio.getFullYear(),inicio.getMonth(),1);cur<=hojeData;cur.setMonth(cur.getMonth()+1)){
        const due=dataComDia(cur.getFullYear(),cur.getMonth(),c.comissaoDia||1), iso=dataLocalISO(due);
        if(iso>=desde&&iso<=hojeISO){
          const key=`conta:${c.id}:comissao:${iso}`;
          alterou=criarMovimentoAutomatico(key,{tipo:'despesa',valor:+c.comissao,cat:'Comissões bancárias',data:iso,desc:c.comissaoDesc||'Comissão de conta',contaId:c.id})||alterou;
        }
      }
    }
    // Juros creditados: diário, no último dia de cada mês ou no último dia do ano.
    if(+c.taxa>0&&c.juroPeriodo&&c.juroPeriodo!=='nenhum'){
      const inicio=new Date(desde+'T00:00:00');
      for(let cur=new Date(inicio);cur<=hojeData;cur.setDate(cur.getDate()+1)){
        const iso=dataLocalISO(cur), ultimoMes=new Date(cur.getFullYear(),cur.getMonth()+1,0).getDate()===cur.getDate();
        const ultimoAno=cur.getMonth()===11&&cur.getDate()===31;
        const devido=c.juroPeriodo==='diario'||(c.juroPeriodo==='mensal'&&ultimoMes)||(c.juroPeriodo==='anual'&&ultimoAno);
        if(!devido||iso<desde)continue;
        const key=`conta:${c.id}:juros:${iso}`;
        if(_autoKeys.has(key))continue;
        const saldo=saldoContaAte(c.id,iso);
        const taxaDia=(+c.taxa)/100/365;
        let juros=c.juroPeriodo==='diario'?saldo*taxaDia:c.juroPeriodo==='mensal'?saldo*(+c.taxa)/100/12:saldo*(+c.taxa)/100;
        juros=+juros.toFixed(2);
        if(juros>0){alterou=criarMovimentoAutomatico(key,{tipo:'receita',valor:juros,cat:'Juros bancários',data:iso,desc:`Juros creditados · ${c.nome}`,contaId:c.id})||alterou;}
      }
    }
  });
  // Subscrições: respeita periodicidade e conta de débito selecionada.
  subscricoes.filter(s=>s.ativa).forEach(s=>{
    const desde=s.autoDesde||hojeISO, inicio=new Date(desde+'T00:00:00');
    for(let cur=new Date(inicio.getFullYear(),inicio.getMonth(),1);cur<=hojeData;cur.setMonth(cur.getMonth()+1)){
      const m=cur.getMonth()+1, ano=cur.getFullYear();
      let ocorre=s.periodo==='mensal'||(s.periodo==='anual'&&m===(+s.mes||1));
      if(s.periodo==='trimestral')ocorre=((m-(+s.mes||1)+12)%3===0);
      if(s.periodo==='semestral')ocorre=((m-(+s.mes||1)+12)%6===0);
      if(!ocorre)continue;
      const due=dataComDia(ano,m-1,s.dia||1), iso=dataLocalISO(due);
      if(iso<desde||iso>hojeISO)continue;
      const key=`sub:${s.id}:${iso}`;
      alterou=criarMovimentoAutomatico(key,{tipo:'despesa',valor:+s.valor,cat:s.cat||'Subscrições',data:iso,desc:s.nome,contaId:s.contaId})||alterou;
    }
  });
  // Prestações de crédito: usa o plano de amortização já calculado pela aplicação.
  creditos.forEach(c=>{
    if(!c.contaId||!c.inicio||!c.prest)return;
    const desde=c.autoDesde||hojeISO;
    (planoCredito(c)||[]).forEach(r=>{
      const iso=dataLocalISO(r.data);
      if(iso<desde||iso>hojeISO||!(r.prest>0))return;
      const key=`credito:${c.id}:${iso}`;
      alterou=criarMovimentoAutomatico(key,{tipo:'despesa',valor:+r.prest,cat:'Prestação de crédito',data:iso,desc:`Prestação · ${c.nome}`,contaId:c.contaId})||alterou;
    });
  });
  if(alterou)sv('fp_tx',transacoes);
  if(migrou){sv('fp_contas',contas);sv('fp_subs',subscricoes);sv('fp_cred',creditos);}
  return alterou;
}
