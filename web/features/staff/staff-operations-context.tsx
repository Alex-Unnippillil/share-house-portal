"use client"

import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react"

import type {
  ChecklistState,
  IncidentReport,
  PackageRecord,
  PackageStatus,
  ShiftLogEntry,
  StaffOperationsState,
  TimeSession,
  VisitorRecord,
  VisitorStatus,
  WorkOrder,
  WorkOrderStatus,
} from "@/types/staff"

const STORAGE_KEY = "staff-operations-state"
const CHANNEL_NAME = "staff-operations"

const initialChecklist: ChecklistState = {
  incidentLogged: false,
  packageIntake: false,
  shiftLogUpdated: false,
  timeTracked: false,
  visitorSignIn: false,
  workOrderUpdated: false,
}

const initialState: StaffOperationsState = {
  checklist: initialChecklist,
  incidents: [],
  packages: [],
  shiftLog: [],
  timeTracking: {
    activeSessions: [],
    history: [],
  },
  version: 0,
  visitors: [],
  workOrders: {
    completed: [],
    in_progress: [],
    new: [],
  },
}

type StaffOperationsAction =
  | { type: "hydrate"; payload: StaffOperationsState }
  | { type: "addPackage"; payload: PackageRecord }
  | {
      type: "updatePackageStatus"
      payload: { id: string; status: PackageStatus; notes?: string }
    }
  | { type: "addVisitor"; payload: VisitorRecord }
  | { type: "updateVisitorStatus"; payload: { id: string; status: VisitorStatus } }
  | { type: "addWorkOrder"; payload: WorkOrder }
  | { type: "moveWorkOrder"; payload: { id: string; status: WorkOrderStatus } }
  | { type: "addShiftEntry"; payload: ShiftLogEntry }
  | { type: "addIncident"; payload: IncidentReport }
  | { type: "startSession"; payload: TimeSession }
  | {
      type: "stopSession"
      payload: { id: string; endedAt: string; notes?: string }
    }
  | { type: "toggleBreak"; payload: { id: string; timestamp: string } }

const incrementVersion = (state: StaffOperationsState): StaffOperationsState => ({
  ...state,
  version: state.version + 1,
})

const updateChecklist = <K extends keyof ChecklistState>(
  state: StaffOperationsState,
  key: K,
): StaffOperationsState => ({
  ...state,
  checklist: {
    ...state.checklist,
    [key]: true,
  },
})

