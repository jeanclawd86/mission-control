'use client';

import { useState } from 'react';
import { Topic, Task } from '@/lib/types';

interface Props {
  topics: Topic[];
  tasks: Task[];
  selectedTopic: number | null;
  hiddenTopics: Set<number>;
  onSelectTopic: (topicId: number | null) => void;
  onToggleHidden: (topicId: number) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const TOPIC_ICONS: Record<string, string> = {
  'General': '◈',
  'Fundraising': '◉',
  'Sales': '▲',
  'JeanClawd Self Care': '♦',
  'JC CODES': '⬡',
  'Nicks app': '◎',
};

export default function Sidebar({ topics, tasks, selectedTopic, hiddenTopics, onSelectTopic, onToggleHidden, mobileOpen, onMobileClose }: Props) {
  const [showHidden, setShowHidden] = useState(false);
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const hiddenTopicsList = topics.filter(t => hiddenTopics.has(t.id));

  const allCount = activeTasks.filter(t => !hiddenTopics.has(t.topic)).length;

  const sidebarContent = (
    <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800/80 bg-white dark:bg-gray-950 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-200 dark:border-gray-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
            M
          </div>
          <span className="text-sm font-semibold tracking-tight">Mission Control</span>
        </div>
      </div>

      {/* Topics */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Topics
        </p>

        {/* All Topics */}
        <button
          onClick={() => onSelectTopic(null)}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-colors ${
            selectedTopic === null
              ? 'bg-violet-500/10 text-violet-400 font-medium'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <span className="text-xs opacity-60">✦</span>
            All Topics
          </span>
          <span className={`text-[10px] tabular-nums min-w-[20px] text-center rounded-full px-1.5 py-0.5 ${
            selectedTopic === null
              ? 'bg-violet-500/20 text-violet-400'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
          }`}>
            {allCount}
          </span>
        </button>

        {topics.map((topic) => {
          const count = activeTasks.filter(t => t.topic === topic.id).length;
          const isActive = selectedTopic === topic.id;
          const isHidden = hiddenTopics.has(topic.id);
          const icon = TOPIC_ICONS[topic.name] || '•';

          return (
            <div
              key={topic.id}
              className={`group flex items-center rounded-lg transition-colors ${
                isHidden ? 'opacity-40' : ''
              } ${
                isActive
                  ? 'bg-violet-500/10'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`}
            >
              <button
                onClick={() => onSelectTopic(topic.id)}
                className={`flex-1 flex items-center justify-between px-2.5 py-2 text-sm transition-colors min-w-0 ${
                  isActive
                    ? 'text-violet-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <span className="text-xs opacity-60">{icon}</span>
                  <span className="truncate">{topic.name}</span>
                </span>
                {count > 0 && (
                  <span className={`text-[10px] tabular-nums min-w-[20px] text-center rounded-full px-1.5 py-0.5 shrink-0 ${
                    isActive
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>

              {/* Telegram link */}
              {topic.telegramUrl && (
                <a
                  href={topic.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 p-1.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  title="Open in Telegram"
                >
                  <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </a>
              )}

              {/* Eye toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHidden(topic.id);
                }}
                className="shrink-0 p-1.5 mr-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                title={isHidden ? 'Show topic' : 'Hide topic'}
              >
                {isHidden ? (
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Hidden Topics */}
      {hiddenTopicsList.length > 0 && (
        <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-800/80">
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="w-full flex items-center gap-2 px-2 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
          >
            <svg
              className={`w-2.5 h-2.5 transition-transform ${showHidden ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Hidden
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-500 tabular-nums">
              {hiddenTopicsList.length}
            </span>
          </button>
          {showHidden && (
            <div className="space-y-0.5">
              {hiddenTopicsList.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span className="truncate">{topic.name}</span>
                  <button
                    onClick={() => onToggleHidden(topic.id)}
                    className="shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Unhide topic"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        {sidebarContent}
      </div>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <div className="relative z-50 animate-slide-in-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
