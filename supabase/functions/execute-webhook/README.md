# Execute Webhook Edge Function

Esta função executa chamadas HTTP para webhooks externos, contornando restrições de CORS.

## Como usar

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/execute-webhook`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`,
  },
  body: JSON.stringify({
    url: 'https://webhook-url.com',
    method: 'POST',
    headers: { 'X-Secret': 'secret-key' },
    payload: { data: 'test' }
  }),
})
```

## Deploy

```bash
supabase functions deploy execute-webhook
```

## Resposta

```json
{
  "sucesso": true,
  "status": 200,
  "dados": { "response": "data" }
}
```