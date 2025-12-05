import { AssistantPage } from "@/components/member/assistant-page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Asistente Jurídico IA | EVA",
  description: "Consulta sobre contratación pública, jurisprudencia y normativa colombiana con inteligencia artificial",
}

export default function MemberAssistantRoute() {
  return <AssistantPage />
}
