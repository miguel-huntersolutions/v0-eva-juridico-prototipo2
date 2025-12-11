import { logger } from "@/lib/logger"
import { AssistantPage } from "@/components/member/assistant-page.ant"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Asistente Jurídico IA | EVA",
  description: "Consulta sobre contratación pública, jurisprudencia y normativa colombiana con inteligencia artificial",
}

export default function MemberAssistantRoute() {
  logger.pageView("/member/assistant")

  return <AssistantPage />
}
