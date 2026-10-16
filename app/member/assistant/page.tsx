import { logger } from "@/lib/logger"
import { AssistantPage } from "@/components/member/assistant-page"
import type { Metadata } from "next"
import { APP_NAME } from "@/lib/brand"

export const metadata: Metadata = {
  title: `Asistente Jurídico IA | ${APP_NAME}`,
  description: "Consulta sobre contratación pública, jurisprudencia y normativa colombiana con inteligencia artificial",
}

export default function MemberAssistantRoute() {
  logger.pageView("/member/assistant")

  return <AssistantPage />
}
