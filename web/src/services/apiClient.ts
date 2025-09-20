import { pinia } from "@/stores"
import { useAuthStore } from "@/stores/auth"
import axios, { AxiosHeaders } from "axios"

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "https://api.placeholder.dev",
  withCredentials: true,
  timeout: 10000,
})

apiClient.interceptors.request.use((config) => {
  const auth = useAuthStore(pinia)

  if (!auth.isInitialized) {
    auth.hydrate()
  }

  if (auth.token) {
    const headers =
      config.headers instanceof AxiosHeaders
        ? config.headers
        : AxiosHeaders.from(config.headers ?? {})

    headers.set("Authorization", `Bearer ${auth.token}`)
    config.headers = headers
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401) {
      const auth = useAuthStore(pinia)
      auth.clearSession()
    }

    return Promise.reject(error)
  }
)

export default apiClient
