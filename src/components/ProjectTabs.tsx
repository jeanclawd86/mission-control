'use client';

import { Project, Task } from '@/lib/types';

interface Props {
  projects: Project[];
  tasks: Task[];
  selectedProject: string | null;
  onSelectProject: (projectId: string | null) => void;
}


export default function ProjectTabs({ projects, tasks, selectedProject, onSelectProject }: Props) {
  const waitingTasks = tasks.filter(t => t.status === 'waiting' && !t.archivedAt);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-px scrollbar-thin">
      {/* All Projects tab */}
      <button
        onClick={() => onSelectProject(null)}
        className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
          selectedProject === null
            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/40'
        }`}
      >
        All Projects
        {waitingTasks.length > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold tabular-nums">
            {waitingTasks.length} waiting
          </span>
        )}
      </button>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-0.5 shrink-0" />

      {projects.map((project) => {
        const projectWaiting = waitingTasks.filter(t => t.project === project.id).length;
        const isActive = selectedProject === project.id;

        return (
          <button
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/40'
            }`}
          >
            {project.name}
            {projectWaiting > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold tabular-nums">
                {projectWaiting}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
