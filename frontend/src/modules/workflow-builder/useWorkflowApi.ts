import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createWorkflow, getWorkflow, updateWorkflow, type WorkflowDefinition } from '../../api/workflows'

export function useWorkflow(id: string | null) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => {
      if (!id) {
        throw new Error('No workflow id provided')
      }
      return getWorkflow(id)
    },
    enabled: !!id,
  })
}

export function useSaveWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (definition: WorkflowDefinition) => {
      if (_isExisting(definition)) {
        return updateWorkflow(definition.id, definition)
      }
      return createWorkflow(definition)
    },
    onSuccess: (definition) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', definition.id] })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

function _isExisting(definition: WorkflowDefinition) {
  // In a real app, presence of the id in store or a dedicated flag would be used.
  // For now, treat any non-empty id as an upsert key and let backend enforce uniqueness.
  return !!definition.id
}

