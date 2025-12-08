# Padrões de Requisições HTTP (Uazapi)

Este documento descreve os padrões para fazer requisições HTTP à API do Uazapi dentro do CRM Azera.

## Base URL
A URL base da API é definida pela variável de ambiente ou configuração do tenant.
Exemplo: `https://uazapi.com.br`

## Headers Padrão
Todas as requisições devem incluir os seguintes headers:
- `Content-Type`: `application/json`
- `apikey`: A chave de API do tenant (obtida da tabela `integrations`).

## Tratamento de Erros
Sempre envolva as chamadas de API em blocos `try/catch`.
Verifique `response.ok` antes de processar o JSON.

## Exemplos

### Enviar Mensagem de Texto

```typescript
const sendMessage = async (instanceId: string, token: string, phone: string, message: string) => {
  const url = `https://uazapi.com.br/message/sendText/${instanceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': token
    },
    body: JSON.stringify({
      number: phone,
      options: {
        delay: 1200,
        presence: "composing",
        linkPreview: false
      },
      textMessage: {
        text: message
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar mensagem: ${response.statusText}`);
  }

  return await response.json();
};
```

### Buscar Avatar do Contato (Z-API / Uazapi)

```typescript
const fetchAvatar = async (instanceId: string, token: string, phone: string) => {
  const url = `https://uazapi.com.br/chat/fetchProfilePictureUrl/${instanceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': token
    },
    body: JSON.stringify({
      number: phone
    })
  });

  if (!response.ok) {
    throw new Error('Falha ao buscar avatar');
  }

  const data = await response.json();
  return data.profilePictureUrl; // Ajustar conforme resposta real
};
```

## Notas Importantes
- **Telefones**: Devem estar no formato internacional (ex: `5511999999999`).
- **Instância**: O `instanceId` deve ser o nome da instância configurada no Uazapi.
- **Token**: O token deve ser a API Key válida para a instância.
