-- Schema setup for Timetable Notifier

-- 1. Create Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create Timetable table
CREATE TABLE IF NOT EXISTS timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL, -- Monday, Tuesday, etc.
    subject TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    teacher TEXT,
    room TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create Push Subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for Classrooms
-- Public can read classrooms
CREATE POLICY "Allow public read of classrooms" 
ON classrooms FOR SELECT 
TO public 
USING (true);

-- Authenticated (Admin) can insert/update/delete classrooms
CREATE POLICY "Allow admin to manage classrooms" 
ON classrooms FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Policies for Timetable
-- Public can read timetable
CREATE POLICY "Allow public read of timetable" 
ON timetable FOR SELECT 
TO public 
USING (true);

-- Authenticated (Admin) can insert/update/delete timetable
CREATE POLICY "Allow admin to manage timetable" 
ON timetable FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Policies for Push Subscriptions
-- Public can insert subscriptions (to subscribe to notifications)
CREATE POLICY "Allow public insert of subscriptions" 
ON push_subscriptions FOR INSERT 
TO public 
WITH CHECK (true);

-- Only Authenticated (Admin) or service role can read/delete subscriptions
CREATE POLICY "Allow admin to view subscriptions" 
ON push_subscriptions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow admin to delete subscriptions" 
ON push_subscriptions FOR DELETE 
TO authenticated 
USING (true);

-- 4. Create Telegram Subscriptions table
CREATE TABLE IF NOT EXISTS telegram_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    chat_id BIGINT NOT NULL,
    telegram_username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(classroom_id, chat_id)
);

ALTER TABLE telegram_subscriptions ENABLE ROW LEVEL SECURITY;

-- Public can insert subscriptions
CREATE POLICY "Allow public insert of telegram subscriptions" 
ON telegram_subscriptions FOR INSERT 
TO public
WITH CHECK (true);

-- Only Admin can view
CREATE POLICY "Allow admin to view telegram subscriptions" 
ON telegram_subscriptions FOR SELECT 
TO authenticated 
USING (true);

-- Only Admin can delete
CREATE POLICY "Allow admin to delete telegram subscriptions" 
ON telegram_subscriptions FOR DELETE 
TO authenticated 
USING (true);

-- 5. Create Requests table
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    classroom TEXT NOT NULL,
    contact_number TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending', -- pending, completed, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Public can insert requests
CREATE POLICY "Allow public insert of requests"
ON requests FOR INSERT
TO public
WITH CHECK (true);

-- Authenticated (Admin) can manage requests (view/update/delete)
CREATE POLICY "Allow admin to manage requests"
ON requests FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Create Pre-Admins table
CREATE TABLE IF NOT EXISTS pre_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number TEXT UNIQUE,
    email TEXT UNIQUE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT check_username_exists CHECK (roll_number IS NOT NULL OR email IS NOT NULL)
);

-- Enable RLS
ALTER TABLE pre_admins ENABLE ROW LEVEL SECURITY;

-- Policies for Pre-Admins
CREATE POLICY "Allow admin to manage pre_admins" 
ON pre_admins FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 7. Create Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT check_user_identity_exists CHECK (roll_number IS NOT NULL OR email IS NOT NULL)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for Users
CREATE POLICY "Allow admin to manage users" 
ON users FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

