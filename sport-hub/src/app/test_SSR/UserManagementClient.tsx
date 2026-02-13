'use client';

import { useState, useRef } from 'react';
import { FormikHelpers, type FormikProps } from 'formik';
import { updateUser, updateUserRoleAndSubTypes } from './actions';
import Button from '@ui/Button';
import Modal from '@ui/Modal';
import UserForm from './UserForm';
import type { Role, UserSubType } from 'src/types/rbac';

interface User {
  createdAt: string;
  id: string;
  name: string;
  email: string;
  country?: string;
  totalPoints?: number;
  contestsParticipated?: number;
  role?: Role;
  userSubTypes?: UserSubType[];
  primarySubType?: UserSubType;
}

interface UserManagementClientProps {
  readonly user: User;
  readonly currentUserId?: string;
}

interface FormValues {
  id: string;
  name: string;
  surname: string;
  gender: string;
  email: string;
  country?: string;
  isaId?: string;
}

const ALL_SUB_TYPES: UserSubType[] = ['athlete', 'judge', 'organizer'];

export default function UserManagementClient({ user, currentUserId }: UserManagementClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const formRef = useRef<FormikProps<FormValues>>(null);

  // Role/SubType state
  const [selectedRole, setSelectedRole] = useState<Role>(user.role || 'user');
  const [selectedSubTypes, setSelectedSubTypes] = useState<UserSubType[]>(user.userSubTypes || []);
  const [primarySubType, setPrimarySubType] = useState<UserSubType | undefined>(user.primarySubType);

  const isCurrentUser = user.id === currentUserId;

  // Initial form values
  const initialValues = {
    id: user.id,
    name: user.name,
    surname: '',
    gender: 'male',
    email: user.email,
    country: user.country || '',
    isaId: '',
  };

  const handleFormSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    try {
      const formData = new FormData();
      formData.append('id', user.id);
      formData.append('name', values.name);
      formData.append('email', values.email);
      if (values.country) {
        formData.append('country', values.country);
      }

      await updateUser(formData);

      setIsModalOpen(false);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
        setIsModalOpen(false);
        return;
      }
      console.error('Failed to update user:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubTypeToggle = (subType: UserSubType) => {
    setSelectedSubTypes(prev => {
      if (prev.includes(subType)) {
        // Remove subtype
        const newSubTypes = prev.filter(st => st !== subType);
        // If removing primary, clear it or set to first remaining
        if (primarySubType === subType) {
          setPrimarySubType(newSubTypes[0]);
        }
        return newSubTypes;
      } else {
        // Add subtype
        const newSubTypes = [...prev, subType];
        // If no primary set, make this one primary
        if (!primarySubType) {
          setPrimarySubType(subType);
        }
        return newSubTypes;
      }
    });
  };

  const handleRoleUpdate = async () => {
    setIsUpdating(true);
    setMessage(null);

    try {
      const result = await updateUserRoleAndSubTypes(
        user.id,
        selectedRole,
        selectedSubTypes,
        primarySubType
      );

      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Updated successfully' });
        setTimeout(() => {
          setIsRoleModalOpen(false);
          window.location.reload();
        }, 1000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
        >
          Edit
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setSelectedRole(user.role || 'user');
            setSelectedSubTypes(user.userSubTypes || []);
            setPrimarySubType(user.primarySubType);
            setMessage(null);
            setIsRoleModalOpen(true);
          }}
        >
          Roles
        </Button>
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit User"
        formRef={formRef}
        showDefaultActions={true}
      >
        <UserForm
          initialValues={initialValues}
          onSubmit={handleFormSubmit}
          showSubmitButton={false}
          formRef={formRef}
          isEditMode={true}
        />
      </Modal>

      {/* Role Management Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Manage Roles & Types"
        showDefaultActions={false}
      >
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

          {/* User Info */}
          <div className="pb-4 border-b">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            {isCurrentUser && (
              <p className="text-xs text-blue-600 mt-1">
                This is your account. Role changes require re-login.
              </p>
            )}
          </div>

          {/* Role Selection */}
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

          {/* Sub-Types Selection */}
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
                      onClick={(e) => {
                        e.preventDefault();
                        setPrimarySubType(subType);
                      }}
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

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => setIsRoleModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRoleUpdate}
              disabled={isUpdating}
              className="flex-1"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
