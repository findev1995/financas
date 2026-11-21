# fin.pessoal — versão modular

Esta pasta substitui o `index.html` monolítico por uma estrutura modular, sem alterar o esquema de dados em `localStorage` nem o aspeto da aplicação.

## Colocação no repositório

1. Copia `index.html`, `css/`, `js/` e `sw.js` para a raiz do repositório.
2. Mantém os ficheiros atuais `manifest.json` e `icon.svg` na raiz, sem alterações.
3. Faz a publicação normal no GitHub Pages apenas quando quiseres.

Os caminhos são relativos à raiz do GitHub Pages. O Service Worker `sw.js` usa o cache `fin-pessoal-v10-modular` e inclui todos os novos ficheiros no cache inicial.

Os scripts permanecem em ordem clássica, em vez de `type="module"`, porque a interface existente usa atributos `onclick` no HTML. Assim, os nomes das funções continuam disponíveis para a interface, preservando o comportamento atual.
