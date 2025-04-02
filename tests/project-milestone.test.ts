import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
class MockContract {
  private storage: Map<string, any> = new Map()
  private maps: Map<string, Map<string, any>> = new Map()
  private readonly name: string
  private txSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  private blockHeight = 100
  
  constructor(name: string) {
    this.name = name
  }
  
  // Set tx-sender for testing
  setTxSender(address: string) {
    this.txSender = address
  }
  
  // Set block-height for testing
  setBlockHeight(height: number) {
    this.blockHeight = height
  }
  
  // Mock for var-get
  varGet(varName: string) {
    return this.storage.get(varName) || 0
  }
  
  // Mock for var-set
  varSet(varName: string, value: any) {
    this.storage.set(varName, value)
  }
  
  // Mock for map-get?
  mapGet(mapName: string, key: any) {
    if (!this.maps.has(mapName)) {
      this.maps.set(mapName, new Map())
    }
    const map = this.maps.get(mapName)!
    const keyStr = JSON.stringify(key)
    return map.has(keyStr) ? map.get(keyStr) : null
  }
  
  // Mock for map-set
  mapSet(mapName: string, key: any, value: any) {
    if (!this.maps.has(mapName)) {
      this.maps.set(mapName, new Map())
    }
    const map = this.maps.get(mapName)!
    const keyStr = JSON.stringify(key)
    map.set(keyStr, value)
  }
  
  // Mock for create-project function
  createProject(name: string, description: string, targetAmount: number, duration: number) {
    const projectId = this.varGet("project-counter")
    const startHeight = this.blockHeight
    const endHeight = startHeight + duration
    
    // Increment project counter
    this.varSet("project-counter", projectId + 1)
    
    // Initialize milestone counter for this project
    this.mapSet("project-milestone-counters", { "project-id": projectId }, 0)
    
    // Create project
    this.mapSet(
        "projects",
        { "project-id": projectId },
        {
          name,
          description,
          "target-amount": targetAmount,
          "start-height": startHeight,
          "end-height": endHeight,
          owner: this.txSender,
        },
    )
    
    return { success: true, value: projectId }
  }
  
  // Mock for add-milestone function
  addMilestone(projectId: number, description: string, targetCompletion: number, fundsAllocated: number) {
    const project = this.mapGet("projects", { "project-id": projectId })
    if (!project) {
      return { success: false, error: 1 }
    }
    
    if (project.owner !== this.txSender) {
      return { success: false, error: 2 }
    }
    
    const milestoneCounter = this.mapGet("project-milestone-counters", { "project-id": projectId }) || 0
    
    // Increment milestone counter
    this.mapSet("project-milestone-counters", { "project-id": projectId }, milestoneCounter + 1)
    
    // Create milestone
    this.mapSet(
        "milestones",
        { "project-id": projectId, "milestone-id": milestoneCounter },
        {
          description,
          "target-completion": targetCompletion,
          "is-completed": false,
          "completion-height": null,
          "funds-allocated": fundsAllocated,
        },
    )
    
    return { success: true, value: milestoneCounter }
  }
  
  // Mock for complete-milestone function
  completeMilestone(projectId: number, milestoneId: number) {
    const project = this.mapGet("projects", { "project-id": projectId })
    if (!project) {
      return { success: false, error: 1 }
    }
    
    const milestone = this.mapGet("milestones", { "project-id": projectId, "milestone-id": milestoneId })
    if (!milestone) {
      return { success: false, error: 2 }
    }
    
    if (project.owner !== this.txSender) {
      return { success: false, error: 3 }
    }
    
    // Update milestone as completed
    this.mapSet(
        "milestones",
        { "project-id": projectId, "milestone-id": milestoneId },
        {
          ...milestone,
          "is-completed": true,
          "completion-height": this.blockHeight,
        },
    )
    
    return { success: true, value: true }
  }
  
  // Mock for get-project function
  getProject(projectId: number) {
    return this.mapGet("projects", { "project-id": projectId })
  }
  
  // Mock for get-milestone function
  getMilestone(projectId: number, milestoneId: number) {
    return this.mapGet("milestones", { "project-id": projectId, "milestone-id": milestoneId })
  }
  
  // Mock for get-milestone-count function
  getMilestoneCount(projectId: number) {
    return this.mapGet("project-milestone-counters", { "project-id": projectId }) || 0
  }
}

describe("Project Milestone Contract", () => {
  let contract: MockContract
  
  beforeEach(() => {
    contract = new MockContract("project-milestone")
  })
  
  it("should create a project correctly", () => {
    const result = contract.createProject("Clean Water Initiative", "Providing clean water to rural areas", 10000, 100)
    
    expect(result.success).toBe(true)
    expect(result.value).toBe(0) // First project ID should be 0
    
    const project = contract.getProject(0)
    expect(project).not.toBeNull()
    expect(project.name).toBe("Clean Water Initiative")
    expect(project["target-amount"]).toBe(10000)
  })
  
  it("should add milestones to a project", () => {
    const owner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    contract.setTxSender(owner)
    
    const projectResult = contract.createProject(
        "Education Fund",
        "Supporting education in underserved areas",
        50000,
        200,
    )
    const projectId = projectResult.value
    
    const milestoneResult = contract.addMilestone(projectId, "Build first school", 30, 15000)
    expect(milestoneResult.success).toBe(true)
    
    const milestone = contract.getMilestone(projectId, milestoneResult.value)
    expect(milestone).not.toBeNull()
    expect(milestone.description).toBe("Build first school")
    expect(milestone["funds-allocated"]).toBe(15000)
    expect(milestone["is-completed"]).toBe(false)
  })
  
  it("should prevent non-owners from adding milestones", () => {
    const owner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const nonOwner = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    
    contract.setTxSender(owner)
    const projectResult = contract.createProject(
        "Medical Supplies",
        "Providing medical supplies to clinics",
        30000,
        150,
    )
    const projectId = projectResult.value
    
    contract.setTxSender(nonOwner)
    const milestoneResult = contract.addMilestone(projectId, "First delivery", 20, 10000)
    
    expect(milestoneResult.success).toBe(false)
    expect(milestoneResult.error).toBe(2) // Error code for unauthorized
  })
  
  it("should complete milestones correctly", () => {
    const owner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    contract.setTxSender(owner)
    
    const projectResult = contract.createProject("Food Bank", "Supporting local food banks", 20000, 120)
    const projectId = projectResult.value
    
    const milestoneResult = contract.addMilestone(projectId, "First distribution", 15, 5000)
    const milestoneId = milestoneResult.value
    
    contract.setBlockHeight(115) // Set a new block height for completion
    const completeResult = contract.completeMilestone(projectId, milestoneId)
    
    expect(completeResult.success).toBe(true)
    
    const milestone = contract.getMilestone(projectId, milestoneId)
    expect(milestone["is-completed"]).toBe(true)
    expect(milestone["completion-height"]).toBe(115)
  })
})

