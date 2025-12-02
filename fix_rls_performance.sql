-- Fix RLS Performance Issues: Wrap auth.uid() calls with (select auth.uid())
-- This prevents unnecessary re-evaluation of auth functions for each row
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

-- Drop and recreate "Users can view their own profile" policy
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT
  USING (id = (SELECT auth.uid()));

-- Drop and recreate "Users can update their own profile" policy
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Drop and recreate "Admins can view all profiles" policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ));

-- Drop and recreate "Enable insert for authenticated users" policy
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
CREATE POLICY "Enable insert for authenticated users" ON profiles
  FOR INSERT
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- USER_ROLES TABLE
-- ============================================================================

-- Drop and recreate "Users can view their own roles" policy
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Drop and recreate "Admins can view all roles" policy
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
    AND ur.role = 'admin'
  ));

-- Drop and recreate "Admins can insert roles" policy
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
CREATE POLICY "Admins can insert roles" ON user_roles
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
    AND ur.role = 'admin'
  ));

-- ============================================================================
-- GROUPS TABLE
-- ============================================================================

-- Drop and recreate "Anyone authenticated can view open groups" policy
DROP POLICY IF EXISTS "Anyone authenticated can view open groups" ON groups;
CREATE POLICY "Anyone authenticated can view open groups" ON groups
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL AND status = 'open');

-- Drop and recreate "Admins can manage groups" policy
DROP POLICY IF EXISTS "Admins can manage groups" ON groups;
CREATE POLICY "Admins can manage groups" ON groups
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ));

-- ============================================================================
-- GROUP_MEMBERS TABLE
-- ============================================================================

-- Drop and recreate "Members can view their own memberships" policy
DROP POLICY IF EXISTS "Members can view their own memberships" ON group_members;
CREATE POLICY "Members can view their own memberships" ON group_members
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Drop and recreate "Admins can view all group members" policy
DROP POLICY IF EXISTS "Admins can view all group members" ON group_members;
CREATE POLICY "Admins can view all group members" ON group_members
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ));

-- Drop and recreate "Admins can manage group members" policy
DROP POLICY IF EXISTS "Admins can manage group members" ON group_members;
CREATE POLICY "Admins can manage group members" ON group_members
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ));

-- ============================================================================
-- JOIN_REQUESTS TABLE
-- ============================================================================

-- Drop and recreate "Users can view their own join requests" policy
DROP POLICY IF EXISTS "Users can view their own join requests" ON join_requests;
CREATE POLICY "Users can view their own join requests" ON join_requests
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Drop and recreate "Users can create join requests" policy
DROP POLICY IF EXISTS "Users can create join requests" ON join_requests;
CREATE POLICY "Users can create join requests" ON join_requests
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Drop and recreate "Admins can view all join requests" policy
DROP POLICY IF EXISTS "Admins can view all join requests" ON join_requests;
CREATE POLICY "Admins can view all join requests" ON join_requests
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ));

-- Drop and recreate "Admins can update join requests" policy
DROP POLICY IF EXISTS "Admins can update join requests" ON join_requests;
CREATE POLICY "Admins can update join requests" ON join_requests
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ));

-- Drop and recreate jr_admin_select policy
DROP POLICY IF EXISTS "jr_admin_select" ON join_requests;
CREATE POLICY "jr_admin_select" ON join_requests
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ));

-- Drop and recreate jr_admin_write policy
DROP POLICY IF EXISTS "jr_admin_write" ON join_requests;
CREATE POLICY "jr_admin_write" ON join_requests
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ));

-- Drop and recreate jr_admin_update policy
DROP POLICY IF EXISTS "jr_admin_update" ON join_requests;
CREATE POLICY "jr_admin_update" ON join_requests
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ));

-- Drop and recreate jr_admin_delete policy
DROP POLICY IF EXISTS "jr_admin_delete" ON join_requests;
CREATE POLICY "jr_admin_delete" ON join_requests
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ));

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

-- Drop and recreate "Users can view their own notifications" policy
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Drop and recreate "Users can update their own notifications" policy
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Drop and recreate "Admins can create notifications" policy
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
CREATE POLICY "Admins can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ));

-- ============================================================================
-- WALLETS TABLE
-- ============================================================================

-- Drop and recreate "Users can view their own wallet." policy
DROP POLICY IF EXISTS "Users can view their own wallet." ON wallets;
CREATE POLICY "Users can view their own wallet." ON wallets
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Drop and recreate "Users can update their own wallet balance." policy
DROP POLICY IF EXISTS "Users can update their own wallet balance." ON wallets;
CREATE POLICY "Users can update their own wallet balance." ON wallets
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- WITHDRAWAL_REQUESTS TABLE
-- ============================================================================

-- Drop and recreate "Users can request withdrawals from their own wallet." policy
DROP POLICY IF EXISTS "Users can request withdrawals from their own wallet." ON withdrawal_requests;
CREATE POLICY "Users can request withdrawals from their own wallet." ON withdrawal_requests
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Drop and recreate "Users can view their own withdrawal requests." policy
DROP POLICY IF EXISTS "Users can view their own withdrawal requests." ON withdrawal_requests;
CREATE POLICY "Users can view their own withdrawal requests." ON withdrawal_requests
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PAYOUT_HISTORY TABLE
-- ============================================================================

-- Drop and recreate "Users can view their own payout history." policy
DROP POLICY IF EXISTS "Users can view their own payout history." ON payout_history;
CREATE POLICY "Users can view their own payout history." ON payout_history
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- BANK_DETAILS TABLE
-- ============================================================================

-- Drop and recreate "Users can view their own bank details." policy
DROP POLICY IF EXISTS "Users can view their own bank details." ON bank_details;
CREATE POLICY "Users can view their own bank details." ON bank_details
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Drop and recreate "Users can insert their own bank details." policy
DROP POLICY IF EXISTS "Users can insert their own bank details." ON bank_details;
CREATE POLICY "Users can insert their own bank details." ON bank_details
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Drop and recreate "Users can update their own bank details." policy
DROP POLICY IF EXISTS "Users can update their own bank details." ON bank_details;
CREATE POLICY "Users can update their own bank details." ON bank_details
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Drop and recreate "Users can delete their own bank details." policy
DROP POLICY IF EXISTS "Users can delete their own bank details." ON bank_details;
CREATE POLICY "Users can delete their own bank details." ON bank_details
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- Verify all policies were updated successfully
-- ============================================================================
-- Run this query to verify policies are using optimized auth() calls:
-- SELECT schemaname, tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
