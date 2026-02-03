

# Correção: Memory Limit Exceeded no Bulk Background

## Problema Identificado

O erro "Memory limit exceeded" **não é causado por processar múltiplas imagens**, mas sim pela forma como o **custom background** é enviado para o edge function.

### Fluxo Atual (Problemático):

```text
Frontend                              Edge Function
   │                                       │
   ├── File → base64 (6.7MB)              │
   │      ↓                               │
   └────────────────────────────────────► │ req.json() → aloca 6.7MB
                                          │ atob() → aloca mais 5MB
                                          │ Uint8Array → aloca mais 5MB
                                          │ 
                                          │ TOTAL: ~16MB só no parsing
                                          │ + Supabase client overhead
                                          │ = MEMORY LIMIT EXCEEDED
```

O Supabase Edge Function tem limite de **150MB de memória**, mas o overhead do runtime Deno + dependências consome ~100-120MB, deixando apenas ~30-50MB para dados.

## Solução: Upload Direto para Storage

Em vez de enviar o custom background no body do request, fazer **upload direto para Supabase Storage** primeiro e enviar apenas o **URL**.

### Fluxo Proposto (Corrigido):

```text
Frontend                              Edge Function
   │                                       │
   ├── Upload file → Storage              │
   │      ↓                               │
   ├── Recebe URL público                 │
   │      ↓                               │
   └── Envia URL (50 bytes) ───────────► │ req.json() → ~1KB
                                          │ fetch(url) no processJob
                                          │ (quando já não há overhead)
                                          │ 
                                          │ TOTAL: <5MB no createJob
```

---

## Alterações Técnicas

### 1. Frontend: Upload Background para Storage Primeiro

**Ficheiro:** `src/pages/BulkBackground.tsx`

```typescript
// Antes (problemático)
let customBgBase64: string | undefined;
if (customBackground) {
  customBgBase64 = await fileToBase64(customBackground);
}
await createJob({
  backgroundImageBase64: customBgBase64,
  // ...
});

// Depois (corrigido)
let customBgUrl: string | undefined;
if (customBackground) {
  // Upload para storage primeiro
  const { data, error } = await supabase.storage
    .from('bulk-backgrounds')
    .upload(`${user.id}/${Date.now()}-custom-bg.jpg`, customBackground, {
      contentType: customBackground.type,
      upsert: false,
    });
  
  if (!error && data) {
    const { data: urlData } = supabase.storage
      .from('bulk-backgrounds')
      .getPublicUrl(data.path);
    customBgUrl = urlData.publicUrl;
  }
}
await createJob({
  backgroundImageUrl: customBgUrl, // URL em vez de base64
  // ...
});
```

### 2. API: Alterar Payload

**Ficheiro:** `src/api/bulk-background-api.ts`

```typescript
export interface CreateBulkJobPayload {
  sourceImageIds: string[];
  backgroundType: 'preset' | 'custom';
  backgroundPresetId?: string;
  backgroundImageUrl?: string; // NOVO: URL em vez de base64
  settings?: { ... };
}
```

### 3. Edge Function: Remover Lógica de Base64

**Ficheiro:** `supabase/functions/bulk-background/index.ts`

```typescript
// Antes (problemático)
if (backgroundType === "custom" && backgroundImageBase64) {
  const binaryStr = atob(backgroundImageBase64);
  const bytes = new Uint8Array(binaryStr.length);
  // ... upload para storage
}

// Depois (simples)
let backgroundImageUrl: string | null = null;
if (backgroundType === "custom" && body.backgroundImageUrl) {
  backgroundImageUrl = body.backgroundImageUrl;
  // URL já está pronto - não precisa fazer nada!
}
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/BulkBackground.tsx` | Upload background para storage antes de criar job |
| `src/api/bulk-background-api.ts` | Mudar `backgroundImageBase64` para `backgroundImageUrl` |
| `supabase/functions/bulk-background/index.ts` | Remover parsing de base64, usar URL diretamente |

---

## Comparação: Antes vs Depois

| Aspeto | Antes (Falha) | Depois |
|--------|---------------|--------|
| Dados no request | ~6.7MB base64 | ~100 bytes URL |
| Memória no createJob | ~20MB+ | <1MB |
| Upload do background | Edge function | Frontend direto |
| Complexidade | Alta (encode/decode) | Baixa (URL pass-through) |

---

## Vantagens Adicionais

1. **Request mais rápido**: Sem base64 encode/decode
2. **Sem timeout risk**: Upload grande é feito pelo browser, não pelo edge function
3. **Reutilização**: Mesmo background pode ser reutilizado via URL
4. **Debugging mais fácil**: URLs são visíveis e testáveis

---

## Ordem de Implementação

1. **API**: Atualizar interface `CreateBulkJobPayload` (2 min)
2. **Frontend**: Adicionar upload direto para storage (10 min)
3. **Edge Function**: Simplificar `createJob` para usar URL (5 min)
4. **Deploy**: Re-deploy edge function (automático)
5. **Teste**: Verificar fluxo completo (5 min)

**Tempo estimado: 20-25 minutos**

