// "use server";
import { headers } from 'next/headers'

import { getLogger, withRequestContext } from '@/lib/logger'

const log = getLogger({ module: 'dashboard.todo.actions' })

export async function createTodo() {
  const requestHeaders = headers()
  return withRequestContext(
    async () => {
      log.info('createTodo invoked')
    },
    { headers: requestHeaders }
  )
}

export async function updateTodoById(id: string) {
  const requestHeaders = headers()
  return withRequestContext(
    async () => {
      log.info({ id }, 'updateTodoById invoked')
    },
    { headers: requestHeaders }
  )
}

export async function deleteTodoById(id: string) {
  const requestHeaders = headers()
  return withRequestContext(
    async () => {
      log.info({ id }, 'deleteTodoById invoked')
    },
    { headers: requestHeaders }
  )
}

export async function readTodos() {
  const requestHeaders = headers()
  return withRequestContext(
    async () => {
      log.info('readTodos invoked')
    },
    { headers: requestHeaders }
  )
}
