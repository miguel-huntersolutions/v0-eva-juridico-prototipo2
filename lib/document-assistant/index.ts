/**
 * Document assistant (RFC-002 / SPEC-002): conversational document generation.
 */

export * from "./types"
export * from "./session-store"
export * from "./orchestrator"
export {
  ragProactiveViaAssistant,
  ragOnDemandViaAssistant,
  parseTagMapFromAssistantResponse,
} from "./rag-via-assistant"
