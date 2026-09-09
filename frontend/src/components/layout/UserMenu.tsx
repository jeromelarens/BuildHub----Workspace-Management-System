import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Dropdown, DropdownItem, DropdownDivider } from '../ui/Dropdown';
import { Avatar } from '../ui/Avatar';
import { User as UserIcon, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export const UserMenu: React.FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { info } = useToast();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    info('You have been signed out.');
    navigate('/login', { replace: true });
  };

  const trigger = (
    <div
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-hover transition-colors text-left w-full group select-none border border-transparent hover:border-dark-borderSubtle cursor-pointer"
      title={user.name}
    >
      <Avatar name={user.name} size="sm" status="online" />
      {!collapsed && (
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-semibold text-text-primary truncate group-hover:text-brand transition-colors">
            {user.name}
          </span>
          <span className="text-[11px] text-text-muted truncate flex items-center gap-1">
            <span className="capitalize">{user.role.replace('_', ' ')}</span>
            {user.role === 'admin' && <ShieldCheck className="w-3 h-3 text-brand" />}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown trigger={trigger} align="right" className="w-56 mb-2 bottom-full">
      <div className="px-3 py-2 border-b border-dark-borderSubtle">
        <p className="text-xs font-semibold text-text-primary truncate">{user.name}</p>
        <p className="text-[11px] text-text-muted truncate">{user.email}</p>
      </div>

      <div className="p-1">
        <DropdownItem icon={<UserIcon className="w-4 h-4" />} onClick={() => navigate('/profile')}>
          My Profile
        </DropdownItem>
        <DropdownItem icon={<Settings className="w-4 h-4" />} onClick={() => navigate('/settings')}>
          Account Settings
        </DropdownItem>
      </div>

      <DropdownDivider />

      <div className="p-1">
        <DropdownItem icon={<LogOut className="w-4 h-4" />} danger onClick={handleLogout}>
          Sign Out
        </DropdownItem>
      </div>
    </Dropdown>
  );
};
