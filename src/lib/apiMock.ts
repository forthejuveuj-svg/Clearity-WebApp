/**
 * Mock API service for development
 */

interface RPCResponse<T = any> {
  success: boolean;
  chat_response?: string;
  entities_stored?: { projects: number; problems: number };
  extracted_data?: { projects: any[]; problems: any[] };
  all_data_json?: { projects: any[]; problems: any[] };
  data?: { projects: any[]; problems: any[] };
  entities?: {
    projects: { count: number; entities: any[] };
    problems: { count: number; entities: any[] };
    total_entities: number;
  };
  message?: string;
  error?: string;
  method?: string;
}

interface ChatParams {
  text: string;
  user_id?: string;
}

interface GetDataParams {
  user_id?: string;
}

interface ShowEntitiesParams {
  user_id?: string;
}

interface ClearDataParams {
  user_id?: string;
}

// Mock data generators
const generateMockProjects = (text: string) => {
  const projectTypes = ['web development', 'mobile app', 'data analysis', 'machine learning'];
  const randomType = projectTypes[Math.floor(Math.random() * projectTypes.length)];
  
  return [{
    id: `project-${Date.now()}`,
    user_id: 'mock-user',
    name: `${randomType.charAt(0).toUpperCase() + randomType.slice(1)} Project`,
    status: 'not_started',
    priority_score: 0.7,
    progress_percent: 0,
    description: `A ${randomType} project based on: ${text.slice(0, 100)}...`,
    key_points: ['innovative', 'scalable', 'user-friendly'],
    tasks: [],
    effort_estimate_hours: 40,
    learning_objectives: ['Learn new technologies', 'Improve skills'],
    project_files: {},
    subproject_from: [],
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString()
  }];
};

const generateMockProblems = (text: string) => {
  const problemTypes = ['technical', 'organizational', 'personal'];
  const randomType = problemTypes[Math.floor(Math.random() * problemTypes.length)];
  
  return [{
    id: `problem-${Date.now()}`,
    user_id: 'mock-user',
    name: `${randomType.charAt(0).toUpperCase() + randomType.slice(1)} Challenge`,
    type: randomType,
    severity: Math.floor(Math.random() * 5) + 3, // 3-7
    status: 'active',
    solution_state: 'planned',
    project_id: `project-${Date.now()}`,
    emotion: 'concerned',
    proposed_solution: `Address the ${randomType} issues mentioned in: ${text.slice(0, 50)}...`,
    recurrence_rate: 0.3,
    duration_hours: 2,
    root_cause: 'Needs further analysis',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }];
};

const generateMockChatResponse = (text: string) => {
  const responses = [
    `I understand you're working on something interesting! Based on what you've shared: "${text.slice(0, 50)}...", I can see there are some projects and challenges to explore.`,
    `That's a great point! I've extracted some key projects and potential problems from your message. Let me help you organize these thoughts.`,
    `Thanks for sharing that with me. I can see several actionable items and challenges in what you've described. Here's what I found...`,
    `Interesting! From your message, I can identify some projects that might be worth pursuing and some challenges to address.`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

export class APIServiceMock {
  private static async simulateDelay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async chat(params: ChatParams): Promise<RPCResponse> {
    await this.simulateDelay(1500);
    
    const mockProjects = generateMockProjects(params.text);
    const mockProblems = generateMockProblems(params.text);
    const chatResponse = generateMockChatResponse(params.text);
    
    return {
      success: true,
      chat_response: chatResponse,
      entities_stored: { 
        projects: mockProjects.length, 
        problems: mockProblems.length 
      },
      extracted_data: { 
        projects: mockProjects, 
        problems: mockProblems 
      },
      all_data_json: { 
        projects: mockProjects, 
        problems: mockProblems 
      },
      method: 'chat'
    };
  }

  static async getData(params: GetDataParams): Promise<RPCResponse> {
    await this.simulateDelay(300);
    
    const mockProjects = generateMockProjects("sample data");
    const mockProblems = generateMockProblems("sample data");
    
    return {
      success: true,
      data: {
        projects: mockProjects,
        problems: mockProblems
      },
      method: 'get_data'
    };
  }

  static async showEntities(params: ShowEntitiesParams): Promise<RPCResponse> {
    await this.simulateDelay(400);
    
    const mockProjects = generateMockProjects("sample data");
    const mockProblems = generateMockProblems("sample data");
    
    return {
      success: true,
      entities: {
        projects: {
          count: mockProjects.length,
          entities: mockProjects
        },
        problems: {
          count: mockProblems.length,
          entities: mockProblems
        },
        total_entities: mockProjects.length + mockProblems.length
      },
      method: 'show_entities'
    };
  }

  static async clearData(params: ClearDataParams): Promise<RPCResponse> {
    await this.simulateDelay(200);
    
    return {
      success: true,
      message: `All data cleared for user ${params.user_id || 'default_user'}`,
      method: 'clear_data'
    };
  }

  static async healthCheck(): Promise<RPCResponse> {
    await this.simulateDelay(200);
    
    return {
      success: true,
      data: {
        status: 'healthy',
        server: 'Mock RPC Server',
        methods: ['chat', 'get_data', 'show_entities', 'clear_data'],
        version: '1.0.0-mock',
        timestamp: new Date().toISOString()
      }
    };
  }
}