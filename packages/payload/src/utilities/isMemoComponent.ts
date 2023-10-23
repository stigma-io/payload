import React, { ComponentType, MemoExoticComponent } from 'react'

const REACT_MEMO_TYPE = Symbol.for('react.memo')

type ComponentMix<T extends ComponentType<any>> =
  | React.ComponentType<T>
  | MemoExoticComponent<T>
  | any
type ComponentMemo<T extends ComponentType<any>> = MemoExoticComponent<T>

export const isMemoComponent = <T extends ComponentType<any>>(Component: ComponentMix<T>) => {
  return (
    typeof Component === 'object' && (Component as ComponentMemo<T>).$$typeof === REACT_MEMO_TYPE
  )
}
