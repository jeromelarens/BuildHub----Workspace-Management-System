import React from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AuditLogEntry } from '../../types';
import { formatDateTime } from '../../utils/date';
import { Shield, Clock, User, Globe, Cpu } from 'lucide-react';

export interface AuditDetailModalProps {
  entry: AuditLogEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({
  entry,
  isOpen,
  onClose,
}) => {
  if (!entry) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Event Details"
      description={`Tamper-evident record #${entry.id} recorded at ${formatDateTime(entry.created_at)}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Core Attributes */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-dark-surface border border-dark-borderSubtle space-y-1">
            <span className="text-text-muted flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-brand" /> Action
            </span>
            <Badge variant="brand" size="sm" className="font-mono text-[11px]">
              {entry.action}
            </Badge>
          </div>

          <div className="p-3 rounded-lg bg-dark-surface border border-dark-borderSubtle space-y-1">
            <span className="text-text-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand" /> Timestamp
            </span>
            <span className="font-semibold text-text-primary block">
              {formatDateTime(entry.created_at)}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-dark-surface border border-dark-borderSubtle space-y-1">
            <span className="text-text-muted flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand" /> Actor
            </span>
            <span className="font-semibold text-text-primary block">
              {entry.actor?.name || 'System / Unauthenticated'}
            </span>
            {entry.actor?.email && (
              <span className="text-[10px] text-text-muted block">{entry.actor.email}</span>
            )}
          </div>

          <div className="p-3 rounded-lg bg-dark-surface border border-dark-borderSubtle space-y-1">
            <span className="text-text-muted flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand" /> IP & Client
            </span>
            <span className="font-mono text-text-primary block truncate">
              {entry.ip_address || 'Internal (127.0.0.1)'}
            </span>
          </div>
        </div>

        {/* User Agent */}
        {entry.user_agent && (
          <div className="p-3 rounded-lg bg-dark-surface border border-dark-borderSubtle text-xs space-y-1">
            <span className="text-text-muted flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-brand" /> User Agent
            </span>
            <p className="font-mono text-[11px] text-text-secondary break-all">
              {entry.user_agent}
            </p>
          </div>
        )}

        {/* Sanitized Event Details Payload */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
            Sanitized Payload
          </span>
          <pre className="p-3.5 rounded-lg bg-dark-elevated border border-dark-borderSubtle font-mono text-[11px] text-text-secondary overflow-x-auto max-h-48 leading-relaxed">
            {JSON.stringify(entry.details || {}, null, 2)}
          </pre>
        </div>

        <ModalFooter>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
};
