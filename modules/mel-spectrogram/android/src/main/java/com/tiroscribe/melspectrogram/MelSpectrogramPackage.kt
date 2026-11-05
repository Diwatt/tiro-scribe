package com.tiroscribe.melspectrogram

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.com.tiroscribe.melspectrogram.MelSpectrogramOnLoad

/**
 * React Native package required for CLI autolinking. All implementations are
 * C++ HybridObjects registered by the generated nitrogen autolinking code.
 */
class MelSpectrogramPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    MelSpectrogramOnLoad.initializeNative()
    return emptyList()
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
