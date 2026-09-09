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
import {
  FileCode,
  Plus,
  Trash2,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  ListFilter,
  Link2,
} from 'lucide-react';
import {
  useCustomFieldDefinitions,
  useCreateCustomFieldDefinition,
  useDeleteCustomFieldDefinition,
} from '../../hooks/useCustomFields';
import { CustomFieldType } from '../../api/customFields.api';

export const CustomFieldsPage: React.FC = () => {
  const [entityFilter, setEntityFilter] = useState<'all' | 'task' | 'project'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state
  const [fieldName, setFieldName] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [entityType, setEntityType] = useState<'task' | 'project'>('task');
  const [optionsStr, setOptionsStr] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  // API hooks
  const { data: definitions = [], isLoading, isError, refetch } = useCustomFieldDefinitions(
    entityFilter === 'all' ? undefined : { entity_type: entityFilter }
  );
  const createMutation = useCreateCustomFieldDefinition();
  const deleteMutation = useDeleteCustomFieldDefinition();

  const handleNameChange = (val: string) => {
    setFieldName(val);
    if (!fieldKey || fieldKey === fieldName.toLowerCase().replace(/[^a-z0-9_]/g, '_')) {
      setFieldKey(val.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName || !fieldKey) return;

    const parsedOptions =
      fieldType === 'select' || fieldType === 'multi_select'
        ? optionsStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    await createMutation.mutateAsync({
      name: fieldName.trim(),
      field_key: fieldKey.trim().toLowerCase(),
      field_type: fieldType,
      entity_type: entityType,
      options: parsedOptions,
      required: isRequired,
    });

    setIsCreateModalOpen(false);
    setFieldName('');
    setFieldKey('');
    setOptionsStr('');
    setIsRequired(false);
  };

  const getTypeIcon = (type: CustomFieldType) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3.5 h-3.5 text-brand" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-status-info" />;
      case 'boolean':
        return <ToggleLeft className="w-3.5 h-3.5 text-status-warning" />;
      case 'select':
      case 'multi_select':
        return <ListFilter className="w-3.5 h-3.5 text-brand" />;
      case 'url':
        return <Link2 className="w-3.5 h-3.5 text-status-info" />;
      case 'text':
      default:
        return <Type className="w-3.5 h-3.5 text-text-muted" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              <FileCode className="w-6 h-6 text-brand" />
              <span>Custom Fields Metadata Definitions</span>
            </h1>
            <Badge variant="brand">Enterprise Schema</Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Define typed dynamic metadata attributes for tasks and projects with validation rules.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          className="shadow-lemon-sm font-semibold"
        >
          Define Custom Field
        </Button>
      </div>

      {/* Entity Tabs */}
      <div className="flex items-center gap-2 border-b border-dark-borderSubtle pb-2">
        <button
          type="button"
          onClick={() => setEntityFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            entityFilter === 'all'
              ? 'bg-brand/15 text-brand border border-brand/30'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          All Entities ({definitions.length})
        </button>
        <button
          type="button"
          onClick={() => setEntityFilter('task')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            entityFilter === 'task'
              ? 'bg-brand/15 text-brand border border-brand/30'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Task Fields
        </button>
        <button
          type="button"
          onClick={() => setEntityFilter('project')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            entityFilter === 'project'
              ? 'bg-brand/15 text-brand border border-brand/30'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Project Fields
        </button>
      </div>

      {/* Fields Table */}
      <Card className="p-0 overflow-hidden bg-dark-surface border-dark-border">
        <div className="p-4 border-b border-dark-borderSubtle flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">Registered Field Definitions</h3>
          <span className="text-xs text-text-muted">{definitions.length} configured fields</span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton variant="rectangular" className="h-10 w-full" />
            <Skeleton variant="rectangular" className="h-10 w-full" />
            <Skeleton variant="rectangular" className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState
              title="Could not load custom fields"
              message="Failed to retrieve custom field definitions from backend."
              onRetry={() => refetch()}
            />
          </div>
        ) : definitions.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No custom field definitions"
              description="Define custom metadata attributes to extend tasks and projects."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dark-borderSubtle bg-dark-elevated/40 text-text-muted uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Field Name</th>
                  <th className="py-3 px-4">Field Key</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Data Type</th>
                  <th className="py-3 px-4">Requirement</th>
                  <th className="py-3 px-4">Options / Schema</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-borderSubtle/60">
                {definitions.map((field) => (
                  <tr key={field.id} className="hover:bg-dark-elevated/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-text-primary flex items-center gap-2">
                      {getTypeIcon(field.field_type)}
                      <span>{field.name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-text-secondary text-[11px]">
                      {field.field_key}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-dark-elevated border border-dark-borderSubtle text-[10px] uppercase font-semibold text-text-primary">
                        {field.entity_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-brand font-semibold text-[11px]">
                      {field.field_type}
                    </td>
                    <td className="py-3 px-4">
                      {field.required ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-danger/15 text-status-danger border border-status-danger/30">
                          Required
                        </span>
                      ) : (
                        <span className="text-text-muted text-[11px]">Optional</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-muted text-[11px]">
                      {field.options && field.options.length > 0
                        ? field.options.join(', ')
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(field.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1 text-text-muted hover:text-status-danger rounded transition-colors"
                        title="Delete custom field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Field Definition Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Define Custom Field"
        description="Add a new structured metadata attribute to tasks or projects."
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Field Display Name"
            placeholder="e.g. Story Points, Release Sprint, Jira Ticket"
            value={fieldName}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Field Key (Unique Identifier)"
            placeholder="e.g. story_points, release_sprint"
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Entity Type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as 'task' | 'project')}
              required
            >
              <option value="task">Task</option>
              <option value="project">Project</option>
            </Select>

            <Select
              label="Data Type"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
              required
            >
              <option value="text">Text (Single-line)</option>
              <option value="number">Numeric / Points</option>
              <option value="boolean">Boolean Toggle (True/False)</option>
              <option value="date">Date / Timestamp</option>
              <option value="select">Single Select (Dropdown)</option>
              <option value="multi_select">Multi-Select List</option>
              <option value="url">Web URL</option>
            </Select>
          </div>

          {(fieldType === 'select' || fieldType === 'multi_select') && (
            <Input
              label="Dropdown Options (Comma-separated)"
              placeholder="e.g. Low, Medium, High, Critical"
              value={optionsStr}
              onChange={(e) => setOptionsStr(e.target.value)}
              required
            />
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isRequired"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="rounded bg-dark-elevated border-dark-border text-brand focus:ring-brand"
            />
            <label htmlFor="isRequired" className="text-xs text-text-primary select-none cursor-pointer">
              Mark as required field
            </label>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createMutation.isPending}
            >
              Create Definition
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
};

export default CustomFieldsPage;
