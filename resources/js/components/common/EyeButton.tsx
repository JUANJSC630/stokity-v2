
import React from 'react'
import { Button } from '../ui/button'
import { Eye } from 'lucide-react'

interface EyeButtonProps {
  text: string;
}

export default function EyeButton({ text }: EyeButtonProps) {
  return (
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
      <Eye className="size-4" />
      <span className="sr-only">{text}</span>
    </Button>
  )
}
