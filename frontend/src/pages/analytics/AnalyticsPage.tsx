import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAnalyticsOverview,
  useTeamVelocity,
} from '../../hooks/useAnalytics';
import { AnalyticsMetricCard } from '../../components/analytics/AnalyticsMetricCard';
import { VelocityChart } from '../../components/analytics/VelocityChart';
import { DistributionBar } from '../../components/analytics/DistributionBar';
import { WorkloadTable } from '../../components/analytics/WorkloadTable';
import { ProjectBurndownCard } from '../../components/analytics/ProjectBurndownCard';
import { ProjectHealthView } from '../../components/analytics/ProjectHealthView';
import { RiskIntelligenceView } from '../../components/analytics/RiskIntelligenceView';
import { ProductivityView } from '../../components/analytics/ProductivityView';
import { DataQualityView } from '../../components/analytics/DataQualityView';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import {
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  Percent,
  BarChart3,
  Activity,
  ShieldAlert,
  TrendingUp,
  FileCheck,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');

  const getDateFilter = () => {
    if (dateRange === 'all') return undefined;
    const now = new Date();
    const past = new Date();
    if (dateRange === '7d') past.setDate(now.getDate() - 7);
    if (dateRange === '30d') past.setDate(now.getDate() - 30);
    if (dateRange === '90d') past.setDate(now.getDate() - 90);
    return {
      startDate: past.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    };
  };

  const { data: overview, isLoading: isOverviewLoading } = useAnalyticsOverview();
  const { data: velocityData, isLoading: isVelocityLoading } = useTeamVelocity(getDateFilter());

  const tasks = overview?.tasks;
  const projects = overview?.projects;
  const priorities = overview?.priority_distribution;
  const statuses = overview?.status_distribution;

  const prioritySegments = [
    { label: 'High Priority', count: priorities?.high || 0, colorClass: 'text-status-danger', bgClass: 'bg-status-danger' },
    { label: 'Medium Priority', count: priorities?.medium || 0, colorClass: 'text-status-warning', bgClass: 'bg-status-warning' },
    { label: 'Low Priority', count: priorities?.low || 0, colorClass: 'text-brand', bgClass: 'bg-brand' },
  ];

  const statusSegments = [
    { label: 'In Progress', count: statuses?.in_progress || 0, colorClass: 'text-brand', bgClass: 'bg-brand' },
    { label: 'Completed', count: statuses?.completed || 0, colorClass: 'text-status-success', bgClass: 'bg-status-success' },
    { label: 'Pending', count: statuses?.pending || 0, colorClass: 'text-text-muted', bgClass: 'bg-text-muted' },
  ];

  const tabs = [
    { id: 'overview', label: 'Executive Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'health', label: 'Project Health', icon: <Activity className="w-4 h-4 text-emerald-400" /> },
    { id: 'risks', label: 'Risk Intelligence', icon: <ShieldAlert className="w-4 h-4 text-rose-400" /> },
    { id: 'productivity', label: 'Productivity & Turnaround', icon: <TrendingUp className="w-4 h-4 text-brand" /> },
    { id: 'quality', label: 'Data Quality', icon: <FileCheck className="w-4 h-4 text-blue-400" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Advanced Analytics & Intelligence</h1>
            <Badge variant="brand">Release 5</Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Executive metrics, objective project health scores, delivery velocity, and operational risk detection.
          </p>
        </div>

        {activeTab === 'overview' && (
          <div className="flex items-center gap-2">
            <Select
              options={[
                { value: 'all', label: 'All Time' },
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
                { value: '90d', label: 'Last 90 Days' },
              ]}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'all' | '7d' | '30d' | '90d')}
              className="w-36 text-xs"
            />
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-dark-borderSubtle">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          {isOverviewLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <AnalyticsMetricCard
                label="Total Tasks"
                value={tasks?.total_tasks || 0}
                icon={<CheckSquare className="w-5 h-5 text-brand" />}
                subtitle="All workspace tasks"
                onClick={() => navigate('/tasks')}
              />
              <AnalyticsMetricCard
                label="Active Tasks"
                value={tasks?.active_tasks || 0}
                icon={<Clock className="w-5 h-5 text-status-warning" />}
                subtitle="Pending + in progress"
                onClick={() => navigate('/tasks?status=in_progress')}
              />
              <AnalyticsMetricCard
                label="Completed"
                value={tasks?.completed_tasks || 0}
                icon={<CheckCircle2 className="w-5 h-5 text-status-success" />}
                badgeText="Finished"
                badgeVariant="success"
                onClick={() => navigate('/tasks?status=completed')}
              />
              <AnalyticsMetricCard
                label="Overdue"
                value={tasks?.overdue_tasks || 0}
                icon={<AlertTriangle className="w-5 h-5 text-status-danger" />}
                badgeText={tasks?.overdue_tasks ? 'Attention' : 'On Track'}
                badgeVariant={tasks?.overdue_tasks ? 'danger' : 'success'}
                onClick={() => navigate('/tasks?status=pending')}
              />
              <AnalyticsMetricCard
                label="Completion Rate"
                value={`${tasks?.completion_rate_percentage || 0}%`}
                icon={<Percent className="w-5 h-5 text-brand" />}
                subtitle="Overall delivery speed"
              />
              <AnalyticsMetricCard
                label="Active Projects"
                value={projects?.total_active_projects || 0}
                icon={<FolderKanban className="w-5 h-5 text-status-info" />}
                subtitle="Ongoing sprints"
                onClick={() => navigate('/projects')}
              />
            </div>
          )}

          {/* Velocity Chart & Distribution Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {isVelocityLoading ? (
                <Skeleton variant="rectangular" className="h-72 w-full rounded-xl" />
              ) : (
                <VelocityChart
                  timeline={velocityData?.velocity_timeline || []}
                  avgHours={velocityData?.summary?.average_completion_hours}
                  avgDays={velocityData?.summary?.average_completion_days}
                />
              )}
            </div>

            <div className="space-y-6">
              <DistributionBar
                title="Status Breakdown"
                subtitle="Distribution of tasks across active lifecycle states"
                segments={statusSegments}
              />
              <DistributionBar
                title="Priority Distribution"
                subtitle="Allocation of high, medium, and low urgency items"
                segments={prioritySegments}
              />
            </div>
          </div>

          {/* Team Workload Table & Burndown Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WorkloadTable workload={velocityData?.workload_by_assignee || []} />
            <ProjectBurndownCard />
          </div>
        </div>
      )}

      {/* TAB 2: PROJECT HEALTH INTELLIGENCE */}
      {activeTab === 'health' && <ProjectHealthView />}

      {/* TAB 3: RISK INTELLIGENCE */}
      {activeTab === 'risks' && <RiskIntelligenceView />}

      {/* TAB 4: PRODUCTIVITY */}
      {activeTab === 'productivity' && <ProductivityView />}

      {/* TAB 5: DATA QUALITY */}
      {activeTab === 'quality' && <DataQualityView />}
    </div>
  );
};

export default AnalyticsPage;
