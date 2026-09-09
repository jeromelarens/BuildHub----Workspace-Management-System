import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  CheckSquare2,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react';
import {
  useApprovalRequests,
  useApprovalWorkflows,
  useSubmitApprovalRequest,
  useDecideApprovalRequest,
} from '../../hooks/useApprovals';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { ApprovalRequest, ApprovalRequestStatus } from '../../api/approvals.api';

export const ApprovalsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<ApprovalRequestStatus | 'all'>('all');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | ''>('');
  const [entityType, setEntityType] = useState<'task' | 'project'>('task');
  const [entityId, setEntityId] = useState<number | ''>('');

  // Decision Modal State
  const [activeDecisionRequest, setActiveDecisionRequest] = useState<ApprovalRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject'>('approve');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // API Hooks
  const { data: requests = [], isLoading, isError, refetch } = useApprovalRequests(
    statusFilter === 'all' ? undefined : { status: statusFilter }
  );
  const { data: workflows = [] } = useApprovalWorkflows();
  const { data: tasksData } = useTasks();
  const tasks = tasksData?.tasks || [];
  const { data: projectsData } = useProjects();
  const projects = projectsData?.projects || [];

  const submitMutation = useSubmitApprovalRequest();
  const decideMutation = useDecideApprovalRequest();

  const handleSubmitNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkflowId || !entityId) return;

    await submitMutation.mutateAsync({
      workflow_id: Number(selectedWorkflowId),
      entity_type: entityType,
      entity_id: Number(entityId),
    });

    setIsSubmitModalOpen(false);
    setSelectedWorkflowId('');
    setEntityId('');
  };

  const handleConfirmDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDecisionRequest) return;

    await decideMutation.mutateAsync({
      requestId: activeDecisionRequest.id,
      data: {
        action: decisionAction,
        notes: decisionNotes.trim() || undefined,
        rejection_reason: decisionAction === 'reject' ? rejectionReason.trim() : undefined,
      },
    });

    setActiveDecisionRequest(null);
    setDecisionNotes('');
    setRejectionReason('');
  };

  const getStatusBadge = (status: ApprovalRequestStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      case 'cancelled':
        return <Badge variant="default">Cancelled</Badge>;
      case 'pending':
      default:
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending Review
          </Badge>
        );
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              <CheckSquare2 className="w-6 h-6 text-brand" />
              <span>Enterprise Approval Center</span>
            </h1>
            <Badge variant="brand">Multi-Step</Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Structured review pipelines, multi-step verification states, and sign-off decision logs.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsSubmitModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          className="shadow-lemon-sm font-semibold"
        >
          Submit Request
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Pending Reviews
          </span>
          <div className="text-2xl font-bold text-status-warning font-mono">
            {pendingCount}
          </div>
          <p className="text-[11px] text-text-secondary">Awaiting sign-off</p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Approved Sign-offs
          </span>
          <div className="text-2xl font-bold text-status-success font-mono">
            {approvedCount}
          </div>
          <p className="text-[11px] text-text-secondary">Fully verified</p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Rejected Requests
          </span>
          <div className="text-2xl font-bold text-status-danger font-mono">
            {rejectedCount}
          </div>
          <p className="text-[11px] text-text-secondary">Declined deliverables</p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Active Workflows
          </span>
          <div className="text-2xl font-bold text-text-primary font-mono">
            {workflows.length}
          </div>
          <p className="text-[11px] text-text-secondary">Governance pipelines</p>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-dark-borderSubtle pb-2">
        {(['all', 'pending', 'approved', 'rejected', 'cancelled'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              statusFilter === st
                ? 'bg-brand/15 text-brand border border-brand/30'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {st === 'all' ? `All (${requests.length})` : st}
          </button>
        ))}
      </div>

      {/* Request Queue Table */}
      <Card className="p-0 overflow-hidden bg-dark-surface border-dark-border">
        <div className="p-4 border-b border-dark-borderSubtle flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">Approval Requests Queue</h3>
          <span className="text-xs text-text-muted">{requests.length} records</span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton variant="rectangular" className="h-12 w-full" />
            <Skeleton variant="rectangular" className="h-12 w-full" />
            <Skeleton variant="rectangular" className="h-12 w-full" />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState
              title="Could not load approval requests"
              message="Failed to retrieve approval queue from backend."
              onRetry={() => refetch()}
            />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No approval requests"
              description="Submit a new deliverable or review request using the button above."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dark-borderSubtle bg-dark-elevated/40 text-text-muted uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Request</th>
                  <th className="py-3 px-4">Workflow</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Requester</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4 text-right">Decision Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-borderSubtle/60">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-dark-elevated/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-text-primary">
                      #{req.id}
                    </td>
                    <td className="py-3 px-4 text-text-secondary font-medium">
                      {req.workflow?.name || `Workflow #${req.workflow_id}`}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-dark-elevated border border-dark-borderSubtle text-[11px] font-mono text-text-primary capitalize">
                        {req.entity_type} #{req.entity_id}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {req.requester?.name || `User #${req.requester_id}`}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(req.status)}</td>
                    <td className="py-3 px-4 font-mono text-text-muted text-[11px]">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => {
                              setActiveDecisionRequest(req);
                              setDecisionAction('approve');
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => {
                              setActiveDecisionRequest(req);
                              setDecisionAction('reject');
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-text-muted italic">
                          {req.rejection_reason ? `Reason: ${req.rejection_reason}` : 'Finalized'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Submit Approval Request Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Approval Request"
        description="Initiate a multi-step approval workflow on a task or project."
        size="md"
      >
        <form onSubmit={handleSubmitNewRequest} className="space-y-4">
          <Select
            label="Approval Workflow"
            value={selectedWorkflowId}
            onChange={(e) => setSelectedWorkflowId(e.target.value ? Number(e.target.value) : '')}
            required
          >
            <option value="">Select a governance workflow...</option>
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.name} ({wf.entity_type}) - {wf.steps?.length || 0} steps
              </option>
            ))}
          </Select>

          <Select
            label="Entity Type"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value as 'task' | 'project');
              setEntityId('');
            }}
            required
          >
            <option value="task">Task</option>
            <option value="project">Project</option>
          </Select>

          {entityType === 'task' ? (
            <Select
              label="Select Task"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">Choose task...</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.id} - {t.title}
                </option>
              ))}
            </Select>
          ) : (
            <Select
              label="Select Project"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">Choose project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} - {p.name}
                </option>
              ))}
            </Select>
          )}

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitMutation.isPending}
            >
              Submit for Sign-off
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Decision Modal */}
      {activeDecisionRequest && (
        <Modal
          isOpen={!!activeDecisionRequest}
          onClose={() => setActiveDecisionRequest(null)}
          title={`${decisionAction === 'approve' ? 'Approve' : 'Reject'} Request #${activeDecisionRequest.id}`}
          size="md"
        >
          <form onSubmit={handleConfirmDecision} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-dark-elevated border border-dark-borderSubtle text-xs text-text-secondary space-y-1">
              <div>
                <strong>Workflow:</strong> {activeDecisionRequest.workflow?.name || 'Governance Workflow'}
              </div>
              <div>
                <strong>Entity:</strong> {activeDecisionRequest.entity_type} #{activeDecisionRequest.entity_id}
              </div>
            </div>

            {decisionAction === 'reject' && (
              <Input
                label="Rejection Reason"
                placeholder="Specify reason for decline..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            )}

            <Textarea
              label="Reviewer Notes"
              placeholder="Add optional sign-off remarks or guidance..."
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              rows={3}
            />

            <ModalFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveDecisionRequest(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={decisionAction === 'approve' ? 'success' : 'danger'}
                size="sm"
                isLoading={decideMutation.isPending}
              >
                Confirm {decisionAction === 'approve' ? 'Approval' : 'Rejection'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ApprovalsPage;
