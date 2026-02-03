
# Correção: Erro do AWS SDK no Edge Function

## Problema Identificado

O edge function `bulk-background` está a falhar com o seguinte erro:

```
Error: [unenv] fs.readFile is not implemented yet!
```

**Causa raiz**: O código usa o `@aws-sdk/client-s3` para uploads para o Hetzner Object Storage. Este SDK depende de módulos Node.js (`fs.readFile`) que não estão disponíveis no runtime Deno dos Edge Functions da Supabase.

## Solução

Substituir o AWS SDK S3 client por **Supabase Storage**, que é totalmente compatível com Deno. Esta é a mesma abordagem usada nos edge functions `outfit-swap` e `ugc-gemini`.

---

## Alterações Técnicas

### 1. Criar Bucket no Supabase Storage

Criar um bucket chamado `bulk-backgrounds` para armazenar as imagens processadas.

### 2. Atualizar Edge Function

Remover a importação do AWS SDK e usar Supabase Storage:

**Antes (problemático):**
```typescript
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.864.0";

function getS3Client() {
  return new S3Client({
    region: "fsn1",
    endpoint: "https://fsn1.your-objectstorage.com",
    // ...
  });
}

async function uploadToStorage(imageData, fileName, contentType) {
  const s3 = getS3Client();
  await s3.send(new PutObjectCommand({ ... }));
  // ...
}
```

**Depois (compatível com Deno):**
```typescript
// Remove AWS SDK import completely

async function uploadToStorage(
  supabase: ReturnType<typeof createClient>,
  imageData: Uint8Array,
  storagePath: string,
  contentType: string
): Promise<{ storagePath: string; publicUrl: string }> {
  const { error: uploadError } = await supabase.storage
    .from("bulk-backgrounds")
    .upload(storagePath, imageData, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from("bulk-backgrounds")
    .getPublicUrl(storagePath);

  return { storagePath, publicUrl: data.publicUrl };
}
```

### 3. Atualizar Chamadas de Upload

Modificar as funções que usam `uploadToStorage`:

- `createJob` (upload de custom background)
- `processSingleResult` (upload de resultado gerado)

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/bulk-background/index.ts` | Remover AWS SDK, usar Supabase Storage |
| Supabase Dashboard | Criar bucket `bulk-backgrounds` com acesso público |

---

## Migração de Dados

Não é necessária migração - os dados são armazenados no novo bucket e os URLs públicos são compatíveis.

---

## Resumo das Alterações no Código

1. **Linha 2**: Remover import do `@aws-sdk/client-s3`
2. **Linhas 79-112**: Substituir `getS3Client()` e `uploadToStorage()` por versão Supabase
3. **Linha 466**: Atualizar chamada de upload de custom background
4. **Linha 322-327**: Atualizar chamada de upload de resultado

---

## Passos de Implementação

1. Criar bucket `bulk-backgrounds` no Supabase Storage (público para leitura)
2. Atualizar edge function `bulk-background/index.ts`
3. Re-deploy do edge function
4. Testar o fluxo completo
