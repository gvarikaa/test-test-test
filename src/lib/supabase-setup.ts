import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a Supabase client with the service role key for admin operations
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

// This is a setup script that will run once to create necessary buckets
export async function setupSupabaseStorage() {
  try {
    // Create buckets for different media types
    const buckets = ['images', 'videos', 'audio', 'documents', 'avatars', 'covers'];
    
    for (const bucket of buckets) {
      // Check if bucket exists
      const { data: existingBuckets } = await adminClient.storage.listBuckets();
      const bucketExists = existingBuckets?.some(b => b.name === bucket);
      
      if (!bucketExists) {
        console.log(`Creating bucket: ${bucket}`);
        
        // Create the bucket
        const { error } = await adminClient.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });
        
        if (error) {
          console.error(`Error creating bucket ${bucket}:`, error);
        } else {
          console.log(`Bucket ${bucket} created successfully`);
          
          // Set public access for the bucket
          const { error: policyError } = await adminClient.storage.from(bucket).createSignedUrl(
            'dummy.txt',
            60
          );
          
          if (policyError && policyError.message !== 'The resource was not found') {
            console.error(`Error setting policy for bucket ${bucket}:`, policyError);
          }
        }
      } else {
        console.log(`Bucket ${bucket} already exists`);
      }
    }
    
    console.log('Supabase storage setup completed');
  } catch (error) {
    console.error('Error setting up Supabase storage:', error);
  }
}

// Run this function if you need to set up storage buckets
// setupSupabaseStorage();