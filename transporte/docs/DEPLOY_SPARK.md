# Yoka Transporte no Spark — integração com Apps Script existente

**Situação:** implementação pronta para homologação nas branches
`feature/transporte-appsscript-spark` dos repositórios
[`yoka-sorteios`](https://github.com/joaogerd/yoka-sorteios) e
[`cadastro-yoka`](https://github.com/joaogerd/cadastro-yoka).
**Não publicado nem testado contra os dados reais.** A implantação exige
algumas ações manuais no Apps Script e na console IAM.

## Arquitetura sem Blaze

- **Hosting e Firestore Spark** em `yoka-transporte` (inalterados até aprovação).
- **Authentication Firebase** (anônimo / Google) existente. O navegador emite
  Firebase ID token, enviado apenas pelo `postMessage` à ponte Apps Script.
- **Google Apps Script do cadastro Yoka**, na implantação existente, executado
  como o proprietário: uma página HTML incorporada (iframe) usa
  `google.script.run` para chamar `transporteSparkRpc`. O Apps Script confere
  o token por `accounts:lookup` do Firebase Authentication; cliente anônimo não
  pode gerar códigos e administrador requer e-mail Google previamente autorizado.
- **Cadastro oficial** em `presencasimplesyoka`: consulta restrita no servidor
  a `clubs/yoka_guaratingueta/athletes` por nascimento, com nome completo,
  status ativo e identificador estável. Nenhuma lista de crianças ou CPFs
  é exposta pelo frontend.
- **Respostas** em `yoka-transporte`:
  `transportTrips/{tripId}/responses/{athleteId}`, garantindo no máximo um
  documento por atleta e viagem mesmo com navegadores diferentes.
- **Autorização individual:** administrador gera código de uso único (20
  caracteres hexadecimais aleatórios), válida por 72 horas, e envia privadamente
  ao responsável do cadastro. O código é armazenado por hash SHA-256.
  A validação cria uma sessão vinculada ao UID do Firebase Auth e válida por
  até 14 dias, revogada se um novo código for emitido.
- Atualização de documentos via REST Firestore + OAuth da conta proprietária
  do Apps Script, com `LockService` e precondições de revisão. Não utiliza
  service accounts privadas no navegador, Cloud Functions ou faturamento Blaze.

## 1. Preparar código local

```bash
cd /media/extra/wrk/dev
git clone https://github.com/joaogerd/cadastro-yoka.git  # se ainda não existir
cd cadastro-yoka
git switch feature/transporte-appsscript-spark
npm run test:transporte-spark

cd ../yoka-sorteios
git switch feature/transporte-appsscript-spark
cd transporte
npm run check
```

O **projeto `cadastro-yoka` que está no GitHub pode estar defasado** em
relação à implantação Apps Script usada pelas famílias. NÃO usar `clasp push`
na implantação existente sem fazer backup e comparar todos os arquivos e
funções de produção. A mudança do `doGet` preserva as rotas de cadastro
e administração, mas uma substituição de outras partes do Apps Script
poderia causar perda de funcionalidades.

## 2. Configurar Apps Script em cópia de teste

No projeto Apps Script do cadastro Yoka existente, preparar **nova versão
ou cópia de homologação**, preservando a implantação atual.

Arquivos que devem ser incorporados à versão atual do projeto Apps Script:

- `src/TransporteSpark.js` (novo)
- `src/TransporteBridge.html` (novo)
- Novo bloco `pagina === 'transporte-ponte'` em `doGet` do
  `src/SistemaUnico.js` (mesclar com o `doGet` realmente publicado).
- Manter `FirestoreV2Bridge.js` com as funções REST já existentes:
  `caminhoDocumentoFirestoreV2_`, `obterDocumentoFirestoreV2_`,
  `montarWriteFirestoreV2_`, `requisitarFirestoreV2_`.

O arquivo `src/appsscript.json` já contém os escopos
`script.external_request`, `datastore` e `userinfo.email`.

Para uma cópia com ID do script próprio, configurar `.clasp.json` na raiz:
```json
{"scriptId":"ID_REAL_DA_COPIA_APPS_SCRIPT","rootDir":"src"}
```
Somente após conferir que o conteúdo remoto e o local são compatíveis:
```bash
npx clasp login
npx clasp status
npx clasp push
npx clasp deploy --description "Ponte Spark transporte Yoka"
```
O ID do Apps Script e o endereço de implantação devem vir do projeto
existente do usuário. Não usar `clasp create` se o objetivo é alterar o
cadastro atual. O endpoint público da implantação deve terminar em `/exec`,
nunca em `/dev`. Implantar **como o proprietário** e acesso **Qualquer pessoa**
(necessário para famílias com autenticação anônima no Firebase).

Nas **Propriedades do script** de teste:
```text
YOKA_TRANSPORTE_SPARK_ENABLED = SIM
YOKA_TRANSPORTE_SPARK_ORIGINS = https://yoka-transporte--<CANAL-DE-TESTE>.web.app
```
A propriedade de origens adicionais só aceita URLs de canais de preview
do próprio site Yoka Transporte. Em produção, a origem
`https://yoka-transporte.web.app` já é permitida.

**IMPORTANTE:** o Apps Script está configurado como `USER_DEPLOYING`
(executar como proprietário). Essa pessoa deve ter autorização **para ler**
o Firestore no `presencasimplesyoka` e **para gravar** no
`yoka-transporte`. Se o deploy é feito com `adyokafutsal@gmail.com`,
conferir o IAM dessa conta nos dois projetos. Conceder o mínimo necessário
(como papel Cloud Datastore User no projeto de transporte, quando aplicável).
Não habilitar leitura pública no Firestore do cadastro.

## 3. Configurar site para preview (sem publicar no live)

No `transporte/public/transport-bridge-config.js`, preencher a URL da
nova implantação Apps Script:

```js
export const TRANSPORT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/ID_REAL_DA_IMPLANTACAO/exec';
```

Esta URL pública não é senha. O backend continua exigindo identificação
Firebase, e-mail administrativo verificado ou código individual. Não incluir
`token`, CPF, dados pessoais ou service account no arquivo.

No diretório `transporte`, após conferir `firebase.json` e autenticação:
```bash
firebase login:use adyokafutsal@gmail.com
npm run check
npx firebase-tools hosting:channel:deploy spark-teste --project yoka-transporte
```

Anotar a URL exata gerada para o canal de preview e cadastrá-la em
`YOKA_TRANSPORTE_SPARK_ORIGINS` no Apps Script. Se essa variável mudar,
criar nova versão do Apps Script e republicar a implantação.

**Atenção:** um canal de preview usa o **Firestore de produção** do projeto
`yoka-transporte`; não é um banco isolado. Criar viagem de teste separada,
não usar a viagem real de 17/10 e remover dados de teste com autorização.
É possível testar o acesso com as regras atuais enquanto nenhuma família
real usa o novo fluxo. Não abrir escrita pública direta em Firestore.

## 4. Homologação obrigatória

- A página `/passageiros/` e os fluxos existentes do cadastro devem continuar.
- A ponte no iframe deve carregar em Chrome e também no celular;
  testar bloqueadores de cookies/iframes. Se a ponte for bloqueada, não
  publicar a versão Spark ainda: será necessário revisar o mecanismo de comunicação.
- Nome correto com nascimento errado, atleta inexistente/inativo e código
  inválido ou reutilizado devem receber mensagem genérica, sem expor cadastro.
- Um responsável com código válido pode confirmar ônibus (atleta +
  acompanhantes), carro, não irá e alterar sua escolha.
- A mesma criança em outro navegador não deve gerar duas respostas;
  código reemitido deve invalidar sessão anterior.
- A conta Google administradora gera códigos; pessoa sem permissão não pode.
- O painel administrativo deve mostrar contagem de passageiros correta.
- Testar Firestore REST gravando um documento de teste no `yoka-transporte`
  via autorização OAuth do Apps Script, sem alterar documentos antigos.

## 5. Migrar com segurança

O arquivo `transporte/firestore.verified.rules` contém as regras que
**bloqueiam criação e alteração direta de respostas por usuários anônimos**.
A escrita das famílias passa exclusivamente pelo Apps Script privilegiado.
ANTES de publicar, conferir as regras reais no Console Firebase e mesclar as
novas permissões com as atuais. **Nunca substituir regras legadas às cegas.**

Depois de aprovar os testes, coordenar:
1. Avisar as famílias sobre a janela de atualização e fechar confirmações
   enquanto se realiza a mudança.
2. Publicar regras mescladas no Firestore (bloqueio de resposta direta).
3. Publicar somente o Hosting novo:
   ```bash
   cd /media/extra/wrk/dev/yoka-sorteios/transporte
   npx firebase-tools deploy --only hosting --project yoka-transporte
   ```
4. Testar novamente a família e o painel, incluindo `/passageiros/`.

**Não executar** `firebase deploy --only functions`, `--only functions:verificado`
ou qualquer upgrade de billing. Esta implementação usa apenas Hosting,
Firestore, Firebase Authentication e Apps Script no Spark.

## Limites assumidos e melhorias futuras

O Apps Script possui cotas de execução, e a incorporação no iframe ainda
precisa ser validada nos navegadores dos responsáveis. A limitação por UID do
Firebase (10 verificações por hora) e código de alta entropia reduzem
tentativas, mas não substituem proteção antiabuso por IP para grandes volumes.
Respostas antigas identificadas por UID anônimo não são migradas
automaticamente. A primeira sessão restaurada é a do navegador atual;
atletas irmãos podem exigir processos de identificação individuais. A
possível duplicidade de acompanhantes entre respostas de irmãos continua
sendo um cuidado de organização do transporte.

Para o uso no Yoka, a administração controla a emissão de códigos e sua
entrega individual. Não enviar lista de atletas, datas ou códigos a grupos.
