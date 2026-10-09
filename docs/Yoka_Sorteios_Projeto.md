# Yoka Sorteios — projeto da primeira versão

## Objetivo
Site profissional para realizar rifas do Yoka, incluindo exclusivamente números confirmados como vendidos. Uso no celular, computador e projeção durante o sorteio.

## Identidade e publicação
- Nome: Yoka Sorteios.
- Conta informada: adyokafutsal@gmail.com.
- Projeto Firebase: yoka-sorteio.
- Endereço desejado: https://yoka-sorteios.web.app, mediante criação e disponibilidade do site adicional yoka-sorteios no mesmo projeto.
- Interface em português, identidade esportiva, fundo escuro, alto contraste e vencedor em destaque. Logo oficial somente quando disponível; não inventar um escudo.

## Preparar a rifa
Informar título da rifa e prêmio da rodada. Colar números vendidos separados por espaços, vírgulas ou linhas, ou importar CSV UTF-8 com colunas numero e nome (nome opcional). CSV não significa suporte a XLSX nesta versão. Preservar zeros à esquerda na apresentação; tratar 001 e 1 como o mesmo número para detectar duplicação. Aceitar apenas inteiros não negativos com até nove algarismos.

Mostrar lista completa e total de números elegíveis. Informar duplicados e entradas inválidas; impedir confirmação enquanto houver erros. Não gerar uma faixa completa de números automaticamente. Números ausentes nunca participam.

## Sorteio
Confirmar e bloquear a lista antes da primeira rodada. Usar Web Crypto com rejeição de valores excedentes para selecionar uniformemente um índice, sem viés de módulo. A animação é apenas apresentação: o resultado é definido uma única vez, registrado e salvo antes da animação. Bloquear cliques simultâneos e mudanças na lista durante o evento.

Cada número pode vencer uma vez por evento. A pessoa pode vencer novamente com outro número comprado. Permitir informar o prêmio seguinte e sortear entre os números restantes. Lista vazia ou esgotada bloqueia o botão. Disponibilizar modo tela cheia e respeitar preferência de movimento reduzido.

## Registro e persistência
Salvar no navegador o evento, lista confirmada, prêmios e resultados com horário. Exibir claramente que os dados ficam neste dispositivo. Exportar comprovante JSON com lista usada, resultados e versão do aplicativo; permitir impressão legível. Validar a estrutura de qualquer backup importado. Erro de armazenamento impede iniciar o sorteio, para evitar um resultado sem registro. Não chamar esse registro de certificado ou auditoria independente.

O Firebase Hosting serve o aplicativo estático. Esta primeira versão não usa Firestore nem exige login de participantes. Os registros não sincronizam entre dispositivos e não são publicados automaticamente. Abrir nova rifa exige confirmação e exportação prévia dos resultados existentes.

## Arquivos e arquitetura
- public/index.html: estrutura e acessibilidade.
- public/styles.css: identidade, responsividade, projeção e impressão.
- public/core.js: normalização, validação e escolha uniforme.
- public/app.js: interface, rodadas, persistência e exportação.
- tests/core.test.mjs: números não vendidos, duplicação, limites, lista vazia e rejeição aleatória.
- firebase.json e .firebaserc: Hosting com destino explícito no projeto yoka-sorteio.
- README.md: uso, limitações e publicação autenticada.

Sem dependências de execução ou fontes externas. O aplicativo funciona em navegadores modernos com HTTPS.

## Verificação
Testar inclusão exclusiva de vendidos, zeros à esquerda, CSV com aspas, entradas inválidas, esgotamento, rejeição no gerador, múltiplos cliques, recuperação após recarregar e falhas de armazenamento. Revisar celular, tela cheia, teclado e impressão quando houver ambiente de navegador disponível.

Publicação só será declarada concluída com retorno confirmado do Firebase. O e-mail informado não fornece autenticação; se o ambiente não tiver acesso à conta, entregar pacote validado e comandos para publicar com a sessão do usuário.
