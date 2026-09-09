import React, { useState } from 'react';
import { useUsers } from '../../hooks/useUsers';
import { User } from '../../types';
import { Card } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { UserRoleModal } from '../../components/users/UserRoleModal';
import { formatDate } from '../../utils/date';
import { Search, UserCog, Users } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedUserForRole, setSelectedUserForRole] = useState<User | null>(null);

  const { data, isLoading, isError, refetch } = useUsers({
    role: roleFilter || undefined,
    page: currentPage,
    limit: 10,
  });

  const rawUsers = data?.users || [];
  const filteredUsers = rawUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pagination = data?.pagination;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'brand';
      case 'manager':
        return 'info';
      case 'team_lead':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Users className="w-6 h-6 text-brand" />
            <span>Users</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Manage people and access across your workspace.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full sm:max-w-sm">
          <Input
            placeholder="Search users by name or email..."
            leftIcon={<Search className="w-4 h-4 text-text-muted" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'admin', label: 'Admin' },
              { value: 'manager', label: 'Manager' },
              { value: 'team_lead', label: 'Team Lead' },
              { value: 'employee', label: 'Employee' },
            ]}
          />
        </div>
      </div>

      {/* User Table */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton variant="rectangular" className="h-10 w-full" />
            <Skeleton variant="rectangular" className="h-10 w-full" />
            <Skeleton variant="rectangular" className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState
              title="Could not load users"
              message="Failed to retrieve user accounts from the backend."
              onRetry={() => refetch()}
            />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Users className="w-8 h-8 text-brand" />}
              title="No users found"
              description="No user accounts match the current filter or search criteria."
            />
          </div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="sm" />
                        <span className="font-semibold text-text-primary text-xs truncate">
                          {user.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-text-secondary text-xs">
                      {user.email}
                    </TableCell>

                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-text-muted text-xs">
                      {formatDate(user.created_at)}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUserForRole(user)}
                        leftIcon={<UserCog className="w-3.5 h-3.5" />}
                        className="text-text-secondary hover:text-brand"
                      >
                        Change Role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="p-4 border-t border-dark-borderSubtle">
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
      </Card>

      {/* Role Management Modal */}
      <UserRoleModal
        user={selectedUserForRole}
        isOpen={selectedUserForRole !== null}
        onClose={() => setSelectedUserForRole(null)}
      />
    </div>
  );
};
