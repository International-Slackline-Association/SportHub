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
import { useSession } from 'next-auth/react';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, isGeneralAdmin, rolesOf, type Role, type UserSubType } from 'src/types/rbac';

const ALL_SUB_TYPES: UserSubType[] = ['athlete', 'judge', 'organizer'];

interface UserManagementModalProps {
  action?: 'CREATE' | 'UPDATE' | 'ROLES';
  buttonSize?: "medium" | "small";
  buttonVariant?: ButtonVariant;
  user?: UserData;
  currentUserId?: string;
  /** UPDATE only: adds a Delete button to the dialog */
  onDelete?: () => Promise<void>;
  /** UPDATE and ROLES: called with the saved fields, so the list row updates without a page reload */
  onSaved?: (changes: Partial<UserData>) => void;
}

const UserManagementModal = ({
  action,
  buttonSize,
  buttonVariant = "primary",
  user,
  currentUserId,
  onDelete,
  onSaved,
}: UserManagementModalProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formRef = useRef<FormikProps<UserFormValues>>(null);
  const queryClient = useQueryClient();

  // Role/subtype state (used when action === 'ROLES')
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(rolesOf(user));
  const [selectedSubTypes, setSelectedSubTypes] = useState<UserSubType[]>((user?.userSubTypes as UserSubType[]) || []);
  const [primarySubType, setPrimarySubType] = useState<UserSubType | undefined>(user?.primarySubType as UserSubType | undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isCurrentUser = user?.id === currentUserId || user?.userId === currentUserId;
  // Only General admins grant or remove General Admin (dev has no sign-in); User Managers set the other roles
  const { data: session } = useSession();
  const canChangeGeneralAdmin = isGeneralAdmin(session?.user?.roles) || process.env.NODE_ENV === 'development';

  const isGeneralAdminTicked = isGeneralAdmin(selectedRoles);

  const handleRoleToggle = (role: Role) => {
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : ROLES.filter(r => r === role || prev.includes(r)));
  };

  const buttonLabel = action === 'CREATE' ? 'Register' : action === 'ROLES' ? 'Set Roles' : 'Edit Details';
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
    const result = await updateUserRoleAndSubTypes(userId, selectedRoles, selectedSubTypes, primarySubType);
    if (result.success) {
      onSaved?.({ roles: result.roles ?? selectedRoles, userSubTypes: selectedSubTypes, primarySubType });
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
      setSelectedRoles(rolesOf(user));
      setSelectedSubTypes((user?.userSubTypes as UserSubType[]) || []);
      setPrimarySubType(user?.primarySubType as UserSubType | undefined);
      setMessage(null);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      setIsModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasDeleteAction = action === 'UPDATE' && !!onDelete;
  const editActions = hasDeleteAction ? (
    <>
      <Button variant="destructive" className="mr-auto" onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? 'Deleting...' : 'Delete'}
      </Button>
      <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={() => formRef.current?.submitForm()}>
        Save
      </Button>
    </>
  ) : undefined;

  const FormComponentProps = {
    formRef,
    onAfterSubmit: (values?: UserFormValues) => {
      if (values && action === 'UPDATE') {
        const { name, surname, email, gender, country, city, birthdate } = values;
        onSaved?.({ name, surname, email, gender, country, city, birthdate });
      }
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
          actions={editActions}
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
                  Admin roles (Authorization)
                </label>
                <p className="text-xs text-gray-500 mb-2">None ticked = normal user. Several roles combine their access. General Admin includes all other roles.</p>
                <div className="space-y-2">
                  {ROLES.map(role => {
                    // While General Admin is ticked the other roles show as ticked and locked; selectedRoles keeps
                    // their own ticks, so unticking General Admin brings back what was there before
                    const isIncludedByGeneralAdmin = role !== 'admin' && isGeneralAdminTicked;
                    const isGeneralAdminLocked = role === 'admin' && !canChangeGeneralAdmin;
                    const isChecked = isIncludedByGeneralAdmin || selectedRoles.includes(role);
                    const isLocked = isIncludedByGeneralAdmin || isGeneralAdminLocked;
                    return (
                      <label
                        key={role}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isChecked ? 'border-purple-300 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                        } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isLocked}
                          onChange={() => handleRoleToggle(role)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <div>
                          <div className="font-medium">{ROLE_LABELS[role]}</div>
                          <div className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[role]}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {!canChangeGeneralAdmin && (
                  <p className="text-xs text-gray-500 mt-1">Only a General Admin can grant or remove General Admin.</p>
                )}
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
