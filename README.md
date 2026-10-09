# Yoka Sorteios 1.0

## Experimentar agora
Abra `Yoka_Sorteios.html` no Chrome, Edge ou Firefox atualizado. Essa página autônoma inclui o mesmo código do site. Dados do arquivo local e do endereço Firebase são separados: exporte e restaure o comprovante para transferir uma rifa.

1. Informe o nome da rifa e cole SOMENTE os números vendidos, ou importe CSV.
2. Confira toda a lista e confirme o bloqueio.
3. Informe o prêmio e clique em Sortear número.
4. Para outro prêmio, altere o campo e sorteie novamente. Um número não ganha duas vezes no evento; uma pessoa com vários números pode ganhar novamente.
5. Baixe o comprovante JSON. A opção Imprimir permite salvar PDF pelo navegador.

CSV UTF-8: cabeçalho `numero,nome` ou `numero;nome`; `nome` é opcional. Há um exemplo em `exemplo-vendidos.csv`. CSV aceita nomes com vírgulas entre aspas. XLSX não é suportado. Lista com duplicados ou inválidos precisa ser corrigida antes da confirmação. `001` e `1` representam o mesmo número. Limites: 50 mil números de até 9 algarismos, CSV 5 MB, backup 10 MB.

## Firebase
Projeto: `yoka-sorteio`. Site desejado: `yoka-sorteios`. Conta: `adyokafutsal@gmail.com`.
Este pacote NÃO contém credenciais e não precisa de Firestore, Functions ou Analytics.

No computador com Node.js instalado, abra o terminal na pasta extraída:

```bash
npx firebase-tools login
npx firebase-tools hosting:sites:list --project yoka-sorteio
```
Se `yoka-sorteios` ainda não existir no projeto, execute:

```bash
npx firebase-tools hosting:sites:create yoka-sorteios --project yoka-sorteio
```
O ID do site precisa estar disponível. Se pertencer a outro projeto, não altere o destino sem verificar. Após confirmar o site:

```bash
npx firebase-tools deploy --only hosting --project yoka-sorteio
```
URL esperada após deploy confirmado: https://yoka-sorteios.web.app
O endereço não está publicado pelo simples recebimento deste pacote. Faça login na conta informada quando o navegador abrir. Nunca envie senha ou token por conversa.

## Dados e limites
Registros ficam no navegador e dispositivo. Não há sincronização, login administrativo ou publicação automática de nomes. Não use navegação anônima para guardar o evento. Download deve ser conferido na pasta de downloads antes de fechar o navegador.
O comprovante é um registro local editável, não uma certificação independente do sorteio. O aplicativo usa Web Crypto com rejeição para probabilidades iguais e Web Locks para serializar ações entre abas da mesma origem. Sem suporte a locks, o sorteio é bloqueado. O resultado é salvo antes da animação, que não muda o vencedor. Uma falha de armazenamento impede prosseguir.

## Desenvolvimento
Sem dependências em execução. `npm test` executa testes com Node.js 22 ou posterior. Arquivos publicados: `public/`. Para servir localmente: `python3 -m http.server 8080 --directory public`, depois abra http://localhost:8080.
