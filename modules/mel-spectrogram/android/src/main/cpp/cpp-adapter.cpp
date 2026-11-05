#include <fbjni/fbjni.h>
#include "MelSpectrogramOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::tiroscribe::registerAllNatives();
  });
}
