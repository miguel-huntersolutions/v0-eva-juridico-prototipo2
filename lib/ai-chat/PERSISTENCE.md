# Arquitectura de Persistencia

## Estructura de Capas

La gestión de persistencia sigue una arquitectura en capas:

```
┌─────────────────────────────────────┐
│   Componente (UI)                  │
│   assistant-page.tsx               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Hook de Negocio                   │
│   useConversations()                │
│   - Estado local                     │
│   - Lógica de negocio                │
│   - Callbacks                        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Servicio API                      │
│   conversations-api.ts               │
│   - Llamadas HTTP                    │
│   - Transformación de datos          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   API Routes (Backend)              │
│   /api/conversations/*              │
│   - Validación                       │
│   - Lógica de negocio                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Base de Datos                     │
│   (PostgreSQL, MySQL, etc.)         │
└─────────────────────────────────────┘
```

## Dónde va cada cosa

### 1. **Componente (UI) - `assistant-page.tsx`**
**Responsabilidad:** Solo UI y eventos de usuario

```tsx
// ✅ CORRECTO: Usa hooks, no lógica de persistencia directa
const { conversations, createConversation, addMessages } = useConversations({
  userId: currentUser.id,
  autoLoad: true
})

// ❌ INCORRECTO: No hacer llamadas API directamente
// const response = await fetch('/api/conversations')
```

### 2. **Hook de Negocio - `useConversations`**
**Responsabilidad:** 
- Estado local de conversaciones
- Orquestación de operaciones
- Callbacks y efectos
- Manejo de errores

**Ubicación:** `lib/ai-chat/use-conversations.ts`

```tsx
// El hook maneja toda la lógica de persistencia
const {
  conversations,        // Estado local
  isLoading,           // Estado de carga
  createConversation,   // Operaciones
  addMessages,
  deleteConversation,
} = useConversations({
  userId: 'user-123',
  autoLoad: true,
  onConversationCreated: (conv) => {
    // Callback opcional
  }
})
```

### 3. **Servicio API - `conversations-api.ts`**
**Responsabilidad:**
- Llamadas HTTP puras
- Transformación de datos
- Manejo de errores HTTP

**Ubicación:** `lib/ai-chat/services/conversations-api.ts`

```tsx
// Funciones puras que hacen llamadas HTTP
export async function fetchConversations(userId?: string) {
  const response = await fetch(`/api/conversations?userId=${userId}`)
  return response.json()
}
```

### 4. **API Routes (Backend)**
**Responsabilidad:**
- Validación de datos
- Autenticación/autorización
- Lógica de negocio del servidor
- Acceso a base de datos

**Ubicación:** `app/api/conversations/`

```
app/api/conversations/
├── route.ts              # GET (listar), POST (crear)
├── [id]/
│   ├── route.ts          # GET, PUT, DELETE (una conversación)
│   └── messages/
│       └── route.ts      # POST (agregar mensajes)
```

### 5. **Base de Datos**
**Responsabilidad:**
- Almacenamiento persistente
- Queries eficientes
- Transacciones

**Implementación:** (Por implementar)
- Tablas: `conversations`, `messages`
- ORM: Prisma, Drizzle, etc.

## Flujo de Datos

### Crear Nueva Conversación

```
1. Usuario envía mensaje
   ↓
2. assistant-page.tsx → handleSubmit()
   ↓
3. useConversations → createConversation()
   ↓
4. conversations-api.ts → createConversationAPI()
   ↓
5. POST /api/conversations
   ↓
6. Base de Datos → INSERT
   ↓
7. Respuesta → Hook → Estado local actualizado
```

### Cargar Conversaciones

```
1. Componente monta
   ↓
2. useConversations (autoLoad: true)
   ↓
3. conversations-api.ts → fetchConversations()
   ↓
4. GET /api/conversations?userId=...
   ↓
5. Base de Datos → SELECT
   ↓
6. Respuesta → Hook → Estado local actualizado
```

### Agregar Mensajes

```
1. IA responde
   ↓
2. useAIChat → onResponseReceived callback
   ↓
3. useConversations → addMessages()
   ↓
4. conversations-api.ts → addMessagesToConversation()
   ↓
5. POST /api/conversations/[id]/messages
   ↓
6. Base de Datos → UPDATE (agregar mensajes)
   ↓
7. Respuesta → Hook → Estado local actualizado
```

## Ejemplo de Uso Completo

```tsx
'use client'

import { useAIChat, useConversations, convertToChatMessage } from '@/lib/ai-chat'

export function AssistantPage() {
  // Hook de persistencia
  const {
    conversations,
    createConversation,
    addMessages,
    deleteConversation,
    isLoading: isLoadingConversations,
  } = useConversations({
    userId: currentUser?.id,
    autoLoad: true,
  })

  // Hook de chat
  const { messages, sendMessage, isLoading: isLoadingChat } = useAIChat(
    { apiEndpoint: '/api/chat' },
    {
      onResponseReceived: async (message) => {
        if (activeConversationId) {
          // Agregar mensaje a conversación existente
          const allMessages = messages.map(convertToChatMessage).concat(message)
          await addMessages(activeConversationId, allMessages)
        }
      },
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const messageText = input.trim()

    // Crear nueva conversación si no existe
    if (!activeConversationId) {
      const newConv = await createConversation(messageText)
      setActiveConversationId(newConv.id)
    }

    // Enviar mensaje
    sendMessage({ text: messageText })
  }

  // ... resto de UI
}
```

## Ventajas de esta Arquitectura

1. **Separación de responsabilidades**
   - UI solo maneja presentación
   - Hooks manejan lógica de negocio
   - Servicios manejan comunicación HTTP
   - API routes manejan validación y BD

2. **Reutilizable**
   - Los hooks se pueden usar en cualquier componente
   - Los servicios son independientes de React

3. **Testeable**
   - Cada capa se puede testear independientemente
   - Fácil mockear servicios

4. **Mantenible**
   - Cambios en BD solo afectan API routes
   - Cambios en UI no afectan lógica de negocio

## Próximos Pasos

1. **Implementar Base de Datos**
   - Crear esquema de tablas
   - Configurar ORM (Prisma, Drizzle)
   - Reemplazar mocks en API routes

2. **Autenticación**
   - Agregar middleware de auth en API routes
   - Filtrar conversaciones por usuario autenticado

3. **Optimizaciones**
   - Cache con React Query o SWR
   - Optimistic updates
   - Paginación para muchas conversaciones

