-- Add mail_cartellini field to launch_stores table
ALTER TABLE launch_stores 
ADD COLUMN mail_cartellini boolean DEFAULT false;