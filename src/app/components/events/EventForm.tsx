"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { useUpload } from '@/hooks/use-upload';
import Image from 'next/image';

type EventFormProps = {
  existingEvent?: any;
  isEditing?: boolean;
};

export default function EventForm({ existingEvent, isEditing = false }: EventFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    existingEvent?.coverImage || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form data state
  const [formData, setFormData] = useState({
    title: existingEvent?.title || '',
    description: existingEvent?.description || '',
    location: existingEvent?.location || '',
    isOnline: existingEvent?.isOnline || false,
    onlineUrl: existingEvent?.onlineUrl || '',
    startsAt: existingEvent?.startsAt
      ? new Date(existingEvent.startsAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    endsAt: existingEvent?.endsAt
      ? new Date(existingEvent.endsAt).toISOString().slice(0, 16)
      : '',
    maxParticipants: existingEvent?.maxParticipants || '',
    isPrivate: existingEvent?.isPrivate || false,
    isRecurring: existingEvent?.isRecurring || false,
    recurrencePattern: existingEvent?.recurrencePattern || '',
    recurrenceEndDate: existingEvent?.recurrenceEndDate
      ? new Date(existingEvent.recurrenceEndDate).toISOString().slice(0, 10)
      : '',
    categoryId: existingEvent?.categoryId || '',
    tags: existingEvent?.eventTags?.map((tag: any) => tag.tag.name).join(', ') || '',
  });
  
  // Hooks
  const utils = trpc.useUtils();
  const upload = useUpload();
  const { data: categories } = trpc.event.getCategories.useQuery();
  
  const createEventMutation = trpc.event.create.useMutation({
    onSuccess: () => {
      router.push('/events');
      utils.event.getAll.invalidate();
    },
  });
  
  const updateEventMutation = trpc.event.update.useMutation({
    onSuccess: () => {
      router.push(`/events/${existingEvent.id}`);
      utils.event.getById.invalidate({ id: existingEvent.id });
    },
  });
  
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checkbox.checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Create a preview
    const previewUrl = URL.createObjectURL(file);
    setCoverImagePreview(previewUrl);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Validate required fields
      if (!formData.title || !formData.startsAt) {
        setError('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }
      
      // Prepare data for submission
      const eventData: any = {
        title: formData.title,
        description: formData.description,
        isOnline: formData.isOnline,
        startsAt: new Date(formData.startsAt),
        isPrivate: formData.isPrivate,
        categoryId: formData.categoryId || undefined,
      };
      
      // Add optional fields if they exist
      if (formData.location) eventData.location = formData.location;
      if (formData.isOnline && formData.onlineUrl) eventData.onlineUrl = formData.onlineUrl;
      if (formData.endsAt) eventData.endsAt = new Date(formData.endsAt);
      if (formData.maxParticipants) eventData.maxParticipants = parseInt(formData.maxParticipants);
      
      // Add recurrence fields if event is recurring
      if (formData.isRecurring) {
        eventData.isRecurring = true;
        if (formData.recurrencePattern) eventData.recurrencePattern = formData.recurrencePattern;
        if (formData.recurrenceEndDate) eventData.recurrenceEndDate = new Date(formData.recurrenceEndDate);
      }
      
      // Handle tags
      if (formData.tags) {
        eventData.tags = formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }
      
      // Upload cover image if a new one was selected
      if (fileInputRef.current?.files?.length) {
        const file = fileInputRef.current.files[0];
        const uploadResult = await upload.uploadMedia(file);
        
        if (uploadResult?.url) {
          eventData.coverImage = uploadResult.url;
        }
      } else if (existingEvent?.coverImage) {
        eventData.coverImage = existingEvent.coverImage;
      }
      
      // Create or update event
      if (isEditing && existingEvent) {
        await updateEventMutation.mutateAsync({
          id: existingEvent.id,
          ...eventData,
        });
      } else {
        await createEventMutation.mutateAsync(eventData);
      }
      
    } catch (err) {
      console.error('Error submitting event:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const nextStep = () => {
    if (step === 1) {
      // Validate first step
      if (!formData.title || !formData.startsAt) {
        setError('Please fill in all required fields');
        return;
      }
      setError(null);
    }
    
    setStep(step + 1);
  };
  
  const prevStep = () => {
    setStep(step - 1);
    setError(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        {isEditing ? 'Edit Event' : 'Create New Event'}
      </h2>
      
      {/* Progress steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div
            className={`flex-1 h-1 ${
              step >= 1 ? 'bg-accent-blue' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          ></div>
          <div
            className={`flex-1 h-1 ${
              step >= 2 ? 'bg-accent-blue' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          ></div>
          <div
            className={`flex-1 h-1 ${
              step >= 3 ? 'bg-accent-blue' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          ></div>
        </div>
        <div className="flex justify-between mt-2">
          <div className={step === 1 ? 'text-accent-blue font-medium' : 'text-gray-500'}>
            Basic Info
          </div>
          <div className={step === 2 ? 'text-accent-blue font-medium' : 'text-gray-500'}>
            Details & Settings
          </div>
          <div className={step === 3 ? 'text-accent-blue font-medium' : 'text-gray-500'}>
            Media & Preview
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Event Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Give your event a name"
                className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What's your event about?"
                rows={4}
                className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="startsAt" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="startsAt"
                  name="startsAt"
                  value={formData.startsAt}
                  onChange={handleChange}
                  className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div className="flex-1">
                <label htmlFor="endsAt" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="endsAt"
                  name="endsAt"
                  value={formData.endsAt}
                  onChange={handleChange}
                  className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isOnline"
                name="isOnline"
                checked={formData.isOnline}
                onChange={handleChange}
                className="w-4 h-4 text-accent-blue focus:ring-accent-blue border-gray-300 rounded"
              />
              <label htmlFor="isOnline" className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                This is an online event
              </label>
            </div>
            
            {formData.isOnline ? (
              <div>
                <label htmlFor="onlineUrl" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Online Event URL
                </label>
                <input
                  type="url"
                  id="onlineUrl"
                  name="onlineUrl"
                  value={formData.onlineUrl}
                  onChange={handleChange}
                  placeholder="e.g., https://zoom.us/j/123456789"
                  className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="location" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Where will the event take place?"
                  className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-accent-blue text-white font-medium rounded-md hover:bg-blue-600 transition-colors"
              >
                Next Step
              </button>
            </div>
          </div>
        )}
        
        {/* Step 2: Details & Settings */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="categoryId" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select a category</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="tags" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Tags (comma separated)
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="e.g., music, conference, networking"
                className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="maxParticipants" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Maximum Participants (leave empty for unlimited)
              </label>
              <input
                type="number"
                id="maxParticipants"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                min="1"
                placeholder="e.g., 50"
                className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPrivate"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleChange}
                className="w-4 h-4 text-accent-blue focus:ring-accent-blue border-gray-300 rounded"
              />
              <label htmlFor="isPrivate" className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                Make this event private (only invited people can see it)
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isRecurring"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleChange}
                className="w-4 h-4 text-accent-blue focus:ring-accent-blue border-gray-300 rounded"
              />
              <label htmlFor="isRecurring" className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                This is a recurring event
              </label>
            </div>
            
            {formData.isRecurring && (
              <div className="pl-6 space-y-4 border-l-2 border-accent-blue ml-2">
                <div>
                  <label htmlFor="recurrencePattern" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Recurrence Pattern
                  </label>
                  <select
                    id="recurrencePattern"
                    name="recurrencePattern"
                    value={formData.recurrencePattern}
                    onChange={handleChange}
                    className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select a pattern</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Bi-Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="recurrenceEndDate" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Recurrence End Date
                  </label>
                  <input
                    type="date"
                    id="recurrenceEndDate"
                    name="recurrenceEndDate"
                    value={formData.recurrenceEndDate}
                    onChange={handleChange}
                    className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-accent-blue text-white font-medium rounded-md hover:bg-blue-600 transition-colors"
              >
                Next Step
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Media & Preview */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Cover Image
              </label>
              
              <div className="mt-1 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 dark:border-gray-600">
                {coverImagePreview ? (
                  <div className="relative w-full h-48">
                    <Image
                      src={coverImagePreview}
                      alt="Cover preview"
                      fill
                      className="object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mx-auto h-12 w-12 text-gray-400">
                      <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                    </svg>
                    <div className="mt-4 flex text-sm">
                      <label
                        htmlFor="coverImage"
                        className="relative cursor-pointer rounded-md font-medium text-accent-blue hover:text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-accent-blue"
                      >
                        <span>Upload an image</span>
                        <input
                          id="coverImage"
                          name="coverImage"
                          type="file"
                          ref={fileInputRef}
                          className="sr-only"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1 text-gray-500">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Event Preview */}
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                Event Preview
              </h3>
              
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-4 shadow-sm">
                {/* Preview header */}
                <div className="relative h-40 w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg mb-4">
                  {coverImagePreview ? (
                    <Image
                      src={coverImagePreview}
                      alt="Cover preview"
                      fill
                      className="object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-r from-accent-blue to-accent-purple rounded-t-lg">
                      <span className="text-white text-2xl font-bold">
                        {formData.title ? formData.title.charAt(0) : '?'}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Preview content */}
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                    {formData.title || 'Your Event Title'}
                  </h4>
                  
                  <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
                    </svg>
                    {formData.startsAt ? (
                      <span>
                        {new Date(formData.startsAt).toLocaleDateString()} at{' '}
                        {new Date(formData.startsAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    ) : (
                      'Date and time not set'
                    )}
                  </div>
                  
                  <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    {formData.isOnline ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                          <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                          <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                        </svg>
                        <span>Online Event</span>
                      </>
                    ) : formData.location ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                        <span>{formData.location}</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                        <span>No location set</span>
                      </>
                    )}
                  </div>
                  
                  {/* Description preview */}
                  {formData.description && (
                    <div className="mt-4 text-gray-700 dark:text-gray-300 text-sm">
                      {formData.description}
                    </div>
                  )}
                  
                  {/* Tags preview */}
                  {formData.tags && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {formData.tags.split(',').map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-accent-blue/10 text-accent-blue rounded-full text-xs"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Privacy badge */}
                  {formData.isPrivate && (
                    <div className="mt-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                      </svg>
                      Private Event
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                Previous
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-accent-blue text-white font-medium rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? 'Saving...'
                  : isEditing
                  ? 'Update Event'
                  : 'Create Event'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}