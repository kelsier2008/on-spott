# ClassCheck Pro

make an app for Design and develop a modern, responsive web application for an automated classroom attendance system with dual portals (Student and Teacher) featuring biometric face recognition, Bluetooth proximity verification, and time-bounded sessions.

### Key Requirements & Flows:

1. Landing & Role Selection:

   - Modern glassmorphic dark-mode UI with high-contrast typography and subtle micro-interactions.

   - Distinct entry paths for "Student Portal" and "Teacher Portal".

2. Authentication & Biometric Verification:

   - Student Form: Full Name and College ID.

   - Teacher Form: Full Name, Faculty ID, and Subject/Course Code.

   - Face Recognition Screen: Live camera stream via WebRTC with an interactive biometric HUD (facial landmark tracking reticle, confidence score animation, snapshot capture, and verification chime).

3. Teacher Command Center:

   - "Open Attendance Window": Triggers a 120-second (2-minute) countdown timer with a circular radial progress display.

   - Real-time Student Roster: Live table displaying student names, roll numbers, Bluetooth proximity status, face verification timestamp, and attendance status (Present / Absent / Pending).

   - Manual Overrides: Ability for the teacher to toggle attendance status for any student during the active session.

   - Final Submit & Lock: A permanent submission action with a confirmation modal. Once locked, the session records become completely immutable, preventing any further student submissions or teacher modifications. Provides CSV/JSON export and verification hash.

4. Student Attendance Portal:

   - Listens for the teacher's active 120-second session window in real-time.

   - Bluetooth Proximity Detection: Enforces that the student device is within physical proximity (via Web Bluetooth API / RSSI beacon simulation with signal strength gauge).

   - "Mark Present" Action: Activated only when (1) face is biometrically verified, (2) the 120-second window is active, and (3) Bluetooth proximity is satisfied.

   - Generates an instant digital confirmation ticket with timestamp and verification QR code.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://on-spott.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c1227493-f216-4de7-b54b-6bb1f889173d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
