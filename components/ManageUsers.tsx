
import React, { useState } from 'react';
import { User, Branch, UserRole, Employee } from '../types';
import { UserPlus, Shield, Trash2, Edit2, KeyRound, Building, User as UserIcon, X } from 'lucide-react';

interface ManageUsersProps {
  users: User[];
  branches: Branch[];
  employees: Employee[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onEditUser: (id: string, data: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
}

const ManageUsers: React.FC<ManageUsersProps> = ({ users, branches, employees, onAddUser, onEditUser, onDeleteUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Add Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('MANAGER');
  const [branchId, setBranchId] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('MANAGER');
  const [editBranchId, setEditBranchId] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) return;
    if (role === 'MANAGER' && !branchId) return;
    if (role === 'USER' && (!branchId || !employeeId)) return;

    onAddUser({
      name,
      username,
      password,
      role,
      branch_id: (role === 'MANAGER' || role === 'USER') ? branchId : undefined,
      employee_id: role === 'USER' ? employeeId : undefined,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`
    });

    setName('');
    setUsername('');
    setPassword('');
    setRole('MANAGER');
    setBranchId('');
    setEmployeeId('');
    setIsAdding(false);
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditPassword(user.password || '');
    setEditRole(user.role);
    setEditBranchId(user.branch_id || '');
    setEditEmployeeId(user.employee_id || '');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const updatedData: Partial<User> = {
      name: editName,
      username: editUsername,
      role: editRole,
      branch_id: (editRole === 'MANAGER' || editRole === 'USER') ? editBranchId : undefined,
      employee_id: editRole === 'USER' ? editEmployeeId : undefined,
      password: editPassword 
    };
    
    // Update avatar if name changed
    updatedData.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(editName)}&background=random&color=fff`;

    onEditUser(editingId, updatedData);
    setEditingId(null);
  };

  // Filter employees based on selected branch for User Link
  const branchEmployees = employees.filter(e => e.branch_id === branchId);
  const editBranchEmployees = employees.filter(e => e.branch_id === editBranchId);

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">System Users</h2>
              <p className="text-sm text-slate-500">Manage Admins, Managers, and Field Officers</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <UserPlus size={16} />
            <span>Add User</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Add User Form */}
          {isAdding && (
            <div className="mb-8 bg-indigo-50 border border-indigo-100 p-6 rounded-xl animate-in fade-in slide-in-from-top-2">
               <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-4">Create New User</h3>
               <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Full Name</label>
                    <input 
                      required type="text" value={name} onChange={e => setName(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Username</label>
                    <input 
                      required type="text" value={username} onChange={e => setUsername(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                     <label className="text-xs font-semibold text-slate-600 mb-1 block">Password</label>
                     <div className="relative">
                       <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                       <input 
                        required type="password" value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full border border-slate-300 rounded pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                     </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Role</label>
                    <select 
                      value={role} onChange={e => setRole(e.target.value as UserRole)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="OWNER">Owner</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Branch Manager</option>
                      <option value="USER">Normal User (Field Officer)</option>
                    </select>
                  </div>

                  {(role === 'MANAGER' || role === 'USER') && (
                    <div className={role === 'USER' ? '' : 'md:col-span-2'}>
                       <label className="text-xs font-semibold text-slate-600 mb-1 block">Assign Branch</label>
                       <select 
                        required
                        value={branchId} onChange={e => setBranchId(e.target.value)}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      >
                        <option value="">Select a branch...</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {role === 'USER' && (
                     <div>
                       <label className="text-xs font-semibold text-slate-600 mb-1 block">Link to Employee Profile</label>
                       <select 
                        required
                        value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        disabled={!branchId}
                      >
                        <option value="">{branchId ? 'Select an employee...' : 'Select branch first'}</option>
                        {branchEmployees.map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.id}) - {e.designation}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                    <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm">Save User</button>
                  </div>
               </form>
            </div>
          )}

          {/* Users List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(user => {
              const userBranch = branches.find(b => b.id === user.branch_id);
              const userEmployee = employees.find(e => e.id === user.employee_id);
              
              let roleColor = 'bg-slate-100 text-slate-700';
              if (user.role === 'SUPER_ADMIN') roleColor = 'bg-purple-100 text-purple-700';
              if (user.role === 'OWNER') roleColor = 'bg-amber-100 text-amber-700';
              if (user.role === 'ADMIN') roleColor = 'bg-cyan-100 text-cyan-700';
              if (user.role === 'MANAGER') roleColor = 'bg-emerald-100 text-emerald-700';
              if (user.role === 'USER') roleColor = 'bg-blue-100 text-blue-700';

              return (
                <div key={user.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow relative group">
                   <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                         <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border border-slate-100" />
                         <div>
                            <h4 className="font-bold text-slate-800">{user.name}</h4>
                            <p className="text-xs text-slate-500">@{user.username}</p>
                         </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${roleColor}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                   </div>

                   {(user.role === 'MANAGER' || user.role === 'USER') && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                         <div className="flex items-center text-sm text-slate-600">
                            <Building size={16} className="mr-2 text-slate-400" />
                            {userBranch ? userBranch.name : <span className="text-red-400 italic">Unassigned Branch</span>}
                         </div>
                         {user.role === 'USER' && (
                             <div className="flex items-center text-sm text-slate-600">
                                <UserIcon size={16} className="mr-2 text-slate-400" />
                                {userEmployee ? `Linked: ${userEmployee.name}` : <span className="text-red-400 italic">No Employee Link</span>}
                             </div>
                         )}
                      </div>
                   )}

                   {/* Action Buttons */}
                   <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEdit(user)}
                        className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                        title="Edit User"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                            if (window.confirm(`Delete user ${user.name}?`)) onDeleteUser(user.id);
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Edit User Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800">Edit User Profile</h3>
                <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                   <X size={20} />
                </button>
             </div>
             
             <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Full Name</label>
                    <input 
                      required type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Username</label>
                    <input 
                      required type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                   <label className="text-xs font-semibold text-slate-600 mb-1 block">Password</label>
                   <div className="relative">
                     <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                     <input 
                      required type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                      className="w-full border border-slate-300 rounded pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                   </div>
                   <p className="text-[10px] text-slate-400 mt-1">Visible for demo purposes only.</p>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Role</label>
                  <select 
                    value={editRole} onChange={e => setEditRole(e.target.value as UserRole)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Branch Manager</option>
                    <option value="USER">Normal User (Field Officer)</option>
                  </select>
                </div>

                {(editRole === 'MANAGER' || editRole === 'USER') && (
                  <div>
                     <label className="text-xs font-semibold text-slate-600 mb-1 block">Assign Branch</label>
                     <select 
                      required
                      value={editBranchId} onChange={e => setEditBranchId(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="">Select a branch...</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {editRole === 'USER' && (
                   <div>
                     <label className="text-xs font-semibold text-slate-600 mb-1 block">Link to Employee Profile</label>
                     <select 
                      required
                      value={editEmployeeId} onChange={e => setEditEmployeeId(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      disabled={!editBranchId}
                    >
                      <option value="">{editBranchId ? 'Select an employee...' : 'Select branch first'}</option>
                      {editBranchEmployees.map(e => (
                        <option key={e.id} value={e.id}>{e.name} ({e.id}) - {e.designation}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm">Update User</button>
                </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageUsers;
