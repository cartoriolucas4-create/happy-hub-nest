# Proteção permanente dos dados dos clientes

Esta política é obrigatória para toda manutenção, correção, migração, publicação e evolução do Minha Barbearia.

## Regra principal

Dados de produção pertencentes a clientes são permanentes por padrão. Nenhuma alteração comum pode apagar, zerar, substituir, sobrescrever ou tornar inacessíveis bancos, usuários, barbearias, perfis, agendamentos, clientes, vendas, despesas, produtos, comissões, assinaturas, pagamentos, arquivos ou históricos.

É proibido, como parte de uma atualização normal:
- apagar ou recriar o projeto/banco Supabase de produção;
- executar `DROP DATABASE`, `DROP SCHEMA`, `DROP TABLE`, `TRUNCATE` ou operações equivalentes;
- excluir em massa registros de clientes ou de tabelas que guardam dados de negócio;
- introduzir exclusão em cascata que possa remover dados de clientes;
- trocar URL, project ref ou chave pública do backend de produção sem validar que o destino é exatamente o banco de produção aprovado;
- executar reset, seed destrutivo, restore sobre produção ou migração que descarte dados.

## Exceção extrema — duas confirmações obrigatórias

Uma operação potencialmente destrutiva não pode ser executada só porque parece tecnicamente necessária ou porque houve um "sim" genérico.

Antes de qualquer exceção, o responsável deve:
1. explicar por escrito por que a operação é inevitável e por que alternativas não destrutivas não resolvem;
2. identificar o projeto, ambiente, tabelas, clientes e registros exatos afetados;
3. apresentar riscos, impacto, duração, indisponibilidade e plano de reversão;
4. comprovar backup recente, íntegro e restaurável, com teste de restauração fora da produção;
5. apresentar um plano de execução limitado e uma verificação pós-operação;
6. pedir uma primeira autorização explícita do proprietário;
7. depois da autorização, repetir o resumo dos riscos e pedir uma segunda confirmação explícita, específica para aquela operação.

Sem as duas confirmações específicas e sem backup restaurável comprovado, a operação permanece bloqueada. Silêncio, urgência, autorização anterior ou confirmação para outra tarefa não contam como consentimento.

## Regras para desenvolvimento e deploy

- Mudanças de código devem preservar o backend e os dados de produção.
- Migrações novas/alteradas são bloqueadas automaticamente se contiverem comandos de remoção estrutural ou exclusão de dados protegidos.
- Exclusões de registros individuais só podem existir quando forem uma funcionalidade de negócio deliberada, autorizada, limitada ao próprio tenant e protegida por confirmação, autorização no servidor e trilha de auditoria. Nunca podem excluir o banco ou os dados de outros clientes.
- Nenhum teste, seed, script ou workflow pode apontar para produção para limpar dados.
- Backups, logs e evidências de validação devem ser preservados antes de qualquer manutenção de risco.
- Se houver dúvida sobre qual Supabase é o backend de produção, interromper a mudança e pedir confirmação. Nunca inferir pelo nome do projeto.

## Limite técnico importante

O bloqueio automatizado deste repositório protege o fluxo de alterações e deploys que passam pelo GitHub Actions. Ele não substitui permissões administrativas, proteção contra exclusão manual no painel Supabase, políticas de backup/PITR, nem controles de acesso do provedor. Esses controles externos também devem permanecer habilitados e restritos.
