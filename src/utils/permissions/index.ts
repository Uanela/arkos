import { AuthConfigs } from '../../types'

export const permissions: Record<string, AuthConfigs> = {
  uploads: {
    authenticationControl: {
      view: false,
    },
    accessControl: {
      view: ['admin', 'customer'],
      create: ['admin'],
      update: ['admin'],
      delete: ['admin'],
    },
  },
}
