# Assinatura InfinitePay e Painel Geral Minha Barbearia

## Entrega
- Área autenticada de assinatura com mensal R$ 59,99 / 30 dias, semestral R$ 239,94 / 6 meses e anual R$ 299,99 / 12 meses; retorno com consulta real de status e atualização manual.
- Pedidos vinculados ao proprietário e à barbearia, valores definidos exclusivamente no servidor, checkout InfinitePay e verificação independente via `payment_check`.
- Confirmação transacional e idempotente, histórico, renovação sem perder dias e pagamento retido para análise quando a licença estiver bloqueada ou suspensa.
- Preservar autenticação, `useLicense`, AccessGate, RPCs administrativas e pagamentos de agendamentos/Mercado Pago.
- Testes de valores, planos inválidos, duplicidade, divergências, pedido inexistente, confirmação falsa, cancelamento e bloqueio.

## Painel Geral — novo pedido
- Evoluir as telas existentes `/super-admin`, clientes/ficha, acessos e histórico, sem duplicar tabelas nem alterar menus dos clientes comuns. Nomear a área “Painel Geral”.
- Autorizar exclusivamente a conta com e-mail verificado `jlucasrodrigues4@gmail.com` por identidade consultada no servidor e papel protegido. Revisar `has_role`, `sa_require` e políticas: a regra atual também permite outros portadores do papel e possui fallback por e-mail sem confirmação explícita.
- Reutilizar licenças reais para totais por status, vencimentos hoje/3/7/15/30 dias e filtros/busca/ordenação de clientes. Não apresentar falha de consulta como zero.
- Acrescentar pagamentos, receita, renovações, plano e último pagamento somente após identificar as fontes reais existentes da InfinitePay. Pagamentos pendentes/cancelados/reembolsados não entram na receita recebida. Tolerância de não renovação deve ser configurada explicitamente, sem inventar uma regra.
- Ficha com contato, acesso, pedidos/pagamentos e auditoria; recuperação/definição de senha por link seguro em vez de administrador escolher a senha do cliente.
- Ações de prazo reutilizam os campos atuais. Mostrar vencimento anterior/novo antes da confirmação, exigir motivo e confirmação nas reduções/bloqueios/encerramento e registrar administrador, cliente e alteração; nunca apagar pagamentos ou histórico.
- Relatórios CSV e PDF conforme recursos existentes, filtros de auditoria, gráficos por período, estados de carregamento/vazio/erro e revisão mobile.
- Testar acesso direto de conta comum, administrador, +11/-11 dias e bloqueio/desbloqueio em dados isolados; preservar idempotência e não modificar assinaturas reais.

## Impedimentos e premissas
- O Lovable Cloud conectado está pausado. Não será reativado sem autorização; aplicação da migration e testes reais aguardam reativação.
- A arquitetura obrigatória permite manter Edge Functions existentes, mas não criar novas. Portanto, checkout usará função de servidor e webhook usará `/api/public/infinitepay-webhook`, **não** o endereço de Edge Function solicitado, que também aponta para uma conexão antiga.
- GitHub Pages não executa servidor. O fluxo completo precisará de publicação com servidor no projeto atual; a entrega não será declarada funcionando no domínio estático antes disso. Nenhuma publicação será feita nesta etapa.
- InfinitePay será usada por handle, sem inventar ou solicitar chave secreta. Trata-se de compra/renovação de prazo por checkout, não débito recorrente automático.
- O usuário informa que InfinitePay já funciona, mas não há arquivos, funções ou tabelas dessa integração no repositório inspecionado. Não substituir uma integração existente nem inventar fontes financeiras: sua localização e o schema ativo precisam ser confirmados com Cloud acessível antes de implementar essa parte.
- A autorização atual da conta administrativa não pôde ser confirmada com o Cloud pausado. Não inventar senha, conceder acesso a outras contas ou declarar a conta ativada sem verificar.

## Detalhes técnicos
- Nova migration aditiva para pedidos com RLS e leitura exclusiva do proprietário; escrita e confirmação restritas a `service_role`.
- Funções autenticadas com middleware existente, verificação de ownership antes de operações privilegiadas e catálogo fixo; helper servidor para chamadas HTTPS do provedor.
- Webhook público com validação de payload, `invoice_slug` → `slug`, consulta independente e comparação de valor/identificadores antes de confirmação atômica no banco.
- Atualização de licença/barbearia/histórico em uma transação com locks e proteção contra dupla extensão; prazos semestral/anual em intervalos de calendário.
- Validar testes e sinais de compilação automática, revisar alterações e registrar exatamente o que foi ou não aplicado/deployado.
- Reutilizar RPCs administrativas existentes onde preservam as regras; novas operações privilegiadas usam funções de servidor autenticadas com autorização administrativa verificada. Manter Edge Functions existentes, sem criar novas em desacordo com a arquitetura obrigatória.