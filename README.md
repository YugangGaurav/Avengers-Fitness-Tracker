# Ⓐ AVENGERS FITNESS TRACKER

An advanced, multi-platform biomechanical fitness tracking and activity intelligence project inspired by Tony Stark's Avengers / JARVIS HUD design.

This repository contains two distinct implementations:
1. **MATLAB Version** (`/matlab`): High-precision desktop scientific app communicating with smartphone sensors via **MATLAB Mobile** (`mobiledev`).
2. **Web Version** (`/web`): 100% client-side, zero-dependency browser testing application deployable directly on **GitHub Pages**, utilizing HTML5 `DeviceMotionEvent` smartphone APIs.

---

## 📁 Repository Structure

```text
Avengers-Fitness-Tracker/
│
├── matlab/
│   └── AvengersFitnessTrackerByYug.m
│
├── web/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── README.md
│
├── README.md
└── LICENSE
```

---

## ⚡ Architecture Overview

| Feature | MATLAB Application (`/matlab`) | Web Testing Application (`/web`) |
| :--- | :--- | :--- |
| **Runtime** | MATLAB R2018b+ Desktop | Modern Web Browser (iOS / Android / Desktop) |
| **Sensor Link** | `mobiledev` (MATLAB Mobile App) | HTML5 `DeviceMotionEvent` API |
| **Dependencies** | MATLAB (+ Signal Processing Toolbox or Fallback) | Vanilla HTML, CSS, JavaScript (Zero dependencies) |
| **Hosting** | Local Machine | GitHub Pages (Static website) |
| **Data Storage** | Base Workspace & CSV Exports | Browser `localStorage` |
| **Offline Test** | Built-in Virtual Simulation Engine | Built-in Virtual Simulation Engine |
| **Step Algorithm** | Zero-Phase IIR + Refractory Peak Discovery | Baseline Detrending + Adaptive Peak Prominence |
| **Privacy** | 100% Local on User Machine | 100% Local in Client Browser |

---

## 🚀 Running the MATLAB Version

The primary MATLAB application is located in [`matlab/AvengersFitnessTrackerByYug.m`](./matlab/AvengersFitnessTrackerByYug.m).

### Requirements:
- MATLAB R2018b or later.
- *(Optional)* MATLAB Mobile installed on your smartphone (iPhone or Android) with sensor logging enabled.

### How to Run:
1. Open MATLAB and navigate to the `matlab/` directory.
2. In the MATLAB Command Window, execute:
   ```matlab
   app = AvengersFitnessTrackerByYug;
   ```
3. The Avengers Stark Tech HUD will launch:
   - Click **Connect MATLAB Mobile** to pair with your smartphone.
   - Or toggle **Mode: Simulation Engine** to run complete hardware-free biomechanical motion profiles (Walking, Running, Sitting).
   - Use the **Accuracy & Validation Suite** to benchmark step counts against known ground truth.

---

## 🌐 Deploying the Web Version to GitHub Pages

The web version is designed specifically for immediate hosting on **GitHub Pages**.

### Exact Deployment Steps:
1. Create a repository on GitHub named:
   ```
   Avengers-Fitness-Tracker
   ```
2. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: Avengers Fitness Tracker MATLAB & Web Suite"
   git branch -M main
   git remote add origin https://github.com/<USERNAME>/Avengers-Fitness-Tracker.git
   git push -u origin main
   ```
3. Open your repository on GitHub in your browser.
4. Click **Settings** → **Pages** (in the left sidebar).
5. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/web`
6. Click **Save**.
7. In 1–2 minutes, your website will be live at:
   ```
   https://<USERNAME>.github.io/Avengers-Fitness-Tracker/
   ```

---

## 📱 Testing on Smartphones (iOS & Android)

### Testing on iPhone (iOS 13+):
1. Open Safari and navigate to your GitHub Pages URL (or local HTTPS server).
2. Tap **START LIVE TEST** or **START TRACKING**.
3. A modal explains why motion access is required. Tap **GRANT PERMISSION**.
4. Safari will present an iOS system permission dialogue: *"This website wants to access Motion and Orientation"*.
5. Tap **Allow**.
6. Walk or run with your phone in your pocket or hand to observe live acceleration waveforms, step markers, and cadence.

### Testing on Android (Chrome / Firefox):
1. Open Chrome and navigate to the GitHub Pages URL over `https://` (modern browsers mandate secure HTTPS contexts to access motion hardware).
2. Tap **START TRACKING**.
3. Sensors will bind and stream motion data in real time.

