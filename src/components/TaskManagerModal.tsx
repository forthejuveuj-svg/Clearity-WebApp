import { useState, useEffect, useRef, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Expand, Calendar, CheckCircle, ChevronDown, ChevronRight as ChevronRightIcon, Info, MessageCircle, Trash2, Reply, Archive } from "lucide-react";

interface Task {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  completed: boolean;
  subtasks: Subtask[];
  expanded: boolean;
  kpi: string;
  duration?: number; // Duration in minutes (optional, defaults to 30)
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToChat?: (task: Task) => void;
  isFullScreen?: boolean;
  scale?: number;
  onReplyToTask?: (task: Task) => void;
}

export const TaskManagerModal = ({ isOpen, onClose, onNavigateToChat, isFullScreen = false, scale = 1, onReplyToTask }: TaskManagerModalProps) => {
  const [taskManagerWeekOffset, setTaskManagerWeekOffset] = useState(0); // Week offset for task manager
  const [scheduleWeekOffset, setScheduleWeekOffset] = useState(0); // Week offset for schedule
  const [selectedTaskManagerDay, setSelectedTaskManagerDay] = useState<Date>(new Date(2025, 9, 21)); // Selected day for task manager
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<Date>(new Date(2025, 9, 21)); // Selected day for schedule
  const [selectedTaskPreview, setSelectedTaskPreview] = useState<{ task: Task; x: number; y: number } | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [targetHours, setTargetHours] = useState(8);
  const [chatTask, setChatTask] = useState<Task | null>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; text: string; isUser: boolean; timestamp: Date }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [draggedScheduledTask, setDraggedScheduledTask] = useState<{ 
    task: Task; 
    duration: number; 
    fromHour: number; 
    fromStartMinute: number;
  } | null>(null);
  const [showUnfinishedTasks, setShowUnfinishedTasks] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; source: 'today' | 'unfinished' } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(() => {
    return localStorage.getItem('dontAskDeleteConfirmation') === 'true';
  });
  
  // Archived tasks - tasks from past days not moved to schedule
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([
    {
      id: "arch-1",
      title: "Review project proposal",
      date: "18/10",
      time: "2:00pm",
      description: "Startup → Review and refine",
      completed: false,
      expanded: false,
      kpi: "Complete review and provide 5 actionable feedbacks",
      duration: 45,
      subtasks: [
        { id: "arch-1-1", title: "Read proposal", completed: false },
        { id: "arch-1-2", title: "Note improvements", completed: false },
        { id: "arch-1-3", title: "Send feedback", completed: false }
      ]
    },
    {
      id: "arch-2",
      title: "Update portfolio website",
      date: "17/10",
      time: "10:30am",
      description: "Design → Portfolio updates",
      completed: false,
      expanded: false,
      kpi: "Add 3 new projects to portfolio",
      duration: 90,
      subtasks: [
        { id: "arch-2-1", title: "Select projects", completed: false },
        { id: "arch-2-2", title: "Write descriptions", completed: false },
        { id: "arch-2-3", title: "Upload images", completed: false }
      ]
    },
    {
      id: "arch-3",
      title: "Plan marketing strategy",
      date: "16/10",
      time: "9:00am",
      description: "Business → Marketing plan",
      completed: false,
      expanded: false,
      kpi: "Create 1-month content calendar",
      duration: 60,
      subtasks: [
        { id: "arch-3-1", title: "Research competitors", completed: false },
        { id: "arch-3-2", title: "Define target audience", completed: false },
        { id: "arch-3-3", title: "Create content ideas", completed: false }
      ]
    }
  ]);

  const openChat = (task: Task) => {
    if (onReplyToTask) {
      // Use the reply callback to show in chat area
      onReplyToTask(task);
    } else if (onNavigateToChat) {
      onNavigateToChat(task);
      onClose();
    } else {
      setChatTask(task);
      setChatMessages([
        {
          id: "1",
          text: `Let's discuss "${task.title}". What would you like to know or work on?`,
          isUser: false,
          timestamp: new Date()
        }
      ]);
    }
  };

  const deleteTask = (taskId: string, source: 'today' | 'unfinished') => {
    if (dontAskAgain) {
      // Delete immediately without confirmation
      confirmDeleteTask(taskId, source);
    } else {
      // Show confirmation modal
      setTaskToDelete({ id: taskId, source });
    }
  };

  const confirmDeleteTask = (taskId: string, source: 'today' | 'unfinished') => {
    if (source === 'unfinished') {
      setArchivedTasks(prev => prev.filter(task => task.id !== taskId));
    } else {
      setTasks(prev => prev.filter(task => task.id !== taskId));
    }
    setTaskToDelete(null);
  };

  const handleDontAskAgain = () => {
    localStorage.setItem('dontAskDeleteConfirmation', 'true');
    setDontAskAgain(true);
    if (taskToDelete) {
      confirmDeleteTask(taskToDelete.id, taskToDelete.source);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !chatTask) return;
    
    const userMessage = {
      id: Date.now().toString(),
      text: newMessage,
      isUser: true,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        text: "I understand. Let me help you break this down into actionable steps.",
        isUser: false,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };
  const [scheduledTasks, setScheduledTasks] = useState<{ 
    [key: string]: { task: Task; duration: number; startMinute: number; sourceList?: 'unfinished' | 'today' }[] 
  }>({});
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Read the neuroscience book",
      date: "29/09",
      time: "11:34am",
      description: "Brain → Clearity UX/UI design",
      completed: false,
      expanded: true,
      kpi: "Complete 30 minutes of focused reading",
      duration: 30,
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
      kpi: "Read 20 pages and identify 3 key insights",
      duration: 60,
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
      kpi: "Complete 1 chapter and create 5 actionable notes",
      duration: 120,
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
      kpi: "Read for 25 minutes without distractions",
      duration: 90,
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
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map(subtask =>
          subtask.id === subtaskId 
            ? { ...subtask, completed: !subtask.completed }
            : subtask
        );
        // Check if all subtasks are completed to mark task as done
        const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed);
        return {
          ...task,
          subtasks: updatedSubtasks,
          completed: allCompleted
        };
      }
      return task;
    }));

    // Update selectedTaskPreview if it's the same task
    if (selectedTaskPreview && selectedTaskPreview.task.id === taskId) {
      setSelectedTaskPreview(prev => {
        if (!prev) return null;
        const updatedSubtasks = prev.task.subtasks.map(subtask =>
          subtask.id === subtaskId 
            ? { ...subtask, completed: !subtask.completed }
            : subtask
        );
        const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed);
        return {
          ...prev,
          task: {
            ...prev.task,
            subtasks: updatedSubtasks,
            completed: allCompleted
          }
        };
      });
    }

    // Update scheduledTasks if the task is in the schedule
    setScheduledTasks(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(hour => {
        updated[hour] = updated[hour].map(item => {
          if (item.task.id === taskId) {
            const updatedSubtasks = item.task.subtasks.map(subtask =>
              subtask.id === subtaskId 
                ? { ...subtask, completed: !subtask.completed }
                : subtask
            );
            const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed);
            return {
              ...item,
              task: {
                ...item.task,
                subtasks: updatedSubtasks,
                completed: allCompleted
              }
            };
          }
          return item;
        });
      });
      return updated;
    });
  };

  const toggleExpanded = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, expanded: !task.expanded } : task
    ));
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag preview matching exact calendar schedule size (30 min = half hour block)
    const dragPreview = document.createElement('div');
    dragPreview.style.cssText = `
      background: rgba(37, 99, 235, 0.3);
      border-left: 3px solid rgb(59, 130, 246);
      border-radius: 0.375rem;
      padding: 0.25rem 0.75rem;
      width: 450px;
      height: 22px;
      position: absolute;
      top: -1000px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
    dragPreview.innerHTML = `
      <p style="font-size: 0.75rem; line-height: 1rem; color: rgb(147, 197, 253); font-weight: 600; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${task.title}
      </p>
      <p style="font-size: 0.625rem; line-height: 0.75rem; color: rgb(156, 163, 175); margin: 0; margin-left: 0.5rem; flex-shrink: 0;">
        30 min
      </p>
    `;
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 50, 20);
    
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, hour: number, halfHour: boolean = false) => {
    e.preventDefault();
    const key = `${hour}`;
    const startMinute = halfHour ? 30 : 0;
    
    if (draggedTask) {
      // Dragging from task list - use task's duration or default to 30
      const taskDuration = draggedTask.duration || 30;
      
      // Check for overlap
      if (checkOverlap(hour, startMinute, taskDuration)) {
        setDraggedTask(null);
        return; // Silently prevent drop
      }
      
      // Add to schedule with source tracking
      const taskWithSource = { 
        task: draggedTask, 
        duration: taskDuration, 
        startMinute,
        sourceList: showUnfinishedTasks ? 'unfinished' : 'today' as 'unfinished' | 'today'
      };
      
      setScheduledTasks(prev => ({
        ...prev,
        [key]: prev[key] 
          ? [...prev[key], taskWithSource] 
          : [taskWithSource]
      }));
      
      // Remove from task list or archived tasks
      if (showUnfinishedTasks) {
        setArchivedTasks(prev => prev.filter(task => task.id !== draggedTask.id));
      } else {
        setTasks(prev => prev.filter(task => task.id !== draggedTask.id));
      }
      
      setDraggedTask(null);
    } else if (draggedScheduledTask) {
      // Re-dragging a scheduled task - check for overlap (excluding the task being moved)
      if (checkOverlap(hour, startMinute, draggedScheduledTask.duration, draggedScheduledTask.task.id)) {
        setDraggedScheduledTask(null);
        return; // Silently prevent drop
      }
      
      const fromKey = `${draggedScheduledTask.fromHour}`;
      setScheduledTasks(prev => {
        // Remove from old location
        const newState = {
          ...prev,
          [fromKey]: prev[fromKey]?.filter(item => 
            !(item.task.id === draggedScheduledTask.task.id && item.startMinute === draggedScheduledTask.fromStartMinute)
          ) || []
        };
        
        // Add to new location
        newState[key] = newState[key] 
          ? [...newState[key], { task: draggedScheduledTask.task, duration: draggedScheduledTask.duration, startMinute }] 
          : [{ task: draggedScheduledTask.task, duration: draggedScheduledTask.duration, startMinute }];
        
        return newState;
      });
      setDraggedScheduledTask(null);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // If drag was cancelled or dropped outside, restore the task to original position
    if (draggedScheduledTask) {
      const key = `${draggedScheduledTask.fromHour}`;
      setScheduledTasks(prev => ({
        ...prev,
        [key]: prev[key] 
          ? [...prev[key], { task: draggedScheduledTask.task, duration: draggedScheduledTask.duration, startMinute: draggedScheduledTask.fromStartMinute }] 
          : [{ task: draggedScheduledTask.task, duration: draggedScheduledTask.duration, startMinute: draggedScheduledTask.fromStartMinute }]
      }));
      setDraggedScheduledTask(null);
    }
  };

  const removeScheduledTask = (hour: number, taskId: string) => {
    const key = `${hour}`;
    
    // Find the task being removed
    const taskToRemove = scheduledTasks[key]?.find(item => item.task.id === taskId);
    
    // Remove from schedule
    setScheduledTasks(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item.task.id !== taskId)
    }));
    
    // Add back to the correct list based on source
    if (taskToRemove) {
      if (taskToRemove.sourceList === 'unfinished') {
        setArchivedTasks(prev => [...prev, taskToRemove.task]);
      } else {
        setTasks(prev => [...prev, taskToRemove.task]);
      }
    }
  };

  const updateTaskDuration = (hour: number, taskId: string, newDuration: number, startMinute: number) => {
    const key = `${hour}`;
    const clampedDuration = Math.max(30, Math.min(360, Math.round(newDuration / 30) * 30));
    
    // Check if new duration would cause overlap
    if (checkOverlap(hour, startMinute, clampedDuration, taskId)) {
      return; // Don't update if it would cause overlap
    }
    
    setScheduledTasks(prev => ({
      ...prev,
      [key]: prev[key].map(item => 
        item.task.id === taskId ? { ...item, duration: clampedDuration } : item
      )
    }));
  };

  const checkOverlap = (hour: number, startMinute: number, duration: number, excludeTaskId?: string) => {
    // Check if a task would overlap with existing tasks across all hours
    const newStart = hour * 60 + startMinute;
    const newEnd = newStart + duration;
    
    // Check all hours that could have overlapping tasks
    const startHour = Math.floor(newStart / 60);
    const endHour = Math.floor((newEnd - 1) / 60);
    
    for (let h = startHour; h <= endHour; h++) {
      const key = `${h}`;
      const existingTasks = scheduledTasks[key] || [];
      
      for (const item of existingTasks) {
        if (excludeTaskId && item.task.id === excludeTaskId) continue;
        
        const existingStart = h * 60 + item.startMinute;
        const existingEnd = existingStart + item.duration;
        
        // Check for any overlap
        if (newStart < existingEnd && newEnd > existingStart) {
          return true; // Overlap detected
        }
      }
    }
    
    return false;
  };

  // Calculate dates for a given week offset
  const getWeekDates = (offset: number) => {
    const today = new Date(2025, 9, 21); // Oct 21, 2025 (month is 0-indexed)
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek; // Calculate Monday of current week
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + (offset * 7));
    
    const weekDates = [];
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push({
        day: weekDays[i],
        date: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        isToday: date.getDate() === 21 && date.getMonth() === 9 && date.getFullYear() === 2025
      });
    }
    
    return weekDates;
  };

  const taskManagerWeekData = getWeekDates(taskManagerWeekOffset);
  const scheduleWeekData = getWeekDates(scheduleWeekOffset);

  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i % 12 || 12;
    const period = i < 12 ? 'AM' : 'PM';
    return `${hour}:00 ${period}`;
  });

  // Get tasks for selected day
  const getTasksForDay = (selectedDay: Date) => {
    // Filter tasks based on selected date
    // For now, return all tasks (you can add date filtering logic here)
    return tasks;
  };

  const displayedTasks = showUnfinishedTasks ? archivedTasks : getTasksForDay(selectedTaskManagerDay);
  
  // Get scheduled tasks for selected day
  const getScheduleForDay = (selectedDay: Date) => {
    // For now, return current schedule (you can add date-based storage here)
    return scheduledTasks;
  };

  const displayedSchedule = getScheduleForDay(selectedScheduleDay);

  const scheduleScrollRef = useRef<HTMLDivElement>(null);

  // Calculate productivity percentage - always recalculate to ensure it updates
  const calculateProductivity = () => {
    const selectedDate = selectedScheduleDay.toISOString().split('T')[0];
    
    // Get all scheduled tasks (flatten the object)
    const allScheduledTasks = Object.values(scheduledTasks).flat();
    
    // Get scheduled tasks for the day
    const scheduledTasksForDay = allScheduledTasks.filter(item => {
      const taskDate = new Date(item.task.date.split('/').reverse().join('-'));
      return taskDate.toISOString().split('T')[0] === selectedDate;
    });
    
    // Calculate total minutes from completed scheduled tasks only
    const completedMinutes = scheduledTasksForDay
      .filter(item => item.task.completed)
      .reduce((sum, item) => sum + item.duration, 0);
    
    const targetMinutes = targetHours * 60;
    const productivityValue = Math.min(100, (completedMinutes / targetMinutes) * 100);
    
    // Debug logging
    console.log('Productivity Debug:', {
      selectedDate,
      allScheduledTasks: allScheduledTasks.length,
      scheduledTasksForDay: scheduledTasksForDay.length,
      completedTasks: scheduledTasksForDay.filter(item => item.task.completed).length,
      completedMinutes,
      targetMinutes,
      productivity: Math.round(productivityValue),
      scheduledTasksKeys: Object.keys(scheduledTasks),
      sampleTask: scheduledTasksForDay[0] ? {
        id: scheduledTasksForDay[0].task.id,
        completed: scheduledTasksForDay[0].task.completed,
        duration: scheduledTasksForDay[0].duration
      } : null
    });
    
    return Math.round(productivityValue);
  };

  const productivity = calculateProductivity();

  // Force re-render when scheduledTasks changes
  useEffect(() => {
    console.log('ScheduledTasks changed:', scheduledTasks);
  }, [scheduledTasks]);

  // Scroll to 9 AM when modal opens
  useEffect(() => {
    if (isOpen && scheduleScrollRef.current) {
      // 9 AM is index 9, each hour is ~48px + borders
      const scrollPosition = 9 * 50; // Approximate position for 9 AM
      scheduleScrollRef.current.scrollTop = scrollPosition;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={isFullScreen ? "h-full w-full" : "fixed inset-0 z-50 flex items-center justify-center p-4"}>
      {/* Backdrop - Only show for modal mode */}
      {!isFullScreen && (
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
      )}
      
      {/* Modal/Full Screen Content */}
      <div 
        className={`relative ${isFullScreen ? 'h-full w-full bg-transparent pt-2' : 'bg-gray-900 border border-gray-700 rounded-2xl max-w-6xl mx-auto shadow-2xl max-h-[90vh]'} flex flex-col`}
        style={isFullScreen ? { 
          backgroundColor: 'transparent'
        } : {}}
      >
        {/* How it Works Banner - Top */}
        <div className="px-6 py-4 text-center">
          <p className="text-base text-blue-300 font-medium">
            Drag tasks from the left side to the right side to start working on them
          </p>
        </div>
        
        {/* Close Button - Absolute positioned to not take space */}
        {!isFullScreen && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-800 transition-colors z-10"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Side - Tasks List */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-700">
            {/* Task Manager Header with Toggle */}
            <div className="border-b border-gray-700 px-4 py-2.5">
              <div className="flex items-center justify-center gap-1.5">
                <button
                  onClick={() => setShowUnfinishedTasks(false)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                    !showUnfinishedTasks
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Today
                  <span className="text-[10px] bg-white/20 px-1 py-0.5 rounded-full">{tasks.length}</span>
                </button>
                <button
                  onClick={() => setShowUnfinishedTasks(true)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                    showUnfinishedTasks
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Archive className="w-3 h-3" />
                  Unfinished
                  <span className="text-[10px] bg-white/20 px-1 py-0.5 rounded-full">{archivedTasks.length}</span>
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto">
              <p className="text-xs text-blue-400 mb-3 font-medium">Drag tasks to the calendar →</p>
              <div className="space-y-2.5">
                {displayedTasks.map((task) => (
                  <div 
                    key={task.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    className="border border-gray-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-blue-500/50 hover:bg-gray-800/30 transition-all group relative"
                  >
                    {/* Main Task */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`w-4 h-4 rounded-full border-2 transition-colors flex items-center justify-center flex-shrink-0 ${
                            task.completed 
                              ? 'border-green-400 bg-green-500' 
                              : 'border-gray-400 hover:border-blue-400'
                          }`}
                        >
                          {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className={`text-sm font-medium truncate ${task.completed ? 'text-green-400 line-through' : 'text-white'}`}>
                              {task.title}
                            </h3>
                            {task.completed && (
                              <span className="text-xs text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Done</span>
                            )}
                          </div>
                          <p className="text-xs text-green-300 mt-1 truncate">→ {task.kpi}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{task.date} • {task.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openChat(task)}
                          className="p-1 rounded hover:bg-gray-800 transition-colors"
                          title="Reply to this task"
                        >
                          <Reply className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id, showUnfinishedTasks ? 'unfinished' : 'today')}
                          className="p-1 rounded hover:bg-gray-800 transition-colors"
                          title="Delete this task"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                        <button
                          onClick={() => toggleExpanded(task.id)}
                          className="p-1 rounded hover:bg-gray-800 transition-colors"
                        >
                          {task.expanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Subtasks */}
                    {task.expanded && (
                      <div className="mt-3 ml-6 space-y-2">
                        {task.subtasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-2.5">
                            <button
                              onClick={() => toggleSubtask(task.id, subtask.id)}
                              className="w-3.5 h-3.5 rounded-full border border-gray-400 hover:border-blue-400 transition-colors flex items-center justify-center"
                            >
                              {subtask.completed && <CheckCircle className="w-3 h-3 text-blue-400" />}
                            </button>
                            <span className={`text-xs ${subtask.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
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

          </div>

          {/* Right Side - Today's Schedule by Hours */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Schedule Header with Mini Calendar */}
            <div className="border-b border-gray-700 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white text-lg font-semibold">Schedule</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScheduleWeekOffset(prev => prev - 1)}
                    className="p-1 rounded hover:bg-gray-800 transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3 text-gray-400" />
                  </button>
                  <div className="flex gap-1">
                    {scheduleWeekData.map((dayData, index) => {
                      const isSelected = selectedScheduleDay.getDate() === dayData.date && 
                                        selectedScheduleDay.getMonth() === dayData.month &&
                                        selectedScheduleDay.getFullYear() === dayData.year;
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedScheduleDay(new Date(dayData.year, dayData.month, dayData.date))}
                          className={`flex flex-col items-center px-2 py-1 rounded text-[9px] transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : dayData.isToday
                              ? 'bg-blue-600/50 text-white'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <span className="font-medium mb-0.5">{dayData.day}</span>
                          <span className="text-[10px] font-semibold">{dayData.date}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => setScheduleWeekOffset(prev => prev + 1)}
                    className="p-1 rounded hover:bg-gray-800 transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
                
                {/* 8 Hours Input - positioned to the right of calendar */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={targetHours}
                    onChange={(e) => setTargetHours(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white text-center"
                    min="1"
                    max="24"
                  />
                  <span className="text-xs text-white/60">hours/day</span>
                  <div className="relative group">
                    <Info className="w-3 h-3 text-white/40 cursor-help" />
                    <div className="absolute top-full right-0 mt-2 w-40 p-2 bg-gray-800 border border-gray-600 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-[9999] shadow-lg">
                      Shows how much of your day is planned with tasks
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Productivity Bar */}
            <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/60">Productivity</span>
                <span className="text-xs text-white font-medium">{productivity}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    productivity >= 100 ? 'bg-green-500' : 
                    productivity >= 75 ? 'bg-blue-500' : 
                    productivity >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, productivity)}%` }}
                ></div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto" ref={scheduleScrollRef}>
              <div className="space-y-0">
                {hours.map((hour, index) => {
                  const key = `${index}`;
                  const scheduledTasksForHour = displayedSchedule[key] || [];
                  
                  return (
                    <div key={hour} className="flex gap-3 border-t border-gray-800 first:border-t-0">
                      <div className="w-16 text-xs text-gray-500 flex-shrink-0 pt-1">
                        {hour}
                      </div>
                      <div className="flex-1 pl-3 relative">
                        {/* Full hour block */}
                        <div className="h-[48px] relative">
                          {/* Drop zones (background) */}
                          <div 
                            className="absolute top-0 left-0 right-0 h-[24px] hover:bg-blue-500/5 transition-colors z-0"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index, false)}
                          />
                          <div 
                            className="absolute bottom-0 left-0 right-0 h-[24px] hover:bg-blue-500/5 transition-colors z-0"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index, true)}
                          />
                          
                          {/* All tasks rendered on top */}
                          {scheduledTasksForHour.map((item, itemIndex) => {
                            // Different shades of blue for different tasks
                            const colors = [
                              { bg: 'bg-blue-600/35', border: 'border-blue-500', hoverBg: 'hover:bg-blue-600/45', text: 'text-blue-300' },
                              { bg: 'bg-blue-500/30', border: 'border-blue-400', hoverBg: 'hover:bg-blue-500/40', text: 'text-blue-200' },
                              { bg: 'bg-blue-700/35', border: 'border-blue-600', hoverBg: 'hover:bg-blue-700/45', text: 'text-blue-300' },
                              { bg: 'bg-sky-600/30', border: 'border-sky-500', hoverBg: 'hover:bg-sky-600/40', text: 'text-sky-200' },
                              { bg: 'bg-indigo-600/30', border: 'border-indigo-500', hoverBg: 'hover:bg-indigo-600/40', text: 'text-indigo-300' },
                            ];
                            // Use a hash of the task ID for consistent coloring
                            const taskIdNum = item.task.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            const colorIndex = taskIdNum % colors.length;
                            const color = colors[colorIndex];
                            
                            return (
                            <div
                              key={item.task.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggedScheduledTask({ 
                                  task: item.task, 
                                  duration: item.duration, 
                                  fromHour: index, 
                                  fromStartMinute: item.startMinute 
                                });
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                // Only open preview if not clicking the delete button
                                if (!(e.target as HTMLElement).closest('button')) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setSelectedTaskPreview({
                                    task: item.task,
                                    x: rect.right + 10,
                                    y: rect.top
                                  });
                                }
                              }}
                              className={`absolute left-0 right-0 ${item.task.completed ? 'bg-green-600/25 border-l-3 border-green-500' : `${color.bg} border-l-3 ${color.border}`} rounded-md px-2 py-0.5 hover:opacity-90 transition-opacity cursor-pointer group z-10`}
                              style={{ 
                                top: `${(item.startMinute / 60) * 48}px`,
                                height: `${(item.duration / 60) * 48}px` 
                              }}
                            >
                              <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
                                <button
                                  onClick={() => openChat(item.task)}
                                  className="p-0.5 rounded bg-blue-500/80 hover:bg-blue-500"
                                  title="Reply to this task"
                                >
                                  <Reply className="w-2.5 h-2.5 text-white" />
                                </button>
                                <button
                                  onClick={() => removeScheduledTask(index, item.task.id)}
                                  className="p-0.5 rounded bg-red-500/80 hover:bg-red-500"
                                >
                                  <X className="w-2.5 h-2.5 text-white" />
                                </button>
                              </div>
                              <div className="flex items-start justify-between h-full py-0.5">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  {item.task.completed && (
                                    <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                                  )}
                                  <p className={`text-xs ${item.task.completed ? 'line-through text-green-300' : color.text} font-semibold truncate pr-6`}>
                                    {item.task.title}
                                  </p>
                                </div>
                                <p className="text-[10px] text-gray-400 flex-shrink-0">
                                  {item.duration} min
                                </p>
                              </div>
                              {/* Resize handle */}
                              <div
                                className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-b z-20"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  const startY = e.clientY;
                                  const startDuration = item.duration;
                                  
                                  const handleMouseMove = (moveEvent: MouseEvent) => {
                                    const deltaY = moveEvent.clientY - startY;
                                    // Each pixel = ~1 minute for smoother control
                                    const newDuration = startDuration + deltaY;
                                    updateTaskDuration(index, item.task.id, newDuration, item.startMinute);
                                  };
                                  
                                  const handleMouseUp = () => {
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                  };
                                  
                                  document.addEventListener('mousemove', handleMouseMove);
                                  document.addEventListener('mouseup', handleMouseUp);
                                }}
                              />
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Details Preview Modal */}
      {selectedTaskPreview && (
        <div
          className="fixed bg-gray-800 border border-gray-600 rounded-xl p-4 shadow-2xl z-[100] w-80 max-h-96 overflow-y-auto"
          style={{
            left: Math.min(selectedTaskPreview.x, window.innerWidth - 340), // Keep within screen
            top: Math.min(Math.max(selectedTaskPreview.y, 10), window.innerHeight - 400), // Keep within screen
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-1">
              <h4 className={`font-semibold text-lg ${selectedTaskPreview.task.completed ? 'text-green-400 line-through' : 'text-white'}`}>
                {selectedTaskPreview.task.title}
              </h4>
              {selectedTaskPreview.task.completed && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Done</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedTaskPreview(null)}
              className="text-gray-400 hover:text-white transition-colors p-1 -mt-1 -mr-1 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-gray-400 text-sm w-16">Time:</span>
              <span className="text-white text-sm">{selectedTaskPreview.task.time}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gray-400 text-sm w-16">Date:</span>
              <span className="text-white text-sm">{selectedTaskPreview.task.date}</span>
            </div>
            {selectedTaskPreview.task.description && (
              <div className="flex items-start gap-3">
                <span className="text-gray-400 text-sm w-16">From:</span>
                <span className="text-white text-sm">{selectedTaskPreview.task.description}</span>
              </div>
            )}
            {selectedTaskPreview.task.kpi && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-sm text-green-400 font-medium mb-1.5">Success Metric:</div>
                <p className="text-sm text-green-300">{selectedTaskPreview.task.kpi}</p>
              </div>
            )}
            {selectedTaskPreview.task.subtasks && selectedTaskPreview.task.subtasks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-sm text-gray-400 mb-2 font-medium">Subtasks ({selectedTaskPreview.task.subtasks.filter(s => s.completed).length}/{selectedTaskPreview.task.subtasks.length}):</div>
                <div className="space-y-2">
                  {selectedTaskPreview.task.subtasks.map((subtask) => (
                    <button
                      key={subtask.id}
                      onClick={() => toggleSubtask(selectedTaskPreview.task.id, subtask.id)}
                      className="flex items-center gap-2.5 text-sm w-full text-left hover:bg-gray-700/50 rounded p-1 -ml-1 transition-colors"
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${subtask.completed ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}>
                        {subtask.completed && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className={subtask.completed ? 'text-gray-500 line-through' : 'text-gray-300'}>{subtask.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setTaskToDelete(null)}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-white text-lg font-semibold mb-3">Delete Task?</h3>
            <p className="text-gray-300 text-sm mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            
            {/* Don't ask again checkbox */}
            <div className="mb-6 flex items-center gap-2">
              <input
                type="checkbox"
                id="dontAskAgain"
                checked={dontAskAgain}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDontAskAgain(checked);
                  localStorage.setItem('dontAskDeleteConfirmation', checked.toString());
                }}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="dontAskAgain" className="text-sm text-gray-400 cursor-pointer">
                Don't ask again
              </label>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setTaskToDelete(null)}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (taskToDelete) {
                    confirmDeleteTask(taskToDelete.id, taskToDelete.source);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setChatTask(null);
              setChatMessages([]);
              setNewMessage("");
            }}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md h-96 flex flex-col shadow-2xl">
            {/* Chat Header */}
            <div className="border-b border-gray-700 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">Chat about task</h3>
                <p className="text-sm text-gray-400">{chatTask.title}</p>
              </div>
              <button
                onClick={() => {
                  setChatTask(null);
                  setChatMessages([]);
                  setNewMessage("");
                }}
                className="p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                      message.isUser
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-700 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
