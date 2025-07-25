-- Create admin_tasks table for real-time task management
CREATE TABLE IF NOT EXISTS public.admin_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_tasks
CREATE POLICY "Admins can manage all tasks" ON public.admin_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Dispatch can view and update tasks" ON public.admin_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'dispatch'
    )
  );

CREATE POLICY "Dispatch can update task status" ON public.admin_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'dispatch'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_admin_tasks_updated_at
  BEFORE UPDATE ON public.admin_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample admin tasks
INSERT INTO public.admin_tasks (title, description, priority, status) VALUES
('Review Low Stock Items', 'Check inventory levels and restock items below threshold', 'high', 'pending'),
('Monitor Rider Performance', 'Track delivery success rates and rider efficiency', 'medium', 'pending'),
('Update Delivery Routes', 'Optimize delivery routes based on recent orders', 'low', 'pending'),
('Customer Feedback Review', 'Review and respond to customer feedback', 'medium', 'pending'),
('System Maintenance', 'Perform routine system checks and updates', 'low', 'pending'); 