### Testing on Desktop / Laptop (Virtual Simulation Engine):
- If accessing the site on a desktop or laptop without accelerometer hardware, tap the **MODE** badge in the header or go to **Profile & Settings** to enable the **Virtual Simulation Engine**.
- Choose between **Walking** (~108 SPM), **Running** (~162 SPM), or **Sitting** (sedentary noise) to test charts, step detection, and accuracy benchmarking without a phone.

---

## 🔬 Biomechanical Signal Algorithms

### 1. Resultant Acceleration Magnitude
Both implementations calculate the 3D resultant acceleration vector:
$$\text{Magnitude} = \sqrt{x^2 + y^2 + z^2}$$

### 2. Zero-Phase Baseline Detrending
The constant earth gravity component ($g \approx 9.81\text{ m/s}^2$) is tracked using an exponential moving average and removed to isolate dynamic physical body propulsion:
$$\text{Baseline}(t) = 0.98 \cdot \text{Baseline}(t-1) + 0.02 \cdot \text{Magnitude}(t)$$
$$\text{Dynamic Motion}(t) = |\text{Magnitude}(t) - \text{Baseline}(t)|$$

### 3. Adaptive Threshold & Refractory Lockout
- **Adaptive Threshold**: Automatically scales with movement variability:
  $$\text{Threshold} = \text{Mean} + 0.35 \cdot \sigma$$
- **Refractory Lockout Window**: Enforces a minimum interval of **280 ms** between consecutive step peaks:
  $$\Delta t_{\text{step}} \ge 280\text{ ms} \quad (\le 214\text{ steps/min})$$
  This eliminates duplicate counts caused by body bounce and secondary foot impacts.

### 4. Multi-Class Activity Classification
Activity is classified using a combination of motion standard deviation ($\sigma$) and cadence:
- **SITTING**: $\sigma < 0.15\text{ m/s}^2$ and Cadence $< 35\text{ SPM}$
- **WALKING**: $\sigma \in [0.15, 0.55]\text{ m/s}^2$ and Cadence $\in [45, 135]\text{ SPM}$
- **RUNNING**: $\sigma > 0.55\text{ m/s}^2$ or Cadence $> 135\text{ SPM}$

### 5. Continuous ACSM Calorie Integration
Instead of multiplying static workout time by a single MET value (which causes calories to drop backwards when resting after a run), energy expenditure accumulates continuously via Euler integration:
$$\Delta \text{Cal} = \frac{\text{MET} \times 3.5 \times \text{Weight (kg)}}{200 \times 60} \times \Delta t$$
- Sitting: $1.3\text{ MET}$
- Walking: $3.8\text{ MET}$
- Running: $7.0\text{ MET}$

### 6. Karvonen Heart Rate Model
$$\text{HR}_{\text{max}} = 220 - \text{Age}$$
$$\text{Estimated HR} = \text{HR}_{\text{rest}} + (\text{HR}_{\text{max}} - \text{HR}_{\text{rest}}) \times \text{Intensity}$$
- Sitting: $0.10$ intensity
- Walking: $0.40$ intensity
- Running: $0.70$ intensity

---

## 🎯 Ground-Truth Accuracy Validation

Both the MATLAB and Web versions feature a **Controlled Step Test Suite**:
1. Enter the actual number of steps you intend to take (e.g. 50 or 100 steps).
2. Press **START TRACKING**.
3. Walk or jog normally.
4. Press **STOP TRACKING**.
5. The application computes the measured empirical accuracy:
   $$\text{Accuracy} = \max\left(0, \min\left(100, 100 - \frac{|\text{Detected} - \text{Actual}|}{\text{Actual}} \times 100\right)\right)\%$$

*Note: The application never fabricates a 98% accuracy score. Accuracy is labeled as "Not yet validated" until an actual ground-truth test is executed.*

---

## ⚠️ Limitations & Disclaimers

- **Estimated Metrics**: Heart rate and calorie values are mathematical approximations derived from smartphone motion models. They are **not measured by clinical electrocardiogram or pulse-oximetry hardware** and must not be used for medical evaluation.
- **Vertical Floors**: Floor climbing estimates ($1\text{ floor} \approx 3\text{ meters}$) require barometer/altitude support; where absent, a stride-incline estimate is used.
- **Sensor Orientation**: Accuracy is highest when the smartphone is kept in a pants pocket, armband, or held steadily during walking.

---

## 🔒 Privacy Guarantee

- **Zero Backend**: Neither the MATLAB app nor the web app requires an external server.
- **Zero Telemetry**: No tracking cookies, external scripts, or analytics.
- **Local Isolation**: All sensor readings stay strictly in the local environment and are never transmitted across the network.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
