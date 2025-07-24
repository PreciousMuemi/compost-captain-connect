-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own tickets" ON tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON tickets;

-- Create new policies
CREATE POLICY "Users can create own tickets" ON tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets" ON tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets" ON tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all tickets" ON tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  ); 