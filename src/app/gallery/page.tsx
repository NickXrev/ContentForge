'use client'

import React from 'react'
import { Image } from 'lucide-react'

export default function GalleryPage() {
  const placeholders = Array.from({ length: 12 }).map((_, i) => i)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Image className="w-6 h-6 text-blue-600" /> Gallery
        </h1>
        <p className="text-gray-600">Your media library for images and assets.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {placeholders.map((i) => (
          <div key={i} className="aspect-video bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-gray-400">
            <Image className="w-8 h-8" />
          </div>
        ))}
      </div>
    </div>
  )
}


