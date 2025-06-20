# Epic Claim Helper

A Tampermonkey userscript to automate collecting and claiming Fab.com listings, while removing `.jpg` images from the page.

## Features

- **Auto-collects Fab.com listing links** (UUID-based)
- **Removes all `.jpg` and `.jpeg` images** for a cleaner browsing experience
- **Draggable overlay UI** with a start/stop button
- **Live stats popup**: success, fail, pending counts
- **Automatically claims listings** by sending requests to Fab.com

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. [Click here to install the script](https://raw.githubusercontent.com/xXxNIKIxXx/epic_fab_claim/refs/heads/main/Epic_Fab_Claim_Helper.js) or copy the code from this repo into a new Tampermonkey script.

## Usage

- Visit [fab.com](https://www.fab.com/).
- Use the overlay in the top-left to start/stop collecting links.
- Stats are shown in the top-right.
- On stop, the script will attempt to claim all collected listings.

## Disclaimer

This script is provided for educational purposes. Use at your own risk.

---

**Author:** xXx_NIKI_xXx  
**License:** MIT