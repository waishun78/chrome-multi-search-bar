# Chrome Multi-Search Bar

A Chrome extension that lets you highlight multiple search terms on any webpage simultaneously, each in a distinct color.

## Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `chrome-multi-search-bar` folder.
5. The extension icon appears in your toolbar.

## Usage

### Opening and closing the panel

- **Click the extension icon** to toggle the search panel open or closed.
- **Press Escape** or click the **×** button in the panel header to close it.
- Closing the panel clears all highlights from the page.

### Searching

1. Open the panel on any webpage.
2. Type in the search box — matching text is highlighted in **yellow** as you type.
3. Click **+ Add search bar** to add another search term, highlighted in a different color (cyan, green, pink, …).
4. Each bar operates independently; you can have up to 8 distinct colors before they cycle.

### Regex mode

- Click the **`.*`** button on any bar to toggle regular expression mode for that bar.
- The button turns blue when regex is active.
- If your regex is invalid, the input turns red and that bar is skipped (no crash).

### Removing a bar

- Click the **×** button on the right of any bar row to remove it.
- Its highlights are cleared immediately.
- The remove button is hidden when only one bar remains.

## Color order

| Bar | Color  |
|-----|--------|
| 1   | Yellow `#FFFF00` |
| 2   | Cyan `#00FFFF` |
| 3   | Light green `#90EE90` |
| 4   | Light pink `#FFB6C1` |
| 5   | Orange `#FFA500` |
| 6   | Plum `#DDA0DD` |
| 7   | Tomato `#FF6347` |
| 8   | Turquoise `#40E0D0` |

## Notes

- The panel is injected directly into the page (not a popup), so it works on any tab.
- Highlights are cleared when you close the panel or navigate away.
- The extension does not collect or transmit any data.
