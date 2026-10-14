> **DOCUMENTO HISTÓRICO:** este guia descreve a alternativa de Cloud Functions
> que exigiria Blaze. Para a implementação adotada no plano Spark, leia
> [DEPLOY_SPARK.md](DEPLOY_SPARK.md).
> NÃO seguir as instruções de Functions ou de faturamento abaixo.

# Yoka Transporte — cadastro verificado de atletas (implantação controlada)

## Situação
Esta implementação está na branch `feature/transporte-cadastro-verificado` e **NÃO
foi publicada em produção**. O site existente e a página `/passageiros/` devem
continuar funcionando até a validação do fluxo completo.

### Fonte oficial dos dados
- Projeto de transporte: `yoka-transporte`
- Projeto do cadastro: `presencasimplesyoka`
- Atletas: `clubs/yoka_guaratingueta/athletes/{athleteId}`
- Perfis privados: `clubs/yoka_guaratingueta/athleteProfiles/{athleteId}`
- Campos exigidos dos atletas: `name`, `birthDate` no formato AAAA-MM-DD,
  `categoryCode`, `isActive=true`, `deleted != true`.

Conferir antes de publicar se a sincronização/migração do cadastro realmente
preencheu os documentos de todos os atletas elegíveis na produção. No repositório
do Cadastro Yoka, `src/FirestoreV2Bridge.js` descreve esse esquema, mas sua
presença no código não comprova que a migração foi concluída.

## Experiência das famílias
1. Selecionar viagem publicada com confirmações abertas.
2. Informar **nome completo + nascimento + código individual do Yoka**.
3. A Cloud Function consulta o cadastro oficial sem expor a lista de atletas.
4. A função consome o código (uso único) e cria uma sessão autorizada para
   aquele atleta e aquele navegador.
5. Informar se vai de ônibus/van, carro ou não vai; lugares de ônibus incluem
   atleta e acompanhantes associados a essa resposta.
6. A função grava em `transportTrips/{tripId}/responses/{athleteId}`: **um
   documento por atleta por viagem**, independentemente de outro aparelho.
7. Pelo mesmo navegador a sessão permite correções até encerrar a viagem;
   em outro dispositivo a administração pode reemitir código, revogando a
   sessão anterior.

Nome e data de nascimento são dados pessoais de menores, **não são
autenticação forte**. O código entregue PRIVADAMENTE ao responsável é obrigatório;
sem ele a família não pode responder. Não solicitar CPF, não retornar perfis
completos, não imprimir códigos em mensagens públicas e não registrar essas
informações em logs.

### Administração
O administrador logado via Google pode informar nome + nascimento, gerar um
código de 12 caracteres aleatórios (60 bits) válido por 72 horas, identificar
o número de contato registrado e enviar a mensagem manualmente de forma
privada. O código é armazenado apenas como SHA-256, nunca em texto claro.
O site não envia mensagens automaticamente nem promete validação do titular do
celular. Para melhor segurança futuramente, preferir SMS OTP ou outro canal
que comprove posse do contato.

## Requisitos técnicos, antes do deploy

1. **Revisar permissões de produção**. Confirmar os esquemas e dados no Firestore
   `presencasimplesyoka`. Não abrir leituras ao público nem permitir queries
   de `athleteProfiles` pelo frontend.
2. Habilitar as APIs de Cloud Functions 2ª geração, Cloud Run, Cloud Build,
   Artifact Registry e Firestore, com faturamento adequado, no projeto
   `yoka-transporte`, se ainda necessário.
3. Descobrir qual **service account de runtime** será usada pelas Functions
   no projeto `yoka-transporte`. Conceder-lhe somente permissão de leitura
   no projeto `presencasimplesyoka` (ex.: `roles/datastore.viewer`), nunca
   acesso público, jamais incorporar chave privada no JavaScript do navegador.
   O acesso cruzado usa ADC do Admin SDK via IAM; sem esta etapa as consultas
   do cadastro retornarão erro de permissão.
4. Instalar as dependências em `transporte/functions` e testar:
   ```sh
   cd transporte
   npm run check
   npm --prefix functions install
   ```
5. **Deploy isolado** das novas funções, usando o codebase `verificado`,
   preservando as antigas Functions do cadastro de passageiros:
   ```sh
   cd transporte
   npx firebase-tools deploy --only functions:verificado \
     --config firebase.functions.json --project yoka-transporte
   ```
   Não executar `firebase deploy --only functions` com configuração genérica:
   isso pode ocasionar propostas de exclusão de funções legadas.
6. Validar as funções com App Check Enterprise e uma conta administradora real:
   gerar um código para atleta ativo de teste, validar e gravar resposta.
   Verificar que pessoa não cadastrada, código inválido/reutilizado e data
   errada não recebem acesso; não registrar dados pessoais em logs.
7. **Conferir integralmente** regras de produção atuais. O arquivo
   `firestore.verified.rules` parte das regras legadas informadas em
   13/10/2026, mas pode estar desatualizado. Mesclar com o estado atual antes
   de publicar. A diferença crucial é impedir `create/update` direto de
   `responses` pelo cliente anônimo; apenas a administração e o Admin SDK
   do backend gravam, evitando falsificação do ID de atleta.
8. Publicar as regras revisadas e, na mesma janela curta de manutenção,
   publicar o Hosting da branch testada. **Não misturar atualização de regras
   com a rotina de deploy do Hosting**. A ordem é intencional: backend válido,
   regras seguras, frontend novo. O intervalo pode interromper respostas na
   versão antiga; avisar a administração antes da troca.
9. Testar diretamente `/passageiros/` e suas Cloud Functions antigas após a
   publicação, além do fluxo do transporte e painel de administração.

## Limitações e melhorias futuras
- CPF não é solicitado; nome e nascimento não são suficientes sem o código.
- O emissor precisa entregar cada código privadamente; ainda não há integração
  automática com WhatsApp ou SMS.
- A primeira sessão recuperável do navegador é restaurada; irmãos podem
  validar códigos separados, mas agrupamento automático de irmãos/veículos
  permanece uma melhoria futura. Conferir passageiros/acompanhantes para não
  computar familiares duas vezes.
- Respostas antigas no esquema `responses/{anonymousUid}` não são migradas
  automaticamente; devem ser auditadas pela administração antes de remover.
- Uma reemissão invalida sessões anteriores para o atleta/viagem. Uma resposta
  existente é atualizada no mesmo documento, não duplicada.
- App Check + Firebase Auth + limitação por UID (10 tentativas/hora) reduzem
  abusos, mas não substituem limites por IP e monitoramento em escala; validar
  quotas antes do lançamento.

## Arquivos
- `functions/index.js`: emissão, verificação, restauração e submissão server-side.
- `functions/security-core.js`: normalização, validação, geração e hash.
- `public/verified-flow.js`: jornada de acesso do responsável e emissão no painel.
- `firestore.verified.rules`: regras candidatas para revisão e mesclagem.
- `firebase.functions.json`: codebase dedicado, sem alteração das Functions legadas.
