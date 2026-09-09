import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '../../hooks/useProjects';
import { useCreateTask } from '../../hooks/useTasks';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import {
  Layers,
  Sparkles,
  Rocket,
  ShieldCheck,
  Palette,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { TaskPriority, TaskStatus } from '../../types';

interface StarterTask {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
}

interface ProjectTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  estimatedWeeks: number;
  icon: React.ReactNode;
  badge: string;
  starterTasks: StarterTask[];
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'software-sprint',
    title: 'Software Engineering Sprint',
    category: 'Engineering',
    description: 'Agile development blueprint structured with core sprint phases, testing, and production deployment.',
    estimatedWeeks: 2,
    icon: <Rocket className="w-5 h-5 text-brand" />,
    badge: 'Popular',
    starterTasks: [
      { title: 'Technical Architecture & API Contracts', description: 'Define database schema, REST endpoints, and security contracts.', priority: 'high', status: 'pending' },
      { title: 'Core Backend Business Logic Implementation', description: 'Implement controllers, models, and service layer logic with unit tests.', priority: 'high', status: 'pending' },
      { title: 'Frontend UI & Responsive Application Shell', description: 'Build atomic components, responsive pages, and client state managers.', priority: 'medium', status: 'pending' },
      { title: 'Integration Testing & Security Hardening', description: 'Execute automated regression test suite and verify permission boundaries.', priority: 'urgent', status: 'pending' },
      { title: 'Production Release & Deployment Sign-off', description: 'Final staging sign-off and deployment to production environment.', priority: 'high', status: 'pending' },
    ],
  },
  {
    id: 'product-launch',
    title: 'Product Launch & Go-To-Market',
    category: 'Marketing & Sales',
    description: 'Cross-functional release framework uniting product messaging, marketing collateral, and launch milestones.',
    estimatedWeeks: 4,
    icon: <Sparkles className="w-5 h-5 text-brand" />,
    badge: 'Standard',
    starterTasks: [
      { title: 'Define Value Proposition & Target Personas', description: 'Align product messaging and key customer benefits.', priority: 'high', status: 'pending' },
      { title: 'Produce Sales Collateral & Demo Video', description: 'Draft slide decks, one-pagers, and interactive recorded demos.', priority: 'medium', status: 'pending' },
      { title: 'Draft Press Release & Launch Announcement', description: 'Coordinate publication across marketing channels and tech blogs.', priority: 'medium', status: 'pending' },
      { title: 'Launch Day Coordination & Live Operations', description: 'Coordinate live social media outreach and customer support readiness.', priority: 'urgent', status: 'pending' },
    ],
  },
  {
    id: 'security-audit',
    title: 'Security Audit & Compliance Hardening',
    category: 'Security & DevOps',
    description: 'Enterprise posture evaluation covering vulnerability scanning, RBAC penetration checks, and data protection.',
    estimatedWeeks: 3,
    icon: <ShieldCheck className="w-5 h-5 text-brand" />,
    badge: 'Enterprise',
    starterTasks: [
      { title: 'Threat Modeling & Attack Surface Review', description: 'Audit public ingress, endpoint authenticators, and JWT policies.', priority: 'urgent', status: 'pending' },
      { title: 'Static Code & Dependency Vulnerability Scan', description: 'Scan third-party libraries for known CVEs and license compliance.', priority: 'high', status: 'pending' },
      { title: 'Penetration Testing & IDOR Verification', description: 'Verify that authorization barriers prevent horizontal privilege escalation.', priority: 'urgent', status: 'pending' },
      { title: 'Compliance Report & Remediation Sign-off', description: 'Publish audit trail log and document all resolved remediations.', priority: 'medium', status: 'pending' },
    ],
  },
  {
    id: 'design-system',
    title: 'Design System Modernization',
    category: 'Design & UX',
    description: 'Establish consistent design tokens, accessible components, and dark SaaS visual hierarchy across applications.',
    estimatedWeeks: 2,
    icon: <Palette className="w-5 h-5 text-brand" />,
    badge: 'Design',
    starterTasks: [
      { title: 'Color Palette & Token System Definition', description: 'Establish HSL semantic tokens, surface elevations, and contrast ratios.', priority: 'high', status: 'pending' },
      { title: 'Atomic UI Component Library Assembly', description: 'Build buttons, badges, modals, tables, and dropdown primitives.', priority: 'medium', status: 'pending' },
      { title: 'Micro-animations & Interactive States', description: 'Implement smooth hover effects, loading skeletons, and focus rings.', priority: 'low', status: 'pending' },
      { title: 'Design System Documentation & Storybook', description: 'Document usage guidelines, props interfaces, and responsive behavior.', priority: 'medium', status: 'pending' },
    ],
  },
];

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const createProjectMutation = useCreateProject();
  const createTaskMutation = useCreateTask();

  const handleOpenTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setProjectName(template.title);
    setProjectDescription(template.description);
  };

  const handleApplyTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !projectName.trim()) return;

    try {
      setIsApplying(true);

      // 1. Create the project via live backend API
      const newProject = await createProjectMutation.mutateAsync({
        name: projectName.trim(),
        description: projectDescription.trim(),
        status: 'active',
      });

      // 2. Instantiate starter tasks into the newly created project
      for (const starter of selectedTemplate.starterTasks) {
        await createTaskMutation.mutateAsync({
          title: starter.title,
          description: starter.description,
          priority: starter.priority,
          status: starter.status,
          project_id: newProject.id,
        });
      }

      showToast(`Project "${newProject.name}" created with ${selectedTemplate.starterTasks.length} starter tasks!`, 'success');
      setSelectedTemplate(null);
      navigate(`/projects/${newProject.id}`);
    } catch {
      showToast('Failed to apply template. Please verify input and retry.', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="border-b border-dark-borderSubtle pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
          <Layers className="w-6 h-6 text-brand" />
          <span>Project Templates Library</span>
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Accelerate your delivery cycle with pre-configured project workflows, task breakdowns, and standard milestones.
        </p>
      </div>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PROJECT_TEMPLATES.map((tmpl) => (
          <Card
            key={tmpl.id}
            className="p-6 bg-dark-surface border-dark-borderSubtle hover:border-brand/40 transition-all duration-200 flex flex-col justify-between space-y-6 group shadow-sm hover:shadow-md"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="p-2.5 rounded-xl bg-dark-elevated border border-dark-borderSubtle group-hover:border-brand/30 transition-colors">
                  {tmpl.icon}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    {tmpl.category}
                  </span>
                  <Badge variant="brand" size="sm">
                    {tmpl.badge}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-text-primary group-hover:text-brand transition-colors">
                  {tmpl.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {tmpl.description}
                </p>
              </div>

              {/* Starter Tasks Checklist Preview */}
              <div className="space-y-2 pt-2 border-t border-dark-borderSubtle/60">
                <div className="flex items-center justify-between text-[11px] font-bold text-text-muted uppercase">
                  <span>Included Starter Tasks</span>
                  <span>{tmpl.starterTasks.length} tasks</span>
                </div>
                <div className="space-y-1.5">
                  {tmpl.starterTasks.slice(0, 3).map((task, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-dark-elevated/60 text-xs text-text-secondary flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0" />
                        <span className="truncate">{task.title}</span>
                      </div>
                      <Badge variant="default" size="sm" className="text-[10px] uppercase shrink-0">
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                  {tmpl.starterTasks.length > 3 && (
                    <div className="text-[11px] text-text-muted text-center pt-0.5">
                      + {tmpl.starterTasks.length - 3} more structured tasks
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer action */}
            <div className="pt-4 border-t border-dark-borderSubtle flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>Est. ~{tmpl.estimatedWeeks} weeks</span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenTemplate(tmpl)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="shadow-lemon-sm"
              >
                Use Template
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Instantiate Template Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTemplate(null)}
          title={`Create Project from "${selectedTemplate.title}"`}
          description="A new project will be created with pre-populated tasks, priorities, and workflow structures."
          size="md"
        >
          <form onSubmit={handleApplyTemplate} className="space-y-4">
            <Input
              label="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Q4 Core Backend Overhaul"
              required
              autoFocus
            />

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-dark-bg border border-dark-borderSubtle focus:border-brand px-3.5 py-2.5 text-xs text-text-primary focus:outline-none resize-none transition-colors"
                placeholder="Brief summary of project goals..."
              />
            </div>

            <div className="p-3 rounded-xl bg-dark-elevated border border-dark-borderSubtle text-xs text-text-secondary space-y-1">
              <div className="font-semibold text-text-primary">Instant Provisioning:</div>
              <div>• {selectedTemplate.starterTasks.length} tasks will be created automatically in your project.</div>
              <div>• All tasks will be assigned to your workspace with default priority configurations.</div>
            </div>

            <ModalFooter>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)} type="button">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isApplying}
                className="shadow-lemon-sm"
              >
                Create Project
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TemplatesPage;
