/**
 * Mock API service for development
 */

interface RPCResponse<T = any> {
  success: boolean;
  result?: T;
  output?: string;
  error?: string;
  method?: string;
}

interface MindDumpParams {
  text: string;
  user_id: string;
  use_relator?: boolean;
}

interface FixNodesParams {
  text: string;
  user_id?: string;
}

interface ProjectManagerParams {
  text: string;
}

interface TaskManagerAssessParams {
  user_message: string;
  task_object: any;
  context?: any;
}

// Mock data generators
const generateMockMindMapData = (text: string) => {
  const words = text.split(' ').slice(0, 10);
  const nodes = words.map((word, index) => ({
    id: `node-${index}`,
    label: word,
    x: Math.random() * 400 + 100,
    y: Math.random() * 300 + 100,
    connections: index > 0 ? [`node-${index - 1}`] : []
  }));

  return {
    nodes,
    connections: nodes.slice(1).map((node, index) => ({
      from: `node-${index}`,
      to: node.id,
      label: 'relates to'
    }))
  };
};

const generateMockProjectResponse = (text: string) => {
  return `Based on your input: "${text.slice(0, 50)}...", here's a mock project analysis:

## Project Overview
This appears to be a ${text.includes('web') ? 'web development' : text.includes('mobile') ? 'mobile app' : 'software'} project.

## Key Components
- Frontend development
- Backend API
- Database design
- Testing strategy

## Next Steps
1. Define requirements
2. Create wireframes
3. Set up development environment
4. Begin implementation

This is mock data for development purposes.`;
};

const generateMockTaskResponse = (message: string) => {
  return `Task Assessment (Mock):

Input: "${message.slice(0, 50)}..."

## Analysis
- Priority: Medium
- Estimated effort: 2-4 hours
- Dependencies: None identified
- Risk level: Low

## Recommendations
1. Break down into smaller subtasks
2. Set clear acceptance criteria
3. Assign appropriate resources

This is mock data for development purposes.`;
};

export class APIServiceMock {
  private static async simulateDelay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async minddump(params: MindDumpParams): Promise<RPCResponse> {
    await this.simulateDelay(1500);
    
    const mockData = generateMockMindMapData(params.text);
    
    return {
      success: true,
      result: mockData,
      output: `Processed mind dump for user ${params.user_id}. Generated ${mockData.nodes.length} nodes.`,
      method: 'minddump'
    };
  }

  static async fixNodes(params: FixNodesParams): Promise<RPCResponse> {
    await this.simulateDelay(800);
    
    return {
      success: true,
      result: {
        fixed_nodes: 3,
        improvements: ['Clarified connections', 'Improved labeling', 'Optimized layout']
      },
      output: `Fixed nodes based on: "${params.text.slice(0, 50)}..."`,
      method: 'fix_nodes'
    };
  }

  static async projectManager(params: ProjectManagerParams): Promise<RPCResponse> {
    await this.simulateDelay(2000);
    
    const mockResponse = generateMockProjectResponse(params.text);
    
    return {
      success: true,
      result: { message: mockResponse },
      output: mockResponse,
      method: 'projectmanager'
    };
  }

  static async taskManagerAssess(params: TaskManagerAssessParams): Promise<RPCResponse> {
    await this.simulateDelay(1200);
    
    const mockResponse = generateMockTaskResponse(params.user_message);
    
    return {
      success: true,
      result: { message: mockResponse },
      output: mockResponse,
      method: 'taskmanager_assess'
    };
  }

  static async healthCheck(): Promise<RPCResponse> {
    await this.simulateDelay(200);
    
    return {
      success: true,
      result: {
        status: 'healthy',
        version: '1.0.0-mock',
        timestamp: new Date().toISOString()
      }
    };
  }
}