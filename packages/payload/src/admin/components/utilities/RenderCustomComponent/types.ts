import type React from 'react'

export type Props = {
  CustomComponent?: React.ComponentType<any> | React.MemoExoticComponent<React.ComponentType<any>>
  DefaultComponent: React.ComponentType<any>
  componentProps?: Record<string, unknown>
}
