import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../../hooks/useUsers';
import { useProjects } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { useTeamVelocity } from '../../hooks/useAnalytics';
import { useAuth } from '../../hooks/useAuth';
import {
  Users,
  Search,
  FolderKanban,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  Shield,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Avatar } from '../../components/ui/Avatar';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { User } from '../../types';

export const TeamPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<User | null>(null);

  const { data: usersData, isLoading: isUsersLoading, error: usersError, refetch: refetchUsers } = useUsers();
  const { data: projectsData, isLoading: isProjectsLoading } = useProjects();
  const { data: tasksData, isLoading: isTasksLoading } = useTasks({ limit: 1000 });
  const { data: velocityData } = useTeamVelocity();

  const users = useMemo(() => usersData?.users || [], [usersData]);
  const projects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const tasks = useMemo(() => tasksData?.tasks || [], [tasksData]);

  // Member task metrics calculation from real backend task data
  const memberMetrics = useMemo(() => {
    const metricsMap = new Map<
      number | string,
      {
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
        projectCount: number;
      }
    >();

    const now = new Date();

    users.forEach((u) => {
      metricsMap.set(u.id, {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        projectCount: 0,
      });
    });

    // Map tasks to assignees
    tasks.forEach((t) => {
      if (t.assigned_to && metricsMap.has(t.assigned_to)) {
        const current = metricsMap.get(t.assigned_to)!;
        current.totalTasks += 1;
        if (t.status === 'completed') {
          current.completedTasks += 1;
        } else {
          current.pendingTasks += 1;
          if (t.due_date && new Date(t.due_date) < now) {
            current.overdueTasks += 1;
          }
        }
      }
    });

    // Count project involvement
    projects.forEach((p) => {
      if (p.created_by && metricsMap.has(p.created_by)) {
        const current = metricsMap.get(p.created_by)!;
        current.projectCount += 1;
      }
    });

    return metricsMap;
  }, [users, tasks, projects]);

  // Filtered members list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const isLoading = isUsersLoading || isProjectsLoading || isTasksLoading;

  if (isLoading) {
    return <LoadingState message="Loading team directory..." />;
  }

  if (usersError) {
    return (
      <ErrorState
        title="Failed to load team directory"
        message="Could not retrieve workspace members from backend."
        onRetry={() => {
          refetchUsers();
        }}
      />
    );
  }

  const totalMembers = users.length;
  const leadCount = users.filter((u) => u.role === 'team_lead').length;
  const managerCount = users.filter((u) => u.role === 'manager').length;
  const employeeCount = users.filter((u) => u.role === 'employee').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Team Directory & Workload</h1>
            <Badge variant="brand">Enterprise</Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Real-time directory of workspace members, project assignments, and active task distribution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/workload')}
            leftIcon={<Briefcase className="w-3.5 h-3.5" />}
          >
            Workload View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/analytics')}
            leftIcon={<TrendingUp className="w-3.5 h-3.5 text-brand" />}
          >
            Team Velocity
          </Button>
          {currentUser?.role === 'admin' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/users')}
              leftIcon={<Shield className="w-3.5 h-3.5" />}
            >
              Manage Roles
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Members</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{totalMembers}</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Managers & Leads</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{managerCount + leadCount}</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Active Contributors</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{employeeCount}</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Active Projects</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{projects.length}</p>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-dark-surface/40 p-3 rounded-xl border border-dark-border">
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder="Search member by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-text-muted" />}
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { label: 'All Roles', value: 'all' },
              { label: 'Admin', value: 'admin' },
              { label: 'Manager', value: 'manager' },
              { label: 'Team Lead', value: 'team_lead' },
              { label: 'Employee', value: 'employee' },
            ]}
          />
        </div>
      </div>

      {/* Members Grid */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-text-muted" />}
          title="No members found"
          description="No team members matched your current filter criteria."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((member) => {
            const stats = memberMetrics.get(member.id) || {
              totalTasks: 0,
              completedTasks: 0,
              pendingTasks: 0,
              overdueTasks: 0,
              projectCount: 0,
            };

            const isCurrent = currentUser?.id === member.id;

            return (
              <Card
                key={member.id}
                className="p-5 bg-dark-surface border-dark-border hover:border-dark-borderHover transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} size="md" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-text-primary truncate max-w-[160px]">
                            {member.name}
                          </h3>
                          {isCurrent && (
                            <span className="text-[10px] px-1 rounded bg-brand/10 text-brand font-medium border border-brand/20">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted truncate max-w-[180px]">{member.email}</p>
                      </div>
                    </div>

                    <Badge
                      variant={
                        member.role === 'admin'
                          ? 'danger'
                          : member.role === 'manager'
                          ? 'warning'
                          : member.role === 'team_lead'
                          ? 'brand'
                          : 'default'
                      }
                      className="capitalize text-[11px]"
                    >
                      {member.role.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Task Workload Distribution */}
                  <div className="mt-4 pt-3 border-t border-dark-borderSubtle grid grid-cols-3 gap-2 text-center">
                    <div className="bg-dark-elevated/50 p-2 rounded-lg border border-dark-borderSubtle">
                      <span className="text-[10px] text-text-muted block">Assigned</span>
                      <span className="text-xs font-bold text-text-primary">{stats.totalTasks}</span>
                    </div>
                    <div className="bg-dark-elevated/50 p-2 rounded-lg border border-dark-borderSubtle">
                      <span className="text-[10px] text-text-muted block">Completed</span>
                      <span className="text-xs font-bold text-emerald-400">{stats.completedTasks}</span>
                    </div>
                    <div className="bg-dark-elevated/50 p-2 rounded-lg border border-dark-borderSubtle">
                      <span className="text-[10px] text-text-muted block">Overdue</span>
                      <span className="text-xs font-bold text-amber-400">{stats.overdueTasks}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-dark-borderSubtle flex items-center justify-between">
                  <span className="text-[11px] text-text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Member since {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMember(member)}
                    rightIcon={<ArrowUpRight className="w-3 h-3" />}
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Member Profile Detail Modal */}
      {selectedMember && (
        <Modal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          title={`Member Profile: ${selectedMember.name}`}
          size="lg"
        >
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-dark-surface border border-dark-border">
              <Avatar name={selectedMember.name} size="lg" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-text-primary">{selectedMember.name}</h2>
                  <Badge variant="brand" className="capitalize">
                    {selectedMember.role.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-0.5">{selectedMember.email}</p>
                <p className="text-[11px] text-text-muted mt-1">
                  User ID: #{selectedMember.id} &bull; Joined: {selectedMember.created_at ? new Date(selectedMember.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Assigned Tasks Summary */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Active Assignments in Workspace
              </h3>
              {tasks.filter((t) => t.assigned_to === selectedMember.id).length === 0 ? (
                <div className="p-4 rounded-lg bg-dark-surface/40 border border-dark-border text-center text-xs text-text-muted">
                  No active tasks currently assigned to this member.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tasks
                    .filter((t) => t.assigned_to === selectedMember.id)
                    .map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedMember(null);
                          navigate(`/tasks/${t.id}`);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-dark-surface border border-dark-border hover:border-brand/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${
                              t.status === 'completed' ? 'text-emerald-400' : 'text-text-muted'
                            }`}
                          />
                          <span className="text-xs font-medium text-text-primary">{t.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              t.priority === 'urgent'
                                ? 'danger'
                                : t.priority === 'high'
                                ? 'warning'
                                : 'default'
                            }
                            className="text-[10px] capitalize"
                          >
                            {t.priority}
                          </Badge>
                          <Badge
                            variant={t.status === 'completed' ? 'success' : 'brand'}
                            className="text-[10px] capitalize"
                          >
                            {t.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Velocity Overview */}
            {velocityData && (
              <div className="p-4 rounded-xl bg-dark-surface/40 border border-dark-border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-brand" />
                  <span className="text-xs font-semibold text-text-primary">Workspace Velocity Context</span>
                </div>
                <p className="text-xs text-text-muted">
                  Average completion velocity: <strong className="text-brand">{velocityData.summary.average_completion_days} days</strong> per task across all active members.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-dark-borderSubtle">
              <Button variant="outline" size="sm" onClick={() => setSelectedMember(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedMember(null);
                  navigate('/workload');
                }}
              >
                Inspect Workload
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
