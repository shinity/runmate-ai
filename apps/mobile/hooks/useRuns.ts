import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Run, CreateRunDto, RunStats } from '@runmate/types'

export function useRuns() {
  return useQuery({
    queryKey: ['runs'],
    queryFn: async () => {
      const { data } = await api.get<Run[]>('/runs?limit=20')
      return data
    },
  })
}

export function useRun(id: string) {
  return useQuery({
    queryKey: ['runs', id],
    queryFn: async () => {
      const { data } = await api.get<Run>(`/runs/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useWeeklyStats() {
  return useQuery({
    queryKey: ['runs', 'stats', 'weekly'],
    queryFn: async () => {
      const { data } = await api.get<RunStats>('/runs/stats/weekly')
      return data
    },
  })
}

export function usePersonalRecords() {
  return useQuery({
    queryKey: ['runs', 'personal-records'],
    queryFn: async () => {
      const { data } = await api.get('/runs/personal-records')
      return data
    },
  })
}

export function useCreateRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (run: CreateRunDto) => {
      const { data } = await api.post<Run>('/runs', run)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] })
      queryClient.invalidateQueries({ queryKey: ['coaching', 'insights'] })
    },
  })
}
