package expo.modules.securerecorder

/**
 * Interface for limit registry operations (for testability)
 * 
 * Allows mocking LimitRegistry in tests without requiring real limit configuration
 */
interface LimitRegistryInterface {
  fun getLimits(): List<Limit>
}
