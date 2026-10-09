# Publicação automática

Cada push na branch `main` executa os testes e, se passarem, publica a pasta `public/` em https://yoka-sorteios.web.app.
Pull requests para main executam testes, sem publicação. O workflow também aceita execução manual em Actions → Testar e publicar no Firebase → Run workflow (branch main).
Não há instalação de dependências para os testes porque o aplicativo não tem dependências npm. A CLI do deploy está fixada em 15.33.0.

## Ativação única

O login Firebase no computador não autentica o GitHub Actions. Cadastre uma conta de serviço do projeto `yoka-sorteio`:

1. Acesse https://console.cloud.google.com/iam-admin/serviceaccounts?project=yoka-sorteio com adyokafutsal@gmail.com.
2. Crie a conta `github-yoka-sorteios`.
3. Conceda os papéis **Firebase Hosting Admin** (`roles/firebasehosting.admin`) e **API Keys Viewer** (`roles/serviceusage.apiKeysViewer`). O site é estático e só publica no canal live: não precisa de permissões para Auth previews ou Cloud Run.
4. Abra essa conta → Chaves → Adicionar chave → Criar nova chave → JSON.
5. Em https://github.com/joaogerd/yoka-sorteios/settings/secrets/actions crie um **Repository secret** com o nome exato `FIREBASE_SERVICE_ACCOUNT_YOKA_SORTEIO`. Cole o conteúdo completo do JSON como valor.
6. Guarde a chave fora do repositório. Não faça commit dela nem envie por conversa.
7. Execute o workflow manualmente pela aba Actions, usando main, ou reexecute uma execução que tenha falhado por falta da credencial.

Sem o secret, os testes podem passar, mas o deploy falha com mensagem indicando a configuração pendente. Se houver erro de permissão, confirme o projeto da chave e os papéis atribuídos.

## Atualizações

Faça alterações nos arquivos de `public/`, rode `npm test`, commit e push em main. A página autônoma `Yoka_Sorteios.html` não é a fonte publicada no Firebase; editar apenas esse arquivo não modifica o site.

Acompanhe os resultados em https://github.com/joaogerd/yoka-sorteios/actions. Não considere a publicação concluída enquanto o job Publicar site não terminar com sucesso.

Referências: https://github.com/FirebaseExtended/action-hosting-deploy e https://github.com/FirebaseExtended/action-hosting-deploy/blob/main/docs/service-account.md.
