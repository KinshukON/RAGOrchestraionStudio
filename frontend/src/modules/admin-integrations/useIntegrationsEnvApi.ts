import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEnvironment,
  deleteEnvironment,
  listEnvironments,
  updateEnvironment,
  type EnvironmentConfig,
} from '../../api/environments'
import {
  createIntegration,
  deleteIntegration,
  listIntegrations,
  updateIntegration,
  type IntegrationConfig,
} from '../../api/integrations'

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: listIntegrations,
  })
}

export function useEnvironments() {
  return useQuery({
    queryKey: ['environments'],
    queryFn: listEnvironments,
  })
}

export function useSaveIntegration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (config: IntegrationConfig) => {
      if (config.id) {
        return updateIntegration(config.id, config)
      }
      return createIntegration(config)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
  })
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
  })
}

export function useSaveEnvironment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (config: EnvironmentConfig) => {
      if (config.id) {
        return updateEnvironment(config.id, config)
      }
      return createEnvironment(config)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] })
    },
  })
}

export function useDeleteEnvironment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEnvironment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] })
    },
  })
}

