-- Create function to get ticket responses
CREATE OR REPLACE FUNCTION get_ticket_responses(ticket_id UUID)
RETURNS TABLE (
  id UUID,
  ticket_id UUID,
  message TEXT,
  created_at TIMESTAMPTZ,
  is_admin_response BOOLEAN,
  user_name TEXT,
  user_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id,
    tr.ticket_id,
    tr.message,
    tr.created_at,
    tr.is_admin_response,
    p.full_name as user_name,
    p.role as user_role
  FROM ticket_responses tr
  LEFT JOIN profiles p ON tr.user_id = p.id
  WHERE tr.ticket_id = get_ticket_responses.ticket_id
  ORDER BY tr.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function to add ticket response
CREATE OR REPLACE FUNCTION add_ticket_response(
  ticket_id UUID,
  user_id TEXT,
  message TEXT,
  is_admin_response BOOLEAN
)
RETURNS UUID AS $$
DECLARE
  response_id UUID;
BEGIN
  INSERT INTO ticket_responses (ticket_id, user_id, message, is_admin_response)
  VALUES (ticket_id, user_id, message, is_admin_response)
  RETURNING id INTO response_id;
  
  RETURN response_id;
END;
$$ LANGUAGE plpgsql; 