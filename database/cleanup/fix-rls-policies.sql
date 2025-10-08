-- Fix RLS policies to prevent infinite recursion
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Team members can read team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can read team data" ON public.teams;
DROP POLICY IF EXISTS "Users can read their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can delete team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can read their teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON public.teams;

-- Create simpler, non-recursive policies for team_members
CREATE POLICY "Users can read their own team memberships" ON public.team_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Team owners can manage team members" ON public.team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE teams.id = team_members.team_id AND teams.owner_id = auth.uid()
    )
  );

-- Allow team owners to insert new members
CREATE POLICY "Team owners can insert team members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE teams.id = team_members.team_id AND teams.owner_id = auth.uid()
    )
  );

-- Allow team owners to update team members
CREATE POLICY "Team owners can update team members" ON public.team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE teams.id = team_members.team_id AND teams.owner_id = auth.uid()
    )
  );

-- Allow team owners to delete team members
CREATE POLICY "Team owners can delete team members" ON public.team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE teams.id = team_members.team_id AND teams.owner_id = auth.uid()
    )
  );

-- Create simple team policies without recursion
CREATE POLICY "Team owners can read their teams" ON public.teams
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams" ON public.teams
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their teams" ON public.teams
  FOR DELETE USING (owner_id = auth.uid());
