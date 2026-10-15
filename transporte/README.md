# Yoka Transporte — versão sem Blaze (Spark)

> **Em homologação:** o fluxo protegido por nome completo, data de nascimento
> e WhatsApp do responsável cadastrado utiliza agora o Google Apps Script já existente no
> cadastro oficial do Yoka. A branch `feature/transporte-appsscript-spark`
> ainda NÃO foi publicada. O site de produção continua preservado.
>
> **Instruções atualizadas:** [docs/DEPLOY_SPARK.md](docs/DEPLOY_SPARK.md).
>
> O guia histórico abaixo descreve o protótipo anterior (com códigos). NÃO executar
> o comando de deploy de Cloud Functions mencionado nele.

# Yoka Transporte

> **Novo fluxo em homologação:** esta branch contém a integração com o cadastro
> oficial de atletas usando nome completo + nascimento + telefone registrado.
> As funções, regras e interface estão preparadas, porém **não estão publicadas**.
> Antes do deploy leia [docs/CADASTRO_VERIFICADO.md](docs/CADASTRO_VERIFICADO.md).
> O site em produção permanece com o fluxo antigo até a implantação controlada.
> Os demais tópicos abaixo descrevem a versão atualmente publicada.
>
Aplicativo móvel/web para organizar transportes de jogos e competições do Yoka. Frontend estático no Firebase Hosting, Firestore como backend com regras próprias, Firebase Authentication (anônimo para responsáveis, Google para administradores).

## Funcionalidades

- Família escolhe viagem e responde `Ônibus/van`, `Carro próprio` ou `Não iremos`.
- Registra nome do responsável, WhatsApp, atleta(s), categoria e quantidade total de lugares (incluindo atletas e acompanhantes).
- Uma confirmação por UID anônimo/autenticado e por viagem. A família pode alterar usando o mesmo navegador/perfil Firebase enquanto as confirmações estiverem abertas.
- Administrador autenticado cria/edita viagens; publica, encerra e reabre; adiciona/remove veículos com capacidade variável. Modelos iniciais: 60, 45, 18 e 15 lugares, apenas 60 habilitado inicialmente.
- Planejador procura combinação de veículos com menor quantidade e menor capacidade ociosa, mantendo grupos familiares indivisíveis. Quando não encontra encaixe, mostra pendências e não afirma que todos estão alocados.
- Administrador vê respostas em tempo real, ajusta manualmente alocações, remove duplicatas, exporta CSV, imprime lista e copia link direto da viagem.

## Segurança e privacidade

O cadastro de atletas fica no projeto `presencasimplesyoka` e NÃO é exposto a famílias pelo frontend. O aplicativo de transporte utiliza um conjunto separado de coleções no projeto `yoka-transporte`: `transportTrips`, `transportAdmins` e suas subcoleções `responses`. O nome informado da criança é coletado diretamente do responsável. Respostas potencialmente repetidas são sinalizadas no painel, mas **o sistema não garante um voto único por atleta registrado** sem a futura integração autenticada com o cadastro. A integração automática com o cadastro existente exige uma credencial/ponte administrativa explícita no projeto original e não é ativada por padrão.

- Famílias só conseguem ver suas próprias respostas. Só administradores podem listar todas, configurar viagens e alocar veículos.
- Quem tem o link público consegue ver informações publicadas da viagem, mas não a lista de crianças/WhatsApps.
- Evite informar dados sensíveis em `notes` e não publique CSV com telefones fora da organização.
- Firebase Auth anônimo é vinculado ao navegador; se usar outro celular ou limpar dados poderá gerar nova confirmação (administrador consegue remover duplicata).
- Não coloque a service account no frontend nem faça `admin=true` no navegador sem regras.

## Configuração Firebase necessária

