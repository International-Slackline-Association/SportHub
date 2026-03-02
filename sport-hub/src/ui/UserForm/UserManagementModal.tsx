'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button, { ButtonVariant } from '@ui/Button';
import Modal from '@ui/Modal';
import UpdateUserForm from '@ui/UserForm/UpdateUserForm';
import { FormikProps } from 'formik';
import { UserFormValues, UserData } from '@ui/UserForm/types';
import { CreateUserForm } from '.';
import { updateUserRoleAndSubTypes } from './actions';
import { useQueryClient } from '@tanstack/react-query';
import type { Role, UserSubType } from 'src/types/rbac';

const ALL_SUB_TYPES: UserSubType[] = ['athlete', 'judge', 'organizer'];

interface UserManagementModalProps {
  action?: 'CREATE' | 'UPDATE' | 'ROLES';
  buttonSize?: "medium" | "small";
  buttonVariant?: ButtonVariant;
  user?: UserData;
  currentUserId?: string;
}

const UserManagementModal = ({
  action,
  buttonSize,
  buttonVariant = "primary",
  user,
  currentUserId,
}: UserManagementModalProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formRef = useRef<FormikProps<UserFormValues>>(null);
  const queryClient = useQueryClient();

  // Role/subtype state (used when action === 'ROLES')
  const [selectedRole, setSelectedRole] = useState<Role>((user?.role as Role) || 'user');
  const [selectedSubTypes, setSelectedSubTypes] = useState<UserSubType[]>((user?.userSubTypes as UserSubType[]) || []);
  const [primarySubType, setPrimarySubType] = useState<UserSubType | undefined>(user?.primarySubType as UserSubType | undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isCurrentUser = user?.id === currentUserId || user?.userId === currentUserId;

  const buttonLabel = action === 'CREATE' ? 'Register' : action === 'ROLES' ? 'Roles' : 'Edit';
  const modalTitle = action === 'CREATE' ? 'Add New User' : action === 'ROLES' ? 'Manage Roles & Types' : 'Edit User';
  const resolvedButtonVariant = action === 'ROLES' ? 'secondary' : buttonVariant;

  const handleSubTypeToggle = (subType: UserSubType) => {
    setSelectedSubTypes(prev => {
      if (prev.includes(subType)) {
        const next = prev.filter(st => st !== subType);
        if (primarySubType === subType) setPrimarySubType(next[0]);
        return next;
      } else {
        const next = [...prev, subType];
        if (!primarySubType) setPrimarySubType(subType);
        return next;
      }
    });
  };

  const handleRoleUpdate = async () => {
    if (!user) return;
    setIsUpdating(true);
    setMessage(null);
    const userId = user.userId || user.id;
    const result = await updateUserRoleAndSubTypes(userId, selectedRole, selectedSubTypes, primarySubType);
    if (result.success) {
      setMessage({ type: 'success', text: result.message || 'Updated successfully' });
      setTimeout(() => {
        setIsModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['users'], refetchType: 'all' });
      }, 1000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update' });
    }
    setIsUpdating(false);
  };

  const openModal = () => {
    if (action === 'ROLES') {
      setSelectedRole((user?.role as Role) || 'user');
      setSelectedSubTypes((user?.userSubTypes as UserSubType[]) || []);
      setPrimarySubType(user?.primarySubType as UserSubType | undefined);
      setMessage(null);
    }
    setIsModalOpen(true);
  };

  const FormComponentProps = {
    formRef,
    onAfterSubmit: () => {
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'], refetchType: 'all' });
    },
    showSubmitButton: false,
  };

  return (
    <>
      <Button onClick={openModal} size={buttonSize} variant={resolvedButtonVariant} type="button">
        {buttonLabel}
      </Button>
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalTitle}
          formRef={action !== 'ROLES' ? formRef : undefined}
          showDefaultActions={action !== 'ROLES'}
        >
          {action === 'CREATE' && <CreateUserForm {...FormComponentProps} />}
          {action === 'UPDATE' && <UpdateUserForm {...FormComponentProps} user={user} />}
          {action === 'ROLES' && (
            <div className="space-y-6">
              {message && (
                <div className={`px-4 py-3 rounded ${
                  message.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="pb-4 border-b">
                <p className="font-medium">{`${user?.name || ''} ${user?.surname || ''}`.trim()}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                {isCurrentUser && (
                  <p className="text-xs text-blue-600 mt-1">
                    This is your account. Role changes require re-login.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role (Authorization)
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('user')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                      selectedRole === 'user'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">User</div>
                    <div className="text-xs text-gray-500">Standard access</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('admin')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                      selectedRole === 'admin'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Admin</div>
                    <div className="text-xs text-gray-500">Full access</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Types (Classification)
                </label>
                <div className="space-y-2">
                  {ALL_SUB_TYPES.map(subType => (
                    <label
                      key={subType}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSubTypes.includes(subType)
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedSubTypes.includes(subType)}
                          onChange={() => handleSubTypeToggle(subType)}
                          className="w-4 h-4 text-green-600 rounded"
                        />
                        <span className="capitalize font-medium">{subType}</span>
                      </div>
                      {selectedSubTypes.includes(subType) && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setPrimarySubType(subType); }}
                          className={`text-xs px-2 py-1 rounded ${
                            primarySubType === subType
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {primarySubType === subType ? 'Primary' : 'Set Primary'}
                        </button>
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Sub-types are for classification only, not authorization.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleRoleUpdate} disabled={isUpdating} className="flex-1">
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </Modal>,
        document.body
      )}
    </>
  );
}

export default UserManagementModal;