const staffOperationsReducer = (
  state: StaffOperationsState,
  action: StaffOperationsAction,
): StaffOperationsState => {
  switch (action.type) {
    case "hydrate": {
      if (action.payload.version <= state.version) {
        return state
      }
      return action.payload
    }
    case "addPackage": {
      const nextState = incrementVersion(state)
      return updateChecklist(
        {
          ...nextState,
          packages: [action.payload, ...nextState.packages],
        },
        "packageIntake",
      )
    }
    case "updatePackageStatus": {
      const nextState = incrementVersion(state)
      return {
        ...nextState,
        packages: nextState.packages.map((item) =>
          item.id === action.payload.id
            ? { ...item, status: action.payload.status, notes: action.payload.notes }
            : item,
        ),
      }
    }
    case "addVisitor": {
      const nextState = incrementVersion(state)
      return updateChecklist(
        {
          ...nextState,
          visitors: [action.payload, ...nextState.visitors],
        },
        "visitorSignIn",
      )
    }
    case "updateVisitorStatus": {
      const nextState = incrementVersion(state)
      return {
        ...nextState,
        visitors: nextState.visitors.map((visitor) =>
          visitor.id === action.payload.id
            ? {
                ...visitor,
                status: action.payload.status,
                checkOut:
                  action.payload.status === "checked_out"
                    ? new Date().toISOString()
                    : visitor.checkOut,
              }
            : visitor,
        ),
      }
    }
    case "addWorkOrder": {
      const nextState = incrementVersion(state)
      const nextWorkOrders = {
        ...nextState.workOrders,
        [action.payload.status]: [
          action.payload,
          ...nextState.workOrders[action.payload.status],
        ],
      }
      return updateChecklist({ ...nextState, workOrders: nextWorkOrders }, "workOrderUpdated")
    }
    case "moveWorkOrder": {
      const nextState = incrementVersion(state)
      const { id, status } = action.payload
      const currentStatus = (Object.keys(nextState.workOrders) as WorkOrderStatus[]).find((key) =>
        nextState.workOrders[key].some((order) => order.id === id),
      )
      if (!currentStatus) {
        return nextState
      }
      const movedOrder = nextState.workOrders[currentStatus].find((order) => order.id === id)
      if (!movedOrder) {
        return nextState
      }
      const updatedCurrent = nextState.workOrders[currentStatus].filter((order) => order.id !== id)
      const updatedTarget: WorkOrder[] = [
        { ...movedOrder, status, updatedAt: new Date().toISOString() },
        ...nextState.workOrders[status],
      ]
      return updateChecklist(
        {
          ...nextState,
          workOrders: {
            ...nextState.workOrders,
            [currentStatus]: updatedCurrent,
            [status]: updatedTarget,
          },
        },
        "workOrderUpdated",
      )
    }
    case "addShiftEntry": {
      const nextState = incrementVersion(state)
      return updateChecklist(
        {
          ...nextState,
          shiftLog: [action.payload, ...nextState.shiftLog],
        },
        "shiftLogUpdated",
      )
    }
    case "addIncident": {
      const nextState = incrementVersion(state)
      return updateChecklist(
        {
          ...nextState,
          incidents: [action.payload, ...nextState.incidents],
        },
        "incidentLogged",
      )
    }
    case "startSession": {
      const nextState = incrementVersion(state)
      const existing = nextState.timeTracking.activeSessions.filter(
        (session) => session.staffName !== action.payload.staffName,
      )
      return updateChecklist(
        {
          ...nextState,
          timeTracking: {
            ...nextState.timeTracking,
            activeSessions: [action.payload, ...existing],
          },
        },
        "timeTracked",
      )
    }
    case "stopSession": {
      const nextState = incrementVersion(state)
      const session = nextState.timeTracking.activeSessions.find(
        (item) => item.id === action.payload.id,
      )
      if (!session) {
        return nextState
      }
      const closedBreaks = session.breaks.map((entry) =>
        entry.endedAt ? entry : { ...entry, endedAt: action.payload.endedAt },
      )
      const completedSession: TimeSession = {
        ...session,
        breaks: closedBreaks,
        endedAt: action.payload.endedAt,
        notes: action.payload.notes ?? session.notes,
      }
      return updateChecklist(
        {
          ...nextState,
          timeTracking: {
            activeSessions: nextState.timeTracking.activeSessions.filter(
              (item) => item.id !== action.payload.id,
            ),
            history: [completedSession, ...nextState.timeTracking.history],
          },
        },
        "timeTracked",
      )
    }
    case "toggleBreak": {
      const nextState = incrementVersion(state)
      const updatedSessions = nextState.timeTracking.activeSessions.map((session) => {
        if (session.id !== action.payload.id) {
          return session
        }
        const hasOpenBreak = session.breaks.some((entry) => !entry.endedAt)
        if (hasOpenBreak) {
          return {
            ...session,
            breaks: session.breaks.map((entry) =>
              entry.endedAt ? entry : { ...entry, endedAt: action.payload.timestamp },
            ),
          }
        }
        return {
          ...session,
          breaks: [
            ...session.breaks,
            { id: `${session.id}-break-${session.breaks.length + 1}`, startedAt: action.payload.timestamp },
          ],
        }
      })
      return updateChecklist(
        {
          ...nextState,
          timeTracking: {
            ...nextState.timeTracking,
            activeSessions: updatedSessions,
          },
        },
        "timeTracked",
      )
    }
    default:
      return state
  }
}

