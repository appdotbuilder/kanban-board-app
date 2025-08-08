import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Plus, Calendar, Clock } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Task, CreateTaskInput, TaskStatus } from '../../server/src/schema';

interface DragItem {
  type: 'task';
  task: Task;
}

const statusColumns: { status: TaskStatus; title: string; color: string }[] = [
  { status: 'todo', title: 'To Do', color: 'bg-slate-50 border-slate-200' },
  { status: 'in_progress', title: 'In Progress', color: 'bg-blue-50 border-blue-200' },
  { status: 'done', title: 'Done', color: 'bg-green-50 border-green-200' }
];

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Form state for creating new tasks
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: null,
    due_date: null,
    status: 'todo'
  });

  const loadTasks = useCallback(async () => {
    try {
      const result = await trpc.getTasks.query();
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newTask = await trpc.createTask.mutate(formData);
      setTasks((prev: Task[]) => [...prev, newTask]);
      setFormData({
        title: '',
        description: null,
        due_date: null,
        status: 'todo'
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback to the dragged element
    const target = e.target as HTMLElement;
    target.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over state if we're leaving the column entirely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    try {
      const updatedTask = await trpc.updateTask.mutate({
        id: draggedTask.id,
        status: newStatus
      });
      
      setTasks((prev: Task[]) => 
        prev.map((task: Task) => 
          task.id === draggedTask.id ? updatedTask : task
        )
      );
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setDraggedTask(null);
    }
  };

  const getTasksByStatus = (status: TaskStatus): Task[] => {
    return tasks.filter((task: Task) => task.status === status);
  };

  const formatDueDate = (date: Date | null): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate: Date | null): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date().toDateString() !== new Date(dueDate).toDateString();
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <Card
      className={`mb-3 cursor-move card-hover card-shadow border-l-4 transition-all duration-200 ${
        task.status === 'todo' ? 'border-l-gray-400 bg-white hover:bg-gray-50' :
        task.status === 'in_progress' ? 'border-l-blue-400 bg-white hover:bg-blue-50' :
        'border-l-green-400 bg-white hover:bg-green-50'
      } ${isOverdue(task.due_date) ? 'overdue-glow' : ''}`}
      draggable
      onDragStart={(e: React.DragEvent) => handleDragStart(e, task)}
      onDragEnd={handleDragEnd}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-900 line-clamp-2">
          {task.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {task.description && (
          <CardDescription className="text-xs text-gray-600 mb-3 line-clamp-3">
            {task.description}
          </CardDescription>
        )}
        {task.due_date && (
          <div className="flex items-center gap-1 text-xs">
            <Calendar className="w-3 h-3" />
            <span className={`${isOverdue(task.due_date) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {formatDueDate(task.due_date)}
              {isOverdue(task.due_date) && (
                <Badge variant="destructive" className="ml-2 text-xs py-0 px-1">
                  Overdue
                </Badge>
              )}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
          <Badge 
            variant="secondary" 
            className={`text-xs ${
              task.status === 'todo' ? 'status-todo' :
              task.status === 'in_progress' ? 'status-in-progress' :
              'status-done'
            }`}
          >
            {task.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <span className="text-xs text-gray-400">
            ID: {task.id}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📋 Kanban Board</h1>
              <p className="text-gray-600 mt-1">Organize your tasks efficiently</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Add a new task to your board. You can drag and drop it between columns later.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTask}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="flex items-center gap-2">
                        <span>Title</span>
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="e.g., Design homepage mockup, Fix login bug..."
                        required
                        className="focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="flex items-center gap-2">
                        📝 Description
                        <span className="text-xs text-gray-500">(optional)</span>
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setFormData((prev: CreateTaskInput) => ({
                            ...prev,
                            description: e.target.value || null
                          }))
                        }
                        placeholder="Add more details about this task..."
                        className="resize-none focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due_date" className="flex items-center gap-2">
                        📅 Due Date
                        <span className="text-xs text-gray-500">(optional)</span>
                      </Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={formData.due_date ? new Date(formData.due_date).toISOString().split('T')[0] : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateTaskInput) => ({
                            ...prev,
                            due_date: e.target.value ? new Date(e.target.value) : null
                          }))
                        }
                        className="focus:ring-blue-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status" className="flex items-center gap-2">
                        🎯 Initial Status
                      </Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: TaskStatus) =>
                          setFormData((prev: CreateTaskInput) => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger className="focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">📝 To Do</SelectItem>
                          <SelectItem value="in_progress">⚡ In Progress</SelectItem>
                          <SelectItem value="done">✅ Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create Task'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Summary Cards */}
          {tasks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Tasks</p>
                      <p className="text-2xl font-bold text-blue-900">{tasks.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-500 rounded-lg">
                      <div className="w-4 h-4 bg-white rounded-sm" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">To Do</p>
                      <p className="text-2xl font-bold text-gray-900">{getTasksByStatus('todo').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <div className="w-4 h-4 border-2 border-white rounded-full border-dashed animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm text-orange-600 font-medium">In Progress</p>
                      <p className="text-2xl font-bold text-orange-900">{getTasksByStatus('in_progress').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <div className="w-4 h-4 text-white flex items-center justify-center font-bold text-xs">✓</div>
                    </div>
                    <div>
                      <p className="text-sm text-green-600 font-medium">Completed</p>
                      <p className="text-2xl font-bold text-green-900">{getTasksByStatus('done').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statusColumns.map((column) => {
            const columnTasks = getTasksByStatus(column.status);
            const isDragOver = dragOverColumn === column.status;
            const columnClass = column.status === 'todo' ? 'column-todo' : 
                              column.status === 'in_progress' ? 'column-progress' : 'column-done';
            
            return (
              <div
                key={column.status}
                className={`${column.color} ${columnClass} rounded-lg border-2 p-4 min-h-[600px] kanban-column overflow-y-auto transition-all duration-200 ${
                  isDragOver ? 'drag-over shadow-lg scale-102' : 'border-dashed'
                } ${draggedTask && draggedTask.status !== column.status ? 'border-solid border-blue-300' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={(e: React.DragEvent) => handleDragEnter(e, column.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e: React.DragEvent) => handleDrop(e, column.status)}
              >
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-inherit pb-2 border-b border-white/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      column.status === 'todo' ? 'bg-gray-400' :
                      column.status === 'in_progress' ? 'bg-blue-400' :
                      'bg-green-400'
                    }`} />
                    <h2 className="font-semibold text-gray-800">{column.title}</h2>
                  </div>
                  <Badge variant="secondary" className="bg-white/90 shadow-sm">
                    {columnTasks.length}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-5xl mb-3">
                        {column.status === 'todo' ? '📝' : 
                         column.status === 'in_progress' ? '⚡' : '✅'}
                      </div>
                      <p className="text-sm font-medium">
                        {isDragOver ? 'Drop task here!' : 
                         column.status === 'todo' ? 'No tasks to do' :
                         column.status === 'in_progress' ? 'No tasks in progress' :
                         'No completed tasks'}
                      </p>
                      {!isDragOver && (
                        <p className="text-xs mt-1 opacity-75">Drag tasks here to organize</p>
                      )}
                    </div>
                  ) : (
                    columnTasks.map((task: Task) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </div>
                
                {/* Drop zone indicator */}
                {isDragOver && columnTasks.length > 0 && (
                  <div className="mt-4 p-3 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 text-center">
                    <p className="text-blue-600 text-sm font-medium">Drop here to add task</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="text-8xl mb-6 animate-bounce">🎯</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to your Kanban Board!</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Start organizing your work by creating your first task. You can easily drag and drop tasks 
                between columns to track your progress.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Task
                </Button>
                <p className="text-xs text-gray-500">
                  💡 Tip: Use drag & drop to move tasks between columns
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Footer */}
        {tasks.length > 0 && (
          <div className="mt-12 text-center text-gray-500 text-sm">
            <p>💡 Drag and drop tasks between columns • {tasks.length} total tasks</p>
            {tasks.some((task: Task) => isOverdue(task.due_date)) && (
              <p className="mt-1 text-red-500">
                ⚠️ You have {tasks.filter((task: Task) => isOverdue(task.due_date)).length} overdue task(s)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;