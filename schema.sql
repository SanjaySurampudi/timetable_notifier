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
