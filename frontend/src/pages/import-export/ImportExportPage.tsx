import React, { useState, useMemo } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { useToast } from '../../hooks/useToast';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  XCircle,
  FolderKanban,
  CheckSquare,
  Shield,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';

interface ImportedTaskRow {
  rowNumber: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  isValid: boolean;
  errors: string[];
}

export const ImportExportPage: React.FC = () => {
  const { success, error, info } = useToast();
  const { data: tasksData, isLoading: isTasksLoading } = useTasks({ limit: 1000 });
  const { data: projectsData, isLoading: isProjectsLoading } = useProjects();
  const { data: auditData } = useAuditLogs({ limit: 100 });

  const tasks = tasksData?.tasks || [];
  const projects = projectsData?.projects || [];
  const auditLogs = auditData?.logs || [];

  // Import State
  const [importRows, setImportRows] = useState<ImportedTaskRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  // Export Tasks to CSV
  const handleExportTasksCSV = () => {
    if (tasks.length === 0) {
      info('No tasks available to export.');
      return;
    }

    const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Due Date', 'Project ID', 'Assigned To', 'Created At'];
    const rows = tasks.map((t) => [
      t.id,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.due_date || '',
      t.project_id || '',
      t.assigned_to || '',
      t.created_at,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `buildhub-tasks-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Tasks exported successfully to CSV.');
  };

  // Export Tasks to JSON
  const handleExportTasksJSON = () => {
    if (tasks.length === 0) {
      info('No tasks available to export.');
      return;
    }

    // Sanitize tasks for export (ensure zero sensitive data)
    const sanitizedTasks = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      project_id: t.project_id,
      assigned_to: t.assigned_to,
      created_at: t.created_at,
    }));

    const jsonString = JSON.stringify(sanitizedTasks, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `buildhub-tasks-export-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Tasks exported successfully to JSON.');
  };

  // Export Projects to CSV
  const handleExportProjectsCSV = () => {
    if (projects.length === 0) {
      info('No projects available to export.');
      return;
    }

    const headers = ['ID', 'Name', 'Description', 'Status', 'Created By', 'Created At'];
    const rows = projects.map((p) => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      p.status,
      p.created_by || '',
      p.created_at,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `buildhub-projects-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Projects exported successfully to CSV.');
  };

  // Handle CSV file upload & validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

        if (lines.length <= 1) {
          error('CSV file has no data rows.');
          setImportRows([]);
          return;
        }

        const validStatuses = ['pending', 'in_progress', 'completed'];
        const validPriorities = ['low', 'medium', 'high', 'urgent'];

        const parsedRows: ImportedTaskRow[] = [];

        // Parse header and rows
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          const title = cols[0] || '';
          const description = cols[1] || '';
          const status = (cols[2] || 'pending').toLowerCase();
          const priority = (cols[3] || 'medium').toLowerCase();
          const due_date = cols[4] || undefined;

          const rowErrors: string[] = [];

          if (!title) {
            rowErrors.push('Title is required');
          }
          if (!validStatuses.includes(status)) {
            rowErrors.push(`Invalid status "${status}". Allowed: ${validStatuses.join(', ')}`);
          }
          if (!validPriorities.includes(priority)) {
            rowErrors.push(`Invalid priority "${priority}". Allowed: ${validPriorities.join(', ')}`);
          }
          if (due_date && isNaN(Date.parse(due_date))) {
            rowErrors.push(`Invalid date format "${due_date}". Use YYYY-MM-DD`);
          }

          parsedRows.push({
            rowNumber: i,
            title,
            description,
            status,
            priority,
            due_date,
            isValid: rowErrors.length === 0,
            errors: rowErrors,
          });
        }

        setImportRows(parsedRows);
        success(`Parsed ${parsedRows.length} rows with ${parsedRows.filter((r) => r.isValid).length} valid records.`);
      } catch {
        error('Failed to parse CSV file.');
      }
    };

    reader.readAsText(file);
  };

  const validRowCount = useMemo(() => importRows.filter((r) => r.isValid).length, [importRows]);
  const errorRowCount = useMemo(() => importRows.filter((r) => !r.isValid).length, [importRows]);

  if (isTasksLoading || isProjectsLoading) {
    return <LoadingState message="Loading data management center..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Data Import & Export</h1>
            <Badge variant="brand">Enterprise Portability</Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Export authorized workspace records or validate bulk CSV datasets for batch import.
          </p>
        </div>
      </div>

      {/* Export Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Download className="w-4 h-4 text-brand" />
          Data Export Center
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 bg-dark-surface border-dark-border flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Tasks Export</h3>
                  <p className="text-xs text-text-muted">{tasks.length} active records</p>
                </div>
              </div>
              <p className="text-xs text-text-secondary mt-3">
                Export all currently authorized workspace tasks, priorities, and assignees.
              </p>
            </div>
            <div className="flex gap-2 pt-3 border-t border-dark-borderSubtle">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTasksCSV}
                leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
                className="flex-1"
              >
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTasksJSON}
                leftIcon={<FileJson className="w-3.5 h-3.5 text-amber-400" />}
                className="flex-1"
              >
                JSON
              </Button>
            </div>
          </Card>

          <Card className="p-5 bg-dark-surface border-dark-border flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Projects Export</h3>
                  <p className="text-xs text-text-muted">{projects.length} active records</p>
                </div>
              </div>
              <p className="text-xs text-text-secondary mt-3">
                Export all workspace projects, member counts, and creation metadata.
              </p>
            </div>
            <div className="pt-3 border-t border-dark-borderSubtle">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportProjectsCSV}
                leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
                className="w-full"
              >
                Export Projects (CSV)
              </Button>
            </div>
          </Card>

          <Card className="p-5 bg-dark-surface border-dark-border flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Audit Log Export</h3>
                  <p className="text-xs text-text-muted">{auditLogs.length} recent events</p>
                </div>
              </div>
              <p className="text-xs text-text-secondary mt-3">
                Export compliance audit logs and security activity history.
              </p>
            </div>
            <div className="pt-3 border-t border-dark-borderSubtle">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (auditLogs.length === 0) {
                    info('No audit logs available for export.');
                    return;
                  }
                  const jsonString = JSON.stringify(auditLogs, null, 2);
                  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.setAttribute('href', url);
                  link.setAttribute('download', `buildhub-audit-logs-${new Date().toISOString().split('T')[0]}.json`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  success('Audit logs exported.');
                }}
                leftIcon={<FileJson className="w-3.5 h-3.5 text-purple-400" />}
                className="w-full"
              >
                Export Audit Trail (JSON)
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* CSV Import & Validation Section */}
      <div className="space-y-3 pt-6 border-t border-dark-borderSubtle">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Upload className="w-4 h-4 text-emerald-400" />
          Bulk CSV Task Import & Pre-flight Validator
        </h2>

        <Card className="p-6 bg-dark-surface border-dark-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Upload Task CSV Dataset</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Expected columns: <code className="text-brand font-mono">title, description, status, priority, due_date</code>
              </p>
            </div>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand text-dark-bg text-xs font-semibold hover:bg-brand/90 transition-colors shadow-lemon-sm">
                <Upload className="w-4 h-4" />
                Select CSV File
              </span>
            </label>
          </div>

          {fileName && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-dark-elevated border border-dark-borderSubtle">
              <span className="text-xs font-medium text-text-primary flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                {fileName}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {validRowCount} Valid
                </span>
                {errorRowCount > 0 && (
                  <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    {errorRowCount} Invalid
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Import Table Preview */}
          {importRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="max-h-64 overflow-y-auto overflow-x-auto border border-dark-border rounded-xl">
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead className="bg-dark-elevated text-text-muted uppercase text-[10px] font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5">Row</th>
                      <th className="p-2.5">Title</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Priority</th>
                      <th className="p-2.5">Due Date</th>
                      <th className="p-2.5">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-borderSubtle">
                    {importRows.map((r) => (
                      <tr key={r.rowNumber} className={r.isValid ? 'hover:bg-dark-hover/50' : 'bg-rose-500/5'}>
                        <td className="p-2.5 font-mono text-text-muted">#{r.rowNumber}</td>
                        <td className="p-2.5 font-medium text-text-primary">{r.title || '<empty>'}</td>
                        <td className="p-2.5 capitalize">{r.status}</td>
                        <td className="p-2.5 capitalize">{r.priority}</td>
                        <td className="p-2.5 text-text-muted">{r.due_date || '-'}</td>
                        <td className="p-2.5">
                          {r.isValid ? (
                            <Badge variant="success" className="text-[10px]">
                              Valid
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-medium">
                              {r.errors.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImportRows([]);
                    setFileName(null);
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={validRowCount === 0}
                  onClick={() => {
                    info(`Validated ${validRowCount} tasks ready for batch ingestion.`);
                  }}
                >
                  Import {validRowCount} Valid Tasks
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
