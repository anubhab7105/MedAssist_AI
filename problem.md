3. Domain: AI in Healthcare & Wellness (Personal Health)
Problem Statement

Design and integrate an AI-powered recovery mode into an existing personal wellness platform. It should recognize when a user is under high strain, simplify the interface, and provide a short recovery plan while safely adjusting daily goals.

 

1. Introduction

Wellness apps usually encourage users to follow daily targets, but those targets may not make sense when someone is exhausted or under heavy stress. A smarter app should recognize such situations and reduce unnecessary pressure instead of treating every day the same.

 

2. Challenges

• Health apps can show too many goals when a user is already stressed or tired.

• Rigid targets can make users feel pressured.

• Users in distress may not want to fill out long forms.

• Daily activity targets may need to be reduced during recovery.

 

3. Application Workflow

User gives a quick health/energy check-in → AI identifies the current energy state → App switches to a simpler mode → AI creates a short recovery plan → Daily goals are adjusted → Normal mode can resume later.

 

4. User Roles & Capabilities

• User: Give a quick text/audio check-in.

• User: Follow the short recovery activity.

• Coach/Admin: View recovery trends and configure trigger levels.

 

5. Core Feature Specifications

• Detect a high-stress or low-energy state from a check-in.

• Switch the interface to a low-effort recovery mode.

• Generate a simple 3-minute recovery activity.

• Temporarily adjust daily goals and protect the user's streak.

 

Test Scenario (Example)

Example:

Check-in: "Exams start in two hours, I slept 3 hours, have a headache and feel sick."

Expected system behavior:

The app enters Recovery/Triage Mode, hides demanding goals, and shows a simple recovery card with hydration and a short relaxation activity. The day's normal activity target is reduced and the streak is protected.

 

6. Expected Outcomes

• Reduces pressure on users during difficult days.

• Provides a simpler experience when users need it most.

• Adapts daily wellness goals automatically.

 

7. Bonus Ideas

• Audio-guided breathing widget.

• A simple energy-level forecast after recovery.