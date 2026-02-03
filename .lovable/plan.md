

# Correção: Memory Limit no Upload de Source Images

## Problema Identificado

O erro de memória persiste porque o **upload de product images** ainda usa base64 no body do request para o edge function `upload-source-image`.

### Fluxo Atual (Problemático):

```text
Frontend (useSourceImageUpload.ts)
   │
   ├── File → FileReader → base64 (5-10MB)
   │      ↓
   └── supabase.functions.invoke('upload-source-image', {
         body: { base64Image: <base64 gigante> }
       })
                │
                ▼
Edge Function (upload-source-image/index.ts)
   │
   ├── req.json() → aloca toda a string base64
   ├── atob() → aloca bytes descodificados
   ├── Uint8Array → aloca buffer
   │
   └── MEMORY LIMIT EXCEEDED
```

## Solução: Upload Direto para Storage

Fazer upload direto para Supabase Storage do **frontend** e depois apenas registar no banco de dados.

### Fluxo Proposto (Corrigido):

```text
Frontend (useSourceImageUpload.ts)
   │
   ├── supabase.storage.from('source-images').upload(path, file)
   │      ↓
   ├── Recebe storage path e public URL
   │      ↓
   └── supabase.from('source_images').insert({...})
   
   [Tudo no frontend - SEM edge function para upload!]
```

---

## Alterações Técnicas

### 1. Atualizar `useSourceImageUpload.ts`

Substituir a chamada ao edge function por upload direto:

```typescript
// Antes (problemático)
const base64 = await fileToBase64(file);
const { data } = await supabase.functions.invoke('upload-source-image', {
  body: { base64Image: base64, fileName: file.name }
});

// Depois (corrigido)
const userId = (await supabase.auth.getUser()).data.user?.id;
const storagePath = `${userId}/${Date.now()}-${file.name}`;

// 1. Upload direto para storage
const { error: uploadError } = await supabase.storage
  .from('source-images')
  .upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });

// 2. Obter URL público
const { data: urlData } = supabase.storage
  .from('source-images')
  .getPublicUrl(storagePath);

// 3. Registar no banco de dados
const { data: sourceImage } = await supabase
  .from('source_images')
  .insert({
    user_id: userId,
    storage_path: storagePath,
    public_url: urlData.publicUrl,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type
  })
  .select()
  .single();

return sourceImage;
```

### 2. Verificar RLS Policies do Bucket `source-images`

O bucket já existe e é público. Precisamos garantir que as RLS policies permitem upload pelo utilizador autenticado.

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useSourceImageUpload.ts` | Upload direto para storage + insert no DB |

## Edge Function `upload-source-image`

Pode ser mantido como **fallback** para uso por API externa, mas o frontend não o vai usar mais.

---

## Comparação: Antes vs Depois

| Aspeto | Antes (Falha) | Depois |
|--------|---------------|--------|
| Dados no request | 5-10MB base64 | File binary (streaming) |
| Memory no edge function | ~30MB+ | 0 (não usa edge function) |
| Número de requests | 2 (edge + storage) | 2 (storage + DB insert) |
| Latência | Alta (encode/decode) | Baixa (upload direto) |

---

## Benefícios

1. **Sem memory issues**: Upload vai direto para storage, sem passar pelo edge function
2. **Mais rápido**: Sem encoding/decoding base64
3. **Simpler**: Menos código, menos pontos de falha
4. **Escalável**: Funciona para ficheiros de qualquer tamanho

---

## Passos de Implementação

1. Verificar/adicionar RLS policies no bucket `source-images` para permitir upload
2. Atualizar `useSourceImageUpload.ts` para upload direto
3. Testar o fluxo completo

