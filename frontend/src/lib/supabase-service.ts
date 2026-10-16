import { supabase } from './supabase';
import { Project, ProjectStatus } from '../types/project';
import { ProjectReport } from '../types/report';

/**
 * Supabase Data Access Service
 * Direct PostgreSQL client integration with Row Level Security (RLS)
 */
export const SupabaseService = {
  /**
   * Check if Supabase connection and tables are accessible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { error } = await supabase.from('projects').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Fetch user's projects directly from Supabase
   */
  async getProjects(userId: string): Promise<Project[] | null> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[SupabaseService] getProjects query error:', error.message);
        return null;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        repositoryUrl: row.repository_url,
        branch: row.branch || 'main',
        commitSha: row.commit_sha || 'latest',
        status: (row.status as ProjectStatus) || 'in_progress',
        lastAnalyzedAt: row.last_analyzed_at || row.created_at,
        createdAt: row.created_at,
        ownerId: row.owner_id,
        latestReport: row.latest_report || undefined,
      }));
    } catch (err: any) {
      console.warn('[SupabaseService] getProjects caught error:', err?.message);
      return null;
    }
  },

  /**
   * Fetch single project by ID from Supabase
   */
  async getProjectById(id: string, userId?: string): Promise<Project | null> {
    try {
      let query = supabase.from('projects').select('*').eq('id', id);
      if (userId) {
        query = query.eq('owner_id', userId);
      }
      const { data, error } = await query.single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        repositoryUrl: data.repository_url,
        branch: data.branch || 'main',
        commitSha: data.commit_sha || 'latest',
        status: (data.status as ProjectStatus) || 'in_progress',
        lastAnalyzedAt: data.last_analyzed_at || data.created_at,
        createdAt: data.created_at,
        ownerId: data.owner_id,
        latestReport: data.latest_report || undefined,
      };
    } catch {
      return null;
    }
  },

  /**
   * Create a new project in Supabase
   */
  async createProject(project: {
    id: string;
    name: string;
    repositoryUrl: string;
    branch?: string;
    description?: string;
    ownerId: string;
  }): Promise<Project | null> {
    try {
      const row = {
        id: project.id,
        owner_id: project.ownerId,
        name: project.name.trim(),
        description: project.description?.trim() || '',
        repository_url: project.repositoryUrl.trim(),
        branch: project.branch?.trim() || 'main',
        commit_sha: 'latest',
        status: 'in_progress',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_analyzed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('projects')
        .insert([row])
        .select()
        .single();

      if (error) {
        console.warn('[SupabaseService] createProject error:', error.message);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        repositoryUrl: data.repository_url,
        branch: data.branch,
        commitSha: data.commit_sha,
        status: data.status,
        lastAnalyzedAt: data.last_analyzed_at,
        createdAt: data.created_at,
        ownerId: data.owner_id,
      };
    } catch (err: any) {
      console.warn('[SupabaseService] createProject caught error:', err?.message);
      return null;
    }
  },

  /**
   * Update project in Supabase
   */
  async updateProject(
    id: string,
    patch: Partial<{ name: string; description: string; branch: string; status: ProjectStatus; repositoryUrl: string; latestReport: ProjectReport }>
  ): Promise<boolean> {
    try {
      const updateData: any = {};
      if (patch.name !== undefined) updateData.name = patch.name;
      if (patch.description !== undefined) updateData.description = patch.description;
      if (patch.branch !== undefined) updateData.branch = patch.branch;
      if (patch.status !== undefined) updateData.status = patch.status;
      if (patch.repositoryUrl !== undefined) updateData.repository_url = patch.repositoryUrl;
      if (patch.latestReport !== undefined) {
        updateData.latest_report = patch.latestReport;
        updateData.last_analyzed_at = patch.latestReport.timestamp || new Date().toISOString();
        if (patch.latestReport.summary) {
          updateData.total_claims = patch.latestReport.summary.total_claims || 0;
          updateData.verified_claims = patch.latestReport.summary.verified_count || 0;
          updateData.partially_verified_claims = patch.latestReport.summary.partially_verified_count || 0;
          updateData.not_verified_claims = patch.latestReport.summary.not_verified_count || 0;
        }
      }

      const { error } = await supabase.from('projects').update(updateData).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Delete project from Supabase
   */
  async deleteProject(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Save full analysis report run and related sub-tables
   */
  async saveAnalysisRun(report: ProjectReport, ownerId: string): Promise<boolean> {
    try {
      // 1. Insert analysis report row
      await supabase.from('analysis_reports').insert([{
        id: report.analysis_run_id,
        project_id: report.project_id,
        owner_id: ownerId,
        schema_version: report.schema_version || '1.0',
        commit_sha: report.commit_sha || 'unknown',
        branch: report.branch || 'main',
        status: report.status || 'COMPLETED',
        duration_ms: report.duration_ms || 0,
        summary: report.summary,
        architecture: report.architecture,
        graph: report.graph,
        diagnostics: report.diagnostics,
      }]);

      // 2. Update parent project status and latest report cache
      await SupabaseService.updateProject(report.project_id, {
        status: report.summary?.not_verified_count > 0 ? 'needs_review' : 'completed',
        latestReport: report,
      });

      return true;
    } catch (err: any) {
      console.warn('[SupabaseService] saveAnalysisRun error:', err?.message);
      return false;
    }
  }
};
