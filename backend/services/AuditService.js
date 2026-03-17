class AuditService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async log({ actorId, action, entityType = null, entityId = null, metadata = {} }) {
    const { error } = await this.supabase
      .from('audit_logs')
      .insert({
        actor_id: actorId || null,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata
      });

    if (error) {
      console.error('[AuditLog] Failed:', error.message);
    }
  }
}

module.exports = AuditService;
