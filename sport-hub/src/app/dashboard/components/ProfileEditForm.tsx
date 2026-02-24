'use client';

import { useState, useRef, useEffect } from 'react';
import { updateProfile } from '../actions';
import { COUNTRIES, getCountryByName } from '@utils/countries';
import { CircleFlag } from 'react-circle-flags';

interface CountryDropdownProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

function CountryDropdown({ value, onChange, disabled }: CountryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCountry = COUNTRIES.find(c => c.code === value);
  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          {selectedCountry ? (
            <>
              <CircleFlag countryCode={selectedCountry.code} height={22} width={22} />
              <span className="text-sm">{selectedCountry.name}</span>
            </>
          ) : (
            <span className="text-sm text-gray-500">Select a country</span>
          )}
        </div>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100"
            >
              Clear selection
            </button>
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => {
                  onChange(country.code);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                  country.code === value ? 'bg-blue-50' : ''
                }`}
              >
                <CircleFlag countryCode={country.code} height={22} width={22} />
                <span>{country.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SocialMediaData {
  instagram?: string;
  youtube?: string;
  facebook?: string;
  whatsapp?: string;
  twitch?: string;
  tiktok?: string;
}

interface ProfileEditFormProps {
  userId: string;
  initialData: {
    name: string;
    surname?: string;
    email: string;
    country?: string;
    city?: string;
    birthdate?: string;
    gender?: string;
    socialMedia?: SocialMediaData;
  };
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ProfileEditForm({
  userId,
  initialData,
  onCancel,
  onSuccess,
}: ProfileEditFormProps) {
  // Find country code from name if provided
  const initialCountry = initialData.country
    ? getCountryByName(initialData.country)
    : undefined;

  const [formData, setFormData] = useState({
    name: initialData.name || '',
    surname: initialData.surname || '',
    email: initialData.email || '',
    countryCode: initialCountry?.code || '',
    city: initialData.city || '',
    birthdate: initialData.birthdate || '',
    gender: initialData.gender || '',
    socialMedia: {
      instagram: initialData.socialMedia?.instagram || '',
      youtube: initialData.socialMedia?.youtube || '',
      facebook: initialData.socialMedia?.facebook || '',
      tiktok: initialData.socialMedia?.tiktok || '',
      twitch: initialData.socialMedia?.twitch || '',
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Convert country code to country name for storage
      const selectedCountry = COUNTRIES.find(c => c.code === formData.countryCode);

      const result = await updateProfile(userId, {
        name: formData.name.trim(),
        surname: formData.surname.trim() || undefined,
        email: formData.email.trim(),
        country: selectedCountry?.name || undefined,
        city: formData.city.trim() || undefined,
        birthdate: formData.birthdate || undefined,
        gender: formData.gender || undefined,
        socialMedia: {
          instagram: formData.socialMedia.instagram.trim() || undefined,
          youtube: formData.socialMedia.youtube.trim() || undefined,
          facebook: formData.socialMedia.facebook.trim() || undefined,
          tiktok: formData.socialMedia.tiktok.trim() || undefined,
          twitch: formData.socialMedia.twitch.trim() || undefined,
        },
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-1">
          Surname
        </label>
        <input
          type="text"
          id="surname"
          value={formData.surname}
          onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-gray-500">
          Note: Changing email may require re-authentication
        </p>
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
          Country
        </label>
        <CountryDropdown
          value={formData.countryCode}
          onChange={(code) => setFormData({ ...formData, countryCode: code })}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
          City
        </label>
        <input
          type="text"
          id="city"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700 mb-1">
          Birthdate
        </label>
        <input
          type="date"
          id="birthdate"
          value={formData.birthdate}
          onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
          Gender
        </label>
        <select
          id="gender"
          value={formData.gender}
          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      <fieldset className="border border-gray-200 rounded-md p-4 space-y-4">
        <legend className="text-sm font-medium text-gray-700 px-1">Social Media</legend>

        <div>
          <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">
            Instagram
          </label>
          <input
            type="text"
            id="instagram"
            placeholder="https://instagram.com/username"
            value={formData.socialMedia.instagram}
            onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, instagram: e.target.value } })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="youtube" className="block text-sm font-medium text-gray-700 mb-1">
            YouTube
          </label>
          <input
            type="text"
            id="youtube"
            placeholder="https://youtube.com/@channel"
            value={formData.socialMedia.youtube}
            onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, youtube: e.target.value } })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-1">
            Facebook
          </label>
          <input
            type="text"
            id="facebook"
            placeholder="https://facebook.com/profile"
            value={formData.socialMedia.facebook}
            onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, facebook: e.target.value } })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="tiktok" className="block text-sm font-medium text-gray-700 mb-1">
            TikTok
          </label>
          <input
            type="text"
            id="tiktok"
            placeholder="https://tiktok.com/@username"
            value={formData.socialMedia.tiktok}
            onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, tiktok: e.target.value } })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="twitch" className="block text-sm font-medium text-gray-700 mb-1">
            Twitch
          </label>
          <input
            type="text"
            id="twitch"
            placeholder="https://twitch.tv/username"
            value={formData.socialMedia.twitch}
            onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, twitch: e.target.value } })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>
      </fieldset>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
