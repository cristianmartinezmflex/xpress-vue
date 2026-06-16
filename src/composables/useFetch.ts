import { ref } from 'vue'
import http from '@/services/http'
import type { ApiResponse } from '@/types'

export function useFetch<T>() {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function execute(url: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await http.get<ApiResponse<T>>(url)
      data.value = res.data.data
    } catch (e: any) {
      error.value = e.message ?? 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
