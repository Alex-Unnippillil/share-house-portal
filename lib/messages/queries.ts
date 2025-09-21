export const THREAD_WITH_MESSAGES_SELECT = `
  id,
  title,
  building_id,
  unit_id,
  created_at,
  updated_at,
  last_message_at,
  metadata,
  pinned_message_id,
  pinned_at,
  pinned_by,
  created_by,
  created_by_profile:profiles!threads_created_by_fkey (
    id,
    full_name,
    avatar_url,
    role,
    building_id,
    unit_id
  ),
  pinned_by_profile:profiles!threads_pinned_by_fkey (
    id,
    full_name,
    avatar_url,
    role,
    building_id,
    unit_id
  ),
  unit:units (
    id,
    name
  ),
  building:buildings (
    id,
    name
  ),
  messages:messages(limit:50, order:created_at.asc) (
    id,
    thread_id,
    parent_message_id,
    author_id,
    content,
    message_type,
    metadata,
    status,
    client_id,
    created_at,
    updated_at,
    deleted_at,
    building_id,
    unit_id,
    author:profiles!messages_author_id_fkey (
      id,
      full_name,
      avatar_url,
      role,
      building_id,
      unit_id
    ),
    reactions:message_reactions (
      id,
      message_id,
      profile_id,
      reaction,
      created_at,
      profile:profiles!message_reactions_profile_id_fkey (
        id,
        full_name,
        avatar_url,
        role,
        building_id,
        unit_id
      )
    ),
    moderation:message_moderation (
      id,
      action,
      reason,
      performed_by,
      created_at,
      metadata,
      performed_by_profile:profiles!message_moderation_performed_by_fkey (
        id,
        full_name,
        avatar_url,
        role,
        building_id,
        unit_id
      )
    )
  )
`

export const MESSAGE_WITH_RELATIONS_SELECT = `
  id,
  thread_id,
  parent_message_id,
  author_id,
  content,
  message_type,
  metadata,
  status,
  client_id,
  created_at,
  updated_at,
  deleted_at,
  building_id,
  unit_id,
  author:profiles!messages_author_id_fkey (
    id,
    full_name,
    avatar_url,
    role,
    building_id,
    unit_id
  ),
  reactions:message_reactions (
    id,
    message_id,
    profile_id,
    reaction,
    created_at,
    profile:profiles!message_reactions_profile_id_fkey (
      id,
      full_name,
      avatar_url,
      role,
      building_id,
      unit_id
    )
  ),
  moderation:message_moderation (
    id,
    action,
    reason,
    performed_by,
    created_at,
    metadata,
    performed_by_profile:profiles!message_moderation_performed_by_fkey (
      id,
      full_name,
      avatar_url,
      role,
      building_id,
      unit_id
    )
  )
`
