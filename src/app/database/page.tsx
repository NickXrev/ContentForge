'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface TableData {
  tableName: string
  data: any[]
  error?: string
}

export default function DatabasePage() {
  const [tables, setTables] = useState<TableData[]>([])
  const [loading, setLoading] = useState(true)

  const tableNames = [
    'users',
    'teams', 
    'team_members',
    'content_documents',
    'todo_categories',
    'user_activity',
    'analytics'
  ]

  useEffect(() => {
    const fetchData = async () => {
      const results: TableData[] = []
      
      for (const tableName of tableNames) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(10)
          
          results.push({
            tableName,
            data: data || [],
            error: error?.message
          })
        } catch (err: any) {
          results.push({
            tableName,
            data: [],
            error: err.message
          })
        }
      }
      
      setTables(results)
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Database Viewer</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Database Viewer</h1>
      
      {tables.map((table) => (
        <div key={table.tableName} className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-blue-600">
            {table.tableName} ({table.data.length} rows)
          </h2>
          
          {table.error ? (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded">
              Error: {table.error}
            </div>
          ) : (
            <div className="bg-gray-50 border rounded p-4 overflow-x-auto">
              <pre className="text-sm">
                {JSON.stringify(table.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