1. Usar projeto Firebase **existente** `yoka-transporte`, que já tem o site `yoka-transporte.web.app` e a página `/passageiros/`. Preservar o fluxo antigo na publicação. NÃO criar outro site.
2. No projeto `yoka-transporte`, conferir **Cloud Firestore** no banco padrão `(default)` (se ainda não estiver habilitado).
3. Conferir/ativar Firebase Authentication: provedores **Anônimo** e **Google**. Adicionar `yoka-transporte.web.app` aos domínios autorizados se necessário.
4. As regras atuais foram fornecidas pelo responsável do projeto em 13/10/2026. O arquivo [`firestore.merged.rules`](firestore.merged.rules) contém as regras **completas**: preserva as coleções `passengerInvites`, `accessCodes`, `passengerStatus` e `passengerData` e acrescenta apenas `transportAdmins` e `transportTrips`. Antes de publicar, confira se o editor Firebase ainda possui exatamente as regras legadas informadas; em caso positivo, substitua todo o conteúdo do editor pelo arquivo mesclado. Se tiverem ocorrido alterações posteriores, faça uma nova mesclagem (não sobrescreva regras novas). O `firebase.json` deste site intencionalmente não faz deploy das regras. O arquivo [`firestore.merge-snippet.rules`](firestore.merge-snippet.rules) é somente o fragmento alternativo para mesclagem manual.
5. O Hosting serve automaticamente `/__/firebase/init.json` com a configuração do projeto. Fora do Hosting, o app reutiliza a configuração Web pública do mesmo projeto em `public/firebase-config.js`. Opcionalmente, `public/firebase-config.local.js` prevalece quando `init.json` não está disponível.
6. As contas Google **`joao.gerd@gmail.com`** e **`adyokafutsal@gmail.com`** estão autorizadas diretamente nas regras e são reconhecidas no novo site. Para autorizar administradores adicionais, faça login com a conta Google desejada e copie o UID exibido no erro inicial; no Console Firebase > Firestore > coleção `transportAdmins` > ID do documento = UID > campo booleano `active = true`. Recarregue a página. As contas autorizadas por e-mail não exigem documento extra.
7. Crie uma viagem e confira a confirmação em outro navegador/celular, inclusive a atualização em tempo real no painel.

## Desenvolvimento local

```sh
npm test
# Servir a pasta public com qualquer servidor HTTP para o desenvolvimento:
python3 -m http.server 8081 -d public
```

## Publicação manual

```sh
npm test
npx firebase-tools@15.33.0 deploy --only hosting --project yoka-transporte
# NÃO publicar firestore.rules isoladamente: mesclar com regras atuais do projeto existente primeiro.
```

## Organização do repositório

O código vive em `transporte/` na branch `transporte` de `joaogerd/yoka-sorteios`, sem alterar a versão principal do sorteador. O workflow de testes é automático. A publicação é **somente manual** via [GitHub Actions > Implantar Yoka Transporte (manual)](https://github.com/joaogerd/yoka-sorteios/actions/workflows/yoka-transporte-deploy.yml), cujo workflow de disparo fica na branch `main` e faz checkout do código atualizado da branch `transporte`. Antes, cadastrar no [GitHub > Settings > Secrets and variables > Actions](https://github.com/joaogerd/yoka-sorteios/settings/secrets/actions) uma credencial do projeto certo no secret `FIREBASE_SERVICE_ACCOUNT_YOKA_TRANSPORTE`. Nunca divulgar nem commitar o JSON da credencial. **Só disparar depois da publicação das regras mescladas e ativação dos provedores Auth. A conta administrativa legada já é autorizada; administradores adicionais exigem documento de UID.** O workflow publica apenas Hosting e não muda Firestore, Authentication nem Cloud Functions. O conteúdo anterior `/passageiros/`, sua folha de estilo e configuração Firebase deve ser preservado.

## Compatibilidade com o sistema antigo

O site existente hospeda a página `/passageiros/` (com credenciais e cadastro via código individual), cujo acesso deve continuar funcionando. O frontend existente usa App Check Enterprise e Cloud Functions de confirmação por convite. **Esta versão introduz viagens com respostas próprias; não migra automaticamente confirmações antigas.** Não elimine coleções, Functions ou regras atuais.