// Client-side data store for prototype
import type { Process, Client, User, AuditLog, ProcessDocument, ProcessComment, DashboardStats } from "./types"
import { mockProcesses, mockClients, mockUsers, mockAuditLogs, mockDocuments, mockComments } from "./mock-data"

class DataStore {
  private processes: Process[] = [...mockProcesses]
  private clients: Client[] = [...mockClients]
  private users: User[] = [...mockUsers]
  private auditLogs: AuditLog[] = [...mockAuditLogs]
  private documents: ProcessDocument[] = [...mockDocuments]
  private comments: ProcessComment[] = [...mockComments]

  // Processes
  getProcesses(clientId?: string): Process[] {
    if (clientId) {
      return this.processes.filter((p) => p.clientId === clientId)
    }
    return this.processes
  }

  getProcess(id: string): Process | undefined {
    return this.processes.find((p) => p.id === id)
  }

  createProcess(process: Omit<Process, "id" | "createdAt" | "updatedAt">): Process {
    const newProcess: Process = {
      ...process,
      id: `proc-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.processes.push(newProcess)
    this.addAuditLog({
      userId: process.createdBy,
      action: "Proceso creado",
      entity: "process",
      entityId: newProcess.id,
      changes: { status: process.status },
    })
    return newProcess
  }

  updateProcess(id: string, updates: Partial<Process>, userId: string): Process | null {
    const index = this.processes.findIndex((p) => p.id === id)
    if (index === -1) return null

    const oldProcess = { ...this.processes[index] }
    this.processes[index] = {
      ...this.processes[index],
      ...updates,
      updatedAt: new Date(),
    }

    this.addAuditLog({
      userId,
      action: "Proceso actualizado",
      entity: "process",
      entityId: id,
      changes: { before: oldProcess, after: updates },
    })

    return this.processes[index]
  }

  // Clients
  getClients(): Client[] {
    return this.clients
  }

  getClient(id: string): Client | undefined {
    return this.clients.find((c) => c.id === id)
  }

  // Users
  getUsers(clientId?: string): User[] {
    if (clientId) {
      return this.users.filter((u) => u.clientId === clientId)
    }
    return this.users
  }

  getUser(id: string): User | undefined {
    return this.users.find((u) => u.id === id)
  }

  createUser(user: Omit<User, "id" | "createdAt">): User {
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
      createdAt: new Date(),
    }
    this.users.push(newUser)
    return newUser
  }

  // Documents
  getDocuments(processId: string): ProcessDocument[] {
    return this.documents.filter((d) => d.processId === processId)
  }

  addDocument(doc: Omit<ProcessDocument, "id" | "uploadedAt">): ProcessDocument {
    const newDoc: ProcessDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date(),
    }
    this.documents.push(newDoc)
    return newDoc
  }

  // Comments
  getComments(processId: string): ProcessComment[] {
    return this.comments.filter((c) => c.processId === processId)
  }

  addComment(comment: Omit<ProcessComment, "id" | "createdAt">): ProcessComment {
    const newComment: ProcessComment = {
      ...comment,
      id: `comment-${Date.now()}`,
      createdAt: new Date(),
    }
    this.comments.push(newComment)
    return newComment
  }

  // Audit Logs
  getAuditLogs(entityId?: string): AuditLog[] {
    if (entityId) {
      return this.auditLogs.filter((log) => log.entityId === entityId)
    }
    return this.auditLogs
  }

  private addAuditLog(log: Omit<AuditLog, "id" | "timestamp" | "userName" | "ipAddress">) {
    const user = this.getUser(log.userId)
    const newLog: AuditLog = {
      ...log,
      id: `audit-${Date.now()}`,
      userName: user?.name || "Unknown",
      ipAddress: "127.0.0.1",
      timestamp: new Date(),
    }
    this.auditLogs.push(newLog)
  }

  // Dashboard Stats
  getDashboardStats(clientId?: string): DashboardStats {
    const processes = this.getProcesses(clientId)

    const totalProcesses = processes.length
    const pendingReview = processes.filter((p) => p.status === "pending_review").length
    const inReview = processes.filter((p) => p.status === "in_review").length
    const completed = processes.filter((p) => p.status === "reviewed").length

    // Calculate average review time (in hours)
    const reviewedProcesses = processes.filter((p) => p.reviewStartedAt && p.completedAt)

    let averageReviewTime = 0
    if (reviewedProcesses.length > 0) {
      const totalTime = reviewedProcesses.reduce((sum, p) => {
        const start = p.reviewStartedAt!.getTime()
        const end = p.completedAt!.getTime()
        return sum + (end - start)
      }, 0)
      averageReviewTime = totalTime / reviewedProcesses.length / (1000 * 60 * 60) // Convert to hours
    }

    // Mock efficiency index calculation
    const manualTimeEstimate = 40 // hours per process
    const currentTime = averageReviewTime || 20
    const hourlyRate = 150000 // COP
    const efficiencyIndex = (manualTimeEstimate - currentTime) * hourlyRate * completed

    return {
      totalProcesses,
      pendingReview,
      inReview,
      completed,
      averageReviewTime: Math.round(averageReviewTime * 10) / 10,
      efficiencyIndex: Math.round(efficiencyIndex),
    }
  }
}

export const dataStore = new DataStore()
