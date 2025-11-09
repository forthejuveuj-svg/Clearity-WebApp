-- Drop existing tables if they exist
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS preferences CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS problems CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS knowledge_nodes CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS skills CASCADE;

-- Create skills table
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    categories JSONB DEFAULT '[]'::jsonb,
    outcomes JSONB DEFAULT '[]'::jsonb,
    practice_hours_estimate FLOAT,
    last_used TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('not_started','planned', 'in_progress', 'on_hold', 'completed')),
    priority_score FLOAT NOT NULL DEFAULT 0.5,
    progress_percent FLOAT NOT NULL DEFAULT 0.0,
    description TEXT,
    key_points JSONB DEFAULT '[]'::jsonb,
    tasks JSONB DEFAULT '[]'::jsonb,
    effort_estimate_hours FLOAT,
    learning_objectives JSONB DEFAULT '[]'::jsonb,
    project_files JSONB DEFAULT '{}'::jsonb,
    subproject_from JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Create knowledge_nodes table
CREATE TABLE knowledge_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    confidence FLOAT NOT NULL DEFAULT 0.8,
    importance_hint FLOAT NOT NULL DEFAULT 0.5,
    project_id UUID NOT NULL,
    summary TEXT,
    domain TEXT,
    complexity_desc TEXT,
    estimated_learning_time_hours FLOAT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'done', 'blocked')),
    type TEXT NOT NULL CHECK (type IN ('normal', 'habit', 'subtask')),
    project_id UUID NOT NULL,
    description TEXT,
    estimated_time_hours FLOAT,
    actual_time_hours FLOAT,
    success_metric TEXT,
    completion_quality FLOAT,
    recurrence TEXT,
    motivation_association FLOAT,
    emotion_during_execution TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create problems table
CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('personal', 'technical', 'emotional', 'organizational')),
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 10),
    status TEXT NOT NULL CHECK (status IN ('active', 'resolved', 'acknowledged')),
    solution_state TEXT NOT NULL CHECK (solution_state IN ('planned', 'executing', 'done')),
    project_id UUID NOT NULL,
    emotion TEXT,
    proposed_solution TEXT,
    recurrence_rate FLOAT,
    duration_hours FLOAT,
    root_cause TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create resources table
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('course', 'book', 'api', 'software', 'hardware')),
    access_link TEXT,
    availability TEXT CHECK (availability IN ('free', 'paid', 'owned')),
    use_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create preferences table
CREATE TABLE preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    strength FLOAT NOT NULL CHECK (strength >= 0.0 AND strength <= 1.0),
    impact FLOAT NOT NULL CHECK (impact >= 0.0 AND impact <= 1.0),
    description TEXT,
    type TEXT CHECK (type IN ('temporal', 'cognitive', 'sensory', 'environmental')),
    emotion TEXT,
    last_violated TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    urgency FLOAT NOT NULL CHECK (urgency >= 0.0 AND urgency <= 1.0),
    completion_status TEXT NOT NULL CHECK (completion_status IN ('pending', 'done')),
    project_id UUID NOT NULL,
    type TEXT CHECK (type IN ('deadline', 'milestone', 'achievement')),
    date TIMESTAMPTZ,
    duration_hours FLOAT,
    emotion TEXT,
    outcomes JSONB DEFAULT '[]'::jsonb,
    reflection TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_skills_user_id ON skills(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_knowledge_nodes_user_id ON knowledge_nodes(user_id);
CREATE INDEX idx_knowledge_nodes_project_id ON knowledge_nodes(project_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_problems_user_id ON problems(user_id);
CREATE INDEX idx_problems_project_id ON problems(project_id);
CREATE INDEX idx_resources_user_id ON resources(user_id);
CREATE INDEX idx_preferences_user_id ON preferences(user_id);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_project_id ON events(project_id);

-- Enable Row Level Security (RLS)
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access their own data)
CREATE POLICY "Users can only access their own skills" ON skills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own knowledge_nodes" ON knowledge_nodes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own problems" ON problems FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own resources" ON resources FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own preferences" ON preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own events" ON events FOR ALL USING (auth.uid() = user_id);