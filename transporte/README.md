# Yoka Transporte

Aplicativo móvel/web para organizar transportes de jogos e competições do Yoka. Frontend estático no Firebase Hosting, Firestore como backend com regras próprias, Firebase Authentication (anônimo para responsáveis, Google para administradores).

## Funcionalidades

- Família escolhe viagem e responde `Ônibus/van`, `Carro próprio` ou `Não iremos`.
- Registra nome do responsável, WhatsApp, atleta(s), categoria e quantidade total de lugares (incluindo atletas e acompanhantes).
- Uma confirmação por UID anônimo/autenticado e por viagem. A família pode alterar usando o mesmo navegador/perfil Firebase enquanto as confirmações estiverem abertas.
- Administrador autenticado cria/edita viagens; publica, encerra e reabre; adiciona/remove veículos com capacidade variável. Modelos iniciais: 60, 45, 18 e 15 lugares, apenas 60 habilitado inicialmente.
- Planejador procura combinação de veículos com menor quantidade e menor capacidade ociosa, mantendo grupos familiares indivisíveis. Quando não encontra encaixe, mostra pendências e não afirma que todos estão alocados.
- Administrador vê respostas em tempo real, ajusta manualmente alocações, remove duplicatas, exporta CSV, imprime lista e copia link direto da viagem.

## Segurança e privacidade

O cadastro de atletas fica no projeto `presencasimplesyoka` e NÃO é exposto a famílias pelo frontend. O aplicativo de transporte utiliza um conjunto separado de coleções no projeto `yoka-sorteio`: `transportTrips`, `transportAdmins` e suas subcoleções `responses`. O nome informado da criança é coletado diretamente do responsável. A integração automática com o cadastro existente exige uma credencial/ponte administrativa explícita no projeto original e não é ativada por padrão.

- Famílias só conseguem ver suas próprias respostas. Só administradores podem listar todas, configurar viagens e alocar veículos.
- Quem tem o link público consegue ver informações publicadas da viagem, mas não a lista de crianças/WhatsApps.
- Evite informar dados sensíveis em `notes` e não publique CSV com telefones fora da organização.
- Firebase Auth anônimo é vinculado ao navegador; se usar outro celular ou limpar dados poderá gerar nova confirmação (administrador consegue remover duplicata).
- Não coloque a service account no frontend nem faça `admin=true` no navegador sem regras.

## Configuração Firebase necessária

1. Usar projeto Firebase `yoka-sorteio` (mesmo projeto do Sorteios), mas criar **outro site Hosting**, ID `yoka-transporte`, sem alterar `yoka-sorteios`.
2. No projeto `yoka-sorteio`, habilitar **Cloud Firestore** no banco padrão `(default)` (se ainda não estiver habilitado).
3. Ativar Firebase Authentication: provedores **Anônimo** e **Google**. Adicionar `yoka-transporte.web.app` aos domínios autorizados se necessário.
4. Publicar regras `firestore.rules`. **Antes de publicar**, verifique se já há outras coleções/regras no projeto; a publicação substitui as regras existentes. Se houver outros aplicativos usando o mesmo banco, faça merge das regras de `transportTrips`/`transportAdmins` e preserve as atuais. Nunca publique este arquivo isoladamente sobre regras de outro app.
5. O Hosting serve automaticamente `/__/firebase/init.json` com config do projeto. Fora do Hosting, copie `public/firebase-config.local.js.example` para `public/firebase-config.local.js` com a config Web do Console Firebase.
6. Faça login no site com a conta Google que será administradora (o erro inicial informará seu UID). No Console Firebase > Firestore > Iniciar coleção `transportAdmins` > ID do documento = UID > campo booleano `active = true`. Recarregue a página. **Esse passo é indispensável** e não pode ser autorizado pelo próprio navegador.
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
npx firebase-tools@15.33.0 hosting:sites:create yoka-transporte --project yoka-sorteio  # somente a primeira vez
npx firebase-tools@15.33.0 deploy --only hosting --project yoka-sorteio
# Regras APENAS após verificar compatibilidade com o banco existente:
npx firebase-tools@15.33.0 deploy --only firestore:rules --project yoka-sorteio
```

## Organização do repositório

O código pode viver em `transporte/` na branch `transporte` do repositório `joaogerd/yoka-sorteios`, sem alterar a versão principal do sorteador. Um workflow próprio na branch executa `npm test`, garante a existência do Hosting `yoka-transporte` e publica **somente Hosting** usando o secret já existente `FIREBASE_SERVICE_ACCOUNT_YOKA_SORTEIO`. Regras Firestore requerem uma publicação separada e consciente.
