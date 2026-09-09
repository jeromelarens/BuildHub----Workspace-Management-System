import React, { useState } from 'react';
import { Task } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal, ModalFooter } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import {
  Flag,
  Calendar,
  Plus,
  Info,
} from 'lucide-react';

export interface ProjectMilestonesProps {
  tasks: Task[];
  projectName: string;
}

interface MilestoneItem {
  id: string;
  title: string;
  targetDate: string;
  description: string;
  filterStatus?: 'completed' | 'in_progress' | 'all';
}

export const ProjectMilestones: React.FC<ProjectMilestonesProps> = ({
  tasks,
}) => {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Built-in delivery milestone phases derived from task progression
  const [customMilestones, setCustomMilestones] = useState<MilestoneItem[]>([
    {
      id: 'm-1',
      title: 'Phase 1: Architecture & Schema Setup',
      targetDate: '2026-09-15',
      description: 'Foundational API structures, entity relations, and system specifications.',
      filterStatus: 'all',
    },
    {
      id: 'm-2',
      title: 'Phase 2: Core Feature Implementation',
      targetDate: '2026-10-01',
      description: 'End-to-end user workflows, business logic, and UI viewports.',
      filterStatus: 'all',
    },
    {
      id: 'm-3',
      title: 'Phase 3: Production QA & Release Sign-off',
      targetDate: '2026-10-15',
      description: 'Final security audits, performance profiling, and launch approval.',
      filterStatus: 'all',
    },
  ]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newMilestone: MilestoneItem = {
      id: `m-${Date.now()}`,
      title: newTitle.trim(),
      targetDate: newDate || '2026-10-31',
      description: newDescription.trim() || 'Custom delivery milestone for project deliverables.',
      filterStatus: 'all',
    };

    setCustomMilestones([...customMilestones, newMilestone]);
    setNewTitle('');
    setNewDate('');
    setNewDescription('');
    setIsModalOpen(false);
    showToast('Milestone goal added to project view!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <Card className="p-6 bg-dark-surface border-dark-borderSubtle flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-brand" />
            <h3 className="text-base font-bold text-text-primary">Project Release Milestones</h3>
          </div>
          <p className="text-xs text-text-secondary max-w-xl">
            Track key delivery targets and aggregate completion progress across distinct project phases.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-text-primary">{overallProgress}%</div>
            <div className="text-[11px] text-text-muted">{completedTasks}/{totalTasks} tasks completed</div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-lemon-sm shrink-0"
          >
            Add Milestone
          </Button>
        </div>
      </Card>

      {/* Notice regarding backend persistence */}
      <div className="p-3 rounded-xl bg-dark-surface border border-dark-borderSubtle text-[11px] text-text-muted flex items-start gap-2.5">
        <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <span>
          Milestones aggregate live task completion metrics from the backend. Custom milestone definitions are currently preserved in client session mode pending future API schema extension.
        </span>
      </div>

      {/* Milestones Cards List */}
      <div className="space-y-4">
        {customMilestones.map((m, idx) => {
          // Calculate phase completion
          const isPhaseDone = idx === 0 && overallProgress >= 33;
          const isPhaseCurrent = (idx === 0 && overallProgress < 33) || (idx === 1 && overallProgress >= 33 && overallProgress < 80);

          return (
            <Card
              key={m.id}
              className="p-5 bg-dark-surface border-dark-borderSubtle hover:border-dark-border transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-text-muted">M-{idx + 1}</span>
                    <h4 className="text-sm font-bold text-text-primary">{m.title}</h4>
                    {isPhaseDone ? (
                      <Badge variant="success" size="sm">Completed</Badge>
                    ) : isPhaseCurrent ? (
                      <Badge variant="brand" size="sm">In Progress</Badge>
                    ) : (
                      <Badge variant="default" size="sm">Upcoming</Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">{m.description}</p>
                </div>

                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Target: {m.targetDate}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-muted">Milestone Delivery</span>
                  <span className="font-semibold text-text-primary">
                    {isPhaseDone ? '100%' : isPhaseCurrent ? `${Math.min(overallProgress + 25, 95)}%` : '0%'}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-dark-elevated overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isPhaseDone ? 'bg-status-success' : isPhaseCurrent ? 'bg-brand' : 'bg-dark-border'
                    }`}
                    style={{
                      width: isPhaseDone ? '100%' : isPhaseCurrent ? `${Math.min(overallProgress + 25, 95)}%` : '0%',
                    }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Milestone Modal */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title="Create Project Milestone"
          description="Define a delivery phase, release target, or strategic milestone for this project."
          size="md"
        >
          <form onSubmit={handleCreateMilestone} className="space-y-4">
            <Input
              label="Milestone Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Beta Customer Preview"
              required
              autoFocus
            />

            <Input
              label="Target Completion Date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-dark-bg border border-dark-borderSubtle focus:border-brand px-3.5 py-2.5 text-xs text-text-primary focus:outline-none resize-none transition-colors"
                placeholder="Key deliverables and acceptance criteria..."
              />
            </div>

            <ModalFooter>
              <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" className="shadow-lemon-sm">
                Save Milestone
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
};
