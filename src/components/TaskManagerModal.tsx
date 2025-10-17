import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Expand, Calendar, CheckCircle, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";

interface Task {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  completed: boolean;
  subtasks: Subtask[];
  expanded: boolean;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaskManagerModal = ({ isOpen, onClose }: TaskManagerModalProps) => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Read the neuroscience book",
      date: "29/09",
      time: "11:34am",
      description: "Brain → Clearity UX/UI design",
      completed: false,
      expanded: true,
      subtasks: [
        { id: "1-1", title: "Download the book", completed: false },
        { id: "1-2", title: "Open in your Kindle", completed: false },
        { id: "1-3", title: "Read Chapter 1", completed: false },
        { id: "1-4", title: "Take notes", completed: false }
      ]
    },
    {
      id: "2",
      title: "Read the neuroscience book",
      date: "22/09",
      time: "4:55pm",
      description: "Brain → habit building for GYM",
      completed: false,
      expanded: false,
      subtasks: [
        { id: "2-1", title: "Download the book", completed: false },
        { id: "2-2", title: "Open in your Kindle", completed: false },
        { id: "2-3", title: "Read Chapter 1", completed: false },
        { id: "2-4", title: "Take notes", completed: false }
      ]
    },
    {
      id: "3",
      title: "Read the neuroscience book",
      date: "12/09",
      time: "12:28am",
      description: "Startup → UX/UI course for landings",
      completed: false,
      expanded: false,
      subtasks: [
        { id: "3-1", title: "Download the book", completed: false },
        { id: "3-2", title: "Open in your Kindle", completed: false },
        { id: "3-3", title: "Read Chapter 1", completed: false },
        { id: "3-4", title: "Take notes", completed: false }
      ]
    },
    {
      id: "4",
      title: "Read the neuroscience book",
      date: "09/09",
      time: "8:44am",
      description: "Brain → Neuroscience books",
      completed: false,
      expanded: false,
      subtasks: [
        { id: "4-1", title: "Download the book", completed: false },
        { id: "4-2", title: "Open in your Kindle", completed: false },
        { id: "4-3", title: "Read Chapter 1", completed: false },
        { id: "4-4", title: "Take notes", completed: false }
      ]
    }
  ]);

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? {
            ...task,
            subtasks: task.subtasks.map(subtask =>
              subtask.id === subtaskId 
                ? { ...subtask, completed: !subtask.completed }
                : subtask
            )
          }
        : task
    ));
  };

  const toggleExpanded = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, expanded: !task.expanded } : task
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl mx-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <button className="px-4 py-2 bg-gray-800 rounded-full text-white text-sm font-medium">
              Today
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <Expand className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="p-6">
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="border border-gray-700 rounded-xl p-4">
                {/* Main Task */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="w-5 h-5 rounded-full border-2 border-gray-400 hover:border-blue-400 transition-colors flex items-center justify-center"
                    >
                      {task.completed && <CheckCircle className="w-4 h-4 text-blue-400" />}
                    </button>
                    <div>
                      <h3 className="text-white font-medium">{task.title}</h3>
                      <p className="text-sm text-gray-400">{task.date} {task.time} {task.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExpanded(task.id)}
                    className="p-1 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    {task.expanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Subtasks */}
                {task.expanded && (
                  <div className="mt-4 ml-8 space-y-2">
                    {task.subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSubtask(task.id, subtask.id)}
                          className="w-4 h-4 rounded-full border-2 border-gray-400 hover:border-blue-400 transition-colors flex items-center justify-center"
                        >
                          {subtask.completed && <CheckCircle className="w-3 h-3 text-blue-400" />}
                        </button>
                        <span className={`text-sm ${subtask.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-medium transition-colors">
            <Calendar className="w-4 h-4" />
            Open in Calendar
          </button>
        </div>
      </div>
    </div>
  );
};
