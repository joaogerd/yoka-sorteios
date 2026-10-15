# Yoka Transporte — implementação Spark, Firestore e Apps Script

## Situação (15/10/2026)

- Backend final em branch `feature/transporte-appsscript-spark` do
  [cadastro-yoka](https://github.com/joaogerd/cadastro-yoka/tree/feature/transporte-appsscript-spark).
- Frontend final em branch `feature/transporte-appsscript-spark` do
  [yoka-sorteios](https://github.com/joaogerd/yoka-sorteios/tree/feature/transporte-appsscript-spark/transporte).
- Preview publicado sem Blaze:
  https://yoka-transporte--spark-verificado-flq3r1mo.web.app
- **A integração em produção ainda depende da publicação do Apps Script original**.
  O Hosting oficial `https://yoka-transporte.web.app` permanece inalterado.

## Fonte de dados — sem planilha

- Cadastro: Firestore `presencasimplesyoka`, coleção
  `clubs/yoka_guaratingueta/athletes`, com `name`,
  `birthDate`, `isActive`, `deleted`, `categoryCode`.
- Contatos particulares do responsável: coleção
  `clubs/yoka_guaratingueta/athleteProfiles`.
- Viagens e respostas: Firestore `yoka-transporte`, subcoleção
  `transportTrips/{tripId}/responses/{athleteId}`.
- A ponte usa o token OAuth da conta que **executa** o Apps Script. O navegador
  autentica-se no Firebase transporte, encaminha Firebase ID token para o
  Apps Script, que valida identidade no Identity Toolkit e controla as operações.
- O responsável informa nome completo, nascimento e código individual de uso único
  enviado privadamente pela organização; a validação cria uma sessão vinculada ao
  UID anônimo ou Google do Firebase transporte.
- Administração pode gerar códigos e conferir acesso aos dois Firestores no
  botão **Verificar conexão com o cadastro**.

## Passo único necessário para habilitar o backend

Não substituir todo o Apps Script pelo checkout do GitHub, porque ele pode
conter diferenças em relação ao código realmente publicado. Em vez disso,
**o instalador automatizado baixa o projeto vivo, cria backup, acrescenta dois
arquivos e somente a rota `transporte-ponte`**, e republica a implantação
existente preservando a URL `/exec` já usada pelas famílias.

No Pop!_OS, depois de clonar o repositório `cadastro-yoka`:

```sh
cd /media/extra/wrk/dev/cadastro-yoka
git fetch origin
git switch feature/transporte-appsscript-spark
bash tools/publicar-transporte-spark.sh
```

É necessária a autenticação interativa `clasp login` na conta
`joao.gerd@gmail.com`, atual proprietária do Apps Script. Se solicitar
ativar Google Apps Script API, habilitar em
https://script.google.com/home/usersettings.

O script não mexe na planilha, não cria outro Firebase, não habilita
faturamento e não transfere propriedade de arquivos.
Guarda um backup da versão original em `~/yoka-appsscript-backups/`.
A URL utilizada permanece:

https://script.google.com/macros/s/AKfycbwxEnjLwGJsnmCyEsNVRuibVTJDLQ8gR6VqkygoYsn482pVIyrxMuLhQlgyevDcjB3l/exec

## IAM e testes de integração

A conta `joao.gerd@gmail.com`, que executa o Apps Script, precisa
ter permissão OAuth de leitura no projeto `presencasimplesyoka` (já utilizada
pelo cadastro) **e de leitura/escrita** no Firestore do `yoka-transporte`.
A permissão de administrador apenas nas *Firebase Security Rules* NÃO equivale
a um papel IAM para usar a API REST com OAuth Google.

Após implantar o Apps Script, acessar o preview e entrar no painel como admin;
clicar **Verificar conexão com o cadastro**. Status 403 de `transporte`
indica que falta conceder à conta executora um papel IAM apropriado, por
exemplo `roles/datastore.user` no projeto `yoka-transporte`, via
https://console.cloud.google.com/iam-admin/iam?project=yoka-transporte.
Evitar Owner/Editor amplos.

Efetuar teste com um atleta de teste sem divulgar dados pessoais: gerar código,
validar no navegador da família, confirmar ônibus e acompanhantes; tentar
outra resposta para o mesmo atleta (deve atualizar, não duplicar). Conferir
ausência, carro, encerramento de viagem, proteção contra código reutilizado e
o painel administrativo.

## Publicação do frontend oficial

**Somente depois de validar o preview e o backend:**

```sh
cd /media/extra/wrk/dev/yoka-sorteios
git fetch origin
git switch feature/transporte-appsscript-spark
cd transporte
npm run check
firebase login:use adyokafutsal@gmail.com
npx firebase-tools deploy --only hosting --project yoka-transporte
```

Antes da publicação, as regras Firestore no Console precisam permitir que
**apenas o Apps Script autenticado por OAuth IAM / administradores** gravem
`transportTrips/{tripId}/responses/{athleteId}`: revisar e mesclar
`firestore.verified.rules` com regras **atuais**, sem eliminar coleções de
passageiros do site legado.

A implantação do novo Hosting sem essas regras deixaria o antigo
`responses/{anonymousUid}` público para escrita direta e enfraqueceria a
garantia de resposta única. Portanto a etapa de revisão das regras é
obrigatória. O comando acima não atualiza regras.

**Limitação:** o preview não comprova acesso entre os dois projetos;
precisa do deploy Apps Script e da confirmação no botão de diagnóstico.
Nenhum código de acesso de menor deve ir para grupos públicos.
