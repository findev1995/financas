// Initialisation deliberately runs after every feature file has loaded.
// The app keeps classic scripts because the existing HTML uses inline onclick
// handlers; this preserves their global names and the current localStorage schema.
const RENDERS={
  dashboard:renderDash, transacoes:renderTx, orcamento:renderOrc,
  poupancas:renderMetas, creditos:renderCreditos, mapa:renderMapaInit,
  simulador:renderSim, previsao:renderPrev, contas:renderContas,
  ativos:renderAtivos, calendario:renderCal, investimentos:renderInv,
  ppr:renderPPR, subscricoes:renderSubs, backup:renderStorageInfo
};

document.getElementById('t-data').value=hoje.toISOString().split('T')[0];
populaSelectContas();
processarMovimentosAutomaticos();
renderDash();
