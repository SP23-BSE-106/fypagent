export type AuditEvent = {
  _id?: string

  userId?: string
  action:
    | 'auth.login'
    | 'auth.logout'
    | 'auth.signup'
    | 'auth.reset_password'
    | 'agent.create'
    | 'agent.update'
    | 'agent.delete'
    | 'agent.generate_workflow'
    | 'workflow.execute'
    | string

  resourceType?: 'user' | 'agent' | 'workflow' | 'api_key' | 'settings' | string
  resourceId?: string

  metadata?: Record<string, unknown>

  createdAt: Date
}