type StaffOperationsContextValue = {
  state: StaffOperationsState
  addPackage: (packageRecord: PackageRecord) => void
  updatePackageStatus: (id: string, status: PackageStatus, notes?: string) => void
  addVisitor: (visitor: VisitorRecord) => void
  updateVisitorStatus: (id: string, status: VisitorStatus) => void
  addWorkOrder: (workOrder: WorkOrder) => void
  moveWorkOrder: (id: string, status: WorkOrderStatus) => void
  addShiftEntry: (entry: ShiftLogEntry) => void
  addIncident: (incident: IncidentReport) => void
  startSession: (session: TimeSession) => void
  stopSession: (payload: { id: string; endedAt: string; notes?: string }) => void
  toggleBreak: (payload: { id: string; timestamp: string }) => void
}

const StaffOperationsContext = createContext<StaffOperationsContextValue | undefined>(
  undefined,
)

export const StaffOperationsProvider = ({
  children,
  initialData,
}: {
  children: React.ReactNode
  initialData?: StaffOperationsState
}) => {
  const [state, dispatch] = useReducer(
    staffOperationsReducer,
    initialData ?? initialState,
  )
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const skipBroadcastRef = useRef(false)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleIncomingState = (payload: StaffOperationsState) => {
      if (payload.version <= stateRef.current.version) {
        return
      }
      skipBroadcastRef.current = true
      dispatch({ type: "hydrate", payload })
    }

    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME)
      broadcastChannelRef.current = channel
      channel.addEventListener("message", (event) => {
        if (event?.data) {
          handleIncomingState(event.data as StaffOperationsState)
        }
      })
      return () => channel.close()
    }

    const poll = window.setInterval(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return
      }
      try {
        const parsed = JSON.parse(raw) as StaffOperationsState
        handleIncomingState(parsed)
      } catch (error) {
        console.error("Failed to parse stored staff state", error)
      }
    }, 5000)

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) {
        return
      }
      try {
        const parsed = JSON.parse(event.newValue) as StaffOperationsState
        handleIncomingState(parsed)
      } catch (error) {
        console.error("Failed to parse storage event", error)
      }
    }

    window.addEventListener("storage", handleStorage)

    return () => {
      window.clearInterval(poll)
      window.removeEventListener("storage", handleStorage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    if (skipBroadcastRef.current) {
      skipBroadcastRef.current = false
      return
    }
    try {
      const serialized = JSON.stringify(state)
      window.localStorage.setItem(STORAGE_KEY, serialized)
      broadcastChannelRef.current?.postMessage(state)
    } catch (error) {
      console.error("Failed to persist staff operations state", error)
    }
  }, [state])

  const contextValue = useMemo<StaffOperationsContextValue>(() => {
    return {
      state,
      addIncident: (incident) => dispatch({ type: "addIncident", payload: incident }),
      addPackage: (packageRecord) => dispatch({ type: "addPackage", payload: packageRecord }),
      addShiftEntry: (entry) => dispatch({ type: "addShiftEntry", payload: entry }),
      addVisitor: (visitor) => dispatch({ type: "addVisitor", payload: visitor }),
      addWorkOrder: (workOrder) => dispatch({ type: "addWorkOrder", payload: workOrder }),
      moveWorkOrder: (id, status) => dispatch({ type: "moveWorkOrder", payload: { id, status } }),
      startSession: (session) => dispatch({ type: "startSession", payload: session }),
      stopSession: (payload) => dispatch({ type: "stopSession", payload }),
      toggleBreak: (payload) => dispatch({ type: "toggleBreak", payload }),
      updatePackageStatus: (id, status, notes) =>
        dispatch({ type: "updatePackageStatus", payload: { id, status, notes } }),
      updateVisitorStatus: (id, status) =>
        dispatch({ type: "updateVisitorStatus", payload: { id, status } }),
    }
  }, [state])

  return (
    <StaffOperationsContext.Provider value={contextValue}>
      {children}
    </StaffOperationsContext.Provider>
  )
}

export const useStaffOperations = () => {
  const context = useContext(StaffOperationsContext)
  if (!context) {
    throw new Error("useStaffOperations must be used within StaffOperationsProvider")
  }
  return context
}

export const getInitialStaffOperationsState = () => initialState
