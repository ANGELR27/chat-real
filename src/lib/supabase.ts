
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwfdjdhovhnhuptjeuxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZmRqZGhvdmhuaHVwdGpldXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3NjgyMjQsImV4cCI6MjA1NTM0NDIyNH0.OyXo37U-ieAyFAZ1jT6yjoFhjxyh48JhRMt6Ib7bnxQ';

export const supabase = createClient(supabaseUrl, supabaseKey);
