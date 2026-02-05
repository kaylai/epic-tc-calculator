# TC Temperature Calculator

A mobile-friendly web calculator for determining the correct Eurotherm controller setpoint based on thermocouple shield thickness and thermocouple wire calibration data.

## What it does

When running high-temperature experiments, the thermocouple reads a temperature that differs from the actual sample temperature due to:

1. **Shield offset** — physical distance between the TC tip and the sample center
2. **TC deviation** — inherent calibration error that varies with temperature and spool

This tool applies both corrections so you can quickly determine what temperature to program into the Eurotherm controller.

**Formula:**
```
T_set = T_desired - T_shield - T_deviation
```

## Usage on local

Open `index.html` in any browser. No build step, no dependencies, no server required.

1. Select your apparatus (Taylor or Rosie)
2. Enter shield thickness and capsule height (inches or mm)
3. Enter desired run temperature in °C
4. Read the corrected Eurotherm setpoint

Tap the ⓘ button to view full documentation, calibration data, and charts.
