import React, { useState } from 'react';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { AuditLogTable } from '../../components/audit/AuditLogTable';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { Skeleton } from '../../components/ui/Skeleton';
import { Shield, Search } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [searchAction, setSearchAction] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useAuditLogs({
    action: searchAction ? searchAction.toUpperCase() : undefined,
    entity_type: entityFilter || undefined,
    page: currentPage,
    limit: 15,
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand" />
            <span>Security Audit Logs</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Tamper-evident system logs tracking administrative actions, user authentications, and data modifications.
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="grow">
          <Input
            placeholder="Search by action (e.g. LOGIN, TASK_CREATED, USER_ROLE_UPDATED)..."
            leftIcon={<Search className="w-4 h-4 text-text-muted" />}
            value={searchAction}
            onChange={(e) => {
              setSearchAction(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Select
            options={[
              { value: '', label: 'All Resources' },
              { value: 'task', label: 'Tasks' },
              { value: 'project', label: 'Projects' },
              { value: 'user', label: 'Users' },
              { value: 'task_attachment', label: 'Attachments' },
              { value: 'task_dependency', label: 'Dependencies' },
              { value: 'auth', label: 'Authentication' },
            ]}
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-44 text-xs"
          />
        </div>
      </div>

      {/* Audit Table */}
      {isLoading ? (
        <div className="p-6 space-y-3 bg-dark-surface rounded-xl border border-dark-borderSubtle">
          <Skeleton variant="rectangular" className="h-10 w-full" />
          <Skeleton variant="rectangular" className="h-10 w-full" />
          <Skeleton variant="rectangular" className="h-10 w-full" />
          <Skeleton variant="rectangular" className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <AuditLogTable logs={logs} />

          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 bg-dark-surface rounded-xl border border-dark-borderSubtle">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
