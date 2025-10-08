'use client'

import { useState, useEffect } from 'react'
import { Plus, Filter, Search, Calendar, Tag, CheckCircle2, Circle, Clock, AlertCircle, GripVertical } from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface Todo {
  id: string
  title: string
  description?: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
  tags: string[]
  metadata: any
}

interface TodoCategory {
  id: string
  name: string
  color: string
  icon: string
}

const priorityColors = {
  low: 'text-gray-500 bg-gray-100',
  medium: 'text-blue-600 bg-blue-100',
  high: 'text-orange-600 bg-orange-100',
  urgent: 'text-red-600 bg-red-100'
}

const statusColors = {
  pending: 'text-gray-600 bg-gray-100',
  in_progress: 'text-blue-600 bg-blue-100',
  completed: 'text-green-600 bg-green-100',
  cancelled: 'text-red-600 bg-red-100'
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [categories, setCategories] = useState<TodoCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [editingCategory, setEditingCategory] = useState<TodoCategory | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')

  // New todo form state
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium' as const,
    due_date: '',
    tags: [] as string[]
  })

  // New category form state
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#3B82F6',
    icon: '📝'
  })

  useEffect(() => {
    fetchTodos()
    fetchCategories()
  }, [])

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTodos(data || [])
    } catch (error) {
      console.error('Error fetching todos:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('todo_categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodo.title.trim()) return

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }
      
      const { data, error } = await supabase
        .from('todos')
        .insert([{
          user_id: user.id,
          title: newTodo.title,
          description: newTodo.description,
          category: newTodo.category,
          priority: newTodo.priority,
          due_date: newTodo.due_date || null,
          tags: newTodo.tags
        }])
        .select()


      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      setTodos([data[0], ...todos])
      setNewTodo({
        title: '',
        description: '',
        category: 'general',
        priority: 'medium',
        due_date: '',
        tags: []
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding todo:', error)
      alert(`Error adding todo: ${error.message || 'Unknown error'}`)
    }
  }

  const updateTodoStatus = async (id: string, status: Todo['status']) => {
    try {
      const updateData: any = { status }
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else if (status !== 'completed') {
        updateData.completed_at = null
      }

      const { error } = await supabase
        .from('todos')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      setTodos(todos.map(todo => 
        todo.id === id 
          ? { ...todo, status, completed_at: updateData.completed_at }
          : todo
      ))
    } catch (error) {
      console.error('Error updating todo:', error)
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTodos(todos.filter(todo => todo.id !== id))
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return

    try {
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('todo_categories')
        .insert([{
          user_id: user.id,
          name: newCategory.name,
          color: newCategory.color,
          icon: newCategory.icon
        }])
        .select()


      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      setCategories([...categories, data[0]])
      // Auto-select the new category in the todo form (works for both add and edit)
      setNewTodo({ ...newTodo, category: data[0].name })
      setNewCategory({
        name: '',
        color: '#3B82F6',
        icon: '📝'
      })
      setShowCategoryForm(false)
    } catch (error) {
      console.error('Error adding category:', error)
      alert(`Error adding category: ${error.message || 'Unknown error'}`)
    }
  }

  const editCategory = (category: TodoCategory) => {
    setEditingCategory(category)
    setNewCategory({
      name: category.name,
      color: category.color,
      icon: category.icon
    })
    setShowCategoryForm(true)
  }

  const updateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.name.trim() || !editingCategory) return

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('todo_categories')
        .update({
          name: newCategory.name,
          color: newCategory.color,
          icon: newCategory.icon
        })
        .eq('id', editingCategory.id)
        .select()

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      setCategories(categories.map(cat => 
        cat.id === editingCategory.id ? data[0] : cat
      ))
      setNewCategory({ name: '', color: '#3B82F6', icon: '📝' })
      setEditingCategory(null)
      setShowCategoryForm(false)
    } catch (error) {
      console.error('Error updating category:', error)
      alert(`Error updating category: ${error.message || 'Unknown error'}`)
    }
  }

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This will remove it from all todos.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('todo_categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      setCategories(categories.filter(cat => cat.id !== categoryId))
    } catch (error) {
      console.error('Error deleting category:', error)
      alert(`Error deleting category: ${error.message || 'Unknown error'}`)
    }
  }

  const editTodo = (todo: Todo) => {
    setEditingTodo(todo)
    setNewTodo({
      title: todo.title,
      description: todo.description || '',
      category: todo.category,
      priority: todo.priority,
      due_date: todo.due_date ? new Date(todo.due_date).toISOString().slice(0, 16) : '',
      tags: todo.tags
    })
    setShowEditForm(true)
  }

  const updateTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTodo || !newTodo.title.trim()) return

    try {
      console.log('Attempting to update todo:', { id: editingTodo.id, ...newTodo })
      
      const { data, error } = await supabase
        .from('todos')
        .update({
          title: newTodo.title,
          description: newTodo.description,
          category: newTodo.category,
          priority: newTodo.priority,
          due_date: newTodo.due_date || null,
          tags: newTodo.tags
        })
        .eq('id', editingTodo.id)
        .select()

      console.log('Update response:', { data, error })

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      setTodos(todos.map(todo => 
        todo.id === editingTodo.id 
          ? { ...todo, ...data[0] }
          : todo
      ))
      
      setEditingTodo(null)
      setNewTodo({
        title: '',
        description: '',
        category: 'general',
        priority: 'medium',
        due_date: '',
        tags: []
      })
      setShowEditForm(false)
    } catch (error) {
      console.error('Error updating todo:', error)
      alert(`Error updating todo: ${error.message || 'Unknown error'}`)
    }
  }

  const handleReorder = (newOrder: Todo[]) => {
    // Use a more efficient update
    setTodos(prevTodos => {
      // Only update if the order actually changed
      const hasChanged = newOrder.some((todo, index) => 
        prevTodos[index]?.id !== todo.id
      )
      return hasChanged ? newOrder : prevTodos
    })
  }

  const filteredTodos = todos.filter(todo => {
    const matchesSearch = todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         todo.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || todo.category === selectedCategory
    const matchesStatus = selectedStatus === 'all' || todo.status === selectedStatus
    const matchesPriority = selectedPriority === 'all' || todo.priority === selectedPriority

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority
  })

  const getCategoryInfo = (categoryName: string) => {
    return categories.find(cat => cat.name === categoryName) || {
      name: categoryName,
      color: '#6B7280',
      icon: '📋'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Todos & Tasks</h1>
          <p className="text-gray-600 mt-1">Manage your content ideas and tasks</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Todo</span>
        </button>
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search todos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCategoryForm(true)}
              className="px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              + Add Category
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Category Management */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
          <button
            onClick={() => {
              setEditingCategory(null)
              setNewCategory({ name: '', color: '#3B82F6', icon: '📝' })
              setShowCategoryForm(true)
            }}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Add Category
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <div
              key={category.id}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: category.color + '20', color: category.color }}
            >
              <span>{category.icon}</span>
              <span className="font-medium">{category.name}</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => editCategory(category)}
                  className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
                  title="Edit category"
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteCategory(category.id)}
                  className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
                  title="Delete category"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Todo List */}
      <div className="flex-1 overflow-y-auto p-6">
        {isDragging && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <div className="flex items-center space-x-2">
              <GripVertical className="w-4 h-4" />
              <span>Drag to reorder your todos</span>
            </div>
          </div>
        )}
        <Reorder.Group
          axis="y"
          values={filteredTodos}
          onReorder={handleReorder}
          className="space-y-4"
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          layoutScroll={false}
          dragConstraints={{ top: 0, bottom: 0 }}
        >
          <AnimatePresence>
            {filteredTodos.map((todo) => {
              const categoryInfo = getCategoryInfo(todo.category)
              return (
                <Reorder.Item
                  key={todo.id}
                  value={todo}
                  className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-150 ${
                    isDragging ? 'opacity-50' : 'opacity-100'
                  }`}
                  style={{ 
                    willChange: 'transform',
                    transform: 'translateZ(0)' // Force hardware acceleration
                  }}
                  whileDrag={{ 
                    scale: 1.01,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                    zIndex: 50
                  }}
                  transition={{ 
                    type: "tween", 
                    duration: 0.2 
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Drag Handle */}
                      <div className="mt-1 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing group-hover:text-gray-600 transition-colors">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Status Checkbox */}
                      <button
                        onClick={() => updateTodoStatus(todo.id, todo.status === 'completed' ? 'pending' : 'completed')}
                        className="mt-1"
                      >
                        {todo.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className={`font-medium ${todo.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {todo.title}
                          </h3>
                          {todo.due_date && isOverdue(todo.due_date) && todo.status !== 'completed' && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        
                        {todo.description && (
                          <p className={`text-sm text-gray-600 mb-2 ${todo.status === 'completed' ? 'line-through' : ''}`}>
                            {todo.description}
                          </p>
                        )}

                        {/* Tags and Meta */}
                        <div className="flex items-center space-x-4 text-xs">
                          {/* Category */}
                          <div className="flex items-center space-x-1">
                            <span>{categoryInfo.icon}</span>
                            <span className="text-gray-600">{categoryInfo.name}</span>
                          </div>

                          {/* Priority */}
                          <span className={`px-2 py-1 rounded-full ${priorityColors[todo.priority]}`}>
                            {todo.priority}
                          </span>

                          {/* Status */}
                          <span className={`px-2 py-1 rounded-full ${statusColors[todo.status]}`}>
                            {todo.status.replace('_', ' ')}
                          </span>

                          {/* Due Date */}
                          {todo.due_date && (
                            <div className="flex items-center space-x-1 text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span className={isOverdue(todo.due_date) && todo.status !== 'completed' ? 'text-red-600' : ''}>
                                {formatDate(todo.due_date)}
                              </span>
                            </div>
                          )}

                          {/* Tags */}
                          {todo.tags.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Tag className="w-3 h-3 text-gray-400" />
                              <div className="flex space-x-1">
                                {todo.tags.slice(0, 3).map((tag, index) => (
                                  <span key={index} className="px-1 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                    {tag}
                                  </span>
                                ))}
                                {todo.tags.length > 3 && (
                                  <span className="text-gray-400">+{todo.tags.length - 3}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => editTodo(todo)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      {todo.status === 'pending' && (
                        <button
                          onClick={() => updateTodoStatus(todo.id, 'in_progress')}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Start
                        </button>
                      )}
                      {todo.status === 'in_progress' && (
                        <button
                          onClick={() => updateTodoStatus(todo.id, 'pending')}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Pause
                        </button>
                      )}
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </Reorder.Item>
              )
            })}
          </AnimatePresence>
        </Reorder.Group>

        {filteredTodos.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <CheckCircle2 className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No todos found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first todo'
              }
            </p>
            {!searchTerm && selectedCategory === 'all' && selectedStatus === 'all' && selectedPriority === 'all' && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Todo
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Todo Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Todo</h2>
            <form onSubmit={addTodo}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newTodo.title}
                    onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What needs to be done?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTodo.description}
                    onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add details..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={newTodo.category}
                        onChange={(e) => setNewTodo({ ...newTodo, category: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {categories.map(category => (
                          <option key={category.id} value={category.name}>
                            {category.icon} {category.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCategoryForm(true)}
                        className="px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={newTodo.priority}
                      onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={newTodo.due_date}
                    onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Todo
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Todo Modal */}
      {showEditForm && editingTodo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Todo</h2>
            <form onSubmit={updateTodo}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newTodo.title}
                    onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What needs to be done?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTodo.description}
                    onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add details..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={newTodo.category}
                        onChange={(e) => setNewTodo({ ...newTodo, category: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {categories.map(category => (
                          <option key={category.id} value={category.name}>
                            {category.icon} {category.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCategoryForm(true)}
                        className="px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={newTodo.priority}
                      onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={newTodo.due_date}
                    onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false)
                    setEditingTodo(null)
                    setNewTodo({
                      title: '',
                      description: '',
                      category: 'general',
                      priority: 'medium',
                      due_date: '',
                      tags: []
                    })
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Todo
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>
            <form onSubmit={editingCategory ? updateCategory : addCategory}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Marketing Ideas"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon
                    </label>
                    <select
                      value={newCategory.icon}
                      onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="📝">📝 Note</option>
                      <option value="💡">💡 Idea</option>
                      <option value="📱">📱 Social</option>
                      <option value="📊">📊 Analytics</option>
                      <option value="🔍">🔍 Research</option>
                      <option value="📋">📋 Task</option>
                      <option value="🎯">🎯 Goal</option>
                      <option value="⚡">⚡ Urgent</option>
                      <option value="📈">📈 Growth</option>
                      <option value="💼">💼 Business</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false)
                    setEditingCategory(null)
                    setNewCategory({ name: '', color: '#3B82F6', icon: '📝' })
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
