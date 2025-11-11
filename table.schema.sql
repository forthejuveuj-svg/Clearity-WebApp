-- Drop tables if they exist in dependency-safe order
DROP TABLE IF EXISTS problems CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS minddumps CASCADE;

-- Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('not_started','planned', 'in_progress', 'on_hold', 'completed')),
    description TEXT,
    key_points JSONB DEFAULT '[]'::jsonb,
    parent_project_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (parent_project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create problems table
CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('personal', 'technical', 'emotional', 'organizational')),
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 10),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'identified', 'ongoing', 'resolved')),
    project_id UUID NOT NULL,
    emotion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create minddumps table
CREATE TABLE minddumps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    prompt TEXT NOT NULL,
    title VARCHAR(255),
    nodes JSONB NOT NULL,
    layout_data JSONB,
    metadata JSONB DEFAULT '{}',
    conversation JSONB DEFAULT '[]',
    parent_project_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (parent_project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_parent_project_id ON projects(parent_project_id);

CREATE INDEX idx_problems_user_id ON problems(user_id);
CREATE INDEX idx_problems_project_id ON problems(project_id);

CREATE INDEX idx_minddumps_user_id ON minddumps(user_id);
CREATE INDEX idx_minddumps_created_at ON minddumps(created_at DESC);
CREATE INDEX idx_minddumps_user_created ON minddumps(user_id, created_at DESC);
CREATE INDEX idx_minddumps_parent_project_id ON minddumps(parent_project_id);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE minddumps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only access their own projects"
  ON projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own problems"
  ON problems
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own minddumps"
  ON minddumps
  FOR ALL USING (auth.uid() = user_id);
