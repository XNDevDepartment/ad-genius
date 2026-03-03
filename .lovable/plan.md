

# Oferta €19.99/mês por 3 meses

## Abordagem

A forma mais simples, usando a infraestrutura existente (padrão do `1MES`), é criar um cupão Stripe programático que aplique um desconto de €9.01 (€29.00 - €19.99) nos primeiros 3 meses da subscrição Starter.

## Implementação

### 1. `supabase/functions/create-checkout/index.ts`

Adicionar detecção de um novo código promo (ex: `3MESES`) que cria um cupão ad-hoc Stripe com:
- `amount_off: 901` (€9.01 de desconto)
- `currency: 'eur'`
- `duration: 'repeating'`
- `duration_in_months: 3`

Isto faz com que o utilizador pague €19.99/mês durante 3 meses e depois passa automaticamente para €29/mês (Starter normal).

### 2. `supabase/functions/stripe-webhook/index.ts`

Opcionalmente, limitar os créditos nos 3 primeiros meses (como o `1MES` que limita a 35). Se quiseres manter os 80 créditos completos do Starter, não é necessária alteração aqui.

### 3. Landing page e checkout direto (opcional)

Criar uma página `/promo/3meses` e `/promo/3meses/checkout` seguindo o padrão do `Promo1Mes` e `Promo1MesCheckout`, com o código `3MESES` pré-aplicado.

### 4. Rota no `App.tsx`

Registar as novas rotas.

## Decisão necessária

- Queres que os utilizadores desta oferta recebam os **80 créditos completos** do Starter ou um valor reduzido (como os 35 do `1MES`)?
- Queres uma landing page dedicada ou apenas usar o código promo no checkout normal?

