# Plano de implementação — Yoka Sorteios
Objetivo: primeira versão estática funcional, conforme Yoka_Sorteios_Projeto.md.
Execução nesta sessão: núcleo validado por testes; interface responsiva; empacotamento Firebase e página autônoma.
1. Criar testes de lista, CSV, duplicação, escolha uniforme, estado e persistência; confirmar falha inicial.
2. Implementar core.js com parseList, parseCSV, validateEntries, randomIndex, createEvent, drawEvent, validateEvent e persist.
3. Implementar index.html, styles.css e app.js com confirmação, bloqueio, histórico, backup e impressão.
4. Verificar testes e sintaxe; revisar integração e gerar versão autônoma a partir dos mesmos arquivos.
5. Configurar Firebase Hosting para projeto yoka-sorteio/site yoka-sorteios; documentar autenticação e publicar somente com acesso confirmado.
Revisão: lista vazia, zeros à esquerda, CSV com aspas e separador brasileiro, backup inválido, falha de armazenamento, recarga e múltiplos cliques.
