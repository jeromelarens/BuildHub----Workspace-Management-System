import React, { useState } from 'react';
import {
  Webhook,
  Plus,
  Shield,
  Clock,
  Trash2,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useWebhookDeliveries,
} from '../../hooks/useWebhooks';
import { WebhookEndpoint } from '../../api/webhooks.api';

export const WebhooksPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [eventsStr, setEventsStr] = useState('task.created, task.status_changed, task.completed');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  // Delivery logs drawer
  const [activeLogEndpoint, setActiveLogEndpoint] = useState<WebhookEndpoint | null>(null);

  // API hooks
  const { data: webhooks = [], isLoading, isError, refetch } = useWebhooks();
  const createMutation = useCreateWebhook();
  const deleteMutation = useDeleteWebhook();
  const testMutation = useTestWebhook();
  const { data: deliveries = [], isLoading: isLoadingDeliveries } = useWebhookDeliveries(
    activeLogEndpoint?.id ?? 0
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;

    const parsedEvents = eventsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await createMutation.mutateAsync({
      target_url: targetUrl.trim(),
      events: parsedEvents,
    });

    if (res.data?.signing_secret) {
      setCreatedSecret(res.data.signing_secret);
    } else {
      setIsCreateOpen(false);
      setTargetUrl('');
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
    setCreatedSecret(null);
    setTargetUrl('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Outbound Webhooks</h1>
            <Badge variant="brand">HMAC-SHA256</Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Subscribe external endpoints to BUILDHUB workspace events with cryptographic signature verification.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          className="shadow-lemon-sm font-semibold"
        >
          Register Webhook
        </Button>
      </div>

      {/* Webhook Endpoints List */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton variant="rectangular" className="h-24 w-full" />
            <Skeleton variant="rectangular" className="h-24 w-full" />
          </>
        ) : isError ? (
          <ErrorState
            title="Could not load webhooks"
            message="Failed to retrieve registered webhook endpoints."
            onRetry={() => refetch()}
          />
        ) : webhooks.length === 0 ? (
          <EmptyState
            title="No registered webhook endpoints"
            description="Register an HTTPS endpoint to receive real-time JSON event payloads."
          />
        ) : (
          webhooks.map((hook) => (
            <Card key={hook.id} className="p-5 bg-dark-surface border-dark-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                    <Webhook className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold font-mono text-text-primary break-all">{hook.target_url}</span>
                      <Badge
                        variant={hook.is_active ? 'success' : 'default'}
                        className="text-[10px] capitalize shrink-0"
                      >
                        {hook.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5 font-mono break-all">
                      Secret: {hook.secret_preview ? `whsec_••••••••${hook.secret_preview}` : 'whsec_••••••••'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    isLoading={testMutation.isPending}
                    onClick={() => testMutation.mutate(hook.id)}
                    leftIcon={<Send className="w-3 h-3" />}
                  >
                    Test Ping
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setActiveLogEndpoint(hook)}
                    leftIcon={<Clock className="w-3 h-3" />}
                  >
                    Delivery Logs
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    className="text-xs p-2"
                    onClick={() => deleteMutation.mutate(hook.id)}
                    title="Delete webhook"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="pt-3 border-t border-dark-borderSubtle flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mr-1">
                    Subscribed Events:
                  </span>
                  {hook.events.map((ev) => (
                    <span
                      key={ev}
                      className="px-2 py-0.5 rounded bg-dark-elevated text-text-secondary text-[10px] font-mono border border-dark-borderSubtle"
                    >
                      {ev}
                    </span>
                  ))}
                </div>

                <span className="text-[11px] text-text-muted font-mono">
                  Created: {new Date(hook.created_at).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Signature & Security Spec Card */}
      <Card className="p-5 bg-dark-surface/60 border-dark-border space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            HMAC-SHA256 Signature Header Specification
          </h3>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Every HTTP POST request includes an <code className="text-brand font-mono">X-TaskFlow-Signature</code> header containing the SHA-256 HMAC digest of the JSON payload signed with the secret token.
        </p>
      </Card>

      {/* Create Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={handleCloseCreateModal}
          title={createdSecret ? 'Webhook Registered Successfully' : 'Register Outbound Webhook'}
          size="md"
        >
          {createdSecret ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-status-success/10 border border-status-success/30 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-status-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Webhook Signing Secret Generated</span>
                </div>
                <p className="text-text-secondary">
                  Copy this secret now. For security purposes, it will never be displayed in full again:
                </p>
                <div className="p-2.5 rounded bg-dark-bg font-mono text-brand font-bold select-all break-all border border-dark-border">
                  {createdSecret}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button variant="primary" size="sm" onClick={handleCloseCreateModal}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Input
                label="Target HTTPS URL"
                placeholder="https://api.your-company.com/webhooks/buildhub"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
                autoFocus
              />

              <Input
                label="Subscribed Events (Comma-separated)"
                placeholder="task.created, task.updated, task.completed, project.created"
                value={eventsStr}
                onChange={(e) => setEventsStr(e.target.value)}
                required
              />

              <ModalFooter>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseCreateModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={createMutation.isPending}
                >
                  Register Endpoint
                </Button>
              </ModalFooter>
            </form>
          )}
        </Modal>
      )}

      {/* Delivery Logs Modal */}
      {activeLogEndpoint && (
        <Modal
          isOpen={!!activeLogEndpoint}
          onClose={() => setActiveLogEndpoint(null)}
          title={`Delivery History: ${activeLogEndpoint.target_url}`}
          size="lg"
        >
          <div className="space-y-4">
            {isLoadingDeliveries ? (
              <Skeleton variant="rectangular" className="h-32 w-full" />
            ) : deliveries.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                No delivery attempts recorded for this endpoint yet. Click "Test Ping" to dispatch an initial event.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-dark-borderSubtle text-text-muted uppercase tracking-wider font-semibold text-[10px]">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Event</th>
                      <th className="py-2.5 px-3">Status Code</th>
                      <th className="py-2.5 px-3">Attempts</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-borderSubtle">
                    {deliveries.map((del) => (
                      <tr key={del.id}>
                        <td className="py-2.5 px-3">
                          {del.success ? (
                            <Badge variant="success" className="text-[10px]">
                              Delivered
                            </Badge>
                          ) : (
                            <Badge variant="danger" className="text-[10px]">
                              Failed
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-text-primary">{del.event_type}</td>
                        <td className="py-2.5 px-3 font-mono text-text-muted">{del.status_code || '—'}</td>
                        <td className="py-2.5 px-3 text-text-muted">{del.attempt_count}</td>
                        <td className="py-2.5 px-3 font-mono text-text-muted text-[11px]">
                          {new Date(del.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-dark-borderSubtle">
              <Button variant="outline" size="sm" onClick={() => setActiveLogEndpoint(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default WebhooksPage;
