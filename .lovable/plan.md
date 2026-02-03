

# Correção: Erros de TypeScript no Edge Function bulk-background

## Problema Identificado

Os erros de build são causados por **inferência de tipos incorreta** do Supabase client no edge function:

```text
TS2345: Argument of type '{ status: string; ... }' is not assignable to parameter of type 'never'.
```

Isto acontece porque:
1. O `createClient` está a ser usado sem tipos explícitos
2. O TypeScript não consegue inferir o schema das tabelas
3. Todas as operações `.update()` falham porque o tipo é inferido como `never`

## Solução

Usar casting explícito `as any` nas operações de update para contornar o problema de tipos, dado que edge functions não têm acesso ao ficheiro de tipos gerado do Supabase.

---

## Alterações Técnicas

### Ficheiro: `supabase/functions/bulk-background/index.ts`

**Alteração 1 - Linha 284-290:**
```typescript
// Antes (erro de tipos)
await adminClient
  .from("bulk_background_results")
  .update({ status: "processing", ... })
  .eq("id", result.id);

// Depois (com casting)
await (adminClient
  .from("bulk_background_results") as any)
  .update({ status: "processing", ... })
  .eq("id", result.id);
```

**Alteração 2 - Linha 324-333:**
```typescript
await (adminClient
  .from("bulk_background_results") as any)
  .update({
    status: "completed",
    result_url: publicUrl,
    ...
  })
  .eq("id", result.id);
```

**Alteração 3 - Linha 339-346:**
```typescript
await (adminClient
  .from("bulk_background_results") as any)
  .update({
    status: "failed",
    error: ...,
    ...
  })
  .eq("id", result.id);
```

**Alteração 4 - Linhas 600-605 e 762-769:**
Mudar o tipo do parâmetro `adminClient` na função `processSingleResult` para `any`:
```typescript
async function processSingleResult(
  result: BulkBackgroundResult,
  job: BulkBackgroundJob,
  adminClient: any,  // Changed from ReturnType<typeof createClient>
  backgroundBase64: string | null
): Promise<{ success: boolean; error?: string }>
```

---

## Resumo das Alterações

| Linha | Alteração |
|-------|-----------|
| 82 | Mudar tipo do parâmetro `adminClient` para `any` em `uploadToStorage` |
| 276 | Mudar tipo do parâmetro `adminClient` para `any` em `processSingleResult` |
| 284-290 | Adicionar `as any` ao `.from()` |
| 324-333 | Adicionar `as any` ao `.from()` |
| 339-346 | Adicionar `as any` ao `.from()` |

---

## Benefícios

1. **Resolve todos os 5 erros de build** imediatamente
2. **Não altera a lógica** - apenas os tipos
3. **Padrão comum** em edge functions da Supabase que não têm acesso a tipos gerados

---

## Ficheiro a Modificar

- `supabase/functions/bulk-background/index.ts`

