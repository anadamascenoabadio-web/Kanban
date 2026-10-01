import React from 'react';
import { Task, TaskStatus } from '../types/crm';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onMoveStatus: (id: string, newStatus: TaskStatus) => void;
  onOpenCreateWithStatus: (status: TaskStatus) => void;
}

const STATUS_COLUMNS: TaskStatus[] = ['Não iniciado', 'Em Andamento', 'Finalizado'];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onEditTask,
  onDeleteTask,
  onMoveStatus,
  onOpenCreateWithStatus,
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch gap-5 overflow-x-auto pb-6">
      {STATUS_COLUMNS.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columnTasks}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onMoveStatus={onMoveStatus}
            onOpenCreateWithStatus={onOpenCreateWithStatus}
          />
        );
      })}
    </div>
  );
};
