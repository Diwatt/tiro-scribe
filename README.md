# Tiro Scribe

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm_Noncommercial-blue.svg)](LICENSE)
[![Privacy First](https://img.shields.io/badge/Privacy-First-green.svg)](https://github.com/Diwatt/tiro-scribe)
[![React Native](https://img.shields.io/badge/React_Native-v0.73-blueviolet.svg)](https://reactnative.dev/)

> **"Notes Tironiennes" for the 21st Century.**
> A privacy-first clinical transcriber that converts speech to anonymized text on-device, without ever storing raw audio.

## ⚠️ License & Usage Warning
**This software is NOT Open Source in the traditional sense.**
It is licensed under the **PolyForm Noncommercial License 1.0.0**.

* ✅ **Allowed:** Use by academic researchers, universities, public hospitals, and non-profits for scientific research.
* ❌ **Prohibited:** Any commercial use, sale, or usage by for-profit entities is **strictly forbidden**.

---

## 📖 The Mission
This project aims to solve the biggest bottleneck in clinical psychology research: **Data Privacy.**
Applying rigorous analysis methods (such as **Lester Luborsky's CCRT**) requires precise session transcripts, but GDPR and medical ethics often make recording impossible or risky.

**Tiro Scribe** shifts the paradigm by performing **Edge AI processing**. Instead of acting as a simple recorder that stores sensitive files, the mobile device acts as a "Privacy Airlock" that outputs only safe data.

## 🏛️ About the Name
Named after **Marcus Tullius Tiro**, the father of shorthand (stenography) and faithful scribe of Cicero. Just as Tiro captured spoken words immediately without interfering with the speech, this tool captures clinical data without compromising patient privacy.

## 🛡️ The Security Protocol (Biocode & Salt)

This application implements a strict **Privacy-by-Design** architecture. No raw audio ever leaves the device.

### Data Flow
1.  **Acquisition:** Audio is processed locally on the therapist's device.
2.  **On-Device Transcription:** We use state-of-the-art (SOTA) ASR models (Whisper/ONNX) to transcribe speech to text **offline**.
3.  **Biocoding (Voice Fingerprinting):**
    * The system extracts a voice vector using embedded AI.
    * This vector is **salted** with the Therapist's ID.
    * **Result:** A unique, consistent Patient Hash that allows longitudinal tracking without ever knowing the patient's real identity.
4.  **Dynamic Pseudonymization:**
    * Local NLP detects direct PII (names, places) and **indirect identifiers** (family roles like "father", "mother", or "boss").
    * **Context-Aware Replacement:** Entities are replaced by tokenized tags (e.g., `Mother` -> `[RELATION_A]`, `Lyon` -> `[CITY_HASH]`).
    * **Temporal Fuzzing:** Exact dates are not destroyed but converted into **relative timestamps** (e.g., `Day +14`) to preserve the clinical timeline while masking specific calendar days.
5.  **Secure Transmission:** Only the anonymized transcript and the Biocode are sent to the backend (`tiro-scribe-server`).

```mermaid
graph TD
    A[Microphone] -->|Raw Audio| B(Device Memory)
    B -->|OFFLINE| C{Local AI Engine}
    C -->|Text| D[Local NLP Sanitizer]
    B -->|Voice Vector| E[Biocode Engine]
    F[Therapist Salt] --> E
    E -->|Hash| G[Patient ID]
    D -->|Anonymized Text| H[Encrypted Payload]
    G --> H
    H -->|TLS| I[Backend Server]