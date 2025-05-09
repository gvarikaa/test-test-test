import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get data from a bucket
export const getDataFromBucket = async (bucketName: string, path: string) => {
  try {
    const { data, error } = await supabase.storage.from(bucketName).download(path);

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from bucket');
    }

    return data;
  } catch (err) {
    console.error('Error fetching data from bucket:', err);
    throw err;
  }
};

// Helper function to upload data to a bucket
export const uploadToBucket = async (
  bucketName: string,
  path: string,
  file: File,
  options?: { contentType?: string; cacheControl?: string }
) => {
  try {
    const { data, error } = await supabase.storage.from(bucketName).upload(path, file, {
      contentType: options?.contentType,
      cacheControl: options?.cacheControl || '3600',
      upsert: false,
    });
    
    if (error) {
      throw error;
    }
    
    // Return the URL
    const { data: urlData } = await supabase.storage.from(bucketName).getPublicUrl(path);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading to bucket:', error);
    throw error;
  }
};

// Helper function to delete data from a bucket
export const deleteFromBucket = async (bucketName: string, paths: string[]) => {
  try {
    const { data, error } = await supabase.storage.from(bucketName).remove(paths);
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error deleting from bucket:', error);
    throw error;
  }
};

// Helper function to create a signed URL
export const createSignedUrl = async (
  bucketName: string,
  path: string,
  expiresIn = 60 // Default to 60 seconds
) => {
  try {
    const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(path, expiresIn);
    
    if (error) {
      throw error;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }
};