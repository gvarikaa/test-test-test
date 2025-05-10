"use client";

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FacebookHeader from '../../components/layouts/FacebookHeader';
import LeftSidebar from '../../components/layouts/LeftSidebar';
import RightSidebar from '../../components/layouts/RightSidebar';
import MobileNavigation from '../../components/layouts/MobileNavigation';

// Define our own type, instead of importing from Prisma
type GroupPrivacyType = 'PUBLIC' | 'PRIVATE' | 'SECRET';

// Define interface for form data
interface GroupFormData {
  name: string;
  handle: string;
  description: string;
  privacy: GroupPrivacyType;
  rules: string;
  logoImage: string;
  coverImage: string;
  autoApproveMembers: boolean;
  allowMemberPosts: boolean;
  requirePostApproval: boolean;
}

export default function CreateGroupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    handle: '',
    description: '',
    privacy: 'PUBLIC',
    rules: '',
    logoImage: '',
    coverImage: '',
    autoApproveMembers: true,
    allowMemberPosts: true,
    requirePostApproval: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  const handlePrivacyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      privacy: e.target.value as GroupPrivacyType,
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate form
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Group name must be at least 3 characters';
    }
    
    if (!formData.handle.trim()) {
      newErrors.handle = 'Group handle is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.handle)) {
      newErrors.handle = 'Handle can only contain letters, numbers, underscores and hyphens';
    } else if (formData.handle.length < 3) {
      newErrors.handle = 'Handle must be at least 3 characters';
    }
    
    if (formData.logoImage && !formData.logoImage.startsWith('http')) {
      newErrors.logoImage = 'Logo image must be a valid URL';
    }
    
    if (formData.coverImage && !formData.coverImage.startsWith('http')) {
      newErrors.coverImage = 'Cover image must be a valid URL';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }
    
    // Simulate form submission (instead of actual API call)
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      
      // Navigate to the new group page after a short delay
      setTimeout(() => {
        router.push(`/groups/${formData.handle}`);
      }, 1000);
    }, 1500);
  };

  const handleCancel = () => {
    router.push('/groups');
  };

  // Generate handle from name automatically
  const generateHandle = () => {
    if (formData.name && !formData.handle) {
      const handle = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      setFormData({
        ...formData,
        handle,
      });
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <FacebookHeader />

      {/* Main content */}
      <div className="flex justify-center px-0 lg:px-4">
        {/* Left sidebar - navigation */}
        <LeftSidebar />

        {/* Main column - create group form */}
        <main className="w-full max-w-[680px] px-0 py-4 sm:px-4">
          <div className="rounded-lg bg-card-bg p-4 shadow-sm">
            <h1 className="mb-6 text-2xl font-bold text-text-primary">Create New Group</h1>
            
            {errors.form && (
              <div className="mb-4 rounded-lg bg-red-900/20 p-3 text-red-500">
                {errors.form}
              </div>
            )}
            
            {submitted ? (
              <div className="rounded-lg bg-green-900/20 p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <h2 className="mt-3 text-xl font-bold text-text-primary">Group Created Successfully!</h2>
                <p className="mt-2 text-text-secondary">
                  Your group "{formData.name}" has been created. Redirecting you to the group page...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Group Info Section */}
                <div className="mb-6">
                  <h2 className="mb-4 border-b border-border-color pb-2 text-lg font-semibold text-text-primary">
                    Group Information
                  </h2>
                  
                  <div className="mb-4">
                    <label htmlFor="name" className="mb-1 block text-sm font-medium text-text-primary">
                      Group Name*
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={generateHandle}
                      className={`w-full rounded-lg bg-input-bg p-2.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                        errors.name ? 'border border-red-500' : ''
                      }`}
                      placeholder="Enter group name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="handle" className="mb-1 block text-sm font-medium text-text-primary">
                      Group Handle* (Used in URL, e.g., /groups/your-handle)
                    </label>
                    <input
                      type="text"
                      id="handle"
                      name="handle"
                      value={formData.handle}
                      onChange={handleChange}
                      className={`w-full rounded-lg bg-input-bg p-2.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                        errors.handle ? 'border border-red-500' : ''
                      }`}
                      placeholder="Enter group handle (letters, numbers, underscores, hyphens)"
                    />
                    {errors.handle && <p className="mt-1 text-sm text-red-500">{errors.handle}</p>}
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="description" className="mb-1 block text-sm font-medium text-text-primary">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className="w-full rounded-lg bg-input-bg p-2.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Describe what your group is about"
                    ></textarea>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="rules" className="mb-1 block text-sm font-medium text-text-primary">
                      Group Rules
                    </label>
                    <textarea
                      id="rules"
                      name="rules"
                      value={formData.rules}
                      onChange={handleChange}
                      rows={4}
                      className="w-full rounded-lg bg-input-bg p-2.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Specify rules for your group (optional)"
                    ></textarea>
                  </div>
                </div>
                
                {/* Privacy Settings */}
                <div className="mb-6">
                  <h2 className="mb-4 border-b border-border-color pb-2 text-lg font-semibold text-text-primary">
                    Privacy Settings
                  </h2>
                  
                  <div className="mb-4 space-y-3">
                    <div className="flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          id="privacy-public"
                          type="radio"
                          name="privacy"
                          value="PUBLIC"
                          checked={formData.privacy === 'PUBLIC'}
                          onChange={handlePrivacyChange}
                          className="h-4 w-4 border-gray-600 bg-input-bg text-primary focus:ring-0 focus:ring-offset-0"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="privacy-public" className="font-medium text-text-primary">
                          Public
                        </label>
                        <p className="text-text-secondary">
                          Anyone can see the group, its members, and their posts. Anyone can join.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          id="privacy-private"
                          type="radio"
                          name="privacy"
                          value="PRIVATE"
                          checked={formData.privacy === 'PRIVATE'}
                          onChange={handlePrivacyChange}
                          className="h-4 w-4 border-gray-600 bg-input-bg text-primary focus:ring-0 focus:ring-offset-0"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="privacy-private" className="font-medium text-text-primary">
                          Private
                        </label>
                        <p className="text-text-secondary">
                          Anyone can find the group and see who's in it. Only members can see posts. Requires approval to join.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          id="privacy-secret"
                          type="radio"
                          name="privacy"
                          value="SECRET"
                          checked={formData.privacy === 'SECRET'}
                          onChange={handlePrivacyChange}
                          className="h-4 w-4 border-gray-600 bg-input-bg text-primary focus:ring-0 focus:ring-offset-0"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="privacy-secret" className="font-medium text-text-primary">
                          Secret
                        </label>
                        <p className="text-text-secondary">
                          Only members can find the group and see posts. People must be invited to join.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {formData.privacy === 'PRIVATE' && (
                    <div className="mb-4 flex items-center">
                      <input
                        id="autoApproveMembers"
                        name="autoApproveMembers"
                        type="checkbox"
                        checked={formData.autoApproveMembers}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-600 bg-input-bg text-primary focus:ring-0 focus:ring-offset-0"
                      />
                      <label htmlFor="autoApproveMembers" className="ml-2 text-sm text-text-primary">
                        Automatically approve new members (without admin approval)
                      </label>
                    </div>
                  )}
                </div>
                
                {/* Content Settings */}
                <div className="mb-6">
                  <h2 className="mb-4 border-b border-border-color pb-2 text-lg font-semibold text-text-primary">
                    Content Settings
                  </h2>
                  
                  <div className="mb-4 flex items-center">
                    <input
                      id="allowMemberPosts"
                      name="allowMemberPosts"
                      type="checkbox"
                      checked={formData.allowMemberPosts}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-gray-600 bg-input-bg text-primary focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="allowMemberPosts" className="ml-2 text-sm text-text-primary">
                      Allow members to create posts
                    </label>
                  </div>
                  
                  {formData.allowMemberPosts && (
                    <div className="mb-4 flex items-center">
                      <input
                        id="requirePostApproval"
                        name="requirePostApproval"
                        type="checkbox"
                        checked={formData.requirePostApproval}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-600 bg-input-bg text-primary focus:ring-0 focus:ring-offset-0"
                      />
                      <label htmlFor="requirePostApproval" className="ml-2 text-sm text-text-primary">
                        Require admin approval for member posts
                      </label>
                    </div>
                  )}
                </div>
                
                {/* Group Images */}
                <div className="mb-6">
                  <h2 className="mb-4 border-b border-border-color pb-2 text-lg font-semibold text-text-primary">
                    Group Images (Optional)
                  </h2>
                  
                  <div className="mb-4">
                    <label htmlFor="logoImage" className="mb-1 block text-sm font-medium text-text-primary">
                      Logo Image URL
                    </label>
                    <input
                      type="text"
                      id="logoImage"
                      name="logoImage"
                      value={formData.logoImage}
                      onChange={handleChange}
                      className={`w-full rounded-lg bg-input-bg p-2.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                        errors.logoImage ? 'border border-red-500' : ''
                      }`}
                      placeholder="Enter URL for group logo"
                    />
                    {errors.logoImage && <p className="mt-1 text-sm text-red-500">{errors.logoImage}</p>}
                    <p className="mt-1 text-xs text-text-tertiary">
                      Recommended: Square image (1:1 ratio)
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="coverImage" className="mb-1 block text-sm font-medium text-text-primary">
                      Cover Image URL
                    </label>
                    <input
                      type="text"
                      id="coverImage"
                      name="coverImage"
                      value={formData.coverImage}
                      onChange={handleChange}
                      className={`w-full rounded-lg bg-input-bg p-2.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                        errors.coverImage ? 'border border-red-500' : ''
                      }`}
                      placeholder="Enter URL for cover image"
                    />
                    {errors.coverImage && <p className="mt-1 text-sm text-red-500">{errors.coverImage}</p>}
                    <p className="mt-1 text-xs text-text-tertiary">
                      Recommended: Banner image (820x312 pixels)
                    </p>
                  </div>
                </div>
                
                {/* Form Actions */}
                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90 disabled:bg-primary/70"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      'Create Group'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-lg bg-card-secondary-bg px-4 py-2 font-medium text-text-primary hover:bg-hover-bg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>

        {/* Right sidebar - chat and contacts */}
        <RightSidebar />
      </div>

      {/* Mobile navigation */}
      <MobileNavigation />
    </div>
  );
}