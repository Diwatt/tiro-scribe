import Foundation

/**
 * Protocol for limit registry operations (for testability)
 * 
 * Allows mocking LimitRegistry in tests without requiring real limit configuration
 */
internal protocol LimitRegistryProtocol {
  func getLimits() -> [Limit]
}

extension LimitRegistry: LimitRegistryProtocol {}
