# TC Temperature Calculator

A mobile-friendly web calculator for determining the correct Eurotherm controller setpoint based on thermocouple (TC) shield thickness and thermocouple wire calibration data.

**Run it on GitHub Pages:** https://kaylai.github.io/epic-tc-calculator/

## What it does

When running high-temperature experiments, the thermocouple reads a temperature that differs from the actual sample temperature due to:

1. **Hot Spot offset** — physical distance between the TC tip and the sample center
2. **TC deviation** — inherent calibration error that varies with temperature and spool

This tool applies both corrections so you can quickly determine what temperature to program into the Eurotherm controller.

## Formulae

```
T_set = T_desired - T_shield - T_deviation
```

Polynomials for the hot spot correction are based on spinel growth calibration experiments and a third- or fourth-order polynomial fit to the data. All raw data for both temperature offsets are documented both in the original excel spreadsheet used to creaete this app (see /excel/Calculating TC temp.xlsx) and in the app (click the ⓘ button at the top of the page to see all documentaiton).

### Rosie's Hot Spot Correction

y = -0.013609x$^{4}$ + 0.60653x$^{3}$ - 12.281x$^{2}$ + 123.67x + 463.54

### Taylor's Hot Spot Correction

y = 0.037129x$^{3}$ - 2.9693x$^{2}$ + 54.464x + 654.14

## Usage on local

Open `index.html` in any browser. No build step, no dependencies, no server required.

1. Select your apparatus (Taylor or Rosie)
2. Enter shield thickness and capsule height (inches or mm)
3. Enter desired run temperature in °C
4. Read the corrected Eurotherm setpoint

Tap the ⓘ button to view full documentation, calibration data, and charts.
