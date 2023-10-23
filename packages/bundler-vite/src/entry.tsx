import { Root } from '@stigma-io/payload/components/root'
// @ts-expect-error
import config from 'payload-config'
import React from 'react'
import { createRoot } from 'react-dom/client'

const container = document.getElementById('app')
const root = createRoot(container)
root.render(<Root config={config} />)
