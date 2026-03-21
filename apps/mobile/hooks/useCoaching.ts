import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { CoachingPlan, CoachingInsight, RecoveryStatus, GeneratePlanDto } from '@runmate/types'

export function useCoachingPlans() {
  return useQuery({
    queryKey: ['coaching', 'plans'],
    queryFn: async () => {
      const { data } = await api.get<CoachingPlan[]>('/coaching/plans')
      return data
    },
  })
}

export function useCoachingInsights() {
  return useQuery({
    queryKey: ['coaching', 'insights'],
    queryFn: async () => {
      const { data } = await api.get<CoachingInsight[]>('/coaching/insights')
      return data
    },
  })
}

export function useRecoveryStatus() {
  return useQuery({
    queryKey: ['coaching', 'recovery'],
    queryFn: async () => {
      const { data } = await api.get<RecoveryStatus>('/coaching/recovery')
      return data
    },
  })
}

export function useGeneratePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: GeneratePlanDto) => {
      const { data } = await api.post<CoachingPlan>('/coaching/plans/generate', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching', 'plans'] })
    },
  })
}

export function useMarkInsightRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (insightId: string) => {
      await api.post(`/coaching/insights/${insightId}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching', 'insights'] })
    },
  })
}
