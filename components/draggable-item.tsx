import React from 'react'

interface DraggableItemProps {
  children: React.ReactNode
}

export function DraggableItem({ children }: DraggableItemProps) {
  return (
    <div>
      {children}
    </div>
  )
}