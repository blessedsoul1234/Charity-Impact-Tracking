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
  
  // Helper function to check if a principal is in a list
  private isInList(list: string[], principal: string): boolean {
    return list.includes(principal)
  }
  
  // Mock for add-impact-metric function
  addImpactMetric(projectId: number, name: string, description: string, targetValue: number, unit: string) {
    const metricCounter = this.mapGet("project-metric-counters", { "project-id": projectId }) || 0
    const reporters = this.mapGet("authorized-reporters", { "project-id": projectId }) || []
    
    // Check if caller is authorized or if this is the first reporter
    if (reporters.length > 0 && !this.isInList(reporters, this.txSender)) {
      return { success: false, error: 1 }
    }
    
    // If no reporters yet, add caller as first reporter
    if (reporters.length === 0) {
      this.mapSet("authorized-reporters", { "project-id": projectId }, [this.txSender])
    }
    
    // Increment metric counter
    this.mapSet("project-metric-counters", { "project-id": projectId }, metricCounter + 1)
    
    // Create impact metric
    this.mapSet(
        "impact-metrics",
        { "project-id": projectId, "metric-id": metricCounter },
        {
          name,
          description,
          "target-value": targetValue,
          "current-value": 0,
          unit,
          "last-updated": this.blockHeight,
        },
    )
    
    return { success: true, value: metricCounter }
  }
  
  // Mock for update-metric-value function
  updateMetricValue(projectId: number, metricId: number, newValue: number) {
    const metric = this.mapGet("impact-metrics", { "project-id": projectId, "metric-id": metricId })
    if (!metric) {
      return { success: false, error: 1 }
    }
    
    const reporters = this.mapGet("authorized-reporters", { "project-id": projectId }) || []
    if (!this.isInList(reporters, this.txSender)) {
      return { success: false, error: 2 }
    }
    
    // Update metric value
    this.mapSet(
        "impact-metrics",
        { "project-id": projectId, "metric-id": metricId },
        {
          ...metric,
          "current-value": newValue,
          "last-updated": this.blockHeight,
        },
    )
    
    return { success: true, value: true }
  }
  
  // Mock for add-reporter function
  addReporter(projectId: number, reporter: string) {
    const reporters = this.mapGet("authorized-reporters", { "project-id": projectId }) || []
    
    // Check if caller is authorized
    if (!this.isInList(reporters, this.txSender)) {
      return { success: false, error: 1 }
    }
    
    // Check if list is not full (max 10 reporters)
    if (reporters.length >= 10) {
      return { success: false, error: 2 }
    }
    
    // Check if reporter is not already in the list
    if (this.isInList(reporters, reporter)) {
      return { success: false, error: 3 }
    }
    
    // Add reporter to the list
    reporters.push(reporter)
    this.mapSet("authorized-reporters", { "project-id": projectId }, reporters)
    
    return { success: true, value: true }
  }
  
  // Mock for get-impact-metric function
  getImpactMetric(projectId: number, metricId: number) {
    return this.mapGet("impact-metrics", { "project-id": projectId, "metric-id": metricId })
  }
  
  // Mock for get-metric-count function
  getMetricCount(projectId: number) {
    return this.mapGet("project-metric-counters", { "project-id": projectId }) || 0
  }
  
  // Mock for get-authorized-reporters function
  getAuthorizedReporters(projectId: number) {
    return this.mapGet("authorized-reporters", { "project-id": projectId }) || []
  }
}

describe("Impact Measurement Contract", () => {
  let contract: MockContract
  const reporter1 = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  const reporter2 = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
  const nonReporter = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
  
  beforeEach(() => {
    contract = new MockContract("impact-measurement")
    contract.setTxSender(reporter1)
  })
  
  it("should add impact metrics correctly", () => {
    const projectId = 1
    const name = "People Served"
    const description = "Number of people who received aid"
    const targetValue = 1000
    const unit = "people"
    
    const result = contract.addImpactMetric(projectId, name, description, targetValue, unit)
    
    expect(result.success).toBe(true)
    expect(result.value).toBe(0) // First metric ID should be 0
    
    const metric = contract.getImpactMetric(projectId, 0)
    expect(metric).not.toBeNull()
    expect(metric.name).toBe(name)
    expect(metric["target-value"]).toBe(targetValue)
    expect(metric["current-value"]).toBe(0)
    expect(metric.unit).toBe(unit)
  })
  
  it("should add the first reporter automatically", () => {
    const projectId = 2
    
    contract.addImpactMetric(
        projectId,
        "Clean Water Access",
        "Number of people with new access to clean water",
        5000,
        "people",
    )
    
    const reporters = contract.getAuthorizedReporters(projectId)
    expect(reporters.length).toBe(1)
    expect(reporters[0]).toBe(reporter1)
  })
  
  it("should allow authorized reporters to update metrics", () => {
    const projectId = 3
    
    // Add a metric
    const metricResult = contract.addImpactMetric(
        projectId,
        "Trees Planted",
        "Number of trees planted in reforestation efforts",
        10000,
        "trees",
    )
    const metricId = metricResult.value
    
    // Update the metric value
    const updateResult = contract.updateMetricValue(projectId, metricId, 500)
    
    expect(updateResult.success).toBe(true)
    
    const metric = contract.getImpactMetric(projectId, metricId)
    expect(metric["current-value"]).toBe(500)
  })
  
  it("should allow adding additional reporters", () => {
    const projectId = 4
    
    // Add a metric (which automatically adds the first reporter)
    contract.addImpactMetric(projectId, "Meals Provided", "Number of meals provided to those in need", 20000, "meals")
    
    // Add another reporter
    const addResult = contract.addReporter(projectId, reporter2)
    
    expect(addResult.success).toBe(true)
    
    const reporters = contract.getAuthorizedReporters(projectId)
    expect(reporters.length).toBe(2)
    expect(reporters).toContain(reporter1)
    expect(reporters).toContain(reporter2)
  })
  
  it("should prevent unauthorized users from updating metrics", () => {
    const projectId = 5
    
    // Add a metric as reporter1
    const metricResult = contract.addImpactMetric(
        projectId,
        "Jobs Created",
        "Number of jobs created through the program",
        500,
        "jobs",
    )
    const metricId = metricResult.value
    
    // Try to update the metric as a non-reporter
    contract.setTxSender(nonReporter)
    const updateResult = contract.updateMetricValue(projectId, metricId, 50)
    
    expect(updateResult.success).toBe(false)
    
    const metric = contract.getImpactMetric(projectId, metricId)
    expect(metric["current-value"]).toBe(0) // Value should not have changed
  })
  
  it("should prevent unauthorized users from adding reporters", () => {
    const projectId = 6
    
    // Add a metric as reporter1
    contract.setTxSender(reporter1)
    contract.addImpactMetric(projectId, "Schools Built", "Number of schools constructed", 20, "schools")
    
    // Try to add a reporter as a non-reporter
    contract.setTxSender(nonReporter)
    const addResult = contract.addReporter(projectId, reporter2)
    
    expect(addResult.success).toBe(false)
    
    const reporters = contract.getAuthorizedReporters(projectId)
    expect(reporters.length).toBe(1) // Should still only have the original reporter
    expect(reporters[0]).toBe(reporter1)
  })
})

