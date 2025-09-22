import { addDays, subDays } from 'date-fns'

type SortDirection = 'asc' | 'desc'

type QueryOptions<TSort extends string> = {
  page: number
  pageSize: number
  sortBy?: TSort
  sortDir?: SortDirection
  search?: string
}

export type MemberRecord = {
  id: string
  name: string
  role: 'admin' | 'property_manager' | 'tenant'
  joinedAt: string
  status: 'active' | 'inactive' | 'invited'
  email: string
}

export type TodoRecord = {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
  createdBy: string
}

type Dataset<TRecord, TSort extends string> = {
  all: readonly TRecord[]
  query: (options: QueryOptions<TSort>) => { rows: TRecord[]; total: number }
}

const FIRST_NAMES = [
  'Jordan',
  'Taylor',
  'Avery',
  'Morgan',
  'Parker',
  'Casey',
  'Reese',
  'Skyler',
  'Sidney',
  'Harper',
  'Quinn',
  'Jude',
  'Drew',
  'Rowan',
  'Elliot',
]

const LAST_NAMES = [
  'Anderson',
  'Bennett',
  'Chen',
  'Diaz',
  'Emerson',
  'Garcia',
  'Hayes',
  'Ingram',
  'Jenkins',
  'Klein',
  'Lopez',
  'Michaels',
  'Nguyen',
  'Owens',
  'Patel',
  'Romero',
  'Singh',
  'Turner',
  'Underwood',
  'Vega',
]

const TODO_PHRASES = [
  'Reconcile payment variance',
  'Confirm maintenance vendor',
  'Review overnight guest request',
  'Verify lease signature',
  'Prep amenity rotation schedule',
  'Respond to roommate inquiry',
  'Audit visitor log for week',
  'Schedule smoke detector check',
  'Finalize monthly newsletter',
  'Tag Cal.com booking conflicts',
]

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickRandom<T>(values: readonly T[], next: () => number) {
  return values[Math.floor(next() * values.length)]
}

function createMemberDataset(): Dataset<MemberRecord, keyof MemberRecord> {
  const next = mulberry32(42)
  const total = 50000
  const today = new Date()

  const members: MemberRecord[] = Array.from({ length: total }, (_, index) => {
    const first = pickRandom(FIRST_NAMES, next)
    const last = pickRandom(LAST_NAMES, next)
    const joinedOffset = Math.floor(next() * 720) // within ~2 years
    const statusRoll = next()
    const roleRoll = next()

    const role: MemberRecord['role'] =
      roleRoll > 0.85
        ? 'admin'
        : roleRoll > 0.6
        ? 'property_manager'
        : 'tenant'

    const status: MemberRecord['status'] =
      statusRoll > 0.9 ? 'inactive' : statusRoll > 0.75 ? 'invited' : 'active'

    const joinedAt = subDays(today, joinedOffset)

    return {
      id: `member-${index}`,
      name: `${first} ${last}`,
      role,
      status,
      joinedAt: joinedAt.toISOString(),
      email: `${first}.${last}${index}@share.house`.toLowerCase(),
    }
  })

  return {
    all: members,
    query: ({ page, pageSize, sortBy, sortDir, search }) => {
      const safePage = Math.max(page, 1)
      const safePageSize = Math.max(pageSize, 1)

      const normalizedSearch = search?.trim().toLowerCase()

      const filtered = normalizedSearch
        ? members.filter((member) =>
            `${member.name} ${member.email} ${member.role} ${member.status}`
              .toLowerCase()
              .includes(normalizedSearch),
          )
        : members

      let working = filtered
      if (sortBy) {
        const direction = sortDir === 'desc' ? -1 : 1
        working = [...filtered].sort((a, b) => {
          const aValue = a[sortBy]
          const bValue = b[sortBy]

          if (aValue === bValue) return 0

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.localeCompare(bValue) * direction
          }

          return aValue > bValue ? direction : -direction
        })
      }

      const totalRows = working.length
      const start = (safePage - 1) * safePageSize
      const end = start + safePageSize

      return {
        rows: working.slice(start, end),
        total: totalRows,
      }
    },
  }
}

function createTodoDataset(): Dataset<TodoRecord, keyof TodoRecord> {
  const next = mulberry32(1337)
  const total = 30000
  const today = new Date()

  const todos: TodoRecord[] = Array.from({ length: total }, (_, index) => {
    const title = pickRandom(TODO_PHRASES, next)
    const createdOffset = Math.floor(next() * 180)
    const createdAt = subDays(today, createdOffset)
    const statusRoll = next()

    const status: TodoRecord['status'] =
      statusRoll > 0.7 ? 'completed' : statusRoll > 0.35 ? 'in_progress' : 'pending'

    const createdBy = `${pickRandom(FIRST_NAMES, next)} ${pickRandom(LAST_NAMES, next)}`

    return {
      id: `todo-${index}`,
      title,
      status,
      createdAt: addDays(createdAt, Math.floor(next() * 2)).toISOString(),
      createdBy,
    }
  })

  return {
    all: todos,
    query: ({ page, pageSize, sortBy, sortDir, search }) => {
      const safePage = Math.max(page, 1)
      const safePageSize = Math.max(pageSize, 1)
      const normalizedSearch = search?.trim().toLowerCase()

      const filtered = normalizedSearch
        ? todos.filter((todo) =>
            `${todo.title} ${todo.status} ${todo.createdBy}`.toLowerCase().includes(normalizedSearch!),
          )
        : todos

      let working = filtered

      if (sortBy) {
        const direction = sortDir === 'desc' ? -1 : 1
        working = [...filtered].sort((a, b) => {
          const aValue = a[sortBy]
          const bValue = b[sortBy]

          if (aValue === bValue) return 0

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.localeCompare(bValue) * direction
          }

          return aValue > bValue ? direction : -direction
        })
      }

      const totalRows = working.length
      const start = (safePage - 1) * safePageSize
      const end = start + safePageSize

      return {
        rows: working.slice(start, end),
        total: totalRows,
      }
    },
  }
}

const membersDataset = createMemberDataset()
const todosDataset = createTodoDataset()

export function queryMembers(options: QueryOptions<keyof MemberRecord>) {
  return membersDataset.query(options)
}

export function queryTodos(options: QueryOptions<keyof TodoRecord>) {
  return todosDataset.query(options)
}

export const MEMBERS_TOTAL = membersDataset.all.length
export const TODOS_TOTAL = todosDataset.all.length
