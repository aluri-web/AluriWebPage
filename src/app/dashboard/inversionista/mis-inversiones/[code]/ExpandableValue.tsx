'use client'

import { useState } from 'react'

export default function ExpandableValue({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <p
      onClick={() => setExpanded(!expanded)}
      className={`${className} cursor-pointer ${expanded ? 'whitespace-normal break-all' : 'truncate'}`}
    >
      {children}
    </p>
  )
}
