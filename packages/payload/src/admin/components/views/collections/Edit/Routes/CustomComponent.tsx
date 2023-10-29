import React from 'react'

import type { CollectionEditViewProps } from '../../../types'

import { API } from '../../../API'
import { LivePreviewView } from '../../../LivePreview'
import VersionView from '../../../Version/Version'
import VersionsView from '../../../Versions'
import { DefaultCollectionEdit } from '../Default/index'
import { isMemoComponent } from '../../../../../../utilities/isMemoComponent'

export type collectionViewType =
  | 'API'
  | 'Default'
  | 'LivePreview'
  | 'References'
  | 'Relationships'
  | 'Version'
  | 'Versions'

export const defaultCollectionViews: {
  [key in collectionViewType]: React.ComponentType<any>
} = {
  API,
  Default: DefaultCollectionEdit,
  LivePreview: LivePreviewView,
  References: null,
  Relationships: null,
  Version: VersionView,
  Versions: VersionsView,
}

export const CustomCollectionComponent = (
  args: CollectionEditViewProps & {
    view: collectionViewType
  },
) => {
  const { collection, view } = args

  const { admin: { components: { views: { Edit } = {} } = {} } = {} } = collection

  // Overriding components may come from multiple places in the config
  // Need to cascade through the hierarchy to find the correct component to render
  // For example, the Edit view:
  // 1. Edit?.Default
  // 2. Edit?.Default?.Component
  // TODO: Remove the `@ts-ignore` when a Typescript wizard arrives
  // For some reason `Component` does not exist on type `Edit[view]` no matter how narrow the type is
  const Component =
    typeof Edit === 'object' && typeof Edit[view] === 'function'
      ? Edit[view]
      : typeof Edit === 'object' &&
        typeof Edit?.[view] === 'object' &&
        // @ts-ignore
        typeof Edit[view].Component === 'function'
      ? // @ts-ignore
        Edit[view].Component
      : isMemoComponent(Edit[view])
      ? Edit[view]
      : defaultCollectionViews[view]

  if (Component) {
    return <Component {...args} />
  }
}
