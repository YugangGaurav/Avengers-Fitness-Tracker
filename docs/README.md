# Ⓐ Avengers Fitness Tracker — Web Testing Engine

A high-performance, browser-based real-time fitness command center built with pure Vanilla HTML5, CSS3, and JavaScript. Powered by the smartphone's native `DeviceMotionEvent` accelerometer stream, zero-phase gravity detrending, and adaptive peak step detection.

---

## 🚀 Live Demo & GitHub Pages Deployment

This web app is 100% static and requires **no build tools, Node.js, backend servers, or API keys**.

### How to Deploy on GitHub Pages:
1. Push this repository to GitHub: `Avengers-Fitness-Tracker`
2. Go to **Settings** → **Pages**
3. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/web`
4. Click **Save**.
5. Your live URL will be ready at:
   ```
   https://<USERNAME>.github.io/Avengers-Fitness-Tracker/
   ```

---

## 📱 How to Test on Mobile Devices

### 🍎 Testing on iPhone (iOS 13+):
1. Open Safari and navigate to your GitHub Pages URL (must be over `https://`).
2. Tap **START TRACKING** or **START LIVE TEST**.
3. Safari will present an iOS system permission dialogue: *"This website wants to access Motion and Orientation"*.
4. Tap **Allow**.
5. Move with your phone in hand or in your pocket to observe live step counts, cadence, and acceleration waveforms.

### 🤖 Testing on Android (Chrome / Firefox):
1. Open Chrome and navigate to your GitHub Pages URL over `https://` (modern browsers require HTTPS to access motion hardware).
2. Tap **START TRACKING**.
3. Sensors will automatically bind and stream live telemetry.

### 💻 Testing on Desktop / Laptop (Virtual Simulation Engine):
- If testing on a laptop or PC without physical motion sensors, the app includes a **Virtual Simulation Engine**.
- Tap the **MODE** badge in the top right or go to **Profile & Settings** to toggle **Simulation Engine**.
- You can simulate realistic human **Walking** (~108 SPM), **Running** (~162 SPM), or **Sitting** (sedentary sensor noise) to verify all algorithms, charts, and accuracy tools offline!

---

## ⚙️ Biomechanical Algorithms

### 1. Acceleration Magnitude:
$$\text{Magnitude} = \sqrt{x^2 + y^2 + z^2}$$

### 2. Zero-Phase Baseline Detrending:
An exponential moving average baseline tracks and removes the $9.81\text{ m/s}^2$ constant earth gravity vector, isolating pure dynamic body propulsion:
$$\text{Baseline}(t) = 0.98 \cdot \text{Baseline}(t-1) + 0.02 \cdot \text{Magnitude}(t)$$
$$\text{Filtered}(t) = |\text{Magnitude}(t) - \text{Baseline}(t)|$$

### 3. Adaptive Threshold & Refractory Lockout:
- **Threshold**: Dynamically scales with movement noise: $\text{Threshold} = \text{Mean} + 0.35 \cdot \sigma$
- **Refractory Lockout Period**: Enforces a minimum interval of **280 ms** between steps, mechanically preventing double-counting bounce vibrations (maximum $214\text{ steps/min}$).

### 4. Continuous ACSM Calorie Integration:
Calories continuously accumulate via Euler integration, preventing the regression bug where sitting after running dropped calorie burn:
$$\Delta \text{Cal} = \frac{\text{MET} \times 3.5 \times \text{Weight (kg)}}{200 \times 60} \times \Delta t$$
- Sitting: $1.3\text{ MET}$
- Walking: $3.8\text{ MET}$
- Running: $7.0\text{ MET}$

### 5. Karvonen Heart Rate Model:
$$\text{HR}_{\text{max}} = 220 - \text{Age}$$
$$\text{Estimated HR} = \text{HR}_{\text{rest}} + (\text{HR}_{\text{max}} - \text{HR}_{\text{rest}}) \times \text{Intensity}$$
*(Labeled explicitly as ESTIMATED HR; not for medical use).*

---

## 🔒 Security & Privacy
- **100% Client-Side**: All data processing runs entirely in your browser's memory.
- **Zero Telemetry**: No tracking cookies, analytics, or external requests.
- **Offline Capable**: Works smoothly offline via `localStorage`.
