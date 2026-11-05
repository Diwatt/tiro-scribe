cmake_minimum_required(VERSION 3.22)
project(MelSpectrogram)

set(PACKAGE_NAME MelSpectrogram)
set(CMAKE_CXX_STANDARD 20)

# Single dependency lock: scripts/native-deps.lock (one "name url sha" line
# per dependency), shared with scripts/fetch-knf.sh (iOS). Sources clone once
# per machine into the gitignored cpp/.fetchcontent cache, then every build
# skips the download. Bump a pin in the lock file and wipe cpp/.fetchcontent
# so the new pin gets cloned.
set(DSP_DIR ${CMAKE_CURRENT_SOURCE_DIR}/..)
include(FetchContent)
set(FETCHCONTENT_BASE_DIR ${DSP_DIR}/cpp/.fetchcontent)

file(STRINGS ${DSP_DIR}/scripts/native-deps.lock dep_lines REGEX "^[A-Za-z]")
foreach(line IN LISTS dep_lines)
    separate_arguments(parts NATIVE_COMMAND "${line}")
    list(GET parts 0 dep_name)
    list(GET parts 1 dep_url)
    list(GET parts 2 dep_sha)
    set(${dep_name}_URL ${dep_url})
    set(${dep_name}_SHA ${dep_sha})
endforeach()

foreach(dep IN ITEMS kissfft kaldi-native-fbank eigen)
    if(NOT DEFINED ${dep}_SHA)
        message(FATAL_ERROR "scripts/native-deps.lock is missing a pin for ${dep}")
    endif()
    FetchContent_Declare(${dep}
            GIT_REPOSITORY ${${dep}_URL}
            GIT_TAG ${${dep}_SHA})
    FetchContent_Populate(${dep})
endforeach()

# Upstream layout: sources live under <repo>/kaldi-native-fbank/csrc. The
# online-feature template family needs every computer below plus Eigen headers.
set(KNF_SRC ${kaldi-native-fbank_SOURCE_DIR}/kaldi-native-fbank/csrc)

add_library(${PACKAGE_NAME} SHARED
        src/main/cpp/cpp-adapter.cpp
        ${DSP_DIR}/cpp/HybridMelSpectrogram.cpp
        ${DSP_DIR}/cpp/MelSpectrogramBridge.cc
        ${kissfft_SOURCE_DIR}/kiss_fft.c
        ${kissfft_SOURCE_DIR}/kiss_fftr.c
        ${KNF_SRC}/feature-delta.cc
        ${KNF_SRC}/feature-fbank.cc
        ${KNF_SRC}/feature-functions.cc
        ${KNF_SRC}/feature-mfcc.cc
        ${KNF_SRC}/feature-pitch.cc
        ${KNF_SRC}/feature-raw-audio-samples.cc
        ${KNF_SRC}/feature-window.cc
        ${KNF_SRC}/kaldi-math.cc
        ${KNF_SRC}/mel-computations.cc
        ${KNF_SRC}/online-feature.cc
        ${KNF_SRC}/online-nemo-fbank.cc
        ${KNF_SRC}/rfft.cc
        ${KNF_SRC}/resample.cc
        ${KNF_SRC}/stft.cc
        ${KNF_SRC}/whisper-feature.cc)

# Nitrogen specs (generated C++/JNI bindings)
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/MelSpectrogram+autolinking.cmake)

include_directories(
        "src/main/cpp"
        "../cpp"
        ${kissfft_SOURCE_DIR}
        ${kaldi-native-fbank_SOURCE_DIR}
        ${eigen_SOURCE_DIR}
)

find_library(LOG_LIB log)

target_link_libraries(${PACKAGE_NAME}
        ${LOG_LIB}
        android
)
