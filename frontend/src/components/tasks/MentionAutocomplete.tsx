import React, { useState, useEffect } from 'react';
import { useUsers } from '../../hooks/useUsers';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { User } from '../../types';

export interface MentionAutocompleteProps {
  searchQuery: string;
  isOpen: boolean;
  onSelectUser: (user: User) => void;
  onClose: () => void;
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  searchQuery,
  isOpen,
  onSelectUser,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch users matching query
  const { data: usersData, isLoading } = useUsers({
    limit: 10,
  });

  const filteredUsers = (usersData?.users || [])
    .filter(
      (u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 6);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || filteredUsers.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelectUser(filteredUsers[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredUsers, selectedIndex, onSelectUser, onClose]);

  if (!isOpen) return null;

  return (
    <div className="absolute z-50 bottom-full left-0 mb-1 w-64 rounded-lg bg-dark-elevated border border-dark-border shadow-xl overflow-hidden py-1">
      <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-text-muted tracking-wider border-b border-dark-borderSubtle">
        Mention Teammate
      </div>

      {isLoading ? (
        <div className="p-2.5 text-xs text-text-muted text-center">Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-2.5 text-xs text-text-muted text-center">No teammates found</div>
      ) : (
        <div className="divide-y divide-dark-borderSubtle/40 max-h-48 overflow-y-auto">
          {filteredUsers.map((user, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={user.id}
                onClick={() => onSelectUser(user)}
                className={`p-2 flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected ? 'bg-brand/10 text-brand' : 'hover:bg-dark-surface text-text-secondary'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={user.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{user.name}</p>
                    <p className="text-[10px] text-text-muted truncate">{user.email}</p>
                  </div>
                </div>

                <Badge variant="default" size="sm" className="text-[9px] uppercase">
                  {user.role}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
