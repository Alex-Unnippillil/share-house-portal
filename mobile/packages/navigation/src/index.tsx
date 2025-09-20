import React, { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

export type RouteParams = Record<string, unknown> | undefined;

export interface Route<P extends RouteParams = RouteParams> {
  key: string;
  name: string;
  params?: P;
}

export interface NavigationState {
  routes: Route[];
  index: number;
}

export type NavigationListener = (state: NavigationState) => void;

export interface NavigationStore {
  getState: () => NavigationState;
  subscribe: (listener: NavigationListener) => () => void;
  navigate: (name: string, params?: RouteParams) => void;
  goBack: () => void;
  reset: (routes: Route[]) => void;
  replace: (name: string, params?: RouteParams) => void;
  setParams: (params: RouteParams) => void;
}

export interface NavigationProviderProps {
  initialRoute: { name: string; params?: RouteParams };
  children: React.ReactNode;
  onStateChange?: (state: NavigationState) => void;
}

export interface NavigationContextValue extends Pick<NavigationStore, "navigate" | "goBack" | "reset" | "replace" | "setParams"> {
  state: NavigationState;
  subscribe: NavigationStore["subscribe"];
}

const createRoute = (name: string, params?: RouteParams, key?: string): Route => ({
  name,
  params,
  key: key ?? `${name}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`,
});

const createNavigationStore = (initialRoute: { name: string; params?: RouteParams }): NavigationStore => {
  let state: NavigationState = {
    routes: [createRoute(initialRoute.name, initialRoute.params)],
    index: 0,
  };

  const listeners = new Set<NavigationListener>();

  const notify = () => {
    listeners.forEach((listener) => listener(state));
  };

  const getState = () => state;

  const subscribe = (listener: NavigationListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const navigate = (name: string, params?: RouteParams) => {
    state = {
      routes: [...state.routes.slice(0, state.index + 1), createRoute(name, params)],
      index: state.index + 1,
    };
    notify();
  };

  const goBack = () => {
    if (state.index === 0) {
      return;
    }

    state = {
      routes: state.routes.slice(0, -1),
      index: state.index - 1,
    };
    notify();
  };

  const reset = (routes: Route[]) => {
    if (routes.length === 0) {
      return;
    }

    state = {
      routes,
      index: routes.length - 1,
    };
    notify();
  };

  const replace = (name: string, params?: RouteParams) => {
    const nextRoutes = [...state.routes];
    nextRoutes[state.index] = createRoute(name, params, nextRoutes[state.index]?.key);
    state = {
      routes: nextRoutes,
      index: state.index,
    };
    notify();
  };

  const setParams = (params?: RouteParams) => {
    const nextRoutes = [...state.routes];
    const currentRoute = nextRoutes[state.index];
    if (!currentRoute) {
      return;
    }

    nextRoutes[state.index] = {
      ...currentRoute,
      params: { ...currentRoute.params, ...params },
    };

    state = {
      routes: nextRoutes,
      index: state.index,
    };
    notify();
  };

  return {
    getState,
    subscribe,
    navigate,
    goBack,
    reset,
    replace,
    setParams,
  };
};

const NavigationContext = React.createContext<NavigationContextValue | undefined>(undefined);

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  initialRoute,
  onStateChange,
  children,
}) => {
  const storeRef = useRef<NavigationStore>();

  if (!storeRef.current) {
    storeRef.current = createNavigationStore(initialRoute);
  }

  const store = storeRef.current;

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  useEffect(() => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [onStateChange, state]);

  const value = useMemo<NavigationContextValue>(
    () => ({
      state,
      navigate: store.navigate,
      goBack: store.goBack,
      reset: store.reset,
      replace: store.replace,
      setParams: store.setParams,
      subscribe: store.subscribe,
    }),
    [state, store],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

export const useNavigation = (): NavigationContextValue => {
  const context = React.useContext(NavigationContext);

  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }

  return context;
};

export const useRoute = (): Route => {
  const { state } = useNavigation();
  return state.routes[state.index];
};

export const useNavigationListener = (listener: NavigationListener) => {
  const { subscribe } = useNavigation();
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    return subscribe((nextState) => listenerRef.current(nextState));
  }, [subscribe]);
};

export const createMemoryNavigation = (initialRoute: { name: string; params?: RouteParams }) =>
  createNavigationStore(initialRoute);

export const getActiveRoute = (state: NavigationState): Route => state.routes[state.index];
