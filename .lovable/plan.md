# Assinatura SaaS Minha Barbearia com InfinitePay

## Entrega
- Área autenticada de assinatura com mensal R$ 59,99 / 30 dias, semestral R$ 239,94 / 6 meses e anual R$ 299,99 / 12 meses; retorno com consulta real de status e atualização manual.
- Pedidos vinculados ao proprietário e à barbearia, valores definidos exclusivamente no servidor, checkout InfinitePay e verificação independente via `payment_check`.
- Confirmação transacional e idempotente, histórico, renovação sem perder dias e pagamento retido para análise quando a licença estiver bloqueada ou suspensa.
- Preservar autenticação, `useLicense`, AccessGate, RPCs administrativas e pagamentos de agendamentos/Mercado Pago.
- Testes de valores, planos inválidos, duplicidade, divergências, pedido inexistente, confirmação falsa, cancelamento e bloqueio.

## Impedimentos e premissas
- O Lovable Cloud conectado está pausado. Não será reativado sem autorização; aplicação da migration e testes reais aguardam reativação.
- A arquitetura obrigatória permite manter Edge Functions existentes, mas não criar novas. Portanto, checkout usará função de servidor e webhook usará `/api/public/infinitepay-webhook`, **não** o endereço de Edge Function solicitado, que também aponta para uma conexão antiga.
- GitHub Pages não executa servidor. O fluxo completo precisará de publicação com servidor no projeto atual; a entrega não será declarada funcionando no domínio estático antes disso. Nenhuma publicação será feita nesta etapa.
- InfinitePay será usada por handle, sem inventar ou solicitar chave secreta. Trata-se de compra/renovação de prazo por checkout, não débito recorrente automático.

## Detalhes técnicos
- Nova migration aditiva para pedidos com RLS e leitura exclusiva do proprietário; escrita e confirmação restritas a `service_role`.
- Funções autenticadas com middleware existente, verificação de ownership antes de operações privilegiadas e catálogo fixo; helper servidor para chamadas HTTPS do provedor.
- Webhook público com validação de payload, `invoice_slug` → `slug`, consulta independente e comparação de valor/identificadores antes de confirmação atômica no banco.
- Atualização de licença/barbearia/histórico em uma transação com locks e proteção contra dupla extensão; prazos semestral/anual em intervalos de calendário.
- Validar testes e sinais de compilação automática, revisar alterações e registrar exatamente o que foi ou não aplicado/deployado.