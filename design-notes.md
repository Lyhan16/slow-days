# Redesign audit

Reading this as: a private anniversary keepsake for a couple, with a quiet photographic language, leaning toward an airy editorial composition and tangible paper interactions.

Mode: approved layout overhaul. Retain the camera, sequential memories, URL, browser-local progress, photo viewer and current audience. Replace scattered corner labels and the detached pile with an editorial workbench and a functional clothesline.

DESIGN_VARIANCE: 6. Left copy, right camera and a full-width clothesline. Explicit single-column mobile fallback.
MOTION_INTENSITY: 6. Shutter feedback, physical feed, development, flight to the line and a damped swing. No continuous ambient float.
VISUAL_DENSITY: 2. One headline, short copy and one shutter action. Collection tools stay secondary.

Foundation: retained buildless HTML/CSS and Feel runtime. White-only intentionally follows the user's explicit white-background requirement. Graphite type, actual lavender shutter accent, square film, pill controls and requested wooden pegs.

The camera's lower strap has been edited to sit in the foreground on the same ground plane, with contact shadows under the body and strap separately. Its upper body and slot retain the calibrated geometry and canvas dimensions. Rear, emerging paper and foreground lip are separate DOM layers; calibrated coordinates live in geometry.js. The same square object-fit coordinate system drives every layer.

Follow-up revision: removed the complete masthead, raised the composition, moved album access into the footer. During printing the workbench moves above the clothesline in the stacking order. A physical zoom brings the camera to bottom center with its lower body cropped. The full paper fits within the viewport: slot at 66% viewport height, width constrained by both viewport width and the paper's 54:86 ratio. The slider defaults to .70 speed, maps to .48 * speed Hz with critical damping and proportional velocity tolerance, and retargets the same body without restarting. Speed and photograph count use separate storage keys.

Reference: https://github.com/alejandrobujan/tendedero and its PeggedView.swift / LineView.swift. Borrow the hanging pivot and responsive swing idea, not the glass framing, metal clips, Mac UI or source implementation. Preserve 54:86 film and 46:62 image proportions.

Preflight: mouth alignment at several scene sizes, automatic hanging, hover/focus swing, 21-item line overflow, photo reading and return, keyboard control, reduced motion, retained progress, missing-image retry, desktop/mobile layout and unchanged site identity/audience. Keep SEO title and URL stable.
