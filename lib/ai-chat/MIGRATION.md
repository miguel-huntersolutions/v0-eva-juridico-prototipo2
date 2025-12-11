# Guía de Migración

## Cómo usar en otros proyectos

### Paso 1: Copiar la biblioteca

Copia la carpeta completa `lib/ai-chat/` a tu nuevo proyecto:

```bash
# Desde el proyecto actual
cp -r lib/ai-chat /ruta/a/nuevo/proyecto/lib/
```

### Paso 2: Instalar dependencias

```bash
pnpm add ai @ai-sdk/react
# o
npm install ai @ai-sdk/react
```

### Paso 3: Configurar variables de entorno

Crea un archivo `.env.local`:

```env
# Para OpenAI GPT-4o (recomendado)
OPENAI_API_KEY=tu_api_key_aqui

# O para Anthropic Claude
ANTHROPIC_API_KEY=tu_api_key_aqui

# O para Google
GOOGLE_GENERATIVE_AI_API_KEY=tu_api_key_aqui
```

### Paso 4: Crear API Route

```typescript
// app/api/chat/route.ts
import { createChatRoute, getMaxDuration } from '@/lib/ai-chat'

export const maxDuration = getMaxDuration(30)

export const POST = createChatRoute({
  systemPrompt: `Eres un asistente especializado en [TU DOMINIO].
  
  Instrucciones:
  - Responde siempre en español
  - Usa formato Markdown
  - Sé conciso pero completo`,
  model: 'openai/gpt-4o',
  maxDuration: 30,
})
```

### Paso 5: Usar en componentes

```tsx
'use client'

import { useAIChat } from '@/lib/ai-chat'

export function MyComponent() {
  const { messages, sendMessage, isLoading } = useAIChat({
    apiEndpoint: '/api/chat'
  })
  
  // ... tu lógica
}
```

## Refactorizar código existente

### Antes (código directo)

```tsx
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

const { messages, sendMessage } = useChat({
  transport: new DefaultChatTransport({ api: "/api/chat" }),
})
```

### Después (usando la biblioteca)

```tsx
import { useAIChat } from "@/lib/ai-chat"

const { messages, sendMessage, isLoading, getMessageText } = useAIChat({
  apiEndpoint: "/api/chat",
})
```

## Crear un paquete NPM (opcional)

Si quieres compartir esto como paquete:

### 1. Crear `package.json` para el paquete

```json
{
  "name": "@tu-org/ai-chat",
  "version": "1.0.0",
  "main": "./index.ts",
  "types": "./index.ts",
  "dependencies": {
    "ai": "latest",
    "@ai-sdk/react": "latest"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  }
}
```

### 2. Publicar

```bash
npm publish --access public
```

### 3. Usar en otros proyectos

```bash
pnpm add @tu-org/ai-chat
```

```tsx
import { useAIChat, createChatRoute } from '@tu-org/ai-chat'
```

## Personalización

### Cambiar el modelo

```typescript
// OpenAI GPT-4o (recomendado - actualmente en uso)
export const POST = createChatRoute({
  systemPrompt: '...',
  model: 'openai/gpt-4o',
})

// Anthropic Claude
export const POST = createChatRoute({
  systemPrompt: '...',
  model: 'anthropic/claude-sonnet-4-20250514',
})

// Google Gemini
export const POST = createChatRoute({
  systemPrompt: '...',
  model: 'google/gemini-pro',
})
```

### Agregar headers personalizados

```typescript
const { messages, sendMessage } = useAIChat({
  apiEndpoint: '/api/chat',
  headers: {
    'X-Custom-Header': 'value',
    'Authorization': 'Bearer token',
  },
})
```

### Con callbacks

```typescript
const { messages, sendMessage } = useAIChat(
  { apiEndpoint: '/api/chat' },
  {
    onMessageSent: (message) => {
      // Guardar en BD, analytics, etc.
      console.log('Sent:', message)
    },
    onResponseReceived: (message) => {
      // Actualizar UI, guardar respuesta
      console.log('Received:', message)
    },
    onError: (error) => {
      // Mostrar notificación
      toast.error(error.message)
    },
  }
)
```